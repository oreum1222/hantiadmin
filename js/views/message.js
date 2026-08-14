// ═══ 문자 발송 ═══
Views.message = function (el) {
  const S = Views._msg = Views._msg || { target: 'parent', body: '' };

  const courseSection = c => {
    const roster = App.enrolledStudents(c.id).filter(s => s.status === '재원');
    const key = App.senderKeyOf(c.id);
    return `<div class="card p-4">
      <label class="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" class="msg-course rounded text-secondary focus:ring-secondary" data-cid="${c.id}"/>
        <span class="font-bold text-[14px]">${U.esc(c.name)}</span>
        <span class="chip border border-outline-variant text-on-surface-variant text-[11px]">${key === 'hanti' ? '한티' : '오름'} 발신</span>
        <span class="ml-auto text-[12px] text-on-surface-variant"><b class="msg-cc" data-cid="${c.id}">0</b>/${roster.length}</span>
      </label>
      ${roster.length ? `<details class="mt-2"><summary class="list-none [&::-webkit-details-marker]:hidden cursor-pointer text-[12px] text-secondary select-none">개별 선택 ▾</summary>
        <div class="mt-2 grid sm:grid-cols-2 gap-x-4 gap-y-1 max-h-56 overflow-y-auto pr-1">
          ${roster.map(s => `<label class="flex items-center gap-2 text-[13px] cursor-pointer py-0.5">
            <input type="checkbox" class="msg-stu rounded text-secondary focus:ring-secondary" data-sid="${s.id}" data-cid="${c.id}"/>
            <span class="font-medium">${U.esc(s.name)}</span><span class="text-on-surface-variant text-[11px]">${U.esc(s.school)}</span>
          </label>`).join('')}
        </div></details>` : '<p class="text-on-surface-variant text-[12px] mt-1">재원생 없음</p>'}
    </div>`;
  };

  const active = App.activeCourses(), ended = App.endedCourses();
  el.innerHTML = `
  <div class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight">문자 발송</h1>
    <p class="text-on-surface-variant text-[14px] mt-1">수신자를 고르고 본문을 작성하세요. <b>미리보기(테스트)</b>로 대상·문구를 확인한 뒤 발송합니다.</p>
  </div>

  <div class="grid lg:grid-cols-2 gap-4">
    <!-- 수신자 -->
    <section class="space-y-3">
      <div class="card p-4 flex flex-wrap items-center gap-4">
        <span class="text-[13px] font-bold">받는 사람</span>
        ${[['parent', '학부모'], ['student', '학생 본인'], ['both', '둘 다']].map(([v, l]) =>
          `<label class="flex items-center gap-1.5 text-[13px] cursor-pointer"><input type="radio" name="msg-target" value="${v}" ${S.target === v ? 'checked' : ''} class="text-secondary focus:ring-secondary"/>${l}</label>`).join('')}
        <span class="ml-auto text-[13px]">선택 <b id="msg-total" class="text-secondary">0</b>명</span>
      </div>
      ${active.map(courseSection).join('')}
      ${ended.length ? App.endedBox(ended.length, `<div class="space-y-3">${ended.map(courseSection).join('')}</div>`) : ''}
    </section>

    <!-- 본문 -->
    <section class="space-y-3">
      <div class="card p-4">
        <div class="flex items-center gap-2 mb-2 flex-wrap">
          <span class="text-[13px] font-bold">본문</span>
          <select id="msg-tmpl" class="fld !w-auto !py-1 text-[12px]">
            <option value="">템플릿 불러오기…</option>
            ${(window.MSG_TEMPLATES || []).map(t => `<option value="${t.id}">${U.esc(t.name)}</option>`).join('')}
          </select>
          <button class="btn btn-ghost !py-1 !px-2 text-[12px] msg-var" data-v="#{이름}">이름 삽입</button>
          <button class="btn btn-ghost !py-1 !px-2 text-[12px] msg-var" data-v="#{학교}">학교 삽입</button>
          <span id="msg-bytes" class="ml-auto text-[12px] text-on-surface-variant"></span>
        </div>
        <textarea id="msg-body" class="fld" rows="9" placeholder="예) #{이름} 학생 학부모님, 안녕하세요. 한티 MEXX 김가경T입니다.&#10;…">${U.esc(S.body)}</textarea>
        <p class="text-on-surface-variant text-[11.5px] mt-1.5">변수 <code>#{이름}</code> <code>#{학교}</code> 는 발송 시 학생별로 치환됩니다.</p>
      </div>
      <div class="card p-4">
        <div id="msg-sender" class="text-[13px] text-on-surface-variant mb-3">발신번호: —</div>
        <div class="flex gap-2">
          <button class="btn btn-ghost flex-1" id="msg-preview"><span class="material-symbols-outlined text-[18px]">visibility</span>미리보기(테스트)</button>
          <button class="btn btn-primary flex-1" id="msg-send"><span class="material-symbols-outlined text-[18px]">send</span>실제 발송</button>
        </div>
      </div>
      <div id="msg-result"></div>
    </section>
  </div>`;

  // ── 상태 갱신 ──
  const picked = () => [...document.querySelectorAll('.msg-stu:checked')].map(x => x.dataset.sid);
  function refresh() {
    const sids = picked();
    document.getElementById('msg-total').textContent = sids.length;
    // 반별 카운트
    document.querySelectorAll('.msg-cc').forEach(sp => {
      sp.textContent = document.querySelectorAll(`.msg-stu[data-cid="${sp.dataset.cid}"]:checked`).length;
    });
    document.querySelectorAll('.msg-course').forEach(cb => {
      const all = document.querySelectorAll(`.msg-stu[data-cid="${cb.dataset.cid}"]`).length;
      const on = document.querySelectorAll(`.msg-stu[data-cid="${cb.dataset.cid}"]:checked`).length;
      cb.checked = on > 0 && on === all; cb.indeterminate = on > 0 && on < all;
    });
    // 발신번호 표시
    const keys = new Set(sids.map(id => App.senderKeyOf((App.coursesOf(id)[0] || {}).id)));
    const nums = [...keys].map(k => `${k === 'hanti' ? '한티 MEXX' : '오름'} ${App.senderNumberOf(k)}`);
    document.getElementById('msg-sender').innerHTML = sids.length
      ? '발신번호: ' + nums.join(' / ') + (keys.size > 1 ? ' <span class="text-yellow-500">· 반별 자동 구분</span>' : '')
      : '발신번호: —';
  }
  document.querySelectorAll('.msg-course').forEach(cb => cb.addEventListener('change', () => {
    document.querySelectorAll(`.msg-stu[data-cid="${cb.dataset.cid}"]`).forEach(x => { x.checked = cb.checked; });
    refresh();
  }));
  document.querySelectorAll('.msg-stu').forEach(cb => cb.addEventListener('change', refresh));
  document.querySelectorAll('input[name="msg-target"]').forEach(r => r.addEventListener('change', e => { S.target = e.target.value; }));

  // ── 본문 ──
  const ta = document.getElementById('msg-body');
  function bytes() {
    const b = App.smsBytes(ta.value);
    document.getElementById('msg-bytes').textContent = `${b} byte · ${b <= 90 ? 'SMS' : 'LMS'}`;
  }
  ta.addEventListener('input', () => { S.body = ta.value; bytes(); });
  const tsel = document.getElementById('msg-tmpl');
  if (tsel) tsel.addEventListener('change', () => {
    const t = (window.MSG_TEMPLATES || []).find(x => x.id === tsel.value); tsel.value = '';
    if (!t) return;
    ta.value = t.body; S.body = ta.value; bytes(); ta.focus();
    App.toast(ta.value ? '템플릿을 불러왔습니다. 필요하면 수정하세요.' : '', 'ok');
  });
  document.querySelectorAll('.msg-var').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.v, p = ta.selectionStart;
    ta.value = ta.value.slice(0, p) + v + ta.value.slice(ta.selectionEnd);
    S.body = ta.value; ta.focus(); ta.selectionStart = ta.selectionEnd = p + v.length; bytes();
  }));
  bytes(); refresh();

  // ── 메시지 빌드 ──
  function build() {
    const body = ta.value.trim();
    if (!body) { App.toast('본문을 입력하세요.', 'err'); return null; }
    const sids = picked();
    if (!sids.length) { App.toast('수신자를 선택하세요.', 'err'); return null; }
    const msgs = [], skipped = [];
    sids.forEach(id => {
      const s = App.studentOf(id); if (!s) return;
      const cid = (App.coursesOf(id)[0] || {}).id || '';
      const senderKey = App.senderKeyOf(cid);
      // 백엔드 senderFor_는 courseId가 'hanti-'로 시작하면 한티 9279-9349로 라우팅
      const sendCid = senderKey === 'hanti' ? 'hanti-' + cid : cid;
      const text = body.replace(/#\{이름\}/g, s.name).replace(/#\{학교\}/g, s.school || '');
      const nums = [];
      if (S.target === 'parent' || S.target === 'both') nums.push(['학부모', s.parentPhone]);
      if (S.target === 'student' || S.target === 'both') nums.push(['학생', s.phone]);
      nums.forEach(([who, ph]) => {
        if (ph && ph.replace(/\D/g, '').length >= 9) msgs.push({ to: ph, text, name: s.name + '(' + who + ')', scenario: 'dashboard', courseId: sendCid, senderKey });
        else skipped.push(s.name + ' ' + who);
      });
    });
    return { msgs, skipped };
  }

  function showResult(html) { document.getElementById('msg-result').innerHTML = `<div class="card p-4">${html}</div>`; }

  document.getElementById('msg-preview').addEventListener('click', () => {
    const b = build(); if (!b) return;
    const { msgs, skipped } = b;
    const sample = msgs.slice(0, 8).map(m => `<div class="border-b border-outline-variant py-1.5"><b>${U.esc(m.name)}</b> <span class="text-on-surface-variant text-[12px]">${U.mask ? U.mask(m.to) : m.to.replace(/(\d{3})\D*\d+\D*(\d{4})/, '$1****$2')}</span><div class="text-[12.5px] text-on-surface-variant whitespace-pre-wrap mt-0.5">${U.esc(m.text)}</div></div>`).join('');
    showResult(`<div class="flex items-center gap-2 mb-2"><span class="chip border border-secondary/30 text-secondary bg-secondary-fixed/50">미리보기</span><b>${msgs.length}건</b> 발송 예정 ${skipped.length ? `<span class="text-yellow-500 text-[12px]">· 번호없음 ${skipped.length}건 제외</span>` : ''}</div>${sample}${msgs.length > 8 ? `<p class="text-on-surface-variant text-[12px] mt-2">…외 ${msgs.length - 8}건</p>` : ''}`);
  });

  document.getElementById('msg-send').addEventListener('click', () => {
    const b = build(); if (!b) return;
    const { msgs, skipped } = b;
    const keys = new Set(msgs.map(m => m.senderKey));
    if (!CONFIG.SEND_SENDER_ROUTING && keys.has('hanti')) {
      App.toast('한티(MEXX) 실발송은 발신번호 라우팅 백엔드 반영 후 열립니다. 미리보기는 됩니다.', 'err');
      return;
    }
    const nums = [...keys].map(k => App.senderNumberOf(k)).join(' / ');
    App.modal(`
      <h3 class="font-extrabold text-lg mb-2">문자 발송 확인</h3>
      <p class="text-[14px] mb-4"><b class="text-secondary">${msgs.length}건</b>을 발신번호 <b>${nums}</b>(으)로 실제 발송합니다.${skipped.length ? `<br/><span class="text-yellow-500 text-[13px]">번호 없는 ${skipped.length}건은 제외됩니다.</span>` : ''}<br/><span class="text-on-surface-variant text-[13px]">되돌릴 수 없습니다. 미리보기로 문구를 확인하셨나요?</span></p>
      <div class="flex justify-end gap-2">
        <button class="btn btn-ghost" onclick="App.closeModal()">취소</button>
        <button class="btn btn-primary" id="msg-send-go"><span class="material-symbols-outlined text-[18px]">send</span>${msgs.length}건 발송</button>
      </div>`);
    document.getElementById('msg-send-go').onclick = async () => {
      const btn = document.getElementById('msg-send-go');
      btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>발송 중…';
      try {
        const r = await App.sendSMS(msgs, false);
        App.closeModal();
        if (r.dryRun) showResult(`<div class="text-yellow-600"><b>테스트 모드로 처리됨</b> — 백엔드에 발송키가 설정되지 않아 실제 발송되지 않았습니다. (${r.count}건 형식 확인 완료)</div>`);
        else showResult(`<div class="flex items-center gap-2"><span class="chip border border-secondary/30 text-secondary bg-secondary-fixed/50">발송 완료</span><b>${r.sent || 0}/${r.count || msgs.length}건</b> 성공${(r.count - (r.sent || 0)) ? ` · <span class="text-red-400">실패 ${r.count - (r.sent || 0)}건</span>` : ''}</div>`);
        App.toast('발송 요청을 처리했습니다.', 'ok');
      } catch (e) {
        App.closeModal(); showResult(`<div class="text-red-400">발송 실패: ${U.esc(String(e.message || e))}</div>`);
      }
    };
  });
};
