# 한티 MEXX 운영 허브 (관리자 대시보드)

학생용 사이트(hanti.oreumyak.com) 컨셉을 계승한 **가경T·실장·조교 전용** 수업 관리 대시보드.
화면: 홈(전체 현황) · 강의 · 학생(상담·진단 연동) · 출결 · 보강 · 공지(수신 확인).

- **라이브**: https://oreum1222.github.io/hantiadmin/ — PIN 입력 후 사용 (PIN은 가경T에게)
- 데이터는 Google Sheets(Apps Script 웹앱, PIN 인증)에서만 내려오며, 이 저장소에는 개인정보가 없습니다.

## 실행 (로컬)

정적 사이트라 아무 웹서버로 열면 됩니다.

```
python -m http.server 8791
→ http://127.0.0.1:8791
```

## 데모 모드 / 라이브 모드

- `js/config.js`의 `SCRIPT_URL`이 **비어 있으면 데모 모드**: localStorage + 익명 샘플 시드로 UI만 확인.
  - 데모 PIN — 마스터 `0000` / 스태프 `1111`
  - 데이터 초기화: 개발자도구 콘솔에서 `Api.demoReset()` 후 새로고침
- **라이브 모드**: `SCRIPT_URL`에 Apps Script 웹앱 URL 설정. 실제 PIN·fassessment 키는
  서버(Apps Script) 쪽에만 존재하며 이 저장소에 두지 않습니다.
- 새 백엔드 구축 절차는 `apps-script/Code.gs` 상단 주석 참고 (시트 생성 → initSheets → 웹앱 배포).

## 구조

```
index.html            셸 (사이드바 · PIN 게이트)
css/admin.css         디자인 토큰 (students.html 계승, 다크/라이트)
js/config.js          설정 (SCRIPT_URL · 담당자 목록)
js/seed.js            데모 시드 (익명 샘플 — 실데이터 금지)
js/diagnosis-data.js  진단 스냅샷 스텁 (실데이터는 라이브 릴레이)
js/api.js             데모/라이브 이중 백엔드 클라이언트
js/app.js             상태 · 해시 라우터 · 토스트 · 모달
js/views/*.js         화면 6개
apps-script/Code.gs   백엔드 (Apps Script 배포용)
docs/superpowers/specs/  설계 문서
```

## 이후 예정

숙제 · 성적 · 상담 관리 확장 · 클리닉 · 자료 · 운영진 업무 · 이상 신호 · 통계.
설계는 `docs/superpowers/specs/2026-07-13-hanti-admin-dashboard-design.md` 참고.
