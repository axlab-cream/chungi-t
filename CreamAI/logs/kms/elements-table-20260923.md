# 공용 리포트 오행 계산값을 시맨틱 표로 수정

- observation: 삽입형 06 상세 리포트의 오행 계산값은 `ul/li` 마크업이었고, 전용 스타일이 전체화면 리더 범위에만 있어 모바일에서 항목과 숫자가 한 글자씩 세로로 깨졌다.
- decision: 저장된 실제 다섯 기운 횟수는 그대로 두고 공용 렌더러를 5열 `table`로 바꾼다. 열은 나무·불·흙·쇠·물, 값은 회원별 계산값이다. 상대 막대는 표의 보조 표현이며 운세 점수가 아니다.
- artifact: commit `70b5dd9`; shared renderer JS, full/in-place reader CSS, cache references, contract test.
- QA result: focused 15/15, full 1539/1539, typecheck, cat contract, 20-service QA, Vercel build and diff check pass. Production deployment `dpl_65WE43tkQRrjpCZoToHzNLLqiCnS` Ready. Logged-in operating report exposed a real TABLE with five headers and values, width 400 within 430 host, and current JS/CSS cache version.
- lesson: dynamic shared markup and shared CSS versions must be deployed together. An element styled only under `#umsh-verified-reading` will appear unstyled inside `[data-umsh-slot="sections"]`.
- relation: `personal/carrotcap/notes/umsh-cat-reader-20-visuals-20260923.md`.
- next_patch: none for this issue. Existing reading-guide table can be reviewed separately if requested; it was not part of the selected defect.
