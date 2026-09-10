# CreamAI AIOps Team

## Roles
- Claude: PM / Supervisor / implementation owner.
- Antigravity: Researcher. Produces evidence and impact notes only.
- Codex: Reviewer. Produces code review findings only.

## Required Setup Flow
1. SETUP creates the project-scoped folders, agent contracts, skills, workflows, MCP notes, automation scripts, and RUN TEAM architecture.
2. SETUP does not open extra PowerShell panes.
3. AIOps starts Claude Code as PM in auto mode.
4. Claude reads `CreamAI/agents/supervisor.md` and `CreamAI/workflows/run-team.md`, then splits work into backlog tasks.
5. Claude calls Antigravity through `CreamAI/scripts/run-researcher.ps1` when research is needed.
6. Claude calls Codex through `CreamAI/scripts/run-reviewer.ps1` when review is needed.

## Project Scope
All team state, agent contracts, skills, workflows, MCP notes, backlog, and logs must stay under this project root.
