// ═══ 강의 관리 ═══
Views.courses = function (el) {
  const sub = (location.hash.split('/')[1] || ''); // #courses/h1 → 상세
  if (sub) return renderDetail(el, sub);

  el.innerHTML = `
  <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight">강의 관리</h1>
      <p class="text-on-surface-variant text-[14px] mt-1">강좌 ${App.db.courses.length}개 운영 중</p>
    </div>
    <button class="btn btn-primary" onclick="Views._courseForm()"><span class="material-symbols-outlined text-[18px]">add</span>강좌 추가</button>
  </div>
  <div class="grid md:grid-cols-2 gap-4">
    ${App.db.courses.map(c => {
      const n = App.enrolledStudents(c.id).length;
      const ss = App.sessionsOf(c.id);
      const done = ss.filter(s => s.date && s.date <= U.today() && !s.isVideo).length;
      const rate = App.attRate(c.id);
      return `<div class="card card-hover p-5 cursor-pointer" onclick="location.hash='#courses/${c.id}'">
        <div class="flex items-start justify-between gap-2">
          <div>
            <span class="chip border ${c.kind === '단과' ? 'text-secondary border-secondary/30 bg-secondary-fixed/50' : 'text-blue-400 border-blue-400/30 bg-blue-400/10'}">${U.esc(c.kind)}</span>
            <h3 class="font-bold text-[16px] mt-2">${U.esc(c.name)}</h3>
          </div>
          <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
        </div>
        <div class="text-on-surface-variant text-[13px] mt-2 space-y-1">
          <div class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">schedule</span>${U.esc(c.day)}요일 ${U.esc(c.time)}${c.room ? ' · ' + U.esc(c.room) : ''}</div>
          <div class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">flag</span>진도 ${done}/${c.sessionsCount}회차 · 담당 ${U.esc(c.staff)}</div>
        </div>
        <div class="flex gap-4 mt-4 pt-3 border-t border-outline-variant text-[13px]">
          <span><b class="text-on-surface">${n}</b> <span class="text-on-surface-variant">수강생</span></span>
          <span><b class="${rate === null ? 'text-on-surface-variant' : rate >= 90 ? 'text-secondary' : 'text-yellow-500'}">${rate === null ? '—' : rate + '%'}</b> <span class="text-on-surface-variant">출석률</span></span>
        </div>
      </div>`;
    }).join('')}
  </div>`;
};

// ── 강좌 상세 ──
function renderDetail(el, courseId) {
  const c = App.courseOf(courseId);
  if (!c) { location.hash = '#courses'; return; }
  const students = App.enrolledStudents(c.id);
  const sessions = App.sessionsOf(c.id);

  el.innerHTML = `
  <button class="btn btn-ghost !px-3 mb-4" onclick="location.hash='#courses'"><span class="material-symbols-outlined text-[18px]">arrow_back</span>강좌 목록</button>
  <div class="flex flex-wrap items-start justify-between gap-3 mb-6">
    <div>
      <span class="chip border ${c.kind === '단과' ? 'text-secondary border-secondary/30 bg-secondary-fixed/50' : 'text-blue-400 border-blue-400/30 bg-blue-400/10'}">${U.esc(c.kind)}</span>
      <h1 class="text-2xl font-extrabold tracking-tight mt-2">${U.esc(c.name)}</h1>
      <p class="text-on-surface-variant text-[14px] mt-1">${U.esc(c.day)}요일 ${U.esc(c.time)}${c.room ? ' · ' + U.esc(c.room) : ''} · 개강 ${U.fmtD(c.openDate)} · 담당 ${U.esc(c.staff)}</p>
      ${c.material ? `<p class="text-on-surface-variant text-[13px] mt-1">교재: ${U.esc(c.material)}</p>` : ''}
    </div>
    <button class="btn btn-ghost" onclick="Views._courseForm('${c.id}')"><span class="material-symbols-outlined text-[18px]">edit</span>정보 수정</button>
  </div>

  <div class="grid lg:grid-cols-5 gap-4">
    <!-- 회차 -->
    <section class="card p-5 lg:col-span-3">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold text-[16px]">회차 · 진도</h2>
        <button class="btn btn-ghost !py-1.5 !px-3 text-[12px]" onclick="Views._sessionForm('${c.id}')"><span class="material-symbols-outlined text-[16px]">add</span>회차 추가</button>
      </div>
      <div class="overflow-x-auto"><table class="tbl">
        <thead><tr><th class="w-12">회차</th><th class="w-24">날짜</th><th>진도</th><th class="w-20">출결</th><th class="w-10"></th></tr></thead>
        <tbody>${sessions.map(s => {
          const recs = App.attOf(s.id);
          const isPast = s.date && s.date <= U.today();
          return `<tr>
            <td class="font-bold">${s.isVideo ? '<span class="material-symbols-outlined text-[18px] text-purple-400">smart_display</span>' : s.no}</td>
            <td class="${isPast ? '' : 'text-on-surface-variant'}">${U.fmtD(s.date)}</td>
            <td class="text-[13px]">${U.esc(s.topic)}</td>
            <td>${s.isVideo ? '<span class="text-on-surface-variant text-[12px]">—</span>' : recs.length ? `<button class="text-secondary text-[13px] font-bold hover:underline" onclick="location.hash='#attendance/${c.id}/${s.id}'">${recs.length}명 ✓</button>` : isPast ? `<button class="text-yellow-500 text-[13px] font-bold hover:underline" onclick="location.hash='#attendance/${c.id}/${s.id}'">미체크</button>` : '<span class="text-on-surface-variant text-[12px]">예정</span>'}</td>
            <td><button class="text-on-surface-variant hover:text-on-surface" onclick="Views._sessionForm('${c.id}','${s.id}')" title="회차 수정"><span class="material-symbols-outlined text-[18px]">edit</span></button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </section>

    <!-- 수강생 -->
    <section class="card p-5 lg:col-span-2">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold text-[16px]">수강생 <span class="text-on-surface-variant font-normal text-[13px]">${students.length}명</span></h2>
        <button class="btn btn-ghost !py-1.5 !px-3 text-[12px]" onclick="Views._enrollForm('${c.id}')"><span class="material-symbols-outlined text-[16px]">person_add</span>등록</button>
      </div>
      ${students.length ? students.map(st => {
        const abs = App.db.attendance.filter(a => a.studentId === st.id && a.status === '결석' && App.sessionOf(a.sessionId)?.courseId === c.id).length;
        return `<div class="flex items-center justify-between gap-2 py-2.5 border-b border-outline-variant last:border-0">
          <div class="row-click min-w-0 flex-1" onclick="location.hash='#students/${st.id}'">
            <span class="font-bold text-[14px]">${U.esc(st.name)}</span>
            <span class="text-on-surface-variant text-[12px] ml-1.5">${U.esc(st.school)} ${U.esc(st.grade)}</span>
            ${abs ? `<span class="text-red-400 text-[12px] ml-1.5">결석 ${abs}</span>` : ''}
          </div>
          <button class="text-on-surface-variant hover:text-red-400" title="수강 해제" onclick="Views._unenroll('${st.id}','${c.id}','${U.esc(st.name)}')"><span class="material-symbols-outlined text-[18px]">person_remove</span></button>
        </div>`;
      }).join('') : '<p class="text-on-surface-variant text-[13px] py-4">아직 등록된 수강생이 없습니다.</p>'}
    </section>
  </div>`;
}

// ── 강좌 추가/수정 모달 ──
Views._courseForm = function (courseId) {
  const c = courseId ? App.courseOf(courseId) : { name: '', grade: '', kind: '단과', day: '일', time: '', room: '', sessionsCount: 5, openDate: '', staff: CONFIG.STAFF[0], material: '' };
  App.modal(`
    <h3 class="font-extrabold text-lg mb-4">${courseId ? '강좌 수정' : '강좌 추가'}</h3>
    <div class="space-y-3">
      <div><label class="lbl">강좌명</label><input id="cf-name" class="fld" value="${U.esc(c.name)}" placeholder="예: 고1 단과 · 고전 문법"/></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="lbl">대상</label><input id="cf-grade" class="fld" value="${U.esc(c.grade)}" placeholder="고1"/></div>
        <div><label class="lbl">유형</label><select id="cf-kind" class="fld">${['단과', '썸머스쿨', '정규'].map(k => `<option ${c.kind === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
        <div><label class="lbl">요일</label><select id="cf-day" class="fld">${['월', '화', '수', '목', '금', '토', '일'].map(d => `<option ${c.day === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
        <div><label class="lbl">시간</label><input id="cf-time" class="fld" value="${U.esc(c.time)}" placeholder="10:00–13:00"/></div>
        <div><label class="lbl">강의실</label><input id="cf-room" class="fld" value="${U.esc(c.room)}" placeholder="L관 101호"/></div>
        <div><label class="lbl">총 회차</label><input id="cf-cnt" type="number" class="fld" value="${c.sessionsCount}"/></div>
        <div><label class="lbl">개강일</label><input id="cf-open" type="date" class="fld" value="${c.openDate}"/></div>
        <div><label class="lbl">담당</label><select id="cf-staff" class="fld">${CONFIG.STAFF.map(s => `<option ${c.staff === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      </div>
      <div><label class="lbl">교재</label><input id="cf-mat" class="fld" value="${U.esc(c.material)}"/></div>
    </div>
    <div class="flex justify-end gap-2 mt-5">
      <button class="btn btn-ghost" onclick="App.closeModal()">취소</button>
      <button class="btn btn-primary" id="cf-save">저장</button>
    </div>`);
  document.getElementById('cf-save').onclick = async () => {
    const v = id => document.getElementById(id).value.trim();
    if (!v('cf-name')) return App.toast('강좌명을 입력하세요.', 'err');
    const ok = await App.act('upsertCourse', { id: courseId || '', name: v('cf-name'), grade: v('cf-grade'), kind: v('cf-kind'), day: v('cf-day'), time: v('cf-time'), room: v('cf-room'), sessionsCount: +v('cf-cnt') || 0, openDate: v('cf-open'), staff: v('cf-staff'), material: v('cf-mat') }, '강좌를 저장했습니다.');
    if (ok) { App.closeModal(); App.refresh(); }
  };
};

// ── 회차 추가/수정 모달 ──
Views._sessionForm = function (courseId, sessionId) {
  const s = sessionId ? App.sessionOf(sessionId) : { no: App.sessionsOf(courseId).length + 1, date: '', topic: '', isVideo: false };
  App.modal(`
    <h3 class="font-extrabold text-lg mb-4">${sessionId ? '회차 수정' : '회차 추가'}</h3>
    <div class="grid grid-cols-2 gap-3">
      <div><label class="lbl">회차 번호</label><input id="sf-no" type="number" class="fld" value="${s.no}"/></div>
      <div><label class="lbl">날짜</label><input id="sf-date" type="date" class="fld" value="${s.date}"/></div>
      <div class="col-span-2"><label class="lbl">진도 내용</label><input id="sf-topic" class="fld" value="${U.esc(s.topic)}"/></div>
      <label class="col-span-2 flex items-center gap-2 text-[13px]"><input id="sf-video" type="checkbox" class="rounded text-secondary focus:ring-secondary" ${s.isVideo ? 'checked' : ''}/>영상 회차 (출결 미집계)</label>
    </div>
    <div class="flex justify-end gap-2 mt-5">
      <button class="btn btn-ghost" onclick="App.closeModal()">취소</button>
      <button class="btn btn-primary" id="sf-save">저장</button>
    </div>`);
  document.getElementById('sf-save').onclick = async () => {
    const ok = await App.act('upsertSession', { id: sessionId || '', courseId, no: +document.getElementById('sf-no').value || 0, date: document.getElementById('sf-date').value, topic: document.getElementById('sf-topic').value.trim(), isVideo: document.getElementById('sf-video').checked }, '회차를 저장했습니다.');
    if (ok) { App.closeModal(); App.refresh(); }
  };
};

// ── 수강 등록 모달 ──
Views._enrollForm = function (courseId) {
  const enrolled = new Set(App.db.enrollments.filter(e => e.courseId === courseId).map(e => e.studentId));
  const candidates = App.db.students.filter(s => !enrolled.has(s.id) && s.status === '재원');
  App.modal(`
    <h3 class="font-extrabold text-lg mb-1">수강생 등록</h3>
    <p class="text-on-surface-variant text-[13px] mb-4">${U.esc(App.courseOf(courseId).name)}</p>
    ${candidates.length ? `
      <div class="max-h-72 overflow-y-auto space-y-1">${candidates.map(s =>
        `<label class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-container-low cursor-pointer">
          <input type="checkbox" class="ef-chk rounded text-secondary focus:ring-secondary" value="${s.id}"/>
          <span class="font-bold text-[14px]">${U.esc(s.name)}</span>
          <span class="text-on-surface-variant text-[12px]">${U.esc(s.school)} ${U.esc(s.grade)}</span>
        </label>`).join('')}</div>
      <div class="flex justify-end gap-2 mt-5">
        <button class="btn btn-ghost" onclick="App.closeModal()">취소</button>
        <button class="btn btn-primary" id="ef-save">선택 등록</button>
      </div>`
    : `<p class="text-on-surface-variant text-[13px] py-3">등록 가능한 학생이 없습니다. 학생 메뉴에서 먼저 추가하세요.</p>
      <div class="flex justify-end mt-4"><button class="btn btn-ghost" onclick="App.closeModal()">닫기</button></div>`}`);
  const save = document.getElementById('ef-save');
  if (save) save.onclick = async () => {
    const ids = [...document.querySelectorAll('.ef-chk:checked')].map(x => x.value);
    if (!ids.length) return App.toast('학생을 선택하세요.', 'err');
    for (const studentId of ids) await App.act('enroll', { studentId, courseId });
    App.toast(ids.length + '명을 등록했습니다.', 'ok');
    App.closeModal(); App.refresh();
  };
};

// ── 수강 해제 ──
Views._unenroll = function (studentId, courseId, name) {
  App.modal(`
    <h3 class="font-extrabold text-lg mb-2">수강 해제</h3>
    <p class="text-[14px] text-on-surface-variant mb-5"><b class="text-on-surface">${U.esc(name)}</b> 학생을 이 강좌에서 해제할까요?<br/>출결 기록은 지워지지 않습니다.</p>
    <div class="flex justify-end gap-2">
      <button class="btn btn-ghost" onclick="App.closeModal()">취소</button>
      <button class="btn btn-danger" id="ue-ok">해제</button>
    </div>`);
  document.getElementById('ue-ok').onclick = async () => {
    const ok = await App.act('unenroll', { studentId, courseId }, '수강을 해제했습니다.');
    if (ok) { App.closeModal(); App.refresh(); }
  };
};
