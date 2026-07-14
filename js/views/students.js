// ═══ 학생 관리 ═══
Views.students = function (el) {
  const sub = (location.hash.split('/')[1] || '');
  if (sub) return renderStudent(el, sub);

  el.innerHTML = `
  <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight">학생 관리</h1>
      <p class="text-on-surface-variant text-[14px] mt-1">재원 ${App.db.students.filter(s => s.status === '재원').length}명 · 전체 ${App.db.students.length}명</p>
    </div>
    <button class="btn btn-primary" onclick="Views._studentForm()"><span class="material-symbols-outlined text-[18px]">person_add</span>학생 추가</button>
  </div>

  <div class="card p-4 mb-4 flex flex-wrap gap-3 items-center">
    <div class="relative flex-1 min-w-[200px]">
      <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
      <input id="st-search" class="fld !pl-10" placeholder="이름·학교로 검색"/>
    </div>
    <select id="st-course" class="fld !w-auto">
      <option value="">전체 강좌</option>
      ${App.db.courses.map(c => `<option value="${c.id}">${U.esc(c.name)}</option>`).join('')}
    </select>
    <select id="st-status" class="fld !w-auto">
      <option value="">전체 상태</option><option>재원</option><option>휴원</option>
    </select>
  </div>

  <div class="card overflow-x-auto">
    <table class="tbl min-w-[640px]">
      <thead><tr><th>이름</th><th>학교 · 학년</th><th>수강 강좌</th><th>결석</th><th>미완 보강</th><th>상태</th></tr></thead>
      <tbody id="st-rows"></tbody>
    </table>
  </div>`;

  function draw() {
    const q = document.getElementById('st-search').value.trim();
    const fc = document.getElementById('st-course').value;
    const fs = document.getElementById('st-status').value;
    let list = [...App.db.students].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    if (q) list = list.filter(s => s.name.includes(q) || s.school.includes(q));
    if (fc) { const ids = new Set(App.db.enrollments.filter(e => e.courseId === fc).map(e => e.studentId)); list = list.filter(s => ids.has(s.id)); }
    if (fs) list = list.filter(s => s.status === fs);
    document.getElementById('st-rows').innerHTML = list.length ? list.map(s => {
      const cs = App.coursesOf(s.id);
      const abs = App.db.attendance.filter(a => a.studentId === s.id && a.status === '결석').length;
      const mk = App.db.makeups.filter(m => m.studentId === s.id && m.status !== '완료').length;
      return `<tr class="row-click" onclick="location.hash='#students/${s.id}'">
        <td class="font-bold">${U.esc(s.name)}</td>
        <td class="text-on-surface-variant text-[13px]">${U.esc(s.school)} ${U.esc(s.grade)}</td>
        <td class="text-[13px]">${cs.length ? cs.map(c => `<span class="chip border border-outline-variant text-on-surface-variant mr-1">${U.esc(c.grade)} ${U.esc(c.kind)}</span>`).join('') : '<span class="text-on-surface-variant text-[12px]">—</span>'}</td>
        <td>${abs ? `<span class="text-red-400 font-bold">${abs}</span>` : '<span class="text-on-surface-variant">0</span>'}</td>
        <td>${mk ? `<span class="text-yellow-500 font-bold">${mk}</span>` : '<span class="text-on-surface-variant">0</span>'}</td>
        <td>${s.status === '재원' ? '<span class="chip border text-secondary border-secondary/30 bg-secondary-fixed/50">재원</span>' : '<span class="chip border text-on-surface-variant border-outline-variant">휴원</span>'}</td>
      </tr>`;
    }).join('') : `<tr><td colspan="6" class="text-center text-on-surface-variant text-[13px] py-8">조건에 맞는 학생이 없습니다.</td></tr>`;
  }
  ['st-search', 'st-course', 'st-status'].forEach(id => document.getElementById(id).addEventListener('input', draw));
  draw();
};

// ── 학생 상세 ──
function renderStudent(el, studentId) {
  const s = App.studentOf(studentId);
  if (!s) { location.hash = '#students'; return; }
  const courses = App.coursesOf(s.id);
  const attHist = App.db.attendance.filter(a => a.studentId === s.id)
    .map(a => ({ a, ss: App.sessionOf(a.sessionId) })).filter(x => x.ss)
    .sort((x, y) => (y.ss.date || '').localeCompare(x.ss.date || ''));
  const mks = App.db.makeups.filter(m => m.studentId === s.id);

  el.innerHTML = `
  <button class="btn btn-ghost !px-3 mb-4" onclick="location.hash='#students'"><span class="material-symbols-outlined text-[18px]">arrow_back</span>학생 목록</button>
  <div class="flex flex-wrap items-start justify-between gap-3 mb-6">
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-2xl font-extrabold tracking-tight">${U.esc(s.name)}</h1>
        ${s.status === '재원' ? '<span class="chip border text-secondary border-secondary/30 bg-secondary-fixed/50">재원</span>' : '<span class="chip border text-on-surface-variant border-outline-variant">휴원</span>'}
      </div>
      <p class="text-on-surface-variant text-[14px] mt-1">${U.esc(s.school)} ${U.esc(s.grade)} · 학생 ${U.esc(s.phone || '—')} · 학부모 ${U.esc(s.parentPhone || '—')}</p>
      ${s.note ? `<p class="text-[13px] mt-2 bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 inline-block"><span class="material-symbols-outlined text-[14px] text-yellow-500 align-middle mr-1">sticky_note_2</span>${U.esc(s.note)}</p>` : ''}
    </div>
    <button class="btn btn-ghost" onclick="Views._studentForm('${s.id}')"><span class="material-symbols-outlined text-[18px]">edit</span>정보 수정</button>
  </div>

  <div class="grid lg:grid-cols-2 gap-4">
    <section class="card p-5">
      <h2 class="font-bold text-[16px] mb-3">수강 강좌</h2>
      ${courses.length ? courses.map(c => `
        <div class="flex items-center justify-between py-2.5 border-b border-outline-variant last:border-0">
          <div class="row-click min-w-0" onclick="location.hash='#courses/${c.id}'">
            <div class="font-bold text-[14px]">${U.esc(c.name)}</div>
            <div class="text-on-surface-variant text-[12px]">${U.esc(c.day)}요일 ${U.esc(c.time)}</div>
          </div>
          <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
        </div>`).join('') : '<p class="text-on-surface-variant text-[13px] py-3">수강 중인 강좌가 없습니다. 강좌 상세에서 등록하세요.</p>'}
    </section>

    <section class="card p-5">
      <h2 class="font-bold text-[16px] mb-3">보강 이력</h2>
      ${mks.length ? mks.map(m => {
        const ss = App.sessionOf(m.sessionId), c = App.courseOf(m.courseId);
        return `<div class="flex items-center justify-between gap-2 py-2.5 border-b border-outline-variant last:border-0">
          <div class="text-[13px]"><b>${U.esc(c?.grade || '')} ${ss ? ss.no + '회차' : ''}</b> <span class="text-on-surface-variant">${ss ? U.fmtD(ss.date) : ''}${m.method ? ' · ' + U.esc(m.method) : ''}</span></div>
          ${U.mkChip(m.status)}
        </div>`;
      }).join('') : '<p class="text-on-surface-variant text-[13px] py-3">보강 이력이 없습니다.</p>'}
    </section>

    ${s.consult ? `
    <section class="card p-5 lg:col-span-2">
      <h2 class="font-bold text-[16px] mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">forum</span>첫수업 대면 상담 <span class="text-on-surface-variant font-normal text-[13px]">(7/12 상담지)</span></h2>
      <p class="text-on-surface-variant text-[13px] leading-relaxed whitespace-pre-wrap">${U.esc(s.consult)}</p>
    </section>` : ''}

    <section class="card p-5 lg:col-span-2">
      <h2 class="font-bold text-[16px] mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">insights</span>학습 성향 진단 <span class="text-on-surface-variant font-normal text-[13px]">(온라인 3종 + 대면)</span></h2>
      <div id="fa-diag"><p class="text-on-surface-variant text-[13px] py-2">불러오는 중…</p></div>
    </section>

    <section class="card p-5 lg:col-span-2">
      <h2 class="font-bold text-[16px] mb-3">출결 이력</h2>
      ${attHist.length ? `<div class="overflow-x-auto"><table class="tbl min-w-[480px]">
        <thead><tr><th>날짜</th><th>강좌 · 회차</th><th>상태</th><th>메모</th><th>기록자</th></tr></thead>
        <tbody>${attHist.map(({ a, ss }) => {
          const c = App.courseOf(ss.courseId);
          return `<tr>
            <td>${U.fmtD(ss.date)}</td>
            <td class="text-[13px]">${U.esc(c?.name || '')} ${ss.no}회차</td>
            <td>${U.attChip(a.status)}</td>
            <td class="text-on-surface-variant text-[13px]">${U.esc(a.memo || '—')}</td>
            <td class="text-on-surface-variant text-[13px]">${U.esc(a.by || '—')}</td>
          </tr>`;
        }).join('')}</tbody></table></div>`
      : '<p class="text-on-surface-variant text-[13px] py-3">출결 기록이 없습니다.</p>'}
    </section>
  </div>`;

  Views._fillDiag(s);
}

// ── 학생 추가/수정 모달 ──
Views._studentForm = function (studentId) {
  const s = studentId ? App.studentOf(studentId) : { name: '', school: '', grade: '', phone: '', parentPhone: '', note: '', status: '재원' };
  App.modal(`
    <h3 class="font-extrabold text-lg mb-4">${studentId ? '학생 정보 수정' : '학생 추가'}</h3>
    <div class="grid grid-cols-2 gap-3">
      <div><label class="lbl">이름 *</label><input id="stf-name" class="fld" value="${U.esc(s.name)}"/></div>
      <div><label class="lbl">상태</label><select id="stf-status" class="fld">${['재원', '휴원'].map(x => `<option ${s.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div><label class="lbl">학교</label><input id="stf-school" class="fld" value="${U.esc(s.school)}"/></div>
      <div><label class="lbl">학년</label><input id="stf-grade" class="fld" value="${U.esc(s.grade)}" placeholder="고1"/></div>
      <div><label class="lbl">학생 연락처</label><input id="stf-phone" class="fld" value="${U.esc(s.phone)}" placeholder="010-"/></div>
      <div><label class="lbl">학부모 연락처</label><input id="stf-pphone" class="fld" value="${U.esc(s.parentPhone)}" placeholder="010-"/></div>
      <div class="col-span-2"><label class="lbl">특이사항</label><textarea id="stf-note" class="fld" rows="2">${U.esc(s.note)}</textarea></div>
      <div class="col-span-2"><label class="lbl">상담 기록</label><textarea id="stf-consult" class="fld" rows="4">${U.esc(s.consult || '')}</textarea></div>
    </div>
    <div class="flex justify-end gap-2 mt-5">
      <button class="btn btn-ghost" onclick="App.closeModal()">취소</button>
      <button class="btn btn-primary" id="stf-save">저장</button>
    </div>`);
  document.getElementById('stf-save').onclick = async () => {
    const v = id => document.getElementById(id).value.trim();
    if (!v('stf-name')) return App.toast('이름을 입력하세요.', 'err');
    const ok = await App.act('upsertStudent', { id: studentId || '', name: v('stf-name'), school: v('stf-school'), grade: v('stf-grade'), phone: v('stf-phone'), parentPhone: v('stf-pphone'), note: v('stf-note'), consult: document.getElementById('stf-consult').value.trim(), status: v('stf-status'), ...(studentId ? { createdAt: App.studentOf(studentId).createdAt } : {}) }, '학생 정보를 저장했습니다.');
    if (ok) { App.closeModal(); App.refresh(); }
  };
};


// ── 학습 성향 진단(fassessment) 라이브 연동 ──
Views._faData = function () {
  if (!window.__FA_DIAG) {
    if (Array.isArray(window.FA_SNAPSHOT)) {
      // 구워둔 스냅샷 우선 (오프라인·file:// 에서도 즉시 표시)
      window.__FA_DIAG = Promise.resolve(window.FA_SNAPSHOT);
    } else if (CONFIG.SCRIPT_URL) {
      // 라이브 모드: PIN 인증된 운영허브 백엔드가 릴레이 (키 노출 없음)
      const u = CONFIG.SCRIPT_URL + '?pin=' + encodeURIComponent(App.pin) + '&action=faList';
      window.__FA_DIAG = fetch(u).then(r => r.json()).then(j => j.list || []).catch(() => []);
    } else if (CONFIG.FASSESSMENT_KEY) {
      // 데모/로컬: fassessment 직접 조회 (키가 로컬 설정에 있을 때만)
      const u = CONFIG.FASSESSMENT_URL + '?key=' + encodeURIComponent(CONFIG.FASSESSMENT_KEY) + '&action=v2List';
      window.__FA_DIAG = fetch(u).then(r => r.json()).catch(() => []);
    } else {
      window.__FA_DIAG = Promise.resolve([]);
    }
  }
  return window.__FA_DIAG;
};
Views._faRecords = function (name, data) {
  const rs = (data || []).filter(r => r['이름'] === name || r['이름'] === name + 'A');
  const pick = v => rs.filter(r => r['버전'] === v).sort((a, b) => String(b['제출시각'] || '').localeCompare(String(a['제출시각'] || '')))[0] || null;
  return { first: pick('재원생 첫'), summer: pick('summer'), parent: pick('학부모관찰') };
};
Views._fillDiag = function (s) {
  const box = document.getElementById('fa-diag');
  if (!box) return;
  const daemyeon = !!s.consult;
  Views._faData().then(data => {
    if (!document.getElementById('fa-diag')) return;
    const rec = Views._faRecords(s.name, data);
    const done = [!!rec.first, !!rec.summer, !!rec.parent, daemyeon].filter(Boolean).length;
    const chip = (ok, label) => `<span class="chip border ${ok ? 'text-secondary border-secondary/30 bg-secondary-fixed/50' : 'text-on-surface-variant border-outline-variant'}">${ok ? '✓' : '○'} ${label}</span>`;
    let h = `<div class="flex flex-wrap gap-2 mb-4 items-center"><span class="text-[13px] font-bold mr-1">완료 ${done}/4</span>${chip(!!rec.first, '재원생 첫')}${chip(!!rec.summer, '여름방학')}${chip(!!rec.parent, '학부모')}${chip(daemyeon, '대면')}</div>`;
    if (rec.first) {
      const r = rec.first;
      const axes = [['자료 장악', '자료장악'], ['사고 적용', '사고적용'], ['조건 변별', '조건변별'], ['오답 메타', '오답메타인지'], ['시간 운영', '시간운영'], ['정서 회복', '정서회복']];
      h += `<div class="bg-surface-container-low border border-outline-variant rounded-lg p-4 mb-3">
        <div class="flex flex-wrap items-center gap-2 mb-3"><span class="font-bold text-[14px]">재원생 첫 진단</span>${r['페르소나'] ? `<span class="chip border text-secondary border-secondary/30 bg-secondary-fixed/50">${U.esc(r['페르소나'])}</span>` : ''}${(+r['고위험수'] > 0) ? `<span class="chip border text-red-400 border-red-400/30 bg-red-400/10">고위험 ${+r['고위험수']}</span>` : ''}${(+r['착각수'] > 0) ? `<span class="chip border text-yellow-500 border-yellow-500/30 bg-yellow-500/10">착각 ${+r['착각수']}</span>` : ''}</div>
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">${axes.map(([lab, key]) => { const v = r[key]; const n = (typeof v === 'number') ? v : null; return `<div class="text-center bg-surface rounded-md py-2"><div class="text-[10.5px] text-on-surface-variant">${lab}</div><div class="font-extrabold text-[15px] ${(n !== null && n < 40) ? 'text-red-400' : (n !== null && n >= 75 ? 'text-secondary' : '')}">${n === null ? '—' : n}</div></div>`; }).join('')}</div>
      </div>`;
    }
    const extra = [];
    if (rec.summer) extra.push('여름방학 학습 진단 응시 완료 · ' + String(rec.summer['제출시각'] || '').slice(0, 10));
    if (rec.parent) extra.push('학부모 진단 접수 완료 · ' + String(rec.parent['제출시각'] || '').slice(0, 10));
    if (extra.length) h += `<div class="text-[13px] text-on-surface-variant mb-3">${extra.map(x => '· ' + U.esc(x)).join('<br>')}</div>`;
    if (rec.first || rec.summer) {
      const url = CONFIG.FASSESSMENT_SITE + 'result-viewer.html?v2Name=' + encodeURIComponent(s.name) + '&report=teacher';
      h += `<a href="${url}" target="_blank" rel="noopener" class="btn btn-ghost !px-3"><span class="material-symbols-outlined text-[18px]">open_in_new</span>강사용 전체 결과지</a>`;
    }
    if (done === 0) h = `<p class="text-on-surface-variant text-[13px] py-2">아직 응답한 진단이 없습니다.</p>` + h;
    box.innerHTML = h;
  }).catch(() => { box.innerHTML = `<p class="text-red-400 text-[13px] py-2">진단 데이터를 불러오지 못했습니다.</p>`; });
};
