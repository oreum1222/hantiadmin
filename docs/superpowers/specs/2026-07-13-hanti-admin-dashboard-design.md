# 한티 MEXX 관리자 대시보드 — 설계 (1차)

2026-07-13 · 승인: 가경T

## 목적

학생용 사이트(hanti.oreumyak.com)의 컨셉·디자인을 계승하되, 중심을 "콘텐츠 안내"에서
**오늘 처리할 업무와 관리가 필요한 학생을 보여주는 운영 허브**로 바꾼 관리자(가경T·실장·조교) 전용 대시보드.

## 확정 결정

| 항목 | 결정 |
|---|---|
| 백엔드 | Google Sheets + Apps Script 웹앱 (oreum-desk·mocksys 패턴) |
| 접근 제어 | 역할별 PIN 2개 — 마스터(가경T) / 스태프(조교·실장). 마스터 전용 메뉴는 2차부터 |
| 배포 | 1차는 로컬 개발만. 배포 위치는 추후 결정 |
| 1차 범위 | 코어 6개 화면: 홈 · 강의 · 학생 · 출결 · 보강 · 공지(사용자 요청으로 1차에 편입) |
| 2차 이후 | 숙제 · 성적 · 상담 · 클리닉 · 자료 · 운영진 업무 · 이상 신호 · 통계 · 공지 학생별 전달 확인 |

## 아키텍처 (A안: 단일 페이지 앱)

- 순수 HTML + Tailwind CDN + 바닐라 JS (학생용 사이트와 동일 스택, 빌드 없음)
- 해시 라우팅: `#home` `#courses` `#students` `#attendance` `#makeup`
- 데이터는 시작 시 한 번 로드해 메모리(`DB`)에 두고 화면 간 공유, 변경 액션마다 백엔드 반영
- **데모 모드**: `js/config.js`의 `SCRIPT_URL`이 비어 있으면 localStorage를 백엔드 삼아
  시드 데이터로 동작 → 백엔드 없이 UI 개발·검수 가능. URL을 넣으면 라이브 모드로 전환

### 파일 구조

```
hanti-admin/
  index.html            셸: 토큰·사이드바·PIN 게이트·컨테이너
  css/admin.css         디자인 토큰(students.html 계승) + 커스텀
  js/config.js          SCRIPT_URL, 데모 PIN, 담당자 목록
  js/seed.js            데모 시드(4강좌·회차·샘플 학생)
  js/api.js             데모(localStorage)/라이브(Apps Script) 이중 백엔드 클라이언트
  js/app.js             상태·라우터·PIN 게이트·토스트·모달·유틸
  js/views/home.js      전체 현황
  js/views/courses.js   강의 관리
  js/views/students.js  학생 관리
  js/views/attendance.js 출결 체크
  js/views/makeup.js    보강 관리
  apps-script/Code.gs   백엔드(추후 배포)
```

## 디자인

students.html 토큰 그대로: 다크 기본 + 라이트 토글(localStorage `mexx-theme` 공유),
배경 `#0a0c10`, 민트 `#4ae3c0` 포인트, Inter + Noto Sans KR, Material Symbols, 카드 UI.
관리자용이므로 **좌측 사이드바**(데스크톱) / **하단 탭바**(모바일).

## 데이터 모델 (Google Sheets 탭 = 엔티티)

| 탭 | 필드 |
|---|---|
| courses | id, name, grade, kind(단과/썸머스쿨), day, time, room, sessionsCount, openDate, staff, material |
| sessions | id, courseId, no, date, topic, isVideo |
| students | id, name, school, grade, phone, parentPhone, note, status(재원/휴원), createdAt |
| enrollments | id, studentId, courseId, date |
| attendance | id, sessionId, studentId, status(출석/지각/결석/사유/온라인), memo, by, ts |
| makeups | id, studentId, sessionId, courseId, status(필요→신청됨→영상전달→완료), method(영상/대면), memo, by, ts, doneAt |

- 한 학생이 여러 강좌 수강 가능(enrollments로 연결)
- **결석 체크 시 보강 항목 자동 생성**, 결석 해제 시 진행 안 된 보강(필요 상태)은 자동 제거
- 시트에 직접 명단을 붙여넣어도 동작(실장님 엑셀 워크플로 존중)

## 화면별 요구사항

### 홈 (#home)
오늘 수업 카드(요일·날짜 매칭, 시간·강의실·담당) / 미처리 보강 목록 / 최근 7일 결석자 /
강좌별 출석률 요약. 숙제·상담 위젯 자리는 2차에서 채움.

### 강의 (#courses)
강좌 카드 목록 → 상세: 기본 정보 수정, 회차 테이블(날짜·진도 편집), 수강생 목록,
회차별 출결 요약. 강좌 추가/수정 모달.

### 학생 (#students)
검색 가능한 명부 테이블 → 상세: 프로필 수정, 수강 강좌(등록/해제), 출결 이력, 보강 이력.
학생 추가 모달.

### 출결 (#attendance)
강좌 선택 → 회차 선택 → 수강생 한 줄씩 [출석|지각|결석|사유|온라인] 버튼 → 일괄 저장.
결석은 보강 자동 생성. 기록자(담당자) 선택.

### 보강 (#makeup)
상태별 필터(필요/신청됨/영상전달/완료) 목록, 상태 스테퍼로 진행, 방식(영상/대면)·메모.

### 공지 (#notices)
날짜별 타임라인 게시판 — 언제·무엇을·어느 강좌에(전체/다중 선택)·어떤 채널(문자/카톡/구두/기타)로
공지했는지 기록. 검색·대상·채널 필터, 오늘 배지, 홈에 최근 공지 3건 위젯.
notices 탭: id, date, title, body, channel, courseIds('all' 또는 쉼표 연결), by, ts.
학생별 전달 여부 확인은 2차.

## 백엔드 (apps-script/Code.gs — 추후 배포)

- `doGet`: PIN 검증 후 전체 데이터 JSON (역할 포함 응답)
- `doPost`: `{pin, action, payload}` — upsertCourse / upsertStudent / setAttendance /
  setMakeup / enroll / unenroll / upsertSession
- PIN은 Script Properties(`MASTER_PIN`, `STAFF_PIN`)에 저장, 코드에 하드코딩 안 함
- CORS 우회: POST는 `text/plain` 바디(검증된 패턴)

## 에러 처리

저장 실패 시 토스트 + 재시도, 저장 중 스피너 표시(Apps Script 1~2초 지연 대응).
데모 모드는 즉시 반영.

## 초기 데이터

- 강좌 4개: courses-data.js에서 시드(고1 단과 h1, 고2 단과 h2, 중3 썸머 sm3, 고1 썸머 sh1) + 실제 회차 날짜
- 샘플 학생 몇 명(데모 확인용, 라이브 전환 시 실명단으로 교체)
- 강의실·담당자 이름은 임시값 — 가경T 확인 후 교체 (담당자 목록은 config.js에서 수정)

## 미결(2차로 이월)

- 실제 강의실 목록·조교/실장 성함 반영
- 배포 위치(별도 repo + admin 서브도메인 예상)
- 마스터 전용 메뉴(상담·통계) 및 역할별 화면 차등
