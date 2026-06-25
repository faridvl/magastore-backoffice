# Appends a git summary snapshot to .claude/work-log.md after each Claude session stop.
# Referenced from .claude/settings.json → hooks.Stop.

$logPath = Join-Path $PSScriptRoot "..\work-log.md"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"

$lines = @(
    "",
    "=== $timestamp ===",
    "--- recent commits ---"
)
$lines += git log --oneline -5 2>$null
$lines += "--- status ---"
$lines += git status --short 2>$null

$lines | Add-Content -Path $logPath -Encoding utf8
