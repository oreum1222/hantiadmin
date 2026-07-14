// ═══ 보강 관리 ═══
Views.makeup = function (el) {
  let filter = Views._mkFilter || '미완료'; // '미완료' | 각 상태 | '전체'

  const all = App.db.makeups
    .map(m => ({ m, st: App.studentOf(m.studentId), ss: App.sessionOf(m.sessionId), c: App.courseOf(m.courseId) }))
    .filter(x => x.st)
    .sort((a, b) => (b.m.ts || '').localeCompare(a.m.ts || ''));

  const counts = { '미완료': all.filter(x => x.m.status !== '완료').length, '전체': all.length };
  CONFIG.MAKEUP_FLOW.forEach(s => counts[s] = all.filter(x => x.m.status === s).length);

  el.innerHTML = `
  <div class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight">보강 관리</h1>
    <p class="text-on-surface-variant text-[14px] mt-1">결석 체크 시 자동으로 생성됩니다. 필요 → 신청됨 → 영상전달 → 완료 순서로 진행하세요.</p>
  </div>

  <div class="flex flex-wrap gap-2 mb-4">
    ${['미완료', ...CONFIG.MAKEUP_FLOW, '전체'].map(f =>
      `<button class="btn ${f === filter ? 'btn-primary' : 'btn-ghost'} !py-1.5 !px-3.5 text-[13px] mk-filter" data-f="${f}">${f} <span class="opacity-70">${counts[f]}</span></button>`).join('')}
  </div>

  <div id="mk-list" class="space-y-3"></div>`;

  function rows() {
    let list = all;
    if (filter === '미완료') list = all.filter(x => x.m.status !== '완료');
    else if (filter !== '전체') list = all.filter(x => x.m.status === filter);

    document.getElementById('mk-list').innerHTML = list.length ? list.map(({ m, st, ss, c }) => `
      <div class="card p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-[15px] row-click hover:text-secondary" onclick="location.hash='#students/${st.id}'">${U.esc(st.name)}</span>
              ${U.mkChip(m.status)}
              ${m.method ? `<span class="chip border border-outline-variant text-on-surface-variant">${U.esc(m.method)}</span>` : ''}
            </div>
            <div class="text-on-surface-variant text-[13px] mt-1">
              ${U.esc(c?.name || '')} · ${ss ? ss.no + '회차 (' + U.fmtD(ss.date) + ')' : '회차 정보 없음'}
              ${m.memo ? ' · ' + U.esc(m.memo) : ''}
              ${m.doneAt ? ` · <span class="text-secondary">완료 ${U.fmtD(m.doneAt)}</span>` : ''}
            </div>
          </div>
          <div class="flex gap-1.5 flex-wrap">
            ${CONFIG.MAKEUP_FLOW.map(s => {
              const on = m.status === s;
              const isNext = CONFIG.MAKEUP_FLOW.indexOf(s) === CONFIG.MAKEUP_FLOW.indexOf(m.status) + 1;
              return `<button class="btn ${on ? 'btn-primary' : isNext ? 'btn-ghost !border-secondary/40 !text-secondary' : 'btn-ghost'} !py-1.5 !px-3 text-[12px] mk-step" data-id="${m.id}" data-s="${s}" ${on ? 'disabled' : ''}>${s}</button>`;
            }).join('')}
            <button class="btn btn-ghost !py-1.5 !px-2.5 text-[12px] mk-edit" data-id="${m.id}" title="방식·메모"><span class="material-symbols-outlined text-[16px]">edit_note</span></button>
          </div>
        </div>
      </div>`).join('')
    : `<div class="card p-10 text-center text-on-surface-variant text-[14px]">${filter === '미완료' ? '미처리 보강이 없습니다. 👍' : '해당 상태의 보강이 없습니다.'}</div>`;

    // 상태 진행
    document.querySelectorAll('.mk-step').forEach(b => b.addEventListener('click', async () => {
      const ok = await App.act('setMakeup', { id: b.dataset.id, status: b.dataset.s, by: App.role === 'master' ? '가경T' : '스태프' }, `'${b.dataset.s}' 상태로 변경했습니다.`);
      if (ok) App.refresh();
    }));
    // 방식·메모 수정
    document.querySelectorAll('.mk-edit').forEach(b => b.addEventListener('click', () => editMk(b.dataset.id)));
  }

  document.querySelectorAll('.mk-filter').forEach(b => b.addEventListener('click', () => {
    filter = b.dataset.f; Views._mkFilter = filter;
    document.querySelectorAll('.mk-filter').forEach(x => { x.className = x.className.replace('btn-primary', 'btn-ghost'); });
    b.className = b.className.replace('btn-ghost', 'btn-primary');
    rows();
  }));
  rows();

  function editMk(id) {
    const m = App.db.makeups.find(x => x.id === id);
    if (!m) return;
    const st = App.studentOf(m.studentId);
    App.modal(`
      <h3 class="font-extrabold text-lg mb-1">보강 상세</h3>
      <p class="text-on-surface-variant text-[13px] mb-4">${U.esc(st?.name || '')} · ${U.esc(App.courseOf(m.courseId)?.name || '')}</p>
      <div class="space-y-3">
        <div><label class="lbl">보강 방식</label>
          <select id="mk-method" class="fld">
            <option value="" ${!m.method ? 'selected' : ''}>미정</option>
            <option ${m.method === '영상' ? 'selected' : ''}>영상</option>
            <option ${m.method === '대면' ? 'selected' : ''}>대면</option>
          </select></div>
        <div><label class="lbl">메모</label><textarea id="mk-memo" class="fld" rows="2">${U.esc(m.memo)}</textarea></div>
      </div>
      <div class="flex justify-between gap-2 mt-5">
        <button class="btn btn-danger" id="mk-del">삭제</button>
        <div class="flex gap-2">
          <button class="btn btn-ghost" onclick="App.closeModal()">취소</button>
          <button class="btn btn-primary" id="mk-save">저장</button>
        </div>
      </div>`);
    document.getElementById('mk-save').onclick = async () => {
      const ok = await App.act('setMakeup', { id, method: document.getElementById('mk-method').value, memo: document.getElementById('mk-memo').value.trim() }, '보강 정보를 저장했습니다.');
      if (ok) { App.closeModal(); App.refresh(); }
    };
    document.getElementById('mk-del').onclick = async () => {
      const ok = await App.act('deleteMakeup', { id }, '보강 항목을 삭제했습니다.');
      if (ok) { App.closeModal(); App.refresh(); }
    };
  }
};
