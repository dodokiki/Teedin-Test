# PowerShell script for starting ngrok
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Starting ngrok for Omise Webhook" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting ngrok on port 3000..." -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: Keep this window open!" -ForegroundColor Red
Write-Host ""
Write-Host "After ngrok starts, you can:" -ForegroundColor Green
Write-Host "  1. Open http://localhost:4040 in your browser" -ForegroundColor White
Write-Host "  2. Or run: pnpm ngrok:url" -ForegroundColor White
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

ngrok http 3000

