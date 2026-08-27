// ═══ 입시 조사 대시보드 (고3 수능 정규반) ═══
Views.admissions = function (el) {
  const ADM = window.ADMISSIONS || {};
  const resp = Object.keys(ADM).map(id => ({ id, st: App.studentOf(id), a: ADM[id] })).filter(x => x.st);
  const rosterIds = new Set([...App.enrolledStudents('g3f'), ...App.enrolledStudents('g3s')].map(s => s.id));
  const total = rosterIds.size || resp.length;
  const nonResp = [...rosterIds].filter(id => !ADM[id]).map(id => App.studentOf(id)).filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  const rate = total ? Math.round(resp.length / total * 100) : 0;

  // ── 집계 ──
  const count = (f) => resp.reduce((m, x) => { const k = f(x.a); if (k != null && k !== '') m[k] = (m[k] || 0) + 1; return m; }, {});
  const subj = count(a => a.subject);
  const gradeC = count(a => (String(a.grade).match(/\d/) || [null])[0]);
  const susiC = {}; resp.forEach(x => (x.a.susi || []).forEach(t => { susiC[t] = (susiC[t] || 0) + 1; }));
  const weights = resp.map(x => parseInt(x.a.weight, 10)).filter(n => !isNaN(n));
  const avgW = weights.length ? (weights.reduce((s, n) => s + n, 0) / weights.length).toFixed(1) : '—';
  const wHist = {}; for (let i = 1; i <= 10; i++) wHist[i] = 0; weights.forEach(n => { if (wHist[n] != null) wHist[n]++; });
  const won = k => resp.reduce((s, x) => s + (parseInt(x.a[k], 10) || 0), 0);
  const wonN = k => resp.filter(x => parseInt(x.a[k], 10) > 0).length;
  const paid = resp.filter(x => x.a.paid === '네');
  const intro = resp.filter(x => x.a.intro === '네');
  const noSchool = resp.filter(x => x.a.schoolConsult === '아니요');
  const changing = resp.filter(x => x.a.change && x.a.change !== '그대로');

  const bar = (label, c, max, sub) => `
    <div class="py-1.5">
      <div class="flex justify-between text-[13px] mb-1"><span class="font-semibold">${U.esc(label)}${sub ? ` <span class="text-on-surface-variant font-normal">${U.esc(sub)}</span>` : ''}</span><span class="text-on-surface-variant">${c}명</span></div>
      <div class="h-2 rounded-full bg-surface-container-low overflow-hidden"><div class="h-full rounded-full bg-secondary" style="width:${max ? c / max * 100 : 0}%"></div></div>
    </div>`;
  const statCard = (icon, label, value, sub) => `<div class="card p-4">
    <div class="flex items-center gap-2 text-on-surface-variant text-[12px] font-bold mb-2"><span class="material-symbols-outlined text-[18px] text-secondary">${icon}</span>${label}</div>
    <div class="text-2xl font-extrabold tracking-tight">${value}</div>
    ${sub ? `<div class="text-on-surface-variant text-[12px] mt-1">${U.esc(sub)}</div>` : ''}</div>`;
  const nameChips = list => list.length
    ? list.map(x => `<button class="chip border text-secondary border-secondary/30 bg-secondary-fixed/50 hover:opacity-80" onclick="location.hash='#students/${x.id || x.st.id}'">${U.esc((x.st || x).name)}</button>`).join(' ')
    : '<span class="text-on-surface-variant text-[13px]">해당 없음</span>';

  const gMax = Math.max(1, ...Object.values(gradeC));
  const sMax = Math.max(1, ...Object.values(susiC));
  const wMax = Math.max(1, ...Object.values(wHist));

  el.innerHTML = `
  <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight">입시 조사</h1>
      <p class="text-on-surface-variant text-[14px] mt-1">고3 수능 정규반 (금·토) · 2026년 8월 조사 · 응답 ${resp.length} / 정규반 ${total}명</p>
    </div>
    <button class="btn btn-ghost" onclick="App.navigate('students')"><span class="material-symbols-outlined text-[18px]">groups</span>학생 관리</button>
  </div>

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
    ${statCard('how_to_reg', '응답률', rate + '%', `${resp.length} / ${total}명`)}
    ${statCard('menu_book', '선택 과목', `언매 ${subj['언매'] || 0} · 화작 ${subj['화작'] || 0}`, changing.length ? `변경 고려 ${changing.length}명` : '변경 계획 없음')}
    ${statCard('balance', '평균 정시 비중', avgW + ' /10', '10에 가까울수록 정시 중심')}
    ${statCard('support_agent', '컨설팅 희망', `${paid.length + intro.length}명`, `유료 ${paid.length} · 소개 ${intro.length}`)}
  </div>

  <div class="grid lg:grid-cols-2 gap-4 mb-4">
    <section class="card p-5">
      <h2 class="font-bold text-[16px] mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">school</span>9평 목표 등급 분포</h2>
      ${['1', '2', '3', '4'].map(g => bar(g + '등급', gradeC[g] || 0, gMax)).join('')}
      <p class="text-on-surface-variant text-[12px] mt-2">복수 응답(2·3등급 등)은 상위 등급으로 집계.</p>
    </section>

    <section class="card p-5">
      <h2 class="font-bold text-[16px] mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">how_to_vote</span>수시 전형 (복수 응답)</h2>
      ${['논술 전형', '학종 전형', '교과 전형', '수시 지원 안 함'].map(t => {
    const key = Object.keys(susiC).find(k => k.includes(t.replace(' 전형', '').replace('수시 지원 안 함', '수시')) || k === t);
    const c = t === '수시 지원 안 함' ? (susiC['수시 지원 안 함'] || 0) : (susiC[t] || susiC[t.replace(' 전형', '')] || 0);
    return bar(t, c, sMax);
  }).join('')}
      <div class="mt-3 pt-3 border-t border-outline-variant text-[13px] text-on-surface-variant">
        원서 계획 합계 — 논술 <b class="text-on-surface">${won('non')}장</b>(${wonN('non')}명) · 학종 <b class="text-on-surface">${won('hak')}장</b>(${wonN('hak')}명) · 교과 <b class="text-on-surface">${won('gyo')}장</b>(${wonN('gyo')}명)
      </div>
    </section>

    <section class="card p-5">
      <h2 class="font-bold text-[16px] mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">balance</span>정시 비중 분포 <span class="text-on-surface-variant font-normal text-[13px]">(평균 ${avgW})</span></h2>
      <div class="flex items-end gap-1 h-28">
        ${Object.keys(wHist).map(k => `<div class="flex-1 flex flex-col items-center justify-end gap-1">
          <div class="text-[10px] text-on-surface-variant">${wHist[k] || ''}</div>
          <div class="w-full rounded-t bg-secondary" style="height:${wHist[k] / wMax * 100}%;min-height:${wHist[k] ? 4 : 0}px"></div>
          <div class="text-[10px] text-on-surface-variant">${k}</div>
        </div>`).join('')}
      </div>
      <p class="text-on-surface-variant text-[12px] mt-2 text-center">수시 중심 ← 1 ‥‥ 10 → 정시 중심</p>
    </section>

    <section class="card p-5">
      <h2 class="font-bold text-[16px] mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">support_agent</span>컨설팅 · 학교 상담 (후속 대상)</h2>
      <div class="space-y-3 text-[13px]">
        <div><div class="font-semibold mb-1.5">유료 컨설팅 관심 <span class="text-on-surface-variant font-normal">${paid.length}명</span></div><div class="flex flex-wrap gap-1.5">${nameChips(paid)}</div></div>
        <div><div class="font-semibold mb-1.5">학원 컨설턴트 소개 희망 <span class="text-on-surface-variant font-normal">${intro.length}명</span></div><div class="flex flex-wrap gap-1.5">${nameChips(intro)}</div></div>
        <div><div class="font-semibold mb-1.5">학교 수시 상담 미진행 <span class="text-on-surface-variant font-normal">${noSchool.length}명</span></div><div class="flex flex-wrap gap-1.5">${nameChips(noSchool)}</div></div>
      </div>
    </section>
  </div>

  <!-- 응답자 전체 표 -->
  <section class="card overflow-hidden">
    <div class="px-5 py-3.5 border-b border-outline-variant flex flex-wrap items-center justify-between gap-2">
      <h2 class="font-bold text-[16px] flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">table_rows</span>응답자 전체</h2>
      <div class="flex gap-1" id="adm-filter">
        ${['전체', '금요', '토요'].map((f, i) => `<button class="btn btn-ghost !py-1.5 !px-3 text-[12px] adm-f ${i === 0 ? 'on-adm' : ''}" data-f="${f}">${f}</button>`).join('')}
      </div>
    </div>
    <div class="overflow-x-auto"><table class="tbl min-w-[860px]">
      <thead><tr>
        <th>이름</th><th class="w-16">반</th><th class="w-14">과목</th><th class="w-16">9평</th>
        <th>수시 전형</th><th>목표 대학 (최고 → 안정)</th><th class="w-16">정시</th><th class="w-24">컨설팅</th>
      </tr></thead>
      <tbody id="adm-rows"></tbody>
    </table></div>
  </section>

  ${nonResp.length ? `
  <section class="card p-5 mt-4">
    <h2 class="font-bold text-[15px] mb-2 flex items-center gap-2 text-on-surface-variant"><span class="material-symbols-outlined text-[19px]">person_off</span>미응답 ${nonResp.length}명</h2>
    <div class="flex flex-wrap gap-1.5">${nonResp.map(s => `<button class="chip border text-on-surface-variant border-outline-variant hover:opacity-80" onclick="location.hash='#students/${s.id}'">${U.esc(s.name)}</button>`).join(' ')}</div>
  </section>` : ''}`;

  // ── 표 렌더 + 반 필터 ──
  Views._admFilter = Views._admFilter || '전체';
  function drawRows() {
    let list = resp.slice().sort((a, b) => a.st.name.localeCompare(b.st.name, 'ko'));
    if (Views._admFilter === '금요') list = list.filter(x => x.a.course === 'F');
    if (Views._admFilter === '토요') list = list.filter(x => x.a.course === 'S');
    document.getElementById('adm-rows').innerHTML = list.map(({ id, st, a }) => {
      const w = parseInt(a.weight, 10);
      const cons = [a.paid === '네' ? '유료' : '', a.intro === '네' ? '소개' : ''].filter(Boolean).join('·') || '—';
      return `<tr class="row-click" onclick="location.hash='#students/${id}'">
        <td class="font-bold">${U.esc(st.name)}</td>
        <td class="text-[13px]">${a.course === 'F' ? '금요' : '토요'}</td>
        <td class="text-[13px]">${U.esc(a.subject)}</td>
        <td class="text-[13px]">${U.esc(a.grade)}등급</td>
        <td class="text-[13px]"><div class="flex flex-wrap gap-1">${Views._admChip(a.susi)}</div></td>
        <td class="text-[13px] text-on-surface-variant"><b class="text-on-surface">${U.esc(a.top || '—')}</b> → ${U.esc(a.safe || '—')}</td>
        <td class="text-[13px]">${isNaN(w) ? '—' : w + '/10'}</td>
        <td class="text-[13px] ${cons === '—' ? 'text-on-surface-variant' : 'text-secondary font-semibold'}">${cons}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="8" class="text-center text-on-surface-variant py-6">해당 반 응답자가 없습니다.</td></tr>`;
  }
  document.querySelectorAll('.adm-f').forEach(b => b.addEventListener('click', () => {
    Views._admFilter = b.dataset.f;
    document.querySelectorAll('.adm-f').forEach(x => x.classList.toggle('on-adm', x === b));
    drawRows();
  }));
  drawRows();
};
