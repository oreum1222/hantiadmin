// ═══ 조교 확인 (운영진 업무 체크리스트) ═══
// 상단: 매주 일요일 정기 루틴(수업 전/중/후) · 하단: 수시 업무(가경T 등록, 조교 완료 체크)
Views.tasks = function (el) {
  const worker = localStorage.getItem('hanti-admin-worker') || CONFIG.STAFF[1] || '실장';
  App.db.tasks || (App.db.tasks = []);

  // ── 매주 일요일 정기 루틴 (MEXX 수업: 현대문법 내신 오전 / 수능 국어반 오후) ──
  const ROUTINE = [
    { id: 'am-print', phase: '수업 전', when: '일 09:05', cls: '현대문법 내신', staff: '규민·경은', task: '워크북 출력 부수 확인', note: '예담T 최종본·노션 기준' },
    { id: 'pm-print', phase: '수업 전', when: '일 13:05', cls: '수능 국어반', staff: '규민·경은·채현·재희', task: '워크북 출력 부수 확인', note: '예담T 최종본·노션 기준' },
    { id: 'am-collect', phase: '수업 중', when: '일 09:55', cls: '현대문법 내신', staff: '규민·경은', task: '숙제 검사', subs: ['워크북 걷기', '워크북 과제 코멘트 작성 (학생 워크북에 기록 + 우리 단톡에 기록)', '모든 사항 단톡에 공유'] },
    { id: 'am-missing', phase: '수업 중', when: '일 10:55', cls: '현대문법 내신', staff: '규민·경은', task: '과제 점검 시스템 미제출자 제출하게 하기', note: '학습 진단 등 · 하원 전 무조건' },
    { id: 'am-observe', phase: '수업 중', when: '수업 중', cls: '현대문법 내신', staff: '규민·경은', task: '수업 중 학생 관찰', note: '수업 태도·이해도 등 특이사항 기록' },
    { id: 'pm-collect', phase: '수업 중', when: '일 13:55', cls: '수능 국어반', staff: '규민·경은·채현·재희', task: '숙제 검사', subs: ['워크북 걷기', '워크북 과제 코멘트 작성 (학생 워크북에 기록 + 우리 단톡에 기록)', '모든 사항 단톡에 공유'] },
    { id: 'pm-missing', phase: '수업 중', when: '일 14:55', cls: '수능 국어반', staff: '규민·경은·채현·재희', task: '과제 점검 시스템 미제출자 제출하게 하기', note: '하원 전 무조건' },
    { id: 'pm-observe', phase: '수업 중', when: '수업 중', cls: '수능 국어반', staff: '규민·경은·채현·재희', task: '수업 중 학생 관찰', note: '수업 태도·이해도 등 특이사항 기록' },
    { id: 'am-attend', phase: '수업 후', when: '일 11:55', cls: '현대문법 내신', staff: '규민·경은', task: '출석부 특이사항 점검 · 출석부 사진 단톡 공유' },
    { id: 'pm-attend', phase: '수업 후', when: '일 15:55', cls: '수능 국어반', staff: '규민·경은·채현·재희', task: '출석부 특이사항 점검 · 출석부 사진 단톡 공유' },
  ];
  const PHASES = [['수업 전', 'inventory_2'], ['수업 중', 'edit_note'], ['수업 후', 'fact_check']];
  function weekKey() { const d = new Date(); const s = new Date(d); s.setDate(d.getDate() - d.getDay()); return s.toISOString().slice(0, 10); }
  const WK = 'hanti-routine-' + weekKey();
  const loadChk = () => { try { return JSON.parse(localStorage.getItem(WK) || '{}'); } catch (e) { return {}; } };
  const saveChk = o => { try { localStorage.setItem(WK, JSON.stringify(o)); } catch (e) { } };

  el.innerHTML = `
  <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight">조교 확인</h1>
      <p class="text-on-surface-variant text-[14px] mt-1">매주 정기 루틴을 수업 전·중·후로 점검하고, 수시 업무를 완료 체크합니다.</p>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      <div class="flex items-center gap-2 text-[13px] text-on-surface-variant">나는
        <select id="tk-worker" class="fld !w-auto">${CONFIG.STAFF.map(s => `<option ${s === worker ? 'selected' : ''}>${s}</option>`).join('')}</select>
      </div>
      <button class="btn btn-primary" onclick="Views._taskForm()"><span class="material-symbols-outlined text-[18px]">add_task</span>수시 업무 추가</button>
    </div>
  </div>

  <section class="card p-5 mb-6 border-2 border-amber-500/40 bg-amber-500/5">
    <h2 class="font-bold text-[16px] flex items-center gap-2 mb-2.5 text-amber-500"><span class="material-symbols-outlined text-[20px]">campaign</span>신규생 있을 시 필독</h2>
    <ol class="space-y-2 text-[13.5px] pl-0.5">
      <li><b class="text-amber-500">1)</b> 대면 상담지 작성 후 <b>바로 단톡에 공유</b> — 파일명 <span class="font-semibold bg-surface-container-low rounded px-1.5 py-0.5">YYMMDD_강의명_학생명_상담담당자명</span> 으로 통일</li>
      <li><b class="text-amber-500">2)</b> 솔라피에 주소록 추가 (학생 및 학부모님 모두)</li>
      <li><b class="text-amber-500">3)</b> 학습 진단 하게 하기</li>
      <li><b class="text-amber-500">4)</b> 관리자 대시보드 <b>문자 발송 탭</b>에서 학생 및 학부모님 신규 문자 발송 <span class="text-on-surface-variant">(템플릿 저장돼 있음)</span></li>
    </ol>
  </section>

  <div id="routine-board"></div>

  <div class="flex items-center gap-2 mb-3 mt-2">
    <span class="material-symbols-outlined text-secondary text-[20px]">assignment</span>
    <h2 class="font-bold text-[16px]">수시 업무</h2>
  </div>
  <div class="card p-4 mb-4 flex flex-wrap gap-3 items-center">
    <select id="tk-assignee" class="fld !w-auto">
      <option value="">전체 담당</option><option>전체(모두)</option>
      ${CONFIG.STAFF.map(s => `<option>${s}</option>`).join('')}
    </select>
    <label class="flex items-center gap-2 text-[13px] text-on-surface-variant"><input id="tk-showdone" type="checkbox" class="rounded text-secondary focus:ring-secondary"/>완료 항목 표시</label>
  </div>
  <div id="tk-list" class="space-y-2.5"></div>`;

  document.getElementById('tk-worker').addEventListener('change', e => { localStorage.setItem('hanti-admin-worker', e.target.value); });

  // ── 정기 루틴 렌더 ──
  function drawRoutine() {
    const chk = loadChk();
    const leafIds = r => r.subs ? r.subs.map((_, i) => r.id + '-' + i) : [r.id];
    const allLeaves = ROUTINE.flatMap(leafIds);
    const doneN = ids => ids.filter(id => chk[id]).length;
    const done = doneN(allLeaves), total = allLeaves.length;
    const leafRow = (lid, label, meta) => { const c = chk[lid]; return `
      <label class="flex items-start gap-3 py-2.5 border-b border-outline-variant last:border-0 cursor-pointer">
        <input type="checkbox" class="rt-chk mt-0.5 w-5 h-5 rounded text-secondary focus:ring-secondary cursor-pointer" data-id="${lid}" ${c ? 'checked' : ''}/>
        <div class="min-w-0 flex-1 ${c ? 'opacity-55' : ''}">
          ${meta ? `<div class="flex items-center gap-1.5 flex-wrap">
            <span class="chip border border-outline-variant text-on-surface-variant">${meta.when}</span>
            <span class="chip border text-secondary border-secondary/30 bg-secondary-fixed/50">${meta.cls}</span>
            <span class="font-semibold text-[13.5px] ${c ? 'line-through' : ''}">${U.esc(meta.task)}</span>
          </div>${meta.note ? `<div class="text-on-surface-variant text-[12px] mt-0.5">${U.esc(meta.note)}</div>` : ''}
          <div class="text-on-surface-variant text-[11px] mt-0.5">담당 ${U.esc(meta.staff)}${c ? ` · ✓ ${U.esc(c.by)} ${U.esc(c.at)}` : ''}</div>`
      : `<div class="text-[13px] ${c ? 'line-through' : ''}">${U.esc(label)}</div>${c ? `<div class="text-on-surface-variant text-[11px] mt-0.5">✓ ${U.esc(c.by)} ${U.esc(c.at)}</div>` : ''}`}
        </div>
      </label>`; };
    const itemHTML = r => {
      if (!r.subs) return leafRow(r.id, '', r);
      const sd = doneN(leafIds(r));
      return `<div class="py-2.5 border-b border-outline-variant last:border-0">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="chip border border-outline-variant text-on-surface-variant">${r.when}</span>
          <span class="chip border text-secondary border-secondary/30 bg-secondary-fixed/50">${r.cls}</span>
          <span class="font-semibold text-[13.5px]">${U.esc(r.task)}</span>
          <span class="chip border ${sd === r.subs.length ? 'text-secondary border-secondary/30 bg-secondary-fixed/50' : 'text-on-surface-variant border-outline-variant'}">${sd}/${r.subs.length}</span>
        </div>
        <div class="text-on-surface-variant text-[11px] mt-0.5 mb-1">담당 ${U.esc(r.staff)}</div>
        <div class="pl-3 ml-0.5 border-l-2 border-outline-variant">${r.subs.map((s, i) => leafRow(r.id + '-' + i, s, null)).join('')}</div>
      </div>`;
    };
    document.getElementById('routine-board').innerHTML = `
    <section class="card p-5 mb-6">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 class="font-bold text-[16px] flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[20px]">event_repeat</span>정기 루틴 <span class="text-on-surface-variant font-normal text-[13px]">매주 일요일 · MEXX 수업</span></h2>
        <span class="chip border ${done === total ? 'text-secondary border-secondary/30 bg-secondary-fixed/50' : 'text-on-surface-variant border-outline-variant'}">${done}/${total} 완료</span>
      </div>
      <div class="h-1.5 rounded-full bg-surface-container-low overflow-hidden mb-4"><div class="h-full rounded-full bg-secondary transition-all" style="width:${done / total * 100}%"></div></div>
      <div class="grid md:grid-cols-3 gap-4">
        ${PHASES.map(([ph, ic]) => { const items = ROUTINE.filter(r => r.phase === ph); const lv = items.flatMap(leafIds); return `<div>
          <div class="flex items-center gap-1.5 text-[13px] font-bold mb-2"><span class="material-symbols-outlined text-secondary text-[18px]">${ic}</span>${ph} <span class="text-on-surface-variant font-normal">${doneN(lv)}/${lv.length}</span></div>
          <div class="rounded-lg border border-outline-variant bg-surface-container-low/30 px-3.5">
            ${items.map(itemHTML).join('')}
          </div>
        </div>`; }).join('')}
      </div>
      <p class="text-on-surface-variant text-[11px] mt-3">체크는 이 기기에 저장되며 매주(일요일 기준) 자동으로 새로 시작됩니다. 조교 공용 공유 체크가 필요하면 알려주세요.</p>
    </section>`;
    document.querySelectorAll('.rt-chk').forEach(c => c.addEventListener('change', () => {
      const o = loadChk(); const me = document.getElementById('tk-worker').value;
      if (c.checked) o[c.dataset.id] = { by: me, at: U.today().slice(5) }; else delete o[c.dataset.id];
      saveChk(o); drawRoutine();
    }));
  }
  drawRoutine();

  // ── 수시 업무 (DB 연동) ──
  function dday(due) {
    if (!due) return '';
    const diff = Math.round((new Date(due + 'T00:00:00') - new Date(U.today() + 'T00:00:00')) / 864e5);
    if (diff < 0) return `<span class="chip border text-red-400 bg-red-400/10 border-red-400/30">지연 ${-diff}일</span>`;
    if (diff === 0) return '<span class="chip border text-yellow-500 bg-yellow-500/10 border-yellow-500/30">오늘 마감</span>';
    return `<span class="chip border border-outline-variant text-on-surface-variant">D-${diff}</span>`;
  }
  function draw() {
    const fa = document.getElementById('tk-assignee').value;
    const showDone = document.getElementById('tk-showdone').checked;
    let list = [...(App.db.tasks || [])];
    if (fa) list = list.filter(t => (t.assignee || '') === fa);
    const pend = list.filter(t => t.status !== '완료').sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
    const done = list.filter(t => t.status === '완료').sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
    const rows = showDone ? [...pend, ...done] : pend;
    document.getElementById('tk-list').innerHTML = rows.length ? rows.map(t => `
      <div class="card p-4 flex items-start gap-3 ${t.status === '완료' ? 'opacity-60' : ''}">
        <input type="checkbox" class="tk-chk mt-1 w-5 h-5 rounded text-secondary focus:ring-secondary cursor-pointer" data-id="${t.id}" ${t.status === '완료' ? 'checked' : ''}/>
        <div class="min-w-0 flex-1 row-click" onclick="Views._taskForm('${t.id}')">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-[15px] ${t.status === '완료' ? 'line-through' : ''}">${U.esc(t.title)}</span>
            ${t.assignee ? `<span class="chip border text-secondary border-secondary/30 bg-secondary-fixed/50">${U.esc(t.assignee)}</span>` : ''}
            ${t.status !== '완료' ? dday(t.due) : ''}
            ${t.status === '완료' ? `<span class="chip border text-secondary border-secondary/25 bg-secondary-fixed/40">✓ ${U.esc(t.doneBy || '')} · ${U.fmtD(t.doneAt)}</span>` : ''}
          </div>
          ${t.detail ? `<p class="text-on-surface-variant text-[13px] mt-1 whitespace-pre-wrap">${U.esc(t.detail)}</p>` : ''}
          <p class="text-on-surface-variant text-[11px] mt-1.5">등록 ${U.esc(t.by || '')}${t.due ? ' · 마감 ' + U.fmtD(t.due) : ''}</p>
        </div>
      </div>`).join('')
      : `<div class="card p-10 text-center text-on-surface-variant text-[14px]">${fa || !showDone ? '표시할 수시 업무가 없습니다. 👍' : '등록된 수시 업무가 없습니다.'}</div>`;

    document.querySelectorAll('.tk-chk').forEach(c => c.addEventListener('change', async () => {
      const t = (App.db.tasks || []).find(x => x.id === c.dataset.id);
      if (!t) return;
      const me = document.getElementById('tk-worker').value;
      const payload = c.checked ? { id: t.id, status: '완료', doneBy: me, doneAt: U.today() } : { id: t.id, status: '대기', doneBy: '', doneAt: '' };
      const ok = await App.act('upsertTask', payload, c.checked ? `완료 처리했습니다 (${me}).` : '대기로 되돌렸습니다.');
      if (ok) draw(); else { c.checked = !c.checked; }
    }));
  }
  ['tk-assignee', 'tk-showdone'].forEach(id => document.getElementById(id).addEventListener('input', draw));
  draw();
};

// ── 업무 추가/수정 모달 ──
Views._taskForm = function (taskId) {
  const t = taskId ? (App.db.tasks || []).find(x => x.id === taskId)
    : { title: '', detail: '', assignee: '전체(모두)', due: '', by: App.role === 'master' ? '가경T' : (localStorage.getItem('hanti-admin-worker') || '실장') };
  if (!t) return;
  App.modal(`
    <h3 class="font-extrabold text-lg mb-4">${taskId ? '수시 업무 수정' : '수시 업무 추가'}</h3>
    <div class="space-y-3">
      <div><label class="lbl">업무 내용 *</label><input id="tf-title" class="fld" value="${U.esc(t.title)}" placeholder="예: 2회차 복사물 준비 확인"/></div>
      <div><label class="lbl">상세 (선택)</label><textarea id="tf-detail" class="fld" rows="3" placeholder="세부 지시·링크 등">${U.esc(t.detail || '')}</textarea></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="lbl">담당</label><select id="tf-assignee" class="fld">${['전체(모두)', ...CONFIG.STAFF].map(s => `<option ${t.assignee === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div><label class="lbl">마감일 (선택)</label><input id="tf-due" type="date" class="fld" value="${t.due || ''}"/></div>
      </div>
    </div>
    <div class="flex justify-between gap-2 mt-5">
      ${taskId ? '<button class="btn btn-danger" id="tf-del">삭제</button>' : '<span></span>'}
      <div class="flex gap-2">
        <button class="btn btn-ghost" onclick="App.closeModal()">취소</button>
        <button class="btn btn-primary" id="tf-save">저장</button>
      </div>
    </div>`);
  document.getElementById('tf-save').onclick = async () => {
    const v = id => document.getElementById(id).value.trim();
    if (!v('tf-title')) return App.toast('업무 내용을 입력하세요.', 'err');
    const ok = await App.act('upsertTask', { id: taskId || '', title: v('tf-title'), detail: v('tf-detail'), assignee: v('tf-assignee'), due: document.getElementById('tf-due').value, ...(taskId ? {} : { status: '대기', by: t.by }) }, '업무를 저장했습니다.');
    if (ok) { App.closeModal(); App.refresh(); }
  };
  const del = document.getElementById('tf-del');
  if (del) del.onclick = async () => {
    const ok = await App.act('deleteTask', { id: taskId }, '업무를 삭제했습니다.');
    if (ok) { App.closeModal(); App.refresh(); }
  };
};
