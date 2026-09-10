# Web Design Required Workflow

## Rule

앞으로 CreamAI CLI에서 웹 디자인, 프론트엔드 UI, 랜딩 페이지, 대시보드, 앱 화면, 리디자인을 수행할 때는 아래 두 스킬을 필수로 확인한다.

1. Anthropic Frontend Design
2. UI UX Pro Max

지원 사용도구:

- 21st.dev Community Components: https://21st.dev/community/components

## Workflow

1. 프로젝트 목적, 사용자, 화면의 단일 역할을 정리한다.
2. CreamWIKI에서 유사 성공/실패 사례를 검색한다.
3. 두 디자인 스킬 등록 문서를 읽는다.
4. 21st.dev Community Components에서 관련 컴포넌트 패턴을 참고한다.
5. 구현 전 디자인 계획을 만든다.
6. 다중 화면이면 `design-system/MASTER.md`를 만든다.
7. 구현 후 모바일/데스크톱, 대비, 포커스, hover, reduced motion, 텍스트 맞춤을 확인한다.
8. `status.md`와 필요 시 CreamWIKI에 결정과 검증 결과를 기록한다.

## CLI SETUP Binding

CARROTCAP/CreamAI CLI SETUP 템플릿에 다음 파일로 반영한다.

- `CreamAI/workflows/web-design-skills.md`
- `.claude/skills/frontend-design/SKILL.md`
- `.claude/skills/ui-ux-pro-max/SKILL.md`
- `docs/DESIGN_SKILLS.md`
