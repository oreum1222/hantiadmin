// ═══ 문자 템플릿 ═══
// scope: 'oreum'(고3 오름 정규반) | 'hanti'(MEXX) | 'both'
// 모든 [오름] 문자는 반드시 '[오름] 국어 가경T' 로 시작.
window.MSG_TEMPLATES = [
  {
    id: 'oreum-onboard', scope: 'oreum', name: '[오름] 신규 수강생 안내',
    body: `[오름] 국어 가경T

[오름] 국어의 강의 수강을 시작한 학생들에게 보내는 문자입니다.
*첫 상담 https://oreum1222.github.io/oreum-fassessment/ (필수)
기본적으로 [오름] 국어의 강의는 주 1회 3시간(혹은 3.5시간) 이루어지지만, 추가적으로 보충 및 클리닉이 있을 수 있습니다. 이는 선생님이 필요하다고 생각할 때 학생과 시간 조율을 하여 진행될 예정입니다.

[고3 정규반] 보강 및 숙제 확인 (즐겨찾기 필수-매주 활용)
https://oreum1222.github.io/oreum-3/

[강의 영상 확인 채널]
https://www.youtube.com/@%EA%B0%80%EA%B2%BDT
*구독하여 영상 확인`
  },
  {
    id: 'oreum-head', scope: 'oreum', name: '[오름] 머리말만',
    body: `[오름] 국어 가경T

`
  },
  {
    id: 'hanti-head', scope: 'hanti', name: '[한티 MEXX] 머리말만',
    body: `[김가경 국어 연구소]

`
  },
];
