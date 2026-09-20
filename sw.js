// ═══ 운영 허브 PWA 서비스워커 ═══
// 정책: 같은 출처(허브 코드/아이콘)는 네트워크 우선 → 항상 최신, 오프라인 시 캐시 폴백.
//       GAS(script.google.com) 등 외부 요청은 절대 캐시하지 않음(로그인·DB·문자 실시간).
const CACHE = 'mexx-hub-v4';
const SHELL = ['./', './index.html', './manifest.json', './fonts/material-symbols-subset.woff2'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ═══ 푸시 알림 수신 ═══
self.addEventListener('push', e => {
  let d = { title: 'MEXX 가경T', body: '', url: './', tag: 'mexx' };
  try { if (e.data) Object.assign(d, e.data.json()); } catch (_) { if (e.data) d.body = e.data.text(); }
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body,
    tag: d.tag,
    data: { url: d.url || './' },
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    renotify: true,
    requireInteraction: !!d.sticky,
  }));
});

// 알림 클릭 → 앱 포커스(있으면) 또는 새 창
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { try { await c.navigate(target); } catch (_) {} return c.focus(); } }
    if (clients.openWindow) return clients.openWindow(target);
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // POST(저장·문자)는 건드리지 않음
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // 외부(GAS·폰트·CDN)는 브라우저 기본 처리
  // 같은 출처: 네트워크 우선(HTTP 캐시 우회로 항상 최신 코드), 실패 시 캐시
  e.respondWith(
    fetch(new Request(req, { cache: 'no-cache' })).then(res => {
      if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return res;
    }).catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
  );
});
