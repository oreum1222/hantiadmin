// ═══ 신규 문의 (홈 위젯 + 모달) ═══
// 재원생 아닌 외부 문의(카톡 채널·전화 등)를 신규 → 상담중 → 등록/미등록으로 관리.
window.Leads = {
  statusChip(s) {
    const map = { '신규': 'text-red-400 bg-red-400/10 border-red-400/30', '상담중': 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30', '등록': 'text-secondary bg-secondary-fixed/60 border-secondary/25', '미등록': 'text-on-surface-variant border-outline-variant' };
    return `<span class="chip border ${map[s] || ''}">${U.esc(s)}</span>`;
  },

  // 홈 위젯 (미등록 신규/상담중 위주)
  homeCard() {
    const all = App.db.leads || [];
    const pending = all.filter(l => l.status === '신규' || l.status === '상담중')
      .sort((a, b) => (b.date + (b.ts || '')).localeCompare(a.date + (a.ts || '')));
    return `
    <section class="card p-5 lg:col-span-2">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold text-[16px] flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">contact_phone</span>신규 문의 <span class="text-on-surface-variant font-normal text-[13px]">미처리 ${pending.length}건</span></h2>
        <button class="btn btn-ghost !py-1.5 !px-3 text-[12px]" onclick="Leads.form()"><span class="material-symbols-outlined text-[16px]">add</span>문의 추가</button>
      </div>
      ${pending.length ? pending.slice(0, 6).map(l => `
        <div class="flex items-center justify-between gap-3 py-2.5 border-b border-outline-variant last:border-0 row-click" onclick="Leads.form('${l.id}')">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-[14px]">${U.esc(l.name || '(이름 미상)')}</span>
              ${l.grade ? `<span class="text-on-surface-variant text-[12px]">${U.esc(l.grade)}</span>` : ''}
              <span class="chip border border-outline-variant text-on-surface-variant">${U.esc(l.via || '')}</span>
              ${Leads.statusChip(l.status)}
            </div>
            ${l.summary ? `<div class="text-on-surface-variant text-[12px] truncate mt-0.5">${U.esc(l.summary)}</div>` : ''}
          </div>
          <span class="text-on-surface-variant text-[12px] shrink-0">${U.fmtD(l.date)}</span>
        </div>`).join('') + (pending.length > 6 ? `<p class="text-on-surface-variant text-[12px] mt-2 text-right">외 ${pending.length - 6}건</p>` : '')
      : `<p class="text-on-surface-variant text-[13px] py-4">미처리 신규 문의가 없습니다. 👍</p>`}
      ${all.filter(l => l.status === '등록' || l.status === '미등록').length ? `<div class="mt-3 pt-2.5 border-t border-outline-variant flex gap-3 text-[12px] text-on-surface-variant">
        <span>등록 <b class="text-secondary">${all.filter(l => l.status === '등록').length}</b></span>
        <span>미등록 <b>${all.filter(l => l.status === '미등록').length}</b></span>
        <button class="ml-auto text-secondary font-bold hover:underline" onclick="Leads.listModal()">전체 보기</button>
      </div>` : ''}
    </section>`;
  },

  // 전체 목록 모달
  listModal() {
    const all = [...(App.db.leads || [])].sort((a, b) => (b.date + (b.ts || '')).localeCompare(a.date + (a.ts || '')));
    App.modal(`
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-extrabold text-lg">신규 문의 전체 (${all.length})</h3>
        <button class="btn btn-primary !py-1.5 !px-3 text-[12px]" onclick="Leads.form()"><span class="material-symbols-outlined text-[16px]">add</span>추가</button>
      </div>
      <div class="max-h-[60vh] overflow-y-auto space-y-2">
        ${all.length ? all.map(l => `
          <div class="bg-surface-container-low border border-outline-variant rounded-lg p-3 row-click" onclick="Leads.form('${l.id}')">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-[14px]">${U.esc(l.name || '(이름 미상)')}</span>
              ${l.grade ? `<span class="text-on-surface-variant text-[12px]">${U.esc(l.grade)}</span>` : ''}
              <span class="chip border border-outline-variant text-on-surface-variant">${U.esc(l.via || '')}</span>
              ${Leads.statusChip(l.status)}
              <span class="text-on-surface-variant text-[12px] ml-auto">${U.fmtD(l.date)}</span>
            </div>
            ${l.summary ? `<div class="text-on-surface-variant text-[13px] mt-1 whitespace-pre-wrap">${U.esc(l.summary)}</div>` : ''}
          </div>`).join('') : '<p class="text-on-surface-variant text-[13px] py-4">문의가 없습니다.</p>'}
      </div>
      <div class="flex justify-end mt-4"><button class="btn btn-ghost" onclick="App.closeModal()">닫기</button></div>`);
  },

  // 추가/수정
  form(leadId) {
    const l = leadId ? (App.db.leads || []).find(x => x.id === leadId)
      : { name: '', phone: '', grade: '', via: CONFIG.LEAD_VIA[0], summary: '', status: '신규', date: U.today(), memo: '', by: App.role === 'master' ? '가경T' : (localStorage.getItem('hanti-admin-worker') || '실장') };
    if (!l) return;
    App.modal(`
      <h3 class="font-extrabold text-lg mb-4">${leadId ? '신규 문의 수정' : '신규 문의 추가'}</h3>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="lbl">이름/닉네임</label><input id="lf-name" class="fld" value="${U.esc(l.name)}" placeholder="카톡 닉네임 등"/></div>
        <div><label class="lbl">학년(추정)</label><input id="lf-grade" class="fld" value="${U.esc(l.grade)}" placeholder="예: 고2"/></div>
        <div><label class="lbl">연락처</label><input id="lf-phone" class="fld" value="${U.esc(l.phone)}" placeholder="010-"/></div>
        <div><label class="lbl">유입 경로</label><select id="lf-via" class="fld">${CONFIG.LEAD_VIA.map(v => `<option ${l.via === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div><label class="lbl">문의일</label><input id="lf-date" type="date" class="fld" value="${l.date}"/></div>
        <div><label class="lbl">상태</label><select id="lf-status" class="fld">${CONFIG.LEAD_STATUS.map(s => `<option ${l.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div class="col-span-2"><label class="lbl">문의 내용 · 응대 요약</label><textarea id="lf-summary" class="fld" rows="4" placeholder="문의 내용과 안내한 내용을 요약">${U.esc(l.summary)}</textarea></div>
      </div>
      <div class="flex justify-between gap-2 mt-5">
        ${leadId ? '<button class="btn btn-danger" id="lf-del">삭제</button>' : '<span></span>'}
        <div class="flex gap-2">
          <button class="btn btn-ghost" onclick="App.closeModal()">취소</button>
          <button class="btn btn-primary" id="lf-save">저장</button>
        </div>
      </div>`);
    document.getElementById('lf-save').onclick = async () => {
      const v = id => document.getElementById(id).value.trim();
      if (!v('lf-name') && !v('lf-summary')) return App.toast('이름 또는 문의 내용을 입력하세요.', 'err');
      const ok = await App.act('upsertLead', { id: leadId || '', name: v('lf-name'), phone: v('lf-phone'), grade: v('lf-grade'), via: v('lf-via'), date: document.getElementById('lf-date').value || U.today(), status: v('lf-status'), summary: v('lf-summary'), ...(leadId ? {} : { by: l.by }) }, '신규 문의를 저장했습니다.');
      if (ok) { App.closeModal(); App.refresh(); }
    };
    const del = document.getElementById('lf-del');
    if (del) del.onclick = async () => {
      const ok = await App.act('deleteLead', { id: leadId }, '신규 문의를 삭제했습니다.');
      if (ok) { App.closeModal(); App.refresh(); }
    };
  },
};
