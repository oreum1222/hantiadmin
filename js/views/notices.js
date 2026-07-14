// ═══ 공지 게시판 ═══
// 언제 · 무엇을 · 어느 강좌에 · 어떤 채널로 공지했는지 날짜별 타임라인으로 표시.
Views.notices = function (el) {
  const CHANNELS = ['문자', '카톡', '구두', '기타'];
  const chChip = ch => {
    const map = { '문자': 'text-blue-400 bg-blue-400/10 border-blue-400/30', '카톡': 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30', '구두': 'text-purple-400 bg-purple-400/10 border-purple-400/30', '기타': 'text-on-surface-variant border-outline-variant' };
    return `<span class="chip border ${map[ch] || map['기타']}">${U.esc(ch)}</span>`;
  };
  const targetChips = ids => {
    if (!ids || ids === 'all') return '<span class="chip border text-secondary border-secondary/30 bg-secondary-fixed/50">전체</span>';
    return ids.split(',').map(id => {
      const c = App.courseOf(id.trim());
      return c ? `<span class="chip border border-outline-variant text-on-surface-variant">${U.esc(c.grade)} ${U.esc(c.kind)}</span>` : '';
    }).join(' ');
  };

  // ── 카드 본문 탭: 내용 / 수신 확인 ──
  const dlvWarnCount = n => (n.delivery && n.delivery.courses || []).reduce((a, c) => a + ((c.warn || []).length), 0);
  const bodyHTML = n => n.body
    ? `<p class="text-on-surface-variant text-[13px] leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto pr-1">${U.esc(n.body)}</p>`
    : '<p class="text-on-surface-variant text-[13px]">내용 없음</p>';
  const dlvHTML = n => {
    const d = n.delivery;
    if (!d) return '';
    return `
    <div class="grid md:grid-cols-2 gap-3">
      ${(d.courses || []).map(c => `
      <div class="bg-surface-container-low/60 border border-outline-variant rounded-xl p-3">
        <div class="flex items-center justify-between gap-2 mb-2">
          <span class="font-bold text-[13px]">${U.esc(c.course)}</span>
          <span class="text-[12px] font-bold ${c.confirmed >= c.total ? 'text-secondary' : 'text-yellow-500'}">${c.confirmed}/${c.total} 수신</span>
        </div>
        <div class="text-[11px] font-bold text-on-surface-variant mb-1">학생</div>
        <div class="flex flex-wrap gap-1">
          ${(c.received || []).map(r => `<span class="chip border text-secondary border-secondary/25 bg-secondary-fixed/40" title="${U.esc(r.via || '')}">✓ ${U.esc(r.name)}</span>`).join('')}
        </div>
        ${c.parents ? `
        <div class="text-[11px] font-bold text-on-surface-variant mt-2.5 mb-1">${U.esc(c.parents.label || '학부모')}</div>
        <div class="flex flex-wrap gap-1">
          ${(c.parents.received || []).map(r => `<span class="chip border text-blue-400 border-blue-400/25 bg-blue-400/10" title="${U.esc(r.via || '')}">✓ ${U.esc(r.name)}</span>`).join('')}
          ${(c.parents.missing || []).map(nm => `<span class="chip border text-on-surface-variant border-outline-variant" title="${U.esc(c.parents.missingNote || '발송 기록 없음')}">— ${U.esc(nm)}</span>`).join('')}
        </div>` : ''}
        ${(c.warn || []).length ? `<div class="mt-2.5 space-y-1.5 border-t border-outline-variant pt-2">${c.warn.map(w => `
          <div class="text-[12px] leading-snug"><span class="chip border text-orange-400 bg-orange-400/10 border-orange-400/30 mr-1">⚠ ${U.esc(w.name)}</span><span class="text-on-surface-variant">${U.esc(w.note)}</span></div>`).join('')}</div>` : ''}
      </div>`).join('')}
    </div>
    ${(d.cancelled || []).length ? `<div class="mt-3 pt-2.5 border-t border-outline-variant text-[12px] text-on-surface-variant leading-relaxed"><b class="text-on-surface">수강 취소 추정 ${d.cancelled.length}건</b> · ${U.esc(d.cancelledNote || '')}<br/>${d.cancelled.map(p => `<span class="inline-block mr-2.5 mt-1 font-mono">${U.esc(p)}</span>`).join('')}</div>` : ''}
    <div class="text-[11px] text-on-surface-variant mt-2">${U.esc(d.checkedAt || '')} · ${U.esc(d.basis || '')}</div>`;
  };
  const TAB_ON = 'nt-tab px-2.5 py-1 text-[12px] font-bold bg-secondary-fixed text-secondary';
  const TAB_OFF = 'nt-tab px-2.5 py-1 text-[12px] font-bold text-on-surface-variant hover:text-on-surface';

  el.innerHTML = `
  <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight">공지 게시판</h1>
      <p class="text-on-surface-variant text-[14px] mt-1">학생·학부모에게 나간 공지를 기록하고 시간순으로 확인합니다.</p>
    </div>
    <button class="btn btn-primary" onclick="Views._noticeForm()"><span class="material-symbols-outlined text-[18px]">campaign</span>공지 작성</button>
  </div>

  <div class="card p-4 mb-6 flex flex-wrap gap-3 items-center">
    <div class="relative flex-1 min-w-[200px]">
      <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
      <input id="nt-search" class="fld !pl-10" placeholder="제목·내용으로 검색"/>
    </div>
    <select id="nt-course" class="fld !w-auto">
      <option value="">전체 대상</option>
      <option value="all">전체 공지만</option>
      ${App.db.courses.map(c => `<option value="${c.id}">${U.esc(c.name)}</option>`).join('')}
    </select>
    <select id="nt-channel" class="fld !w-auto">
      <option value="">모든 채널</option>
      ${CHANNELS.map(c => `<option>${c}</option>`).join('')}
    </select>
  </div>

  <div id="nt-timeline"></div>`;

  function draw() {
    const q = document.getElementById('nt-search').value.trim();
    const fc = document.getElementById('nt-course').value;
    const fch = document.getElementById('nt-channel').value;
    let list = [...(App.db.notices || [])].sort((a, b) => (b.date + (b.ts || '')).localeCompare(a.date + (a.ts || '')));
    if (q) list = list.filter(n => (n.title + ' ' + n.body).includes(q));
    if (fc === 'all') list = list.filter(n => !n.courseIds || n.courseIds === 'all');
    else if (fc) list = list.filter(n => n.courseIds === 'all' || (n.courseIds || '').split(',').map(s => s.trim()).includes(fc));
    if (fch) list = list.filter(n => n.channel === fch);

    if (!list.length) {
      document.getElementById('nt-timeline').innerHTML =
        `<div class="card p-10 text-center text-on-surface-variant text-[14px]">${q || fc || fch ? '조건에 맞는 공지가 없습니다.' : '아직 공지가 없습니다. 첫 공지를 작성해 보세요.'}</div>`;
      return;
    }

    // 날짜별 그룹 (최신순)
    const groups = [];
    list.forEach(n => {
      const g = groups.find(x => x.date === n.date);
      if (g) g.items.push(n); else groups.push({ date: n.date, items: [n] });
    });

    const today = U.today();
    document.getElementById('nt-timeline').innerHTML = `
    <div class="relative pl-6 md:pl-8">
      <div class="absolute left-[7px] md:left-[9px] top-2 bottom-2 w-px bg-outline-variant"></div>
      ${groups.map(g => `
      <div class="relative mb-7">
        <div class="absolute -left-6 md:-left-8 top-1 w-[15px] h-[15px] md:w-[19px] md:h-[19px] rounded-full border-2 ${g.date === today ? 'bg-secondary border-secondary' : 'bg-surface-container-high border-outline'} "></div>
        <div class="flex items-baseline gap-2 mb-2.5">
          <span class="font-extrabold text-[15px] ${g.date === today ? 'text-secondary' : ''}">${U.fmtD(g.date)}</span>
          ${g.date === today ? '<span class="chip border text-secondary border-secondary/30 bg-secondary-fixed/50">오늘</span>' : ''}
          <span class="text-on-surface-variant text-[12px]">${g.items.length}건</span>
        </div>
        <div class="space-y-3">
          ${g.items.map(n => `
          <div class="card p-4" data-nid="${n.id}">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-bold text-[15px]">${U.esc(n.title)}</span>
              ${chChip(n.channel)}
              ${targetChips(n.courseIds)}
              ${n.by === '학원(MEXX)'
                ? '<span class="chip border text-orange-400 bg-orange-400/10 border-orange-400/30">학원 발송</span>'
                : `<span class="text-on-surface-variant text-[12px]">${U.esc(n.by || '')}</span>`}
              <div class="ml-auto flex items-center gap-1.5">
                ${n.delivery ? `
                <div class="flex rounded-lg border border-outline-variant overflow-hidden">
                  <button class="${TAB_ON}" data-tab="body">내용</button>
                  <button class="${TAB_OFF}" data-tab="dlv">수신 확인${dlvWarnCount(n) ? ` <span class="text-orange-400">⚠${dlvWarnCount(n)}</span>` : ''}</button>
                </div>` : ''}
                <button class="nt-edit w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0" data-nid="${n.id}" title="수정"><span class="material-symbols-outlined text-[18px]">edit</span></button>
              </div>
            </div>
            <div class="nt-pane mt-2.5">${bodyHTML(n)}</div>
          </div>`).join('')}
        </div>
      </div>`).join('')}
    </div>`;

    // 카드 이벤트: 수정 버튼 · 내용/수신확인 탭 전환
    document.querySelectorAll('#nt-timeline .nt-edit').forEach(b =>
      b.addEventListener('click', () => Views._noticeForm(b.dataset.nid)));
    document.querySelectorAll('#nt-timeline .nt-tab').forEach(b =>
      b.addEventListener('click', () => {
        const card = b.closest('[data-nid]');
        const n = (App.db.notices || []).find(x => x.id === card.dataset.nid);
        if (!n) return;
        card.querySelectorAll('.nt-tab').forEach(x => { x.className = (x === b ? TAB_ON : TAB_OFF); });
        card.querySelector('.nt-pane').innerHTML = b.dataset.tab === 'dlv' ? dlvHTML(n) : bodyHTML(n);
      }));
  }
  ['nt-search', 'nt-course', 'nt-channel'].forEach(id => document.getElementById(id).addEventListener('input', draw));
  draw();
};

// ── 공지 작성/수정 모달 ──
Views._noticeForm = function (noticeId) {
  const CHANNELS = ['문자', '카톡', '구두', '기타'];
  const n = noticeId ? (App.db.notices || []).find(x => x.id === noticeId)
    : { date: U.today(), title: '', body: '', channel: '문자', courseIds: 'all', by: App.role === 'master' ? '가경T' : '실장' };
  if (!n) return;
  const SENDERS = CONFIG.NOTICE_SENDERS || CONFIG.STAFF;
  const selected = n.courseIds === 'all' || !n.courseIds ? [] : n.courseIds.split(',').map(s => s.trim());
  App.modal(`
    <h3 class="font-extrabold text-lg mb-4">${noticeId ? '공지 수정' : '공지 작성'}</h3>
    <div class="space-y-3">
      <div><label class="lbl">제목 *</label><input id="nf-title" class="fld" value="${U.esc(n.title)}" placeholder="예: 일요일 단과 개강 안내"/></div>
      <div class="grid grid-cols-3 gap-3">
        <div><label class="lbl">공지일</label><input id="nf-date" type="date" class="fld" value="${n.date}"/></div>
        <div><label class="lbl">채널</label><select id="nf-channel" class="fld">${CHANNELS.map(c => `<option ${n.channel === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div><label class="lbl">발송 주체</label><select id="nf-by" class="fld">${SENDERS.map(s => `<option ${n.by === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      </div>
      <div>
        <label class="lbl">대상 강좌</label>
        <label class="flex items-center gap-2 text-[13px] py-1"><input id="nf-all" type="checkbox" class="rounded text-secondary focus:ring-secondary" ${!selected.length ? 'checked' : ''}/>전체 공지</label>
        <div id="nf-courses" class="grid grid-cols-2 gap-1 ${!selected.length ? 'opacity-40 pointer-events-none' : ''}">
          ${App.db.courses.map(c => `<label class="flex items-center gap-2 text-[13px] py-1"><input type="checkbox" class="nf-course rounded text-secondary focus:ring-secondary" value="${c.id}" ${selected.includes(c.id) ? 'checked' : ''}/>${U.esc(c.name)}</label>`).join('')}
        </div>
      </div>
      <div><label class="lbl">내용</label><textarea id="nf-body" class="fld" rows="6" placeholder="공지 내용 (문자·카톡 원문을 붙여넣어도 됩니다)">${U.esc(n.body)}</textarea></div>
    </div>
    <div class="flex justify-between gap-2 mt-5">
      ${noticeId ? '<button class="btn btn-danger" id="nf-del">삭제</button>' : '<span></span>'}
      <div class="flex gap-2">
        <button class="btn btn-ghost" onclick="App.closeModal()">취소</button>
        <button class="btn btn-primary" id="nf-save">저장</button>
      </div>
    </div>`);

  document.getElementById('nf-all').addEventListener('change', e => {
    document.getElementById('nf-courses').className =
      'grid grid-cols-2 gap-1' + (e.target.checked ? ' opacity-40 pointer-events-none' : '');
    if (e.target.checked) document.querySelectorAll('.nf-course').forEach(x => x.checked = false);
  });
  document.querySelectorAll('.nf-course').forEach(x => x.addEventListener('change', () => {
    if ([...document.querySelectorAll('.nf-course')].some(c => c.checked)) document.getElementById('nf-all').checked = false;
  }));

  document.getElementById('nf-save').onclick = async () => {
    const v = id => document.getElementById(id).value.trim();
    if (!v('nf-title')) return App.toast('제목을 입력하세요.', 'err');
    const picked = [...document.querySelectorAll('.nf-course:checked')].map(x => x.value);
    const courseIds = document.getElementById('nf-all').checked || !picked.length ? 'all' : picked.join(',');
    const ok = await App.act('upsertNotice', { id: noticeId || '', date: v('nf-date') || U.today(), title: v('nf-title'), body: v('nf-body'), channel: v('nf-channel'), courseIds, by: v('nf-by'), ...(noticeId ? { ts: n.ts } : {}) }, '공지를 저장했습니다.');
    if (ok) { App.closeModal(); App.refresh(); }
  };
  const del = document.getElementById('nf-del');
  if (del) del.onclick = async () => {
    const ok = await App.act('deleteNotice', { id: noticeId }, '공지를 삭제했습니다.');
    if (ok) { App.closeModal(); App.refresh(); }
  };
};
