# PowerShell script to start ngrok and show URL
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Starting ngrok for Omise Webhook" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Start ngrok in background
$ngrokProcess = Start-Process -FilePath "ngrok" -ArgumentList "http", "3000" -PassThru -NoNewWindow

Write-Host "Waiting for ngrok to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Try to get URL from ngrok API
$maxRetries = 10
$retryCount = 0
$urlFound = $false

while ($retryCount -lt $maxRetries -and -not $urlFound) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -Method Get -ErrorAction Stop
        
        if ($response.tunnels -and $response.tunnels.Length -gt 0) {
            $httpsTunnel = $response.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
            
            if ($httpsTunnel) {
                $webhookUrl = "$($httpsTunnel.public_url)/api/omise-webhook"
                
                Write-Host ""
                Write-Host "============================================================" -ForegroundColor Green
                Write-Host "  ✅ Ngrok is running!" -ForegroundColor Green
                Write-Host "============================================================" -ForegroundColor Green
                Write-Host ""
                Write-Host "📋 Forwarding URL:" -ForegroundColor Cyan
                Write-Host "   $($httpsTunnel.public_url)" -ForegroundColor White
                Write-Host ""
                Write-Host "🔗 Webhook URL (copy this):" -ForegroundColor Cyan
                Write-Host "   $webhookUrl" -ForegroundColor Yellow -BackgroundColor DarkBlue
                Write-Host ""
                Write-Host "============================================================" -ForegroundColor Green
                Write-Host ""
                Write-Host "💡 Next steps:" -ForegroundColor Yellow
                Write-Host "   1. Copy the Webhook URL above" -ForegroundColor White
                Write-Host "   2. Go to Omise Dashboard > Settings > Webhooks" -ForegroundColor White
                Write-Host "   3. Add new webhook with the URL above" -ForegroundColor White
                Write-Host ""
                Write-Host "⚠️  Keep this window open while testing!" -ForegroundColor Red
                Write-Host ""
                
                $urlFound = $true
            }
        }
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "Retrying... ($retryCount/$maxRetries)" -ForegroundColor Gray
            Start-Sleep -Seconds 1
        }
    }
}

if (-not $urlFound) {
    Write-Host ""
    Write-Host "❌ Could not get ngrok URL automatically" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Manual steps:" -ForegroundColor Yellow
    Write-Host "   1. Look at the ngrok output above" -ForegroundColor White
    Write-Host "   2. Find the line: Forwarding https://xxxxx.ngrok-free.app -> http://localhost:3000" -ForegroundColor White
    Write-Host "   3. Copy the https:// URL and add /api/omise-webhook" -ForegroundColor White
    Write-Host ""
    Write-Host "   Or open http://localhost:4040 in your browser" -ForegroundColor White
    Write-Host ""
}

Write-Host "Press Ctrl+C to stop ngrok" -ForegroundColor Gray
Write-Host ""

# Keep script running
try {
    $ngrokProcess.WaitForExit()
} catch {
    Write-Host "Ngrok stopped" -ForegroundColor Yellow
}

