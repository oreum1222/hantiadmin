// ═══ 학습 성향 진단 대시보드 (fassessment 네이티브 통합) ═══
// 원본 대시보드(oreum-fassessment)는 그대로 가동. 여기서는 같은 데이터를 허브 학생명단과 묶어 표시.
Views.diagnosis = function (el) {
  const AX = [['자료 장악', '자료장악'], ['사고 적용', '사고적용'], ['조건 변별', '조건변별'], ['오답 메타', '오답메타인지'], ['시간 운영', '시간운영'], ['정서 회복', '정서회복']];
  const statCard = (icon, label, value, sub) => `<div class="card p-4">
    <div class="flex items-center gap-2 text-on-surface-variant text-[12px] font-bold mb-2"><span class="material-symbols-outlined text-[18px] text-secondary">${icon}</span>${label}</div>
    <div class="text-2xl font-extrabold tracking-tight">${value}</div>
    ${sub ? `<div class="text-on-surface-variant text-[12px] mt-1">${U.esc(sub)}</div>` : ''}</div>`;
  const bar = (label, c, max) => `<div class="py-1.5">
    <div class="flex justify-between text-[13px] mb-1"><span class="font-semibold">${U.esc(label)}</span><span class="text-on-surface-variant">${c}명</span></div>
    <div class="h-2 rounded-full bg-surface-container-low overflow-hidden"><div class="h-full rounded-full bg-secondary" style="width:${max ? c / max * 100 : 0}%"></div></div>
  </div>`;

  el.innerHTML = `
  <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight">학습 성향 진단</h1>
      <p class="text-on-surface-variant text-[14px] mt-1">재원생 첫 진단 · 여름방학 · 학부모 관찰 · 대면 상담 통합</p>
    </div>
    <a href="${CONFIG.FASSESSMENT_SITE}dashboard.html" target="_blank" rel="noopener" class="btn btn-ghost !no-underline"><span class="material-symbols-outlined text-[18px]">open_in_new</span>원본 대시보드</a>
  </div>
  <div id="fadash"><div class="card p-8 text-center text-on-surface-variant text-[13px]">불러오는 중…</div></div>`;

  Views._faData().then(data => {
    const box = document.getElementById('fadash');
    if (!box) return;
    const studs = App.db.students.filter(s => s.status === '재원')
      .map(s => ({ s, r: Views._faRecords(s.name, data) }));
    const total = studs.length;
    const nFirst = studs.filter(x => x.r.first).length;
    const nSummer = studs.filter(x => x.r.summer).length;
    const nParent = studs.filter(x => x.r.parent).length;
    const daemyeon = studs.filter(x => !!x.s.consult).length;

    // 페르소나 분포 (재원생 첫)
    const persona = {};
    studs.forEach(x => { const p = x.r.first && x.r.first['페르소나']; if (p) persona[p] = (persona[p] || 0) + 1; });
    const pOrder = Object.keys(persona).sort((a, b) => persona[b] - persona[a]);
    const pMax = Math.max(1, ...Object.values(persona));

    // 6축 평균 (재원생 첫 응답자)
    const withFirst = studs.filter(x => x.r.first);
    const axAvg = AX.map(([lab, key]) => {
      const vals = withFirst.map(x => x.r.first[key]).filter(v => typeof v === 'number');
      return { lab, key, avg: vals.length ? Math.round(vals.reduce((s, n) => s + n, 0) / vals.length) : null };
    });

    // 주의 학생: 재원생 첫에서 40 미만 축이 2개 이상
    const lowOf = x => AX.map(([, k]) => x.r.first[k]).filter(v => typeof v === 'number' && v < 40).length;
    const alert = withFirst.filter(x => lowOf(x) >= 2)
      .map(x => ({ x, low: lowOf(x), min: Math.min(...AX.map(([, k]) => x.r.first[k]).filter(v => typeof v === 'number')) }))
      .sort((a, b) => b.low - a.low || a.min - b.min);
    const noResp = studs.filter(x => !x.r.first && !x.r.summer).map(x => x.s)
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

    const rate = total ? Math.round(nFirst / total * 100) : 0;
    box.innerHTML = `
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      ${statCard('how_to_reg', '재원생 첫 진단', rate + '%', `${nFirst} / 재원 ${total}명`)}
      ${statCard('family_restroom', '학부모 관찰', nParent + '명', '가정 관찰 응답')}
      ${statCard('wb_sunny', '여름방학 진단', nSummer + '명', '여름 학습 점검')}
      ${statCard('warning', '주의 관찰 대상', alert.length + '명', '저조 축 2개 이상')}
    </div>

    <div class="grid lg:grid-cols-2 gap-4 mb-4">
      <section class="card p-5">
        <h2 class="font-bold text-[16px] mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">workspaces</span>페르소나 분포</h2>
        ${pOrder.length ? pOrder.map(p => bar(p, persona[p], pMax)).join('') : '<p class="text-on-surface-variant text-[13px] py-2">응답 데이터가 없습니다.</p>'}
      </section>
      <section class="card p-5">
        <h2 class="font-bold text-[16px] mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">radar</span>6축 평균 <span class="text-on-surface-variant font-normal text-[13px]">(첫 진단 ${withFirst.length}명)</span></h2>
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
          ${axAvg.map(a => `<div class="text-center bg-surface-container-low rounded-md py-2.5"><div class="text-[10.5px] text-on-surface-variant mb-0.5">${a.lab}</div><div class="font-extrabold text-[16px] ${a.avg == null ? 'text-on-surface-variant' : a.avg < 40 ? 'text-red-400' : a.avg >= 75 ? 'text-secondary' : ''}">${a.avg == null ? '—' : a.avg}</div></div>`).join('')}
        </div>
        <p class="text-on-surface-variant text-[12px] mt-3">0~100 · 40 미만(빨강)은 코호트 취약 지점.</p>
      </section>
    </div>

    <section class="card p-5 mb-4">
      <h2 class="font-bold text-[16px] mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">priority_high</span>주의 관찰 대상 <span class="text-on-surface-variant font-normal text-[13px]">${alert.length}명</span></h2>
      ${alert.length ? `<div class="flex flex-wrap gap-1.5">${alert.map(a => `<button class="chip border text-red-400 border-red-400/30 bg-red-400/10 hover:opacity-80" onclick="location.hash='#students/${a.x.s.id}'">${U.esc(a.x.s.name)} · 저조 ${a.low}축</button>`).join(' ')}</div>` : '<p class="text-on-surface-variant text-[13px] py-1">저조 축 2개 이상인 학생이 없습니다. 👍</p>'}
    </section>

    <section class="card overflow-hidden mb-4">
      <div class="px-5 py-3.5 border-b border-outline-variant flex items-center justify-between">
        <h2 class="font-bold text-[16px] flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">table_rows</span>응답자 (${withFirst.length}명)</h2>
      </div>
      <div class="overflow-x-auto"><table class="tbl min-w-[720px]">
        <thead><tr><th>이름</th><th>학교·학년</th><th>페르소나</th>${AX.map(a => `<th class="text-center">${a[0].replace(' ', '<br>')}</th>`).join('')}<th class="w-24">완료</th></tr></thead>
        <tbody>${withFirst.sort((a, b) => a.s.name.localeCompare(b.s.name, 'ko')).map(({ s, r }) => `
          <tr class="row-click" onclick="location.hash='#students/${s.id}'">
            <td class="font-bold">${U.esc(s.name)}</td>
            <td class="text-[13px] text-on-surface-variant">${U.esc(s.school)} ${U.esc(s.grade)}</td>
            <td>${r.first['페르소나'] ? `<span class="chip border text-secondary border-secondary/30 bg-secondary-fixed/50">${U.esc(r.first['페르소나'])}</span>` : '—'}</td>
            ${AX.map(([, k]) => { const v = r.first[k]; const n = typeof v === 'number' ? v : null; return `<td class="text-center text-[13px] font-semibold ${n != null && n < 40 ? 'text-red-400' : n != null && n >= 75 ? 'text-secondary' : ''}">${n == null ? '—' : n}</td>`; }).join('')}
            <td class="text-[12px] text-on-surface-variant">${[r.summer ? '여름' : '', r.parent ? '학부모' : '', s.consult ? '대면' : ''].filter(Boolean).join('·') || '첫진단'}</td>
          </tr>`).join('')}</tbody>
      </table></div>
    </section>

    ${noResp.length ? `<section class="card p-5">
      <h2 class="font-bold text-[15px] mb-2 flex items-center gap-2 text-on-surface-variant"><span class="material-symbols-outlined text-[19px]">person_off</span>미응답 ${noResp.length}명</h2>
      <div class="flex flex-wrap gap-1.5">${noResp.map(s => `<button class="chip border text-on-surface-variant border-outline-variant hover:opacity-80" onclick="location.hash='#students/${s.id}'">${U.esc(s.name)}</button>`).join(' ')}</div>
    </section>` : ''}`;
  }).catch(() => { const b = document.getElementById('fadash'); if (b) b.innerHTML = `<div class="card p-8 text-center text-red-400 text-[13px]">진단 데이터를 불러오지 못했습니다.</div>`; });
};
