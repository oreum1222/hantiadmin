// ═══ 홈: 전체 현황 ═══
Views.home = function (el) {
  const today = U.today();
  const dayName = U.dayName(today);

  // 오늘 수업 (날짜 일치 회차)
  const todaySessions = App.db.sessions.filter(s => s.date === today)
    .map(s => ({ s, c: App.courseOf(s.courseId) })).filter(x => x.c);

  // 미처리 보강
  const pendingMk = App.db.makeups.filter(m => m.status !== '완료');

  // 최근 7일 결석
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const recentAbsent = App.db.attendance.filter(a => a.status === '결석')
    .map(a => ({ a, s: App.sessionOf(a.sessionId), st: App.studentOf(a.studentId) }))
    .filter(x => x.s && x.st && x.s.date >= weekAgo)
    .sort((x, y) => (y.s.date || '').localeCompare(x.s.date || ''));

  const fmt = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });

  el.innerHTML = `
  <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight">전체 현황</h1>
      <p class="text-on-surface-variant text-[14px] mt-1">${fmt.format(new Date())} · 오늘 처리할 업무를 확인하세요.</p>
    </div>
    <div class="flex gap-2">
      <button class="btn btn-ghost" onclick="App.navigate('attendance')"><span class="material-symbols-outlined text-[18px]">fact_check</span>출결 체크</button>
      <button class="btn btn-primary" onclick="App.navigate('makeup')"><span class="material-symbols-outlined text-[18px]">event_repeat</span>보강 처리${pendingMk.length ? ` (${pendingMk.length})` : ''}</button>
    </div>
  </div>

  <!-- 요약 스탯 -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
    ${statCard('school', '오늘 수업', todaySessions.length + '개', todaySessions.length ? todaySessions.map(x => x.c.grade).join(' · ') : '수업 없는 날')}
    ${statCard('event_repeat', '미처리 보강', pendingMk.length + '건', pendingMk.length ? '처리 필요' : '모두 완료')}
    ${statCard('person_off', '최근 7일 결석', recentAbsent.length + '명', '')}
    ${statCard('groups', '재원생', App.db.students.filter(s => s.status === '재원').length + '명', '전체 ' + App.db.students.length + '명')}
  </div>

  <div class="grid lg:grid-cols-2 gap-4">
    <!-- 오늘 수업 -->
    <section class="card p-5">
      <h2 class="font-bold text-[16px] mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">today</span>오늘 수업 <span class="text-on-surface-variant font-normal text-[13px]">(${dayName}요일)</span></h2>
      ${todaySessions.length ? todaySessions.map(({ s, c }) => `
        <div class="flex items-center justify-between gap-3 py-3 border-b border-outline-variant last:border-0">
          <div class="min-w-0">
            <div class="font-bold text-[14px] truncate">${U.esc(c.name)}</div>
            <div class="text-on-surface-variant text-[12px] mt-0.5">${s.no}회차 · ${U.esc(c.time)}${c.room ? ' · ' + U.esc(c.room) : ''} · 담당 ${U.esc(c.staff)}</div>
          </div>
          <button class="btn btn-ghost !py-1.5 !px-3 text-[12px] shrink-0" onclick="location.hash='#attendance/${c.id}/${s.id}'">출결</button>
        </div>`).join('')
      : `<p class="text-on-surface-variant text-[13px] py-4">오늘은 예정된 수업이 없습니다.</p>`}
    </section>

    <!-- 미처리 보강 -->
    <section class="card p-5">
      <h2 class="font-bold text-[16px] mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">event_repeat</span>미처리 보강</h2>
      ${pendingMk.length ? pendingMk.slice(0, 6).map(m => {
        const st = App.studentOf(m.studentId), s = App.sessionOf(m.sessionId), c = App.courseOf(m.courseId);
        return `<div class="flex items-center justify-between gap-3 py-2.5 border-b border-outline-variant last:border-0 row-click" onclick="App.navigate('makeup')">
          <div class="min-w-0">
            <div class="font-bold text-[14px]">${U.esc(st?.name || '?')} <span class="font-normal text-on-surface-variant text-[12px]">${U.esc(c?.grade || '')} ${s ? s.no + '회차 (' + U.fmtD(s.date) + ')' : ''}</span></div>
            ${m.memo ? `<div class="text-on-surface-variant text-[12px] truncate">${U.esc(m.memo)}</div>` : ''}
          </div>
          ${U.mkChip(m.status)}
        </div>`;
      }).join('') + (pendingMk.length > 6 ? `<p class="text-on-surface-variant text-[12px] mt-2 text-right">외 ${pendingMk.length - 6}건 — 보강 메뉴에서 확인</p>` : '')
      : `<p class="text-on-surface-variant text-[13px] py-4">미처리 보강이 없습니다. 👍</p>`}
    </section>

    <!-- 최근 결석 -->
    <section class="card p-5">
      <h2 class="font-bold text-[16px] mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">person_off</span>최근 7일 결석</h2>
      ${recentAbsent.length ? recentAbsent.map(({ a, s, st }) => {
        const c = App.courseOf(s.courseId);
        return `<div class="flex items-center justify-between gap-3 py-2.5 border-b border-outline-variant last:border-0">
          <div><span class="font-bold text-[14px]">${U.esc(st.name)}</span> <span class="text-on-surface-variant text-[12px]">${U.esc(c?.grade || '')} · ${U.fmtD(s.date)} ${s.no}회차${a.memo ? ' · ' + U.esc(a.memo) : ''}</span></div>
          ${U.attChip('결석')}
        </div>`;
      }).join('') : `<p class="text-on-surface-variant text-[13px] py-4">최근 7일간 결석이 없습니다.</p>`}
    </section>

    <!-- 강좌별 출석률 -->
    <section class="card p-5">
      <h2 class="font-bold text-[16px] mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">monitoring</span>강좌별 출석률</h2>
      ${App.db.courses.map(c => {
        const rate = App.attRate(c.id);
        const n = App.enrolledStudents(c.id).length;
        return `<div class="py-2.5 border-b border-outline-variant last:border-0">
          <div class="flex justify-between text-[13px] mb-1.5">
            <span class="font-semibold truncate">${U.esc(c.name)} <span class="text-on-surface-variant font-normal">· ${n}명</span></span>
            <span class="font-bold ${rate === null ? 'text-on-surface-variant' : rate >= 90 ? 'text-secondary' : rate >= 70 ? 'text-yellow-500' : 'text-red-400'}">${rate === null ? '기록 없음' : rate + '%'}</span>
          </div>
          <div class="h-1.5 rounded-full bg-surface-container-low overflow-hidden">
            <div class="h-full rounded-full bg-secondary transition-all" style="width:${rate ?? 0}%"></div>
          </div>
        </div>`;
      }).join('')}
    </section>
    <!-- 최근 공지 -->
    <section class="card p-5 lg:col-span-2">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold text-[16px] flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">campaign</span>최근 공지</h2>
        <button class="btn btn-ghost !py-1.5 !px-3 text-[12px]" onclick="App.navigate('notices')">전체 보기</button>
      </div>
      ${(App.db.notices || []).length ? [...App.db.notices].sort((a, b) => (b.date + (b.ts || '')).localeCompare(a.date + (a.ts || ''))).slice(0, 3).map(n => `
        <div class="flex items-center justify-between gap-3 py-2.5 border-b border-outline-variant last:border-0 row-click" onclick="App.navigate('notices')">
          <div class="min-w-0">
            <span class="font-bold text-[14px]">${U.esc(n.title)}</span>
            <span class="text-on-surface-variant text-[12px] ml-1.5">${U.esc(n.channel)} · ${n.courseIds === 'all' ? '전체' : n.courseIds.split(',').map(id => App.courseOf(id.trim())?.grade || '').filter(Boolean).join('·')}</span>
          </div>
          <span class="text-on-surface-variant text-[12px] shrink-0">${U.fmtD(n.date)}</span>
        </div>`).join('')
      : '<p class="text-on-surface-variant text-[13px] py-4">아직 공지가 없습니다.</p>'}
    </section>
  </div>

  <!-- 2차 예정 영역 자리 -->
  <div class="mt-4 card p-4 border-dashed !bg-transparent flex items-center gap-3 text-on-surface-variant text-[13px]">
    <span class="material-symbols-outlined text-[18px]">construction</span>
    숙제 · 성적 · 상담 · 클리닉 · 통계 위젯은 이후 구축에서 이 자리에 추가됩니다.
  </div>`;

  function statCard(icon, label, value, sub) {
    return `<div class="card p-4">
      <div class="flex items-center gap-2 text-on-surface-variant text-[12px] font-bold mb-2"><span class="material-symbols-outlined text-[18px] text-secondary">${icon}</span>${label}</div>
      <div class="text-2xl font-extrabold tracking-tight">${value}</div>
      ${sub ? `<div class="text-on-surface-variant text-[12px] mt-1">${U.esc(sub)}</div>` : ''}
    </div>`;
  }
};
