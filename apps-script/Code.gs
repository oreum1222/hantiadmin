/**
 * 한티 MEXX 운영 허브 — Apps Script 백엔드
 *
 * [배포 절차]
 * 1. Google Sheets 새 문서 생성 → 확장 프로그램 → Apps Script → 이 코드 붙여넣기
 * 2. 프로젝트 설정 → 스크립트 속성에 MASTER_PIN, STAFF_PIN 추가
 * 3. 한 번 initSheets() 실행 (시트 탭 자동 생성)
 * 4. 배포 → 웹 앱: 실행 계정 = 나, 액세스 = 모든 사용자 → URL을 js/config.js SCRIPT_URL에 입력
 *
 * 시트 탭: courses / sessions / students / enrollments / attendance / makeups
 * 각 탭 1행은 헤더. 시트에서 직접 행을 추가·수정해도 대시보드에 반영됩니다.
 */

var TABS = {
  courses: ['id', 'name', 'grade', 'kind', 'day', 'time', 'room', 'sessionsCount', 'openDate', 'staff', 'material'],
  sessions: ['id', 'courseId', 'no', 'date', 'topic', 'isVideo'],
  students: ['id', 'name', 'school', 'grade', 'phone', 'parentPhone', 'note', 'consult', 'status', 'createdAt'],
  enrollments: ['id', 'studentId', 'courseId', 'date'],
  attendance: ['id', 'sessionId', 'studentId', 'status', 'memo', 'by', 'ts'],
  makeups: ['id', 'studentId', 'sessionId', 'courseId', 'status', 'method', 'memo', 'by', 'ts', 'doneAt'],
  notices: ['id', 'date', 'title', 'body', 'channel', 'courseIds', 'by', 'ts', 'delivery'],
};

function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try { ss.setSpreadsheetTimeZone('Asia/Seoul'); } catch (e) { }
  Object.keys(TABS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(TABS[name]);
  });
}

function checkPin_(pin) {
  var props = PropertiesService.getScriptProperties();
  if (pin && pin === props.getProperty('MASTER_PIN')) return 'master';
  if (pin && pin === props.getProperty('STAFF_PIN')) return 'staff';
  return null;
}

function readAll_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var db = {};
  Object.keys(TABS).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    var rows = sh ? sh.getDataRange().getValues() : [];
    var header = rows.shift() || TABS[name];
    db[name] = rows.filter(function (r) { return r[0] !== ''; }).map(function (r) {
      var o = {};
      header.forEach(function (h, i) {
        var v = r[i];
        // 주의: getValues()의 Date는 다른 컨텍스트 객체라 instanceof가 실패할 수 있음 → toString 판별
        if (Object.prototype.toString.call(v) === '[object Date]') v = Utilities.formatDate(v, 'Asia/Seoul', h === 'ts' ? "yyyy-MM-dd'T'HH:mm:ss" : 'yyyy-MM-dd');
        if (h === 'isVideo') v = (v === true || v === 'TRUE' || v === 'true');
        if (h === 'delivery' && typeof v === 'string' && v) { try { v = JSON.parse(v); } catch (err) { /* 문자열 그대로 */ } }
        if (h === 'no' || h === 'sessionsCount') v = Number(v) || 0;
        o[h] = v;
      });
      return o;
    });
  });
  return db;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var role = checkPin_((e.parameter || {}).pin);
  if (!role) return json_({ ok: false, error: 'PIN이 올바르지 않습니다.' });
  if ((e.parameter || {}).auth) return json_({ ok: true, role: role });
  if ((e.parameter || {}).action === 'faList') return json_(faList_());
  return json_({ ok: true, role: role, db: readAll_() });
}

// ── 학습 성향 진단(fassessment) 릴레이: PIN 인증 후 서버가 키로 조회 ──
// 스크립트 속성 FASSESSMENT_URL / FASSESSMENT_KEY 필요 (공개 저장소에 키를 두지 않기 위한 구조)
function faList_() {
  try {
    var props = PropertiesService.getScriptProperties();
    var url = props.getProperty('FASSESSMENT_URL');
    var key = props.getProperty('FASSESSMENT_KEY');
    if (!url || !key) return { ok: false, error: 'FASSESSMENT 속성 미설정', list: [] };
    var res = UrlFetchApp.fetch(url + '?key=' + encodeURIComponent(key) + '&action=v2List', { muteHttpExceptions: true, followRedirects: true });
    var list = [];
    try { list = JSON.parse(res.getContentText() || '[]'); } catch (e2) { }
    return { ok: true, list: Array.isArray(list) ? list : (list.list || []) };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err), list: [] };
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000); // 동시 저장 충돌 방지
  try {
    var body = JSON.parse(e.postData.contents);
    var role = checkPin_(body.pin);
    if (!role) return json_({ ok: false, error: 'PIN이 올바르지 않습니다.' });
    var result = applyAction_(body.action, body.payload || {}, role);
    return json_({ ok: true, result: result });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

// ── 시트 행 조작 헬퍼 ──
function sheet_(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }
function findRow_(name, id) {
  var sh = sheet_(name);
  var ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}
function toRow_(name, obj) { return TABS[name].map(function (h) { return obj[h] !== undefined ? obj[h] : ''; }); }
function upsert_(name, obj) {
  var sh = sheet_(name);
  var row = obj.id ? findRow_(name, obj.id) : -1;
  if (row > 0) {
    // 기존 값 유지 병합
    var cur = sh.getRange(row, 1, 1, TABS[name].length).getValues()[0];
    TABS[name].forEach(function (h, i) { if (obj[h] === undefined) obj[h] = cur[i]; });
    sh.getRange(row, 1, 1, TABS[name].length).setValues([toRow_(name, obj)]);
  } else {
    sh.appendRow(toRow_(name, obj));
  }
  return obj;
}
function remove_(name, pred) {
  var sh = sheet_(name);
  var rows = sh.getDataRange().getValues();
  var header = rows[0];
  for (var i = rows.length - 1; i >= 1; i--) {
    var o = {};
    header.forEach(function (h, j) { o[h] = rows[i][j]; });
    if (pred(o)) sh.deleteRow(i + 1);
  }
}
function uid_() { return new Date().getTime().toString(36) + Math.random().toString(36).slice(2, 7); }
function today_() { return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'); }
function now_() { return Utilities.formatDate(new Date(), 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ss"); }

// ── 액션 (js/api.js의 applyAction과 동일 의미) ──
function applyAction_(action, p, role) {
  switch (action) {
    case 'upsertCourse':
      if (!p.id) p.id = 'c-' + uid_();
      return upsert_('courses', p);
    case 'upsertSession':
      if (!p.id) p.id = 'ss-' + uid_();
      return upsert_('sessions', p);
    case 'upsertStudent':
      if (!p.id) { p.id = 's-' + uid_(); p.createdAt = today_(); }
      return upsert_('students', p);
    case 'enroll': {
      var db = readAll_();
      var dup = db.enrollments.filter(function (x) { return x.studentId === p.studentId && x.courseId === p.courseId; })[0];
      if (dup) return dup;
      return upsert_('enrollments', { id: 'e-' + uid_(), studentId: p.studentId, courseId: p.courseId, date: today_() });
    }
    case 'unenroll':
      remove_('enrollments', function (o) { return o.studentId === p.studentId && o.courseId === p.courseId; });
      return true;
    case 'setAttendance': {
      var db2 = readAll_();
      var ts = now_();
      (p.records || []).forEach(function (r) {
        var ex = db2.attendance.filter(function (a) { return a.sessionId === p.sessionId && a.studentId === r.studentId; })[0];
        if (!r.status) {
          if (ex) remove_('attendance', function (o) { return o.id === ex.id; });
        } else {
          upsert_('attendance', { id: ex ? ex.id : 'a-' + uid_(), sessionId: p.sessionId, studentId: r.studentId, status: r.status, memo: r.memo || '', by: p.by, ts: ts });
        }
        var mk = db2.makeups.filter(function (m) { return m.sessionId === p.sessionId && m.studentId === r.studentId; })[0];
        if (r.status === '결석') {
          if (!mk) upsert_('makeups', { id: 'm-' + uid_(), studentId: r.studentId, sessionId: p.sessionId, courseId: p.courseId, status: '필요', method: '', memo: r.memo || '', by: p.by, ts: ts, doneAt: '' });
        } else if (mk && mk.status === '필요') {
          remove_('makeups', function (o) { return o.id === mk.id; });
        }
      });
      return true;
    }
    case 'setMakeup': {
      var db3 = readAll_();
      var m2 = db3.makeups.filter(function (x) { return x.id === p.id; })[0];
      if (!m2) throw new Error('보강 항목을 찾을 수 없습니다.');
      Object.keys(p).forEach(function (k) { m2[k] = p[k]; });
      if (p.status === '완료' && !m2.doneAt) m2.doneAt = today_();
      if (p.status && p.status !== '완료') m2.doneAt = '';
      return upsert_('makeups', m2);
    }
    case 'deleteMakeup':
      remove_('makeups', function (o) { return o.id === p.id; });
      return true;
    case 'upsertNotice':
      if (!p.id) { p.id = 'n-' + uid_(); p.ts = now_(); }
      if (p.delivery && typeof p.delivery !== 'string') p.delivery = JSON.stringify(p.delivery);
      return upsert_('notices', p);
    case 'deleteNotice':
      remove_('notices', function (o) { return o.id === p.id; });
      return true;
    case 'bulkImport': {
      // 초기 1회 데이터 적재(마스터 전용). 이미 데이터가 있는 탭은 건너뜀.
      if (role !== 'master') throw new Error('마스터 권한이 필요합니다.');
      initSheets();
      var data = p.db || {};
      var report = {};
      Object.keys(TABS).forEach(function (name) {
        var rows = data[name];
        if (!rows || !rows.length) { report[name] = 0; return; }
        var sh = sheet_(name);
        if (sh.getLastRow() > 1 && !p.force) { report[name] = 'skip(기존 데이터 있음)'; return; }
        rows.forEach(function (o) {
          if (name === 'notices' && o.delivery && typeof o.delivery !== 'string') o.delivery = JSON.stringify(o.delivery);
          sh.appendRow(toRow_(name, o));
        });
        report[name] = rows.length;
      });
      return report;
    }
    default:
      throw new Error('알 수 없는 액션: ' + action);
  }
}
