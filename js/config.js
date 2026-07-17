// ═══ 운영 허브 설정 ═══
window.Views = {}; // 뷰 레지스트리 (views/*.js가 등록, app.js가 호출)
window.CONFIG = {
  // Apps Script 웹앱 URL. 비어 있으면 데모 모드(localStorage)로 동작.
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzNg79BjvaVqXZF6LFKIGsH1sOqIjQETgGbB62L6xn6WR5AfcJ0D_xxZ2HO-g5JzSbKBg/exec',

  // 학습 성향 진단(fassessment) 연동 — 라이브 모드에선 백엔드가 릴레이(키 불필요)
  FASSESSMENT_URL: 'https://script.google.com/macros/s/AKfycby9qU_19oS8xDijJJttVEf5MChRvNW4oLpMlGejsGaSOUp55mJkeQG_sdBmhczitR_B/exec',
  FASSESSMENT_KEY: '',  // ⚠️ 공개 저장소이므로 키를 여기 두지 말 것 (백엔드 릴레이 사용)
  FASSESSMENT_SITE: 'https://oreum1222.github.io/oreum-fassessment/',

  // 데모 모드 전용 PIN (라이브 모드에서는 서버에서 검증 — 실제 PIN을 여기 두지 말 것)
  DEMO_PIN_MASTER: '0000',
  DEMO_PIN_STAFF: '1111',

  // 담당자 선택지 (조교 확인·출결 기록자·강좌 담당 등) — 한티 메가 조교진
  STAFF: ['가경T', '다미', '채현', '경은', '규민'],

  // 공지 발송 주체 (연구소 내부 + 학원 측 발송 구분)
  NOTICE_SENDERS: ['가경T', '학원(MEXX)', '다미', '채현', '경은', '규민'],

  // 출결 상태
  ATT_STATUSES: ['출석', '지각', '결석', '사유', '온라인'],

  // 보강 진행 단계
  MAKEUP_FLOW: ['필요', '신청됨', '영상전달', '완료'],

  // 신규 문의 진행 상태
  LEAD_STATUS: ['신규', '상담중', '등록', '미등록'],

  // 신규 문의 유입 경로
  LEAD_VIA: ['카톡 채널', '전화', '문자', '유튜브', '기타'],
};
