// ═══ 운영 허브 코어: 상태 · 라우터 · PIN 게이트 · 공용 UI ═══
window.Views = window.Views || {};

// ── 유틸 ──
window.U = {
  esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  dayName(dateStr) { if (!dateStr) return ''; return ['일', '월', '화', '수', '목', '금', '토'][new Date(dateStr + 'T00:00:00').getDay()]; },
  fmtD(dateStr) { if (!dateStr) return '—'; const [y, m, d] = dateStr.split('-'); return `${+m}/${+d} (${U.dayName(dateStr)})`; },
  attChip(status) {
    const map = { '출석': 'text-secondary bg-secondary-fixed/60 border-secondary/25', '지각': 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30', '결석': 'text-red-400 bg-red-400/10 border-red-400/30', '사유': 'text-blue-400 bg-blue-400/10 border-blue-400/30', '온라인': 'text-purple-400 bg-purple-400/10 border-purple-400/30' };
    return `<span class="chip border ${map[status] || 'text-on-surface-variant border-outline-variant'}">${U.esc(status)}</span>`;
  },
  mkChip(status) {
    const map = { '필요': 'text-red-400 bg-red-400/10 border-red-400/30', '신청됨': 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30', '영상전달': 'text-blue-400 bg-blue-400/10 border-blue-400/30', '완료': 'text-secondary bg-secondary-fixed/60 border-secondary/25' };
    return `<span class="chip border ${map[status] || ''}">${U.esc(status)}</span>`;
  },
};

// ── 앱 상태 ──
window.App = {
  db: null, pin: '', role: '', view: 'home',

  // DB 조회 헬퍼
  courseOf(id) { return App.db.courses.find(c => c.id === id); },
  studentOf(id) { return App.db.students.find(s => s.id === id); },
  sessionOf(id) { return App.db.sessions.find(s => s.id === id); },
  sessionsOf(courseId) { return App.db.sessions.filter(s => s.courseId === courseId).sort((a, b) => a.no - b.no); },
  enrolledStudents(courseId) {
    return App.db.enrollments.filter(e => e.courseId === courseId)
      .map(e => App.studentOf(e.studentId)).filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  },
  coursesOf(studentId) { return App.db.enrollments.filter(e => e.studentId === studentId).map(e => App.courseOf(e.courseId)).filter(Boolean); },
  attOf(sessionId) { return App.db.attendance.filter(a => a.sessionId === sessionId); },

  // 강좌 출석률 (기록이 있는 회차 기준, 출석+지각+온라인 = 출석 인정)
  attRate(courseId) {
    const sids = App.sessionsOf(courseId).map(s => s.id);
    const recs = App.db.attendance.filter(a => sids.includes(a.sessionId));
    if (!recs.length) return null;
    const ok = recs.filter(r => ['출석', '지각', '온라인'].includes(r.status)).length;
    return Math.round(ok / recs.length * 100);
  },

  // ── 액션 실행 (저장 중 토스트 → 성공/실패) ──
  async act(action, payload, okMsg) {
    try {
      await Api.action(App.db, App.pin, action, payload);
      if (okMsg) App.toast(okMsg, 'ok');
      return true;
    } catch (e) {
      App.toast('저장 실패: ' + e.message + ' — 다시 시도해 주세요.', 'err');
      return false;
    }
  },

  // ── 토스트 ──
  toast(msg, kind = 'ok') {
    const wrap = document.getElementById('toast-wrap');
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = `<span class="material-symbols-outlined text-[18px] ${kind === 'ok' ? 'text-secondary' : 'text-red-400'}">${kind === 'ok' ? 'check_circle' : 'error'}</span><span>${U.esc(msg)}</span>`;
    wrap.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 2600);
  },

  // ── 모달 ──
  modal(html) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="modal-back" id="modal-back"><div class="modal-box p-6">${html}</div></div>`;
    root.querySelector('#modal-back').addEventListener('click', e => { if (e.target.id === 'modal-back') App.closeModal(); });
    return root;
  },
  closeModal() { document.getElementById('modal-root').innerHTML = ''; },

  // ── 라우터 ──
  MENUS: [
    { id: 'home', label: '홈', icon: 'space_dashboard' },
    { id: 'courses', label: '강의', icon: 'menu_book' },
    { id: 'students', label: '학생', icon: 'groups' },
    { id: 'attendance', label: '출결', icon: 'fact_check' },
    { id: 'makeup', label: '보강', icon: 'event_repeat' },
    { id: 'notices', label: '공지', icon: 'campaign' },
  ],
  navigate(view) { location.hash = '#' + view; },
  render() {
    const hash = (location.hash || '#home').slice(1).split('/')[0];
    App.view = App.MENUS.some(m => m.id === hash) ? hash : 'home';
    // 네비 활성 표시
    document.querySelectorAll('#side-nav .nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === App.view));
    document.querySelectorAll('#bottom-nav .bottom-nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === App.view));
    const main = document.getElementById('view');
    main.innerHTML = '';
    main.className = main.className.replace(' view-fade', '');
    void main.offsetWidth; // 리플로우로 애니메이션 재시작
    main.className += ' view-fade';
    Views[App.view](main);
  },

  // 뷰 새로고침 (저장 후 화면 갱신)
  refresh() { App.render(); },
};

// ── 부팅 ──
(function boot() {
  const gate = document.getElementById('pin-gate');
  const shell = document.getElementById('app-shell');
  const input = document.getElementById('pin-input');
  const errEl = document.getElementById('pin-error');

  // 네비 구성
  const sideNav = document.getElementById('side-nav');
  sideNav.innerHTML = App.MENUS.map(m =>
    `<div class="nav-item" data-view="${m.id}"><span class="material-symbols-outlined text-[20px]">${m.icon}</span>${m.label}</div>`).join('');
  const bottomNav = document.getElementById('bottom-nav');
  bottomNav.innerHTML = App.MENUS.map(m =>
    `<div class="bottom-nav-item" data-view="${m.id}"><span class="material-symbols-outlined text-[22px]">${m.icon}</span>${m.label}</div>`).join('');
  document.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => App.navigate(el.dataset.view)));

  // 테마 토글
  function toggleTheme() {
    const d = document.documentElement;
    const toLight = d.classList.contains('dark');
    d.classList.toggle('dark', !toLight); d.classList.toggle('light', toLight);
    localStorage.setItem('mexx-theme', toLight ? 'light' : 'dark');
  }
  ['theme-toggle', 'theme-toggle-m'].forEach(id => document.getElementById(id)?.addEventListener('click', toggleTheme));
  // 잠금
  function lock() { sessionStorage.removeItem('hanti-admin-auth'); location.reload(); }
  ['logout-btn', 'logout-btn-m'].forEach(id => document.getElementById(id)?.addEventListener('click', lock));

  async function enter(role, pin) {
    App.role = role; App.pin = pin;
    sessionStorage.setItem('hanti-admin-auth', JSON.stringify({ role, pin }));
    document.getElementById('role-badge').innerHTML =
      `<span class="material-symbols-outlined text-[14px]">${role === 'master' ? 'workspace_premium' : 'badge'}</span>${role === 'master' ? '가경T (마스터)' : '스태프'}`;
    document.getElementById('mode-badge').textContent = Api.isDemo() ? '데모 모드 · 이 기기에만 저장됩니다' : '라이브 · Google Sheets 연동';
    try {
      App.db = await Api.load(pin);
    } catch (e) {
      gate.classList.remove('hidden'); shell.classList.add('hidden');
      errEl.textContent = '데이터 로드 실패: ' + e.message;
      return;
    }
    gate.classList.add('hidden'); shell.classList.remove('hidden');
    App.render();
  }

  async function tryPin() {
    const pin = input.value.trim();
    if (!pin) return;
    errEl.textContent = '';
    const r = await Api.auth(pin);
    if (r) enter(r.role, pin);
    else { errEl.textContent = 'PIN이 올바르지 않습니다.'; input.value = ''; input.focus(); }
  }
  document.getElementById('pin-submit').addEventListener('click', tryPin);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') tryPin(); });

  window.addEventListener('hashchange', () => { if (App.db) App.render(); });

  // 세션 유지 확인
  const saved = sessionStorage.getItem('hanti-admin-auth');
  if (saved) {
    try { const { role, pin } = JSON.parse(saved); enter(role, pin); return; } catch (e) { /* fallthrough */ }
  }
  gate.classList.remove('hidden');
  input.focus();
})();
