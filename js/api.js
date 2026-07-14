// ═══ 백엔드 클라이언트 ═══
// SCRIPT_URL이 비어 있으면 데모 모드: localStorage를 백엔드 삼아 동작.
// 라이브 모드: Apps Script 웹앱과 통신 (POST는 text/plain — CORS 우회 검증 패턴).
window.Api = (function () {
  const LS_KEY = 'hanti-admin-db-v2'; // v2: 실명단 시드 (v1 샘플 데이터는 무시됨)
  const isDemo = () => !CONFIG.SCRIPT_URL;

  // ── 데모 저장소 ──
  function demoLoad() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const db = JSON.parse(raw);
        // 마이그레이션: 이후 추가된 컬렉션이 없으면 시드에서 보충
        Object.keys(SEED).forEach(k => { if (!db[k]) db[k] = JSON.parse(JSON.stringify(SEED[k])); });
        // v3 패치: 학원(MEXX) 발송 개강 안내 공지 주입 + 강의실 표기 정정
        if ((db._v || 2) < 3) {
          ['n3', 'n4'].forEach(id => {
            const s = SEED.notices.find(n => n.id === id);
            if (s && !db.notices.some(n => n.id === id)) db.notices.push(JSON.parse(JSON.stringify(s)));
          });
          db.courses.forEach(c => { if (c.room === 'L관 101호') c.room = '2관 L층 101호'; });
          db._v = 3;
          demoSave(db);
        }
        // v4~v8 패치: n1 수신 확인 갱신 + n5 학부모용 원문 공지 추가
        if (db._v < 8) {
          const s1 = SEED.notices.find(n => n.id === 'n1');
          const cur1 = db.notices.find(n => n.id === 'n1');
          if (s1 && cur1) Object.assign(cur1, JSON.parse(JSON.stringify(s1))); // delivery 통째 교체(학부모 정보는 n5로 이동)
          const s5 = SEED.notices.find(n => n.id === 'n5');
          if (s5 && !db.notices.some(n => n.id === 'n5')) db.notices.push(JSON.parse(JSON.stringify(s5)));
          db._v = 8;
          demoSave(db);
        }
        // v9 패치: 첫수업 상담지(7/12) 판독 내용을 학생 consult 필드로 주입
        if (db._v < 9) {
          SEED.students.forEach(ss => {
            const cur = db.students.find(x => x.id === ss.id);
            if (cur && ss.consult && !cur.consult) cur.consult = ss.consult;
            if (cur && ss.note && cur.note !== ss.note && ['s219', 's220'].includes(ss.id)) cur.note = ss.note;
          });
          db._v = 9;
          demoSave(db);
        }
        // v10 패치: 장성주 학교 정정(경기고, 가경T 확인) + 학교 확인 플래그 제거
        if (db._v < 10) {
          const s106 = db.students.find(x => x.id === 's106');
          if (s106) {
            if (s106.school === '경기외국어고등학교') s106.school = '경기고등학교';
            if (s106.consult) s106.consult = s106.consult.replace('ISTP · 상담지 학교란 "경기고" 기재(출석부와 대조 확인 필요)', 'ISTP');
          }
          const s107 = db.students.find(x => x.id === 's107');
          if (s107 && s107.consult) s107.consult = s107.consult.replace('INTP · 상담지 학교란 "대원여고" 기재(출석부는 대원외고 — 확인 필요)', 'INTP');
          db._v = 10;
          demoSave(db);
        }
        return db;
      }
    } catch (e) { /* 손상 시 시드로 초기화 */ }
    const db = JSON.parse(JSON.stringify(SEED));
    localStorage.setItem(LS_KEY, JSON.stringify(db));
    return db;
  }
  function demoSave(db) { localStorage.setItem(LS_KEY, JSON.stringify(db)); }

  // ── 공통 액션 적용 (데모 모드는 클라이언트에서, 라이브는 서버 Code.gs가 동일 로직 수행) ──
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function applyAction(db, action, p) {
    const upsert = (list, item) => {
      const i = list.findIndex(x => x.id === item.id);
      if (i >= 0) list[i] = { ...list[i], ...item }; else list.push(item);
      return item;
    };
    switch (action) {
      case 'upsertCourse': {
        if (!p.id) p.id = 'c-' + uid();
        return upsert(db.courses, p);
      }
      case 'upsertSession': {
        if (!p.id) p.id = 'ss-' + uid();
        return upsert(db.sessions, p);
      }
      case 'upsertStudent': {
        if (!p.id) { p.id = 's-' + uid(); p.createdAt = new Date().toISOString().slice(0, 10); }
        return upsert(db.students, p);
      }
      case 'enroll': {
        const dup = db.enrollments.find(e => e.studentId === p.studentId && e.courseId === p.courseId);
        if (dup) return dup;
        const e = { id: 'e-' + uid(), studentId: p.studentId, courseId: p.courseId, date: new Date().toISOString().slice(0, 10) };
        db.enrollments.push(e);
        return e;
      }
      case 'unenroll': {
        db.enrollments = db.enrollments.filter(e => !(e.studentId === p.studentId && e.courseId === p.courseId));
        return true;
      }
      case 'setAttendance': {
        // p = { sessionId, courseId, by, records: [{studentId, status, memo}] }
        const now = new Date().toISOString();
        p.records.forEach(r => {
          const i = db.attendance.findIndex(a => a.sessionId === p.sessionId && a.studentId === r.studentId);
          if (!r.status) { // 상태 해제 → 기록 삭제
            if (i >= 0) db.attendance.splice(i, 1);
          } else if (i >= 0) {
            Object.assign(db.attendance[i], { status: r.status, memo: r.memo || '', by: p.by, ts: now });
          } else {
            db.attendance.push({ id: 'a-' + uid(), sessionId: p.sessionId, studentId: r.studentId, status: r.status, memo: r.memo || '', by: p.by, ts: now });
          }
          // 보강 자동 연동: 결석 → 생성, 결석 아님 → '필요' 상태인 자동 보강 제거
          const mi = db.makeups.findIndex(m => m.sessionId === p.sessionId && m.studentId === r.studentId);
          if (r.status === '결석') {
            if (mi < 0) db.makeups.push({ id: 'm-' + uid(), studentId: r.studentId, sessionId: p.sessionId, courseId: p.courseId, status: '필요', method: '', memo: r.memo || '', by: p.by, ts: now, doneAt: '' });
          } else if (mi >= 0 && db.makeups[mi].status === '필요') {
            db.makeups.splice(mi, 1);
          }
        });
        return true;
      }
      case 'setMakeup': {
        const m = db.makeups.find(x => x.id === p.id);
        if (m) {
          Object.assign(m, p);
          if (p.status === '완료' && !m.doneAt) m.doneAt = new Date().toISOString().slice(0, 10);
          if (p.status && p.status !== '완료') m.doneAt = '';
        }
        return m;
      }
      case 'deleteMakeup': {
        db.makeups = db.makeups.filter(x => x.id !== p.id);
        return true;
      }
      case 'upsertNotice': {
        if (!p.id) { p.id = 'n-' + uid(); p.ts = new Date().toISOString(); }
        return upsert(db.notices, p);
      }
      case 'deleteNotice': {
        db.notices = db.notices.filter(x => x.id !== p.id);
        return true;
      }
      default: throw new Error('알 수 없는 액션: ' + action);
    }
  }

  // ── 공개 API ──
  return {
    isDemo,

    // PIN 검증 → { role: 'master'|'staff' } 또는 null
    async auth(pin) {
      if (isDemo()) {
        if (pin === CONFIG.DEMO_PIN_MASTER) return { role: 'master' };
        if (pin === CONFIG.DEMO_PIN_STAFF) return { role: 'staff' };
        return null;
      }
      const res = await fetch(CONFIG.SCRIPT_URL + '?pin=' + encodeURIComponent(pin) + '&auth=1');
      const j = await res.json();
      return j.ok ? { role: j.role } : null;
    },

    // 전체 데이터 로드
    async load(pin) {
      if (isDemo()) return demoLoad();
      const res = await fetch(CONFIG.SCRIPT_URL + '?pin=' + encodeURIComponent(pin));
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || '데이터를 불러오지 못했습니다.');
      return j.db;
    },

    // 액션 실행 → 변경된 DB를 로컬 상태에도 반영
    async action(db, pin, action, payload) {
      if (isDemo()) {
        const r = applyAction(db, action, payload);
        demoSave(db);
        return r;
      }
      const res = await fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ pin, action, payload }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || '저장에 실패했습니다.');
      applyAction(db, action, payload); // 서버 성공 후 로컬 반영
      return j.result;
    },

    // 데모 데이터 초기화
    demoReset() { localStorage.removeItem(LS_KEY); },
  };
})();
