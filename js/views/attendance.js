// ═══ 출결 체크 ═══
// 해시: #attendance 또는 #attendance/<courseId>/<sessionId>
Views.attendance = function (el) {
  const parts = location.hash.slice(1).split('/');
  const courseId = parts[1] || App.db.courses[0]?.id || '';
  const course = App.courseOf(courseId);
  const sessions = course ? App.sessionsOf(courseId).filter(s => !s.isVideo) : [];
  // 기본 선택: 지정된 회차 → 없으면 오늘 이전 가장 최근 회차
  let sessionId = parts[2] || '';
  if (!sessionId && sessions.length) {
    const past = sessions.filter(s => s.date && s.date <= U.today());
    sessionId = (past[past.length - 1] || sessions[0]).id;
  }
  const session = App.sessionOf(sessionId);
  const roster = course ? App.enrolledStudents(courseId) : [];
  const existing = {};
  if (session) App.attOf(session.id).forEach(a => existing[a.studentId] = a);

  // 편집 버퍼 (저장 전 로컬 상태)
  const buf = {};
  roster.forEach(st => { buf[st.id] = { status: existing[st.id]?.status || '', memo: existing[st.id]?.memo || '' }; });

  el.innerHTML = `
  <div class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight">출결 체크</h1>
    <p class="text-on-surface-variant text-[14px] mt-1">강좌와 회차를 선택하고 상태를 탭하세요. 결석은 보강이 자동 생성됩니다.</p>
  </div>

  <div class="card p-4 mb-4 flex flex-wrap gap-3 items-center">
    <select id="at-course" class="fld !w-auto min-w-[220px]">
      ${App.db.courses.map(c => `<option value="${c.id}" ${c.id === courseId ? 'selected' : ''}>${U.esc(c.name)}</option>`).join('')}
    </select>
    <select id="at-session" class="fld !w-auto" ${sessions.length ? '' : 'disabled'}>
      ${sessions.map(s => `<option value="${s.id}" ${s.id === sessionId ? 'selected' : ''}>${s.no}회차 · ${U.fmtD(s.date)}</option>`).join('')}
    </select>
    <div class="flex-1"></div>
    <div class="flex items-center gap-2 text-[13px] text-on-surface-variant">
      기록자
      <select id="at-by" class="fld !w-auto">${CONFIG.STAFF.map(s => `<option>${s}</option>`).join('')}</select>
    </div>
  </div>

  ${!course ? `<div class="card p-8 text-center text-on-surface-variant">강좌가 없습니다. 강의 메뉴에서 먼저 추가하세요.</div>`
  : !session ? `<div class="card p-8 text-center text-on-surface-variant">이 강좌에는 출결 체크할 회차가 없습니다.</div>`
  : !roster.length ? `<div class="card p-8 text-center text-on-surface-variant">수강생이 없습니다. <button class="text-secondary font-bold hover:underline" onclick="location.hash='#courses/${courseId}'">강좌 상세</button>에서 등록하세요.</div>`
  : `
  <div class="card overflow-hidden">
    <div class="px-5 py-3.5 border-b border-outline-variant flex flex-wrap items-center justify-between gap-2 bg-surface-container-low/50">
      <div class="text-[14px]"><b>${session.no}회차</b> <span class="text-on-surface-variant">${U.fmtD(session.date)}${session.topic ? ' · ' + U.esc(session.topic) : ''}</span></div>
      <div class="flex gap-2">
        <button class="btn btn-ghost !py-1.5 !px-3 text-[12px]" id="at-all-present">전원 출석</button>
        <button class="btn btn-ghost !py-1.5 !px-3 text-[12px]" id="at-clear">모두 지우기</button>
      </div>
    </div>
    <div id="at-rows">
      ${roster.map(st => `
      <div class="px-5 py-3.5 border-b border-outline-variant last:border-0 grid md:grid-cols-[minmax(130px,1fr)_minmax(280px,2fr)_minmax(140px,1fr)] gap-3 items-center" data-sid="${st.id}">
        <div>
          <div class="font-bold text-[14px]">${U.esc(st.name)}</div>
          <div class="text-on-surface-variant text-[12px]">${U.esc(st.school)} ${U.esc(st.grade)}</div>
        </div>
        <div class="flex gap-1.5">
          ${CONFIG.ATT_STATUSES.map(s => `<button class="att-btn" data-status="${s}">${s}</button>`).join('')}
        </div>
        <input class="fld !py-1.5 text-[13px] at-memo" placeholder="메모" value="${U.esc(buf[st.id].memo)}"/>
      </div>`).join('')}
    </div>
    <div class="px-5 py-4 border-t border-outline-variant flex items-center justify-between gap-3 bg-surface-container-low/50">
      <div id="at-summary" class="text-[13px] text-on-surface-variant"></div>
      <button class="btn btn-primary" id="at-save"><span class="material-symbols-outlined text-[18px]">save</span>저장</button>
    </div>
  </div>`}`;

  // ── 셀렉터 변경 → 해시 갱신으로 재렌더 ──
  document.getElementById('at-course').addEventListener('change', e => { location.hash = '#attendance/' + e.target.value; });
  const sessSel = document.getElementById('at-session');
  if (sessSel) sessSel.addEventListener('change', e => { location.hash = '#attendance/' + courseId + '/' + e.target.value; });
  if (!session || !roster.length) return;

  // ── 상태 버튼 로직 ──
  function paintRow(row) {
    const sid = row.dataset.sid;
    row.querySelectorAll('.att-btn').forEach(b => {
      const on = buf[sid].status === b.dataset.status;
      b.className = 'att-btn' + (on ? ' on-' + b.dataset.status : '');
    });
  }
  function paintSummary() {
    const vals = Object.values(buf);
    const cnt = s => vals.filter(v => v.status === s).length;
    const parts = CONFIG.ATT_STATUSES.map(s => cnt(s) ? `${s} ${cnt(s)}` : '').filter(Boolean);
    const unchecked = vals.filter(v => !v.status).length;
    document.getElementById('at-summary').textContent =
      (parts.length ? parts.join(' · ') : '체크된 학생 없음') + (unchecked ? ` · 미체크 ${unchecked}` : '');
  }
  document.querySelectorAll('#at-rows [data-sid]').forEach(row => {
    const sid = row.dataset.sid;
    row.querySelectorAll('.att-btn').forEach(b => b.addEventListener('click', () => {
      buf[sid].status = (buf[sid].status === b.dataset.status) ? '' : b.dataset.status; // 재탭 = 해제
      paintRow(row); paintSummary();
    }));
    row.querySelector('.at-memo').addEventListener('input', e => { buf[sid].memo = e.target.value; });
    paintRow(row);
  });
  paintSummary();

  document.getElementById('at-all-present').addEventListener('click', () => {
    Object.keys(buf).forEach(sid => buf[sid].status = '출석');
    document.querySelectorAll('#at-rows [data-sid]').forEach(paintRow); paintSummary();
  });
  document.getElementById('at-clear').addEventListener('click', () => {
    Object.keys(buf).forEach(sid => buf[sid].status = '');
    document.querySelectorAll('#at-rows [data-sid]').forEach(paintRow); paintSummary();
  });

  // ── 저장 ──
  document.getElementById('at-save').addEventListener('click', async () => {
    const btn = document.getElementById('at-save');
    btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>저장 중…';
    const records = Object.entries(buf).map(([studentId, v]) => ({ studentId, status: v.status, memo: v.memo.trim() }));
    const ok = await App.act('setAttendance', { sessionId: session.id, courseId, by: document.getElementById('at-by').value, records }, '출결을 저장했습니다.');
    btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">save</span>저장';
    if (ok) {
      const nAbs = records.filter(r => r.status === '결석').length;
      if (nAbs) App.toast(`결석 ${nAbs}명의 보강 항목이 준비되었습니다.`, 'ok');
      App.refresh();
    }
  });
};
