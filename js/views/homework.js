// ═══ 과제 검사 대시보드 (hwsys 네이티브 통합) ═══
// 원본(oreum1222.github.io/homework)은 그대로 가동. 여기서는 가벼운 소스만 사용:
//   과제 정의 = courses.js(≈10KB) · 등록명단 = roster(54KB) · 독려대상 = pending(28KB). (6MB list 미사용)
Views.homework = function (el) {
  const statCard = (icon, label, value, sub) => `<div class="card p-4">
    <div class="flex items-center gap-2 text-on-surface-variant text-[12px] font-bold mb-2"><span class="material-symbols-outlined text-[18px] text-secondary">${icon}</span>${label}</div>
    <div class="text-2xl font-extrabold tracking-tight">${value}</div>
    ${sub ? `<div class="text-on-surface-variant text-[12px] mt-1">${U.esc(sub)}</div>` : ''}</div>`;

  el.innerHTML = `
  <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight">과제 검사</h1>
      <p class="text-on-surface-variant text-[14px] mt-1">주차별 과제 정의 · 등록 현황 · 미완료(독려 대상)를 강좌별로 정리</p>
    </div>
    <a href="${CONFIG.HOMEWORK_DASHBOARD}" target="_blank" rel="noopener" class="btn btn-ghost !no-underline"><span class="material-symbols-outlined text-[18px]">open_in_new</span>원본 대시보드</a>
  </div>
  <div id="hwdash"><div class="card p-8 text-center text-on-surface-variant text-[13px]">불러오는 중…</div></div>`;

  // hwsysCourseId -> 이 시스템(허브)에서 매핑된 강좌명들
  const hubNames = {};
  Object.entries(CONFIG.HW_COURSE_MAP || {}).forEach(([hubId, hwId]) => {
    const c = App.courseOf(hubId);
    (hubNames[hwId] = hubNames[hwId] || []).push(c ? c.name : hubId);
  });
  const studentByName = {};
  App.db.students.forEach(s => { (studentByName[s.name] = studentByName[s.name] || []).push(s); });

  Promise.all([App.hwAssignments(), App.hwRoster(), App.hwPending(), App.hwCourseList()]).then(([assign, roster, pending, clist]) => {
    const box = document.getElementById('hwdash');
    if (!box) return;
    const nameOf = {}; (clist || []).forEach(c => nameOf[c.id] = c.name);

    // 집계 (허브에 매핑된 hwsys 강좌만)
    const hwIds = [...new Set(Object.values(CONFIG.HW_COURSE_MAP || {}))];
    const rosterCount = {}; roster.forEach(r => { rosterCount[r.courseId] = (rosterCount[r.courseId] || 0) + 1; });
    // 독려대상: courseId -> weekLabel -> [names]
    const pendMap = {};
    pending.forEach(p => {
      if (!hwIds.includes(p.courseId)) return;
      const wl = p.weekLabel || '(주차 미상)';
      ((pendMap[p.courseId] = pendMap[p.courseId] || {})[wl] = (pendMap[p.courseId][wl] || [])).push(p.name);
    });
    const totalReg = hwIds.reduce((s, id) => s + (rosterCount[id] || 0), 0);
    const totalPend = hwIds.reduce((s, id) => s + Object.values(pendMap[id] || {}).reduce((a, arr) => a + arr.length, 0), 0);
    const activeWeeks = hwIds.reduce((s, id) => s + (assign[id] || []).filter(w => w.status === 'active').length, 0);

    const nameChip = nm => {
      const st = (studentByName[nm] || [])[0];
      return st ? `<button class="chip border text-amber-500 border-amber-500/30 bg-amber-500/10 hover:opacity-80" onclick="location.hash='#students/${st.id}'">${U.esc(nm)}</button>`
        : `<span class="chip border text-on-surface-variant border-outline-variant">${U.esc(nm)}</span>`;
    };

    box.innerHTML = `
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      ${statCard('link', '연동 강좌', hwIds.length + '개', '과제 검사 시스템 매핑')}
      ${statCard('groups', '등록 학생', totalReg + '명', '과제 시스템 등록')}
      ${statCard('assignment_late', '독려 대상', totalPend + '명', '미완료(누적 큐)')}
      ${statCard('event_available', '진행 중 주차', activeWeeks + '개', 'active 과제')}
    </div>

    ${hwIds.map(id => {
      const weeks = assign[id] || [];
      const reg = rosterCount[id] || 0;
      const pend = pendMap[id] || {};
      const names = (hubNames[id] || [nameOf[id] || id]);
      const pendTotal = Object.values(pend).reduce((a, arr) => a + arr.length, 0);
      return `
      <section class="card overflow-hidden mb-4">
        <div class="px-5 py-3.5 border-b border-outline-variant flex flex-wrap items-center justify-between gap-2 bg-surface-container-low/40">
          <div class="min-w-0">
            <div class="font-bold text-[15px]">${U.esc(names.join(' · '))}</div>
            <div class="text-on-surface-variant text-[12px] mt-0.5">${U.esc(nameOf[id] || id)} · 등록 ${reg}명</div>
          </div>
          ${pendTotal ? `<span class="chip border text-amber-500 border-amber-500/30 bg-amber-500/10">독려 ${pendTotal}명</span>` : `<span class="chip border text-secondary border-secondary/30 bg-secondary-fixed/50">독려 없음</span>`}
        </div>
        <div class="p-5">
          <div class="text-[12px] font-bold text-on-surface-variant mb-2">주차별 과제</div>
          ${weeks.length ? `<div class="overflow-x-auto"><table class="tbl min-w-[560px]">
            <thead><tr><th class="w-16">주차</th><th>과제</th><th class="w-28">영역</th><th class="w-32">기간</th><th class="w-16">상태</th></tr></thead>
            <tbody>${weeks.map(w => `<tr>
              <td class="text-[13px] font-semibold">${w.month ? U.esc(w.month) + ' ' : ''}${w.w != null ? w.w + '주' : '—'}</td>
              <td class="text-[13px]">${U.esc(w.label.replace(/^\s*\d[\d\-]*\s*주차(에 한 숙제 검사)?\s*[·:\-—]\s*/, ''))}</td>
              <td class="text-[12px] text-on-surface-variant">${U.esc(w.area || '—')}</td>
              <td class="text-[12px] text-on-surface-variant">${U.esc(w.date || '—')}</td>
              <td>${w.status === 'active' ? '<span class="chip border text-secondary border-secondary/30 bg-secondary-fixed/50">진행</span>' : w.status === 'tentative' ? '<span class="chip border text-on-surface-variant border-outline-variant">예정</span>' : '<span class="chip border text-on-surface-variant border-outline-variant">마감</span>'}</td>
            </tr>`).join('')}</tbody></table></div>` : '<p class="text-on-surface-variant text-[13px]">등록된 주차 과제가 없습니다.</p>'}

          ${pendTotal ? `<div class="mt-4">
            <div class="text-[12px] font-bold text-amber-500 mb-2">미완료 · 독려 대상</div>
            ${Object.keys(pend).map(wl => `<div class="mb-2">
              <div class="text-[12px] text-on-surface-variant mb-1">${U.esc(wl)} <span class="opacity-70">· ${pend[wl].length}명</span></div>
              <div class="flex flex-wrap gap-1.5">${pend[wl].map(nameChip).join(' ')}</div>
            </div>`).join('')}
          </div>` : ''}
        </div>
      </section>`;
    }).join('')}

    <div class="card p-4 border-dashed !bg-transparent flex items-center gap-3 text-on-surface-variant text-[13px]">
      <span class="material-symbols-outlined text-[18px]">info</span>
      제출 원점수·정답률 등 상세는 학생 상세의 '복습시험 · 숙제 결과'와 원본 대시보드에서 확인하세요. (여기선 대용량 제출 데이터를 받지 않습니다.)
    </div>`;
  }).catch(() => { const b = document.getElementById('hwdash'); if (b) b.innerHTML = `<div class="card p-8 text-center text-red-400 text-[13px]">과제 데이터를 불러오지 못했습니다.</div>`; });
};
