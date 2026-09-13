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

