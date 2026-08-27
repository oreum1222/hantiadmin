// ═══ 운영 허브 코어: 상태 · 라우터 · PIN 게이트 · 공용 UI ═══
window.Views = window.Views || {};

// ── 유틸 ──
window.U = {
  esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  dayName(dateStr) { if (!dateStr) return ''; return ['일', '월', '화', '수', '목', '금', '토'][new Date(dateStr + 'T00:00:00').getDay()]; },
  fmtD(dateStr) { if (!dateStr) return '—'; const [y, m, d] = dateStr.split('-'); return `${+m}/${+d} (${U.dayName(dateStr)})`; },
  attChip(status) {
    const map = { '출석': 'text-secondary bg-secondary-fixed/60 border-secondary/25', '지각': 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30', '결석': 'text-red-400 bg-red-400/10 border-red-400/30', '보강': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30', '사유': 'text-blue-400 bg-blue-400/10 border-blue-400/30', '온라인': 'text-purple-400 bg-purple-400/10 border-purple-400/30' };
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
  sessionsOf(courseId) { return App.db.sessions.filter(s => s.courseId === courseId).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.no - b.no)); },
  enrolledStudents(courseId) {
    return App.db.enrollments.filter(e => e.courseId === courseId)
      .map(e => App.studentOf(e.studentId)).filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  },
  coursesOf(studentId) { return App.db.enrollments.filter(e => e.studentId === studentId).map(e => App.courseOf(e.courseId)).filter(Boolean); },
  attOf(sessionId) { return App.db.attendance.filter(a => a.sessionId === sessionId); },
  // 후발 등록 학생의 수강 시작일 (이 날짜 이전 회차는 '수강 전')
  enrollStart(studentId) { return (window.ENROLL_START || {})[studentId] || ''; },
  // 학생의 수강 시작 회차 번호(해당 강좌에서 시작일 이후 첫 비영상 회차)
  startSessionNo(courseId, studentId) {
    const st = App.enrollStart(studentId); if (!st) return null;
    const first = App.sessionsOf(courseId).filter(s => !s.isVideo).find(s => (s.date || '') >= st);
    return first ? first.no : null;
  },

  // 강좌 출석률 (기록이 있는 회차 기준, 출석+지각+온라인 = 출석 인정)
  attRate(courseId) {
    const sids = App.sessionsOf(courseId).map(s => s.id);
    const recs = App.db.attendance.filter(a => sids.includes(a.sessionId));
    if (!recs.length) return null;
    const ok = recs.filter(r => ['출석', '지각', '온라인', '보강'].includes(r.status)).length;
    return Math.round(ok / recs.length * 100);
  },

  // ── 진행/종강 강좌 구분 ──
  courseEnded(id) { return (CONFIG.ENDED_COURSES || []).includes(id); },
  activeCourses() { return App.db.courses.filter(c => !App.courseEnded(c.id)); },
  endedCourses() { return App.db.courses.filter(c => App.courseEnded(c.id)); },
  // 종강 항목을 접어두는 공용 토글 (클릭하면 펼쳐짐). opened=true면 기본 펼침.
  endedBox(count, innerHTML, opened) {
    return `<details class="group mt-4"${opened ? ' open' : ''}>
      <summary class="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none rounded-xl border border-outline-variant bg-surface-container-low/40 hover:bg-surface-container-low transition-colors px-5 py-3.5 flex items-center justify-between gap-2">
        <span class="flex items-center gap-2 font-bold text-[14px] text-on-surface-variant"><span class="material-symbols-outlined text-[19px]">inventory_2</span>종강 강좌 <span class="chip border border-outline-variant text-on-surface-variant">${count}</span><span class="text-[12px] font-normal opacity-70">클릭하여 펼치기</span></span>
        <span class="material-symbols-outlined text-on-surface-variant transition-transform duration-200 group-open:rotate-180">expand_more</span>
      </summary>
      <div class="mt-3">${innerHTML}</div>
    </details>`;
  },

  // ── 문자 발송 ──
  // 강좌 → 발신 구분('hanti'|'oreum') 및 표시 번호
  senderKeyOf(courseId) { return (CONFIG.MEXX_COURSES || []).includes(courseId) ? 'hanti' : 'oreum'; },
  senderNumberOf(key) { return key === 'oreum' ? CONFIG.SENDER_OREUM : CONFIG.SENDER_HANTI; },
  // Solapi 릴레이(hwsys)로 발송. dryRun=true면 실발송 없이 형식·대상만 확인.
  async sendSMS(messages, dryRun) {
    const res = await fetch(CONFIG.SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams({ action: 'sendMessages', dryRun: dryRun ? '1' : '0', messages: JSON.stringify(messages) }),
    });
    return res.json();
  },
  // 문자 바이트 수(한글 2, 그 외 1) 및 SMS/LMS 판별
  smsBytes(text) { let b = 0; for (const ch of String(text || '')) b += ch.charCodeAt(0) > 127 ? 2 : 1; return b; },

  // ── 과제(숙제) 라이브 연동: 과제 검사 시스템에서 주차별 과제 범위 조회(세션당 1회 캐시) ──
  hwAssignments() {
    if (!window.__HW_ASSIGN) {
      window.__HW_ASSIGN = fetch(CONFIG.SEND_URL + '?action=list')
        .then(r => r.json())
        .then(list => {
          const map = {}; // hwsysCourseId -> { week -> {label, area} }
          (list || []).forEach(r => {
            const cid = r.courseId, w = r.week, wl = r.weekLabel;
            if (!cid || w == null || w === '' || !wl) return;
            (map[cid] = map[cid] || {})[w] = { label: String(wl), area: r.area || '' };
          });
          const out = {};
          Object.keys(map).forEach(cid => {
            out[cid] = Object.keys(map[cid]).map(Number).sort((a, b) => a - b).map(w => ({ w, ...map[cid][w] }));
          });
          return out;
        }).catch(() => ({}));
    }
    return window.__HW_ASSIGN;
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
    { id: 'message', label: '문자 발송', icon: 'sms' },
    { id: 'tasks', label: '조교 확인', icon: 'checklist' },
    { id: 'diagnosis', label: '성향 진단', icon: 'psychology', url: 'https://oreum1222.github.io/oreum-fassessment/dashboard.html' },
    { id: 'review', label: '복습시험', icon: 'quiz', url: 'https://oreum1222.github.io/oreum-study/dashboard.html' },
  ],
  navigate(view) { location.hash = '#' + view; },
  render() {
    const hash = (location.hash || '#home').slice(1).split('/')[0];
    App.view = App.MENUS.some(m => m.id === hash && !m.url) ? hash : 'home';
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
    m.url
      ? `<a class="nav-item" href="${m.url}" target="_blank" rel="noopener"><span class="material-symbols-outlined text-[20px]">${m.icon}</span>${m.label}<span class="material-symbols-outlined text-[15px] ml-auto opacity-60">open_in_new</span></a>`
      : `<div class="nav-item" data-view="${m.id}"><span class="material-symbols-outlined text-[20px]">${m.icon}</span>${m.label}</div>`).join('');
  const bottomNav = document.getElementById('bottom-nav');
  bottomNav.innerHTML = App.MENUS.map(m =>
    m.url
      ? `<a class="bottom-nav-item" href="${m.url}" target="_blank" rel="noopener"><span class="material-symbols-outlined text-[22px]">${m.icon}</span>${m.label}</a>`
      : `<div class="bottom-nav-item" data-view="${m.id}"><span class="material-symbols-outlined text-[22px]">${m.icon}</span>${m.label}</div>`).join('');
  bottomNav.style.gridTemplateColumns = `repeat(${App.MENUS.length}, minmax(0, 1fr))`; // 메뉴 수에 맞춰 열 수 자동 조정
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
