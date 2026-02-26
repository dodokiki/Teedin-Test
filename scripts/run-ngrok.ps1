# Script to run ngrok and show URL clearly
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Starting Ngrok for Omise Webhook" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Make sure Next.js is running on port 3000 first!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting ngrok..." -ForegroundColor Green
Write-Host ""

# Start ngrok
$ngrokJob = Start-Job -ScriptBlock {
    ngrok http 3000
}

# Wait a bit for ngrok to start
Start-Sleep -Seconds 4

# Try to get URL
$maxAttempts = 15
$attempt = 0
$urlFound = $false

while ($attempt -lt $maxAttempts -and -not $urlFound) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -Method Get -ErrorAction Stop
        
        if ($response.tunnels -and $response.tunnels.Length -gt 0) {
            $httpsTunnel = $response.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
            
            if ($httpsTunnel) {
                $webhookUrl = "$($httpsTunnel.public_url)/api/omise-webhook"
                
                Write-Host ""
                Write-Host "============================================================" -ForegroundColor Green
                Write-Host "  ✅ NGROK IS RUNNING!" -ForegroundColor Green
                Write-Host "============================================================" -ForegroundColor Green
                Write-Host ""
                Write-Host "📋 Forwarding URL:" -ForegroundColor Cyan
                Write-Host "   $($httpsTunnel.public_url)" -ForegroundColor White
                Write-Host ""
                Write-Host "🔗 WEBHOOK URL (COPY THIS):" -ForegroundColor Yellow -BackgroundColor DarkBlue
                Write-Host "   $webhookUrl" -ForegroundColor Yellow -BackgroundColor DarkBlue
                Write-Host ""
                Write-Host "============================================================" -ForegroundColor Green
                Write-Host ""
                Write-Host "📝 Next Steps:" -ForegroundColor Yellow
                Write-Host "   1. Copy the Webhook URL above" -ForegroundColor White
                Write-Host "   2. Go to: https://dashboard.omise.co/test" -ForegroundColor White
                Write-Host "   3. Settings > Webhooks > Add new webhook" -ForegroundColor White
                Write-Host "   4. Paste the Webhook URL" -ForegroundColor White
                Write-Host ""
                Write-Host "⚠️  Keep this window open while testing!" -ForegroundColor Red
                Write-Host ""
                Write-Host "Press Ctrl+C to stop ngrok" -ForegroundColor Gray
                Write-Host ""
                
                $urlFound = $true
                
                # Keep script running
                while ($true) {
                    Start-Sleep -Seconds 10
                }
            }
        }
    } catch {
        $attempt++
        if ($attempt -lt $maxAttempts) {
            Write-Host "Waiting for ngrok to start... ($attempt/$maxAttempts)" -ForegroundColor Gray
            Start-Sleep -Seconds 1
        }
    }
}

if (-not $urlFound) {
    Write-Host ""
    Write-Host "❌ Could not get ngrok URL automatically" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "   1. Is Next.js running on port 3000?" -ForegroundColor White
    Write-Host "   2. Is ngrok installed? (run: ngrok version)" -ForegroundColor White
    Write-Host "   3. Try running ngrok manually:" -ForegroundColor White
    Write-Host "      ngrok http 3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Then look for the 'Forwarding' line and copy the HTTPS URL" -ForegroundColor White
    Write-Host ""
}

# Cleanup
Stop-Job $ngrokJob -ErrorAction SilentlyContinue
Remove-Job $ngrokJob -ErrorAction SilentlyContinue

