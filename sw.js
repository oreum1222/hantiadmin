// ═══ 운영 허브 PWA 서비스워커 ═══
// 정책: 같은 출처(허브 코드/아이콘)는 네트워크 우선 → 항상 최신, 오프라인 시 캐시 폴백.
//       GAS(script.google.com) 등 외부 요청은 절대 캐시하지 않음(로그인·DB·문자 실시간).
const CACHE = 'mexx-hub-v1';
const SHELL = ['./', './index.html', './manifest.json'];

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

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // POST(저장·문자)는 건드리지 않음
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // 외부(GAS·폰트·CDN)는 브라우저 기본 처리
  // 같은 출처: 네트워크 우선, 실패 시 캐시
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return res;
    }).catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
  );
});
