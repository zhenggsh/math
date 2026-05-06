# Kimi Claude Code Launcher
# Step 1: claude-code-proxy serve
# Step 2: Run this script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Claude Code + Kimi (via Proxy)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$env:ANTHROPIC_BASE_URL = "http://localhost:18765"
$env:ANTHROPIC_AUTH_TOKEN = "unused"
$env:ANTHROPIC_MODEL = "kimi-for-coding"
$env:ANTHROPIC_SMALL_FAST_MODEL = "kimi-for-coding"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
$env:CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK = "1"

Write-Host ""
Write-Host "Proxy URL : $($env:ANTHROPIC_BASE_URL)" -ForegroundColor Gray
Write-Host "Model     : $($env:ANTHROPIC_MODEL)" -ForegroundColor Gray
Write-Host ""

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:18765/healthz" -TimeoutSec 2 -UseBasicParsing
    Write-Host "Proxy OK : $($resp.Content)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "WARNING: Proxy not running!" -ForegroundColor Red
    Write-Host "Run first: claude-code-proxy serve" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Starting Claude Code..." -ForegroundColor Green
Write-Host ""
claude
