# All-service final PDF — reusable knowledge

## Context

- Project: `ax-lab-cream/chungi-t`
- Task: `task-tone-v2-all-service-final-pdf-20260913`
- Date: 2026-09-13
- AIOS routes: `04 Workflows`, `11 Ops`, `12 QA/Eval`, `14 Memory/KMS`

## Verified pattern

When a full-service PDF must be produced before every release evidence gate is complete, never flatten all outputs into one undifferentiated “final” state. Export each service with an explicit provenance tier:

1. actual provider-generated, stored and replay-verified output;
2. actual deterministic-engine stored and branch-verified output;
3. production-equivalent template/corpus/RAG synthetic QA output.

Strip internal attempts, rejected raw provider prose, generation metadata, credentials and customer data before document authoring. Keep the aggregate release decision visible in the document.

## Verified outcome

- 20 services and 730 interpreted sections exported.
- 5 provider-verified, 1 deterministic-verified and 14 production-template QA services.
- One 328-page A4 PDF with 20 service bookmarks and no blank pages.
- All 20 service titles were text-extractable.
- Visual inspection passed for cover, table of contents, overview, deterministic result, synthetic QA chapter, provider chapter and closing page.
- Credential/privacy scan found no submitted account identifiers, passwords, attempts, raw provider text, token usage or generator metadata.
- Artifact SHA-256: `D86D07585BB6061CBB34AF6183B3BB91624A09159071B6940CA0DB00456C679E`.

## Reusable commands

```powershell
npm exec tsx scripts/export-final-service-reports.ts -- tmp/pdfs/final-service-reports.json
& 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/build-final-service-pdf.py tmp/pdfs/final-service-reports.json 'C:\Users\user\Desktop\운명상회-최종\운명상회-전체서비스-최종산출물.pdf'
```

## Remaining boundary

- The document is a complete current-output QA artifact, not a release approval.
- Fourteen services still need provider/full-outline/visual evidence before the aggregate can become `GO`.
- Remote CreamWIKI save/index was not run because the tunnel endpoint returned `authentication_required`; this sanitized local KMS record remains available.
