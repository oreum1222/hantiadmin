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

  return { supported, subscribe, unsubscribe, isSubscribed, loadSubs, cardHTML, drawCard };
})();
