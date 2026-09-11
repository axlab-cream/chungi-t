# CreamWIKI AIOS/KMS Workflow

## Purpose

Use CreamWIKI as the shared evidence layer for AIOS work. The goal is to reuse
verified success cases, avoid repeated mistakes, and leave new validated
knowledge for the next agent or project.

If an imported prompt mentions another company or wiki name, treat it as a
source-template typo and normalize the target name to `CreamWIKI`.

## Trigger

Follow this workflow when the user asks for any of these:

- CreamWIKI, Wiki, KMS, RAG, memory, or knowledge-base linked work
- evidence-based implementation
- saving a successful or failed case for reuse
- AIOS/KMS commands or prompt-driven collaboration

## Preflight

1. Identify the selected project root and task summary.
2. Use only the user-designated CreamWIKI root. In CreamAI CLI this is passed
   as the `CREAMWIKI_ROOT` environment variable after the user sets the global
   CreamWIKI folder.
3. Do not auto-detect CreamWIKI from the current project root or parent folders.
   The project root and the wiki root are separate concepts.
4. If `CREAMWIKI_ROOT` is missing, invalid, or its scripts are unavailable,
   continue in degraded mode:
   - search local ProjectOps memory with `CreamAI/scripts/search-project-memory.ps1`
   - search repository text with `rg`
   - record CreamWIKI indexing/search as `NOT_RUN` or `BLOCKED`
5. Never store API keys, OAuth tokens, cookies, passwords, private keys,
   authorization headers, or raw secret-bearing logs.

## Remote Access (verified 2026-09-11)

No local `CREAMWIKI_ROOT` exists on this PC, so the local `scripts/*.py`
commands below are unavailable. The working path is the remote API over an SSH
tunnel.

```bash
# 1. ensure the tunnel (SessionStart hook also runs this)
pwsh -NoProfile -File "C:/Users/user/bin/creamwiki-tunnel.ps1"

# 2. confirm the API answers with JSON, not a 302
curl -s -m 5 http://127.0.0.1:18765/api/v1/kms/me

# 3. query
export PYTHONIOENCODING=utf-8
python ~/creamwiki/kms_cli.py search "<query>" --limit 5   # --scope all|core|personal
python ~/creamwiki/kms_cli.py get "<relativePath>"
python ~/creamwiki/kms_cli.py put "notes/<file>.md" --file ./note.md
```

Constraints that change how this workflow runs:

- The public HTTPS API (`https://wiki.crea-m.com/api/v1/...`) returns `302`.
  Never use it as the base URL.
- Core documents are read-only, and `get` returns a summary truncated near 650
  characters. For full text read the server original:
  `ssh nexus "cat /home/www/webapps/creamwiki/memory/wiki/<relativePath>"`.
- Writes land under `personal/carrotcap/` only. There is no delete API, so reuse
  a fixed path such as `notes/_scratch.md` for throwaway checks instead of
  date-stamped paths.
- The reindex commands in the Reindex section are server-side and unavailable
  from here. Record them as `NOT_RUN` rather than `PASS`.

## Search First

Before implementation, create 3-7 focused search queries from:

- user request
- related feature names
- likely file/module names
- failure symptoms
- desired success pattern
- relevant AIOS route names

Preferred CreamWIKI command:

```powershell
python scripts/query_aios_kms.py "<query>" --top-k 8
```

If collection filters exist, prefer the most relevant subset:

```powershell
python scripts/query_aios_kms.py "<query>" --top-k 8 --collections project_ops code_kms agents skills
```

Fallback local memory command:

```powershell
.\CreamAI\scripts\search-project-memory.ps1 -Query "<query>" -IncludeCandidates
```

Fallback repository command:

```powershell
rg -n "<query>"
```

## AIOS Route Mapping

Map each task to one or more routes and mention the mapping in the plan or
work-log:

- `00 Context`
- `01 Skills`
- `02 Agents`
- `03 Teams`
- `04 Workflows`
- `05 Hooks`
- `06 Templates`
- `07 Design System`
- `08 Components`
- `09 Assets`
- `10 MCP`
- `11 Ops`
- `12 QA/Eval`
- `13 Deploy`
- `14 Memory/KMS`

## Apply Evidence

When search returns reusable evidence, extract only the operational facts:

- applicable rule
- success pattern
- risk warning
- recommended command
- related file path
- do-not-repeat pattern
- revalidation method

Do not paste long raw search results into work files. Summarize the useful
parts and cite paths or document titles.

## Save Work Log

After implementation or inspection, save a sanitized Markdown work-log to the
best available CreamWIKI path. Prefer these folders when they exist:

- `memory/wiki/operations/`
- `memory/wiki/projects/`
- `memory/wiki/sessions/`
- `memory/wiki/rules/`
- `memory/wiki/code/`
- `memory/wiki/lessons/`
- `MD/Knowledge/RAG_Briefings/`

Use this filename pattern:

```text
YYYY-MM-DD-short-topic-slug.md
```

Use `CreamAI/workflows/creamwiki-work-log-template.md` as the content template.
If no CreamWIKI destination exists, store a candidate under
`CreamAI/memory/candidates/` and record the degraded mode in `status.md`.

## Reindex

After saving a CreamWIKI work-log, run the available indexing commands in order:

```powershell
python scripts/wiki_kms_guard.py register
python scripts/build_wiki_lite_data.py
python scripts/build_search_lexicon.py
python scripts/build_aios_kms_index.py
python scripts/query_aios_kms.py "<topic>" --top-k 5
```

If any script is missing or fails, record:

- command
- exit code or missing-file reason
- fallback used
- whether the saved work-log still exists
- next action needed

Do not mark missing indexing as `PASS`.

## Collaboration Contract

- Claude PM uses CreamWIKI evidence for planning and implementation decisions.
- Antigravity can be asked to research external/current technical facts, but
  must not implement production code.
- Codex reviews changed code and checks whether evidence, tests, and saved
  knowledge are sufficient.
- All agents should leave enough paths, commands, and reasoning for another
  agent to resume without re-discovering the same context.

## Final Report Additions

When this workflow is active, the final answer must include:

- CreamWIKI/KMS evidence used, or why it was unavailable
- saved work-log path, or candidate memory path
- indexing commands run and their result states
- reusable success pattern or prevention rule
- unverified or blocked items
