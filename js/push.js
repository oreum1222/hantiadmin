// ═══ 웹 푸시 구독 관리 ═══
// 각 기기(원장/조교 폰·PC)에서 "알림 받기"를 켜면 구독 정보가 서버(sys-push 숨김 레코드)에 저장된다.
// 실제 발송은 PC의 push_send.py(pywebpush + VAPID 비밀키)가 이 목록을 읽어 수행한다.
// GAS는 Web Push 암호화(ES256/ECDH)를 못 하므로 발송은 반드시 PC에서 한다.
window.Push = (function () {
  const SUB_ID = 'sys-push';           // 구독 목록 저장 레코드
  const LS_ON = 'mexx-push-on';        // 이 기기 구독 여부(빠른 UI용)

  function supported() { return ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window); }

  function b64ToU8(b64) {
    const pad = '='.repeat((4 - b64.length % 4) % 4);
    const s = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(s); const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  function whoAmI() {
    const el = document.getElementById('tk-worker');
    if (el && el.value) return el.value;
    return App.role === 'master' ? '원장' : '조교';
  }

  // sys-push.detail = JSON 배열 [{endpoint, keys:{p256dh,auth}, by, ua, at}]
  function loadSubs() {
    const rec = (App.db.tasks || []).find(t => t.id === SUB_ID);
    if (rec && rec.detail) { try { return JSON.parse(rec.detail) || []; } catch (_) {} }
    return [];
  }
  async function saveSubs(list) {
    return App.act('upsertTask', { id: SUB_ID, title: '[시스템] 푸시 구독', status: '완료', assignee: '', detail: JSON.stringify(list) });
  }
  async function mergeSub(sub, by) {
    const j = sub.toJSON();
    const list = loadSubs().filter(s => s.endpoint !== j.endpoint); // 같은 기기 중복 제거
    list.push({ endpoint: j.endpoint, keys: j.keys, by: by || whoAmI(), ua: navigator.userAgent.slice(0, 120), at: new Date().toISOString() });
    return saveSubs(list);
  }
  async function dropSub(endpoint) {
    const list = loadSubs().filter(s => s.endpoint !== endpoint);
    return saveSubs(list);
  }

  async function isSubscribed() {
    if (!supported()) return false;
    try { const reg = await navigator.serviceWorker.ready; const s = await reg.pushManager.getSubscription(); return !!s; }
    catch (_) { return false; }
  }

  async function subscribe() {
    if (!supported()) { App.toast('이 브라우저는 알림을 지원하지 않습니다.', 'err'); return false; }
    if (!CONFIG.VAPID_PUBLIC_KEY) { App.toast('알림 키가 설정되지 않았습니다.', 'err'); return false; }
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { App.toast('알림 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요.', 'err'); return false; }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(CONFIG.VAPID_PUBLIC_KEY) });
      const ok = await mergeSub(sub);
      if (ok) { try { localStorage.setItem(LS_ON, '1'); } catch (_) {} App.toast('이 기기에서 알림을 받습니다.', 'ok'); }
      return ok;
    } catch (e) { App.toast('알림 설정 실패: ' + e.message, 'err'); return false; }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await dropSub(sub.endpoint); await sub.unsubscribe(); }
      try { localStorage.removeItem(LS_ON); } catch (_) {}
      App.toast('이 기기 알림을 껐습니다.', 'ok');
      return true;
    } catch (e) { App.toast('해제 실패: ' + e.message, 'err'); return false; }
  }

  // ── UI 카드 ──
  function cardHTML() {
    return `<div id="push-card" class="card p-4 mb-6"></div>`;
  }
  async function drawCard() {
    const el = document.getElementById('push-card'); if (!el) return;
    const on = supported() && (await isSubscribed());
    const denied = supported() && Notification.permission === 'denied';
    const cnt = loadSubs().length;
    if (!supported()) {
      el.innerHTML = `<div class="flex items-center gap-2 text-on-surface-variant text-[13px]">
        <span class="material-symbols-outlined text-[20px]">notifications_off</span>
        이 브라우저는 푸시 알림을 지원하지 않습니다. (아이폰은 홈 화면에 추가한 앱에서만 가능)</div>`;
      return;
    }
    el.innerHTML = `
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="material-symbols-outlined text-[22px] ${on ? 'text-secondary' : 'text-on-surface-variant'}">${on ? 'notifications_active' : 'notifications'}</span>
          <div class="min-w-0">
            <div class="font-bold text-[14.5px]">푸시 알림 ${on ? '<span class="text-secondary">켜짐</span>' : '<span class="text-on-surface-variant">꺼짐</span>'}</div>
            <div class="text-on-surface-variant text-[12px]">${denied ? '브라우저에서 알림이 차단됨 — 설정에서 허용 필요' : (on ? '이 기기로 루틴·이벤트 알림을 받습니다' : '이 기기에서 알림 받기')} · 등록 기기 ${cnt}</div>
          </div>
        </div>
        <button id="push-toggle" class="shrink-0 ${on ? 'border border-outline-variant text-on-surface-variant hover:bg-surface-container' : 'bg-secondary text-on-secondary hover:opacity-90'} font-bold rounded-xl px-4 py-2 text-[13.5px] transition">
          ${on ? '끄기' : '알림 켜기'}
        </button>
      </div>`;
    const btn = document.getElementById('push-toggle');
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = '처리 중…';
      if (on) await unsubscribe(); else await subscribe();
      await drawCard();
    });
  }

  // ═══ 알림 루틴 (시간·요일 지정 반복 알림) ═══
  // sys-pushroutine.detail = JSON 배열 [{id,label,body,time:"HH:MM",days:[0..6],enabled,lastFired}]
  // 0=일 1=월 2=화 3=수 4=목 5=금 6=토. 실제 발송은 PC의 push_routines.py(10분마다)가 수행.
  const RT_ID = 'sys-pushroutine';
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  function loadRoutines() {
    const rec = (App.db.tasks || []).find(t => t.id === RT_ID);
    if (rec && rec.detail) { try { return JSON.parse(rec.detail) || []; } catch (_) {} }
    return [];
  }
  async function saveRoutines(list) {
    return App.act('upsertTask', { id: RT_ID, title: '[시스템] 알림 루틴', status: '완료', assignee: '', detail: JSON.stringify(list) });
  }
  const rid = () => 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  function routineForm(existing) {
    const r = existing || { id: rid(), label: '', body: '', time: '08:00', days: [0, 1, 2, 3, 4, 5, 6], enabled: true };
    App.modal(`
      <h3 class="text-lg font-extrabold mb-4">${existing ? '루틴 수정' : '알림 루틴 추가'}</h3>
      <label class="block text-[13px] font-semibold mb-1">제목</label>
      <input id="rt-label" class="fld w-full mb-3" placeholder="예: 오늘 수업 준비 점검" value="${U.esc(r.label)}"/>
      <label class="block text-[13px] font-semibold mb-1">내용 <span class="text-on-surface-variant font-normal">(선택)</span></label>
      <input id="rt-body" class="fld w-full mb-3" placeholder="예: 워크북 출력 부수 확인" value="${U.esc(r.body || '')}"/>
      <div class="flex gap-4 mb-3">
        <div><label class="block text-[13px] font-semibold mb-1">시각</label>
          <input id="rt-time" type="time" class="fld" value="${r.time}"/></div>
      </div>
      <label class="block text-[13px] font-semibold mb-1.5">요일</label>
      <div class="flex gap-1.5 mb-5" id="rt-days">
        ${DOW.map((d, i) => `<button type="button" data-d="${i}" class="rt-day w-9 h-9 rounded-lg border text-[13px] font-bold ${r.days.includes(i) ? 'bg-secondary text-on-secondary border-secondary' : 'border-outline-variant text-on-surface-variant'}">${d}</button>`).join('')}
      </div>
      <div class="flex gap-2 justify-end">
        ${existing ? `<button id="rt-del" class="btn border border-red-400/40 text-red-400 mr-auto">삭제</button>` : ''}
        <button class="btn border border-outline-variant" onclick="App.closeModal()">취소</button>
        <button id="rt-save" class="btn btn-primary">저장</button>
      </div>`);
    const days = new Set(r.days);
    document.querySelectorAll('.rt-day').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.d;
      if (days.has(i)) { days.delete(i); b.className = b.className.replace('bg-secondary text-on-secondary border-secondary', 'border-outline-variant text-on-surface-variant'); }
      else { days.add(i); b.className = b.className.replace('border-outline-variant text-on-surface-variant', 'bg-secondary text-on-secondary border-secondary'); }
    }));
    document.getElementById('rt-save').addEventListener('click', async () => {
      const label = document.getElementById('rt-label').value.trim();
      if (!label) { App.toast('제목을 입력하세요.', 'err'); return; }
      const obj = { id: r.id, label, body: document.getElementById('rt-body').value.trim(),
        time: document.getElementById('rt-time').value || '08:00', days: [...days].sort(), enabled: r.enabled !== false, lastFired: r.lastFired || '' };
      const list = loadRoutines().filter(x => x.id !== r.id); list.push(obj);
      if (await saveRoutines(list)) { App.closeModal(); drawRoutines(); }
    });
    if (existing) document.getElementById('rt-del').addEventListener('click', async () => {
      const list = loadRoutines().filter(x => x.id !== r.id);
      if (await saveRoutines(list)) { App.closeModal(); drawRoutines(); }
    });
  }

  async function toggleRoutine(id) {
    const list = loadRoutines(); const r = list.find(x => x.id === id); if (!r) return;
    r.enabled = r.enabled === false; await saveRoutines(list); drawRoutines();
  }

  function drawRoutines() {
    const el = document.getElementById('push-routines'); if (!el) return;
    const list = loadRoutines().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const rows = list.length ? list.map(r => {
      const on = r.enabled !== false;
      const dtxt = r.days.length === 7 ? '매일' : r.days.map(i => DOW[i]).join('·');
      return `<div class="flex items-center gap-3 py-2.5 border-b border-outline-variant last:border-0 ${on ? '' : 'opacity-45'}">
        <button class="rt-toggle shrink-0 w-11 h-6 rounded-full relative transition ${on ? 'bg-secondary' : 'bg-surface-container-high'}" data-id="${r.id}">
          <span class="absolute top-0.5 ${on ? 'right-0.5' : 'left-0.5'} w-5 h-5 rounded-full bg-white transition-all"></span></button>
        <div class="min-w-0 flex-1 row-click cursor-pointer" data-edit="${r.id}">
          <div class="font-semibold text-[13.5px] truncate">${U.esc(r.label)}</div>
          <div class="text-on-surface-variant text-[12px]">${r.time} · ${dtxt}${r.body ? ' · ' + U.esc(r.body) : ''}</div>
        </div>
        <span class="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
      </div>`;
    }).join('') : `<div class="text-on-surface-variant text-[13px] py-3 text-center">등록된 루틴이 없습니다. 아래 <b>루틴 추가</b>로 만드세요.</div>`;
    el.innerHTML = `<div class="card p-4 mb-6">
      <div class="flex items-center justify-between mb-1.5">
        <h2 class="font-bold text-[15px] flex items-center gap-2"><span class="material-symbols-outlined text-[20px] text-secondary">alarm</span>알림 루틴</h2>
        <button id="rt-add" class="btn btn-primary !py-1.5 !px-3 text-[13px]"><span class="material-symbols-outlined text-[17px]">add</span>루틴 추가</button>
      </div>
      <p class="text-on-surface-variant text-[11.5px] mb-2">지정한 시각·요일에 이 기기로 알림이 옵니다. <b>발송 PC가 켜져 있어야</b> 전송됩니다.</p>
      ${rows}</div>`;
    document.getElementById('rt-add').addEventListener('click', () => routineForm());
    el.querySelectorAll('.rt-toggle').forEach(b => b.addEventListener('click', () => toggleRoutine(b.dataset.id)));
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
      const r = loadRoutines().find(x => x.id === b.dataset.edit); if (r) routineForm(r);
    }));
  }

  return { supported, subscribe, unsubscribe, isSubscribed, loadSubs, cardHTML, drawCard, drawRoutines };
})();
