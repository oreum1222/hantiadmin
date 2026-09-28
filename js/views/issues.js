// ═══ 카톡 이슈 정리 (강좌별 · 공통) ═══
// 조교 단톡에서 나온 문제·대기 업무·운영 규칙을 강좌별로 모아 둔다.
// 데이터는 숨김 태스크 `sys-issues-<key>`.detail(JSON {items:[...]})에만 저장 — 학생 실명이 있으므로 공개 저장소에 넣지 않는다.
// item = {id, date:'MM-DD', title, detail, owner, status:'open'|'done'|'rule', note, by, at, src}
window.Issues = (function () {
  const TABS = [['open', '미해결', 'priority_high'], ['rule', '운영 규칙', 'info'], ['done', '해결됨', 'task_alt']];
  const tabOf = {};                       // 강좌별 현재 탭
  const recId = key => 'sys-issues-' + key;
  const me = () => localStorage.getItem('hanti-admin-worker') || (App.role === 'master' ? '가경T' : '조교');

  function load(key) {
    const rec = (App.db.tasks || []).find(t => t.id === recId(key));
    if (rec && rec.detail) { try { return (JSON.parse(rec.detail) || {}).items || []; } catch (_) {} }
    return [];
  }
  function save(key, items) {
    return App.act('upsertTask', { id: recId(key), title: '[시스템] 카톡 이슈 ' + key, status: '완료', assignee: '', detail: JSON.stringify({ items }) });
  }
  const openCount = key => load(key).filter(x => x.status === 'open').length;

  function sorted(items, tab) {
    const list = items.filter(x => x.status === tab);
    return tab === 'done'
      ? list.sort((a, b) => String(b.at || b.date).localeCompare(String(a.at || a.date)))
      : list.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  function row(key, x) {
    const done = x.status === 'done', rule = x.status === 'rule';
    const box = rule
      ? `<span class="material-symbols-outlined text-[20px] text-blue-400 mt-0.5 shrink-0">info</span>`
      : `<input type="checkbox" class="iss-chk mt-1 w-5 h-5 rounded text-secondary focus:ring-secondary cursor-pointer shrink-0" data-key="${key}" data-id="${x.id}" ${done ? 'checked' : ''}/>`;
    return `
    <div class="flex items-start gap-3 py-3 border-b border-outline-variant last:border-0">
      ${box}
      <div class="min-w-0 flex-1 ${done ? 'opacity-60' : ''}">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="chip border border-outline-variant text-on-surface-variant">${U.esc(x.date || '')}</span>
          <span class="font-semibold text-[14px] ${done ? 'line-through' : ''}">${U.esc(x.title)}</span>
          ${x.owner ? `<span class="text-on-surface-variant text-[12px]">담당 ${U.esc(x.owner)}</span>` : ''}
          ${x.src ? `<span class="text-on-surface-variant/60 text-[11px]">· ${U.esc(x.src)}</span>` : ''}
        </div>
        ${x.detail ? `<div class="text-on-surface-variant text-[13px] mt-1 leading-relaxed">${U.esc(x.detail)}</div>` : ''}
        ${x.note ? `<div class="text-secondary text-[12.5px] mt-1">↳ ${U.esc(x.note)}</div>` : ''}
        ${done && x.by ? `<div class="text-on-surface-variant text-[11px] mt-1">✓ ${U.esc(x.by)} ${U.esc(x.at || '')}</div>` : ''}
      </div>
      <button class="text-on-surface-variant hover:text-on-surface shrink-0" title="수정" onclick="Issues.form('${key}','${x.id}')"><span class="material-symbols-outlined text-[18px]">edit</span></button>
    </div>`;
  }

  // 자리만 만들어 두고 draw로 채운다
  function slot(key, title, sub) {
    return `<section class="card p-5 mb-6" id="iss-${key}" data-title="${U.esc(title)}" data-sub="${U.esc(sub || '')}"></section>`;
  }

  function draw(key) {
    const el = document.getElementById('iss-' + key); if (!el) return;
    const items = load(key);
    const cnt = t => items.filter(x => x.status === t).length;
    const tab = tabOf[key] || (cnt('open') ? 'open' : 'rule');
    const list = sorted(items, tab);
    el.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 class="font-bold text-[16px] flex items-center gap-2">
          <span class="material-symbols-outlined text-[20px] text-secondary">forum</span>${el.dataset.title}
          ${cnt('open') ? `<span class="chip border text-amber-500 border-amber-500/30 bg-amber-500/10">미해결 ${cnt('open')}</span>` : ''}
        </h2>
        <button class="btn btn-ghost !py-1.5 !px-3 text-[12px]" onclick="Issues.form('${key}')"><span class="material-symbols-outlined text-[16px]">add</span>이슈 추가</button>
      </div>
      ${el.dataset.sub ? `<p class="text-on-surface-variant text-[12px] mb-3">${el.dataset.sub}</p>` : ''}
      <div class="flex gap-1.5 mb-1 flex-wrap">
        ${TABS.map(([t, label, ic]) => `<button class="iss-tab btn !py-1.5 !px-3 text-[12.5px] ${t === tab ? 'btn-primary' : 'btn-ghost'}" data-key="${key}" data-tab="${t}"><span class="material-symbols-outlined text-[16px]">${ic}</span>${label} ${cnt(t)}</button>`).join('')}
      </div>
      <div>${list.length ? list.map(x => row(key, x)).join('') : `<p class="text-on-surface-variant text-[13px] py-4 text-center">항목이 없습니다.</p>`}</div>`;
    el.querySelectorAll('.iss-tab').forEach(b => b.addEventListener('click', () => { tabOf[key] = b.dataset.tab; draw(key); }));
    el.querySelectorAll('.iss-chk').forEach(c => c.addEventListener('change', async () => {
      const all = load(key); const x = all.find(i => i.id === c.dataset.id); if (!x) return;
      if (c.checked) { x.status = 'done'; x.by = me(); x.at = U.today().slice(5); }
      else { x.status = 'open'; x.by = ''; x.at = ''; }
      c.disabled = true;
      const ok = await save(key, all);
      if (ok) draw(key); else { c.checked = !c.checked; c.disabled = false; }
    }));
  }

  // 추가·수정 모달
  function form(key, id) {
    const all = load(key);
    const x = all.find(i => i.id === id) || { id: 'i' + Date.now().toString(36), date: U.today().slice(5), title: '', detail: '', owner: '', status: 'open', note: '' };
    App.modal(`
      <h3 class="font-extrabold text-lg mb-4">${id ? '이슈 수정' : '이슈 추가'}</h3>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="lbl">날짜 (MM-DD)</label><input id="is-date" class="fld" value="${U.esc(x.date)}"/></div>
        <div><label class="lbl">상태</label><select id="is-status" class="fld">
          ${TABS.map(([t, l]) => `<option value="${t}" ${x.status === t ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="col-span-2"><label class="lbl">제목</label><input id="is-title" class="fld" value="${U.esc(x.title)}"/></div>
        <div class="col-span-2"><label class="lbl">내용</label><textarea id="is-detail" class="fld" rows="4">${U.esc(x.detail)}</textarea></div>
        <div><label class="lbl">담당</label><input id="is-owner" class="fld" value="${U.esc(x.owner)}"/></div>
        <div><label class="lbl">처리 메모</label><input id="is-note" class="fld" value="${U.esc(x.note || '')}"/></div>
      </div>
      <div class="flex gap-2 justify-end mt-5">
        ${id ? `<button id="is-del" class="btn btn-danger mr-auto">삭제</button>` : ''}
        <button class="btn btn-ghost" onclick="App.closeModal()">취소</button>
        <button id="is-save" class="btn btn-primary">저장</button>
      </div>`);
    document.getElementById('is-save').addEventListener('click', async () => {
      const v = n => document.getElementById(n).value.trim();
      if (!v('is-title')) { App.toast('제목을 입력하세요.', 'err'); return; }
      const st = v('is-status');
      const obj = Object.assign({}, x, { date: v('is-date'), title: v('is-title'), detail: v('is-detail'), owner: v('is-owner'), note: v('is-note'), status: st });
      if (st === 'done' && x.status !== 'done') { obj.by = me(); obj.at = U.today().slice(5); }
      const list = all.filter(i => i.id !== x.id); list.push(obj);
      if (await save(key, list)) { App.closeModal(); tabOf[key] = st; draw(key); }
    });
    if (id) document.getElementById('is-del').addEventListener('click', async () => {
      if (!confirm('이 이슈를 삭제할까요?')) return;
      if (await save(key, all.filter(i => i.id !== x.id))) { App.closeModal(); draw(key); }
    });
  }

  return { slot, draw, form, openCount, load };
})();
