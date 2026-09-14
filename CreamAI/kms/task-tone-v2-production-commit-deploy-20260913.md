# Production commit/deploy — reusable knowledge

## Context

- Project: `ax-lab-cream/chungi-t`
- Domain: `umsh.kr`
- Date: 2026-09-13

## Verified lesson

The Vercel CLI used by this project validates `functions.api/index.ts.includeFiles` as one string glob. Supplying multiple strings as an array fails before the build begins. Multiple required roots can remain explicit in one brace-expanded glob, and the exact string should be frozen by a configuration test.

## Release gate

- Scan the staged set for real credential formats and known submitted password literals.
- Run the full serial suite, typecheck and `vercel build --prod` before committing.
- Confirm the `.vercel/project.json` project ID and the domain-to-project mapping under the intended team scope before deploying.

## Verified outcome

- Source commit: `e75104c`
- GitHub branch: `codex/tone-v2`
- Vercel deployment: `dpl_DzR7DobFjVRzgvWUQNNm8GrHp6Yg`
- Production alias: `https://umsh.kr`
- Health: HTTP 200, `ok: true`, corpus registry `tone-v2.2.0.20`
- Route smoke: public and administrator shell entry routes returned 200; protected administrator data endpoints returned 401 without a session.
- Initial error-log scan: clean.
