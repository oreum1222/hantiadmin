// ═══ 데모 시드 데이터 (익명 샘플) ═══
// ⚠️ 공개 저장소 — 실명단·연락처·상담 내용을 절대 이 파일에 넣지 말 것.
// 실데이터는 라이브 모드(Google Sheets 백엔드, PIN 인증)에서만 내려옵니다.
// 이 시드는 SCRIPT_URL이 비어 있는 로컬 데모 모드에서 UI 확인용으로만 쓰입니다.
window.SEED = (function () {
  const courses = [
    { id: 'h1', name: '고1 단과 [고전 영역]', grade: '고1', kind: '단과', day: '일', time: '10:00–13:00', room: '2관 L층 101호', sessionsCount: 5, openDate: '2026-07-12', staff: '가경T', material: '고전문법 개념서 + 고전시가 (자체 제작)' },
    { id: 'h2', name: '고2 단과 [화법과 언어]', grade: '고2', kind: '단과', day: '일', time: '14:00–17:30', room: '2관 L층 101호', sessionsCount: 5, openDate: '2026-07-12', staff: '가경T', material: '현대문법 개념서 + 화법 워크북 (자체 제작)' },
    { id: 'sm3', name: '중3 썸머스쿨 · 현대 문법', grade: '중3', kind: '썸머스쿨', day: '월', time: '09:00–12:30', room: '', sessionsCount: 3, openDate: '2026-07-27', staff: '가경T', material: '현대 문법 개념서 / 유형서 · 내신형 워크북' },
    { id: 'sh1', name: '고1 썸머스쿨 · 고전 문법', grade: '고1', kind: '썸머스쿨', day: '금', time: '09:00–12:30', room: '', sessionsCount: 3, openDate: '2026-07-24', staff: '가경T', material: '고전문법 개념서 (자체 제작) · 복습 워크북' },
  ];

  const sessions = [
    { id: 'h1-1', courseId: 'h1', no: 1, date: '2026-07-12', topic: '고전 문법의 이해 + 세종어제훈민정음 ① / 고전 시가의 이해 + 고대가요', isVideo: false },
    { id: 'h1-2', courseId: 'h1', no: 2, date: '2026-07-19', topic: '중세국어: 세종어제훈민정음 ② / 향가', isVideo: false },
    { id: 'h1-3', courseId: 'h1', no: 3, date: '2026-07-26', topic: '중세국어: 용비어천가 ① / 고려가요', isVideo: false },
    { id: 'h1-4', courseId: 'h1', no: 4, date: '2026-08-02', topic: '중세국어: 용비어천가 ② / 시조와 가사', isVideo: false },
    { id: 'h1-5', courseId: 'h1', no: 5, date: '2026-08-09', topic: '중세국어: 소학언해 / 가사', isVideo: false },
    { id: 'h2-1', courseId: 'h2', no: 1, date: '2026-07-12', topic: '문법·화법 영역의 이해 · 국어의 품사', isVideo: false },
    { id: 'h2-2', courseId: 'h2', no: 2, date: '2026-07-19', topic: '문장 성분 · 화법 문제 풀이의 이해', isVideo: false },
    { id: 'h2-3', courseId: 'h2', no: 3, date: '2026-07-26', topic: '형태소와 단어의 짜임새', isVideo: false },
    { id: 'h2-4', courseId: 'h2', no: 4, date: '2026-08-02', topic: '음운의 정의와 체계 · 음운변동 ①', isVideo: false },
    { id: 'h2-5', courseId: 'h2', no: 5, date: '2026-08-09', topic: '음운변동 ②', isVideo: false },
    { id: 'sm3-1', courseId: 'sm3', no: 1, date: '2026-07-27', topic: '문법 영역의 구조와 이해 · 국어의 품사', isVideo: false },
    { id: 'sm3-2', courseId: 'sm3', no: 2, date: '2026-08-03', topic: '문장 성분', isVideo: false },
    { id: 'sm3-3', courseId: 'sm3', no: 3, date: '2026-08-10', topic: '형태소와 단어의 짜임새', isVideo: false },
    { id: 'sm3-v', courseId: 'sm3', no: 4, date: '', topic: '[영상] 문장의 짜임새', isVideo: true },
    { id: 'sh1-1', courseId: 'sh1', no: 1, date: '2026-07-24', topic: '고전 문법의 이해 · 세종어제훈민정음 ①', isVideo: false },
    { id: 'sh1-2', courseId: 'sh1', no: 2, date: '2026-07-31', topic: '세종어제훈민정음 ②', isVideo: false },
    { id: 'sh1-3', courseId: 'sh1', no: 3, date: '2026-08-07', topic: '용비어천가', isVideo: false },
  ];

  // 익명 샘플 학생 (UI 데모용)
  const students = [
    { id: 'demo1', name: '김샘플', school: '데모고등학교', grade: '고1', phone: '010-0000-0000', parentPhone: '010-0000-0000', note: '데모 데이터입니다', consult: '데모 상담 기록입니다.\n성적: 예시 · 취약: 예시', status: '재원', createdAt: '2026-07-12' },
    { id: 'demo2', name: '이데모', school: '샘플고등학교', grade: '고2', phone: '010-0000-0001', parentPhone: '010-0000-0001', note: '', status: '재원', createdAt: '2026-07-12' },
  ];

  const enrollments = [
    { id: 'de1', studentId: 'demo1', courseId: 'h1', date: '2026-07-12' },
    { id: 'de2', studentId: 'demo2', courseId: 'h2', date: '2026-07-12' },
  ];

  const attendance = [
    { id: 'da1', sessionId: 'h1-1', studentId: 'demo1', status: '출석', memo: '', by: '가경T', ts: '2026-07-12T10:05:00' },
    { id: 'da2', sessionId: 'h2-1', studentId: 'demo2', status: '결석', memo: '데모', by: '가경T', ts: '2026-07-12T14:05:00' },
  ];

  const makeups = [
    { id: 'dm1', studentId: 'demo2', sessionId: 'h2-1', courseId: 'h2', status: '필요', method: '', memo: '데모', by: '가경T', ts: '2026-07-12T14:05:00', doneAt: '' },
  ];

  const notices = [
    { id: 'dn1', date: '2026-07-12', title: '데모 공지', channel: '문자', courseIds: 'all', by: '가경T', ts: '2026-07-12T18:30:00', body: '데모 모드 공지 예시입니다. 실데이터는 라이브 모드에서 표시됩니다.' },
  ];

  const tasks = [
    { id: 'dt1', title: '데모 업무: 2회차 복사물 확인', detail: '데모 항목입니다.', assignee: '전체(모두)', due: '', status: '대기', by: '가경T', doneBy: '', doneAt: '', ts: '2026-07-12T00:00:00' },
  ];

  const leads = [
    { id: 'dl1', name: '데모 문의자', phone: '', grade: '', via: '카톡 채널', summary: '데모 신규 문의 예시입니다.', status: '신규', date: '2026-07-12', by: '가경T', memo: '', ts: '2026-07-12T00:00:00' },
  ];

  return { courses, sessions, students, enrollments, attendance, makeups, notices, tasks, leads };
})();
