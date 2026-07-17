// ═══ 조교 확인 (운영진 업무 체크리스트) ═══
// 가경T가 업무를 등록하고 조교·실장이 확인(완료 체크). 담당·마감·완료자 기록.
Views.tasks = function (el) {
  const worker = localStorage.getItem('hanti-admin-worker') || CONFIG.STAFF[1] || '실장';
  const tasks = App.db.tasks || (App.db.tasks = []);

  el.innerHTML = `
  <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight">조교 확인</h1>
      <p class="text-on-surface-variant text-[14px] mt-1">확인할 업무를 체크하면 완료자와 시각이 기록됩니다.</p>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      <div class="flex items-center gap-2 text-[13px] text-on-surface-variant">
        나는
        <select id="tk-worker" class="fld !w-auto">${CONFIG.STAFF.map(s => `<option ${s === worker ? 'selected' : ''}>${s}</option>`).join('')}</select>
      </div>
      <button class="btn btn-primary" onclick="Views._taskForm()"><span class="material-symbols-outlined text-[18px]">add_task</span>업무 추가</button>
    </div>
  </div>

  <div class="card p-4 mb-4 flex flex-wrap gap-3 items-center">
    <select id="tk-assignee" class="fld !w-auto">
      <option value="">전체 담당</option>
      <option>전체(모두)</option>
      ${CONFIG.STAFF.map(s => `<option>${s}</option>`).join('')}
    </select>
    <label class="flex items-center gap-2 text-[13px] text-on-surface-variant"><input id="tk-showdone" type="checkbox" class="rounded text-secondary focus:ring-secondary"/>완료 항목 표시</label>
  </div>

  <div id="tk-list" class="space-y-2.5"></div>`;

  document.getElementById('tk-worker').addEventListener('change', e => localStorage.setItem('hanti-admin-worker', e.target.value));

  function dday(due) {
    if (!due) return '';
    const diff = Math.round((new Date(due + 'T00:00:00') - new Date(U.today() + 'T00:00:00')) / 864e5);
    if (diff < 0) return `<span class="chip border text-red-400 bg-red-400/10 border-red-400/30">지연 ${-diff}일</span>`;
    if (diff === 0) return '<span class="chip border text-yellow-500 bg-yellow-500/10 border-yellow-500/30">오늘 마감</span>';
    return `<span class="chip border border-outline-variant text-on-surface-variant">D-${diff}</span>`;
  }

  function draw() {
    const fa = document.getElementById('tk-assignee').value;
    const showDone = document.getElementById('tk-showdone').checked;
    let list = [...(App.db.tasks || [])];
    if (fa) list = list.filter(t => (t.assignee || '') === fa);
    const pend = list.filter(t => t.status !== '완료').sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
    const done = list.filter(t => t.status === '완료').sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
    const rows = showDone ? [...pend, ...done] : pend;

    document.getElementById('tk-list').innerHTML = rows.length ? rows.map(t => `
      <div class="card p-4 flex items-start gap-3 ${t.status === '완료' ? 'opacity-60' : ''}">
        <input type="checkbox" class="tk-chk mt-1 w-5 h-5 rounded text-secondary focus:ring-secondary cursor-pointer" data-id="${t.id}" ${t.status === '완료' ? 'checked' : ''}/>
        <div class="min-w-0 flex-1 row-click" onclick="Views._taskForm('${t.id}')">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-[15px] ${t.status === '완료' ? 'line-through' : ''}">${U.esc(t.title)}</span>
            ${t.assignee ? `<span class="chip border text-secondary border-secondary/30 bg-secondary-fixed/50">${U.esc(t.assignee)}</span>` : ''}
            ${t.status !== '완료' ? dday(t.due) : ''}
            ${t.status === '완료' ? `<span class="chip border text-secondary border-secondary/25 bg-secondary-fixed/40">✓ ${U.esc(t.doneBy || '')} · ${U.fmtD(t.doneAt)}</span>` : ''}
          </div>
          ${t.detail ? `<p class="text-on-surface-variant text-[13px] mt-1 whitespace-pre-wrap">${U.esc(t.detail)}</p>` : ''}
          <p class="text-on-surface-variant text-[11px] mt-1.5">등록 ${U.esc(t.by || '')}${t.due ? ' · 마감 ' + U.fmtD(t.due) : ''}</p>
        </div>
      </div>`).join('')
    : `<div class="card p-10 text-center text-on-surface-variant text-[14px]">${fa || !showDone ? '표시할 업무가 없습니다. 👍' : '등록된 업무가 없습니다.'}</div>`;

    document.querySelectorAll('.tk-chk').forEach(c => c.addEventListener('change', async () => {
      const t = (App.db.tasks || []).find(x => x.id === c.dataset.id);
      if (!t) return;
      const me = document.getElementById('tk-worker').value;
      const payload = c.checked
        ? { id: t.id, status: '완료', doneBy: me, doneAt: U.today() }
        : { id: t.id, status: '대기', doneBy: '', doneAt: '' };
      const ok = await App.act('upsertTask', payload, c.checked ? `완료 처리했습니다 (${me}).` : '대기로 되돌렸습니다.');
      if (ok) draw(); else { c.checked = !c.checked; }
    }));
  }
  ['tk-assignee', 'tk-showdone'].forEach(id => document.getElementById(id).addEventListener('input', draw));
  draw();
};

// ── 업무 추가/수정 모달 ──
Views._taskForm = function (taskId) {
  const t = taskId ? (App.db.tasks || []).find(x => x.id === taskId)
    : { title: '', detail: '', assignee: '전체(모두)', due: '', by: App.role === 'master' ? '가경T' : (localStorage.getItem('hanti-admin-worker') || '실장') };
  if (!t) return;
  App.modal(`
    <h3 class="font-extrabold text-lg mb-4">${taskId ? '업무 수정' : '업무 추가'}</h3>
    <div class="space-y-3">
      <div><label class="lbl">업무 내용 *</label><input id="tf-title" class="fld" value="${U.esc(t.title)}" placeholder="예: 2회차 복사물 준비 확인"/></div>
      <div><label class="lbl">상세 (선택)</label><textarea id="tf-detail" class="fld" rows="3" placeholder="세부 지시·링크 등">${U.esc(t.detail || '')}</textarea></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="lbl">담당</label><select id="tf-assignee" class="fld">${['전체(모두)', ...CONFIG.STAFF].map(s => `<option ${t.assignee === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div><label class="lbl">마감일 (선택)</label><input id="tf-due" type="date" class="fld" value="${t.due || ''}"/></div>
      </div>
    </div>
    <div class="flex justify-between gap-2 mt-5">
      ${taskId ? '<button class="btn btn-danger" id="tf-del">삭제</button>' : '<span></span>'}
      <div class="flex gap-2">
        <button class="btn btn-ghost" onclick="App.closeModal()">취소</button>
        <button class="btn btn-primary" id="tf-save">저장</button>
      </div>
    </div>`);
  document.getElementById('tf-save').onclick = async () => {
    const v = id => document.getElementById(id).value.trim();
    if (!v('tf-title')) return App.toast('업무 내용을 입력하세요.', 'err');
    const ok = await App.act('upsertTask', { id: taskId || '', title: v('tf-title'), detail: v('tf-detail'), assignee: v('tf-assignee'), due: document.getElementById('tf-due').value, ...(taskId ? {} : { status: '대기', by: t.by }) }, '업무를 저장했습니다.');
    if (ok) { App.closeModal(); App.refresh(); }
  };
  const del = document.getElementById('tf-del');
  if (del) del.onclick = async () => {
    const ok = await App.act('deleteTask', { id: taskId }, '업무를 삭제했습니다.');
    if (ok) { App.closeModal(); App.refresh(); }
  };
};
