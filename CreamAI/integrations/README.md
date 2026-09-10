# Integration Memory

This folder stores non-secret integration setup state for project services.

Use `CreamAI/scripts/remember-integration.ps1` before re-running login or
setup flows for Supabase, Vercel, GitHub, Railway, or another CLI service.

Examples:

```powershell
.\CreamAI\scripts\remember-integration.ps1 -Service supabase -Action ensure
.\CreamAI\scripts\remember-integration.ps1 -Service vercel -Action check
.\CreamAI\scripts\remember-integration.ps1 -Service github -Action mark -Notes "gh auth login completed"
.\CreamAI\scripts\remember-integration.ps1 -Action list
```

The script keeps the current PowerShell session open by default and sets
`$LASTEXITCODE` to the check result. Use `-ExitProcess` only when a CI wrapper
needs the PowerShell process itself to exit with that code.

The state file records only service names, timestamps, status, setup hints, and
sanitized output tails. Do not put API keys, access tokens, refresh tokens,
passwords, or private keys in this folder.
