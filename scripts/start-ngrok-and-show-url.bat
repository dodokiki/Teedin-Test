@echo off
title Ngrok - Omise Webhook
color 0A
cls
echo.
echo ============================================================
echo   Starting Ngrok for Omise Webhook
echo ============================================================
echo.
echo Please wait while ngrok starts...
echo.

REM Start ngrok in background and capture output
start /B ngrok http 3000 > ngrok_output.txt 2>&1

REM Wait for ngrok to start
timeout /t 5 /nobreak >nul

REM Try to get URL from ngrok API
echo Getting ngrok URL...
echo.

REM Use PowerShell to get URL from ngrok API
powershell -Command "try { $response = Invoke-RestMethod -Uri 'http://localhost:4040/api/tunnels' -ErrorAction Stop; $httpsTunnel = $response.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1; if ($httpsTunnel) { $webhookUrl = $httpsTunnel.public_url + '/api/omise-webhook'; Write-Host ''; Write-Host '============================================================' -ForegroundColor Green; Write-Host '  Ngrok is running!' -ForegroundColor Green; Write-Host '============================================================' -ForegroundColor Green; Write-Host ''; Write-Host 'Forwarding URL:' -ForegroundColor Cyan; Write-Host $httpsTunnel.public_url -ForegroundColor White; Write-Host ''; Write-Host 'Webhook URL (COPY THIS):' -ForegroundColor Yellow; Write-Host $webhookUrl -ForegroundColor Yellow -BackgroundColor DarkBlue; Write-Host ''; Write-Host '============================================================' -ForegroundColor Green; Write-Host ''; Write-Host 'Next steps:' -ForegroundColor Yellow; Write-Host '1. Copy the Webhook URL above' -ForegroundColor White; Write-Host '2. Go to Omise Dashboard ^> Settings ^> Webhooks' -ForegroundColor White; Write-Host '3. Add new webhook with the URL above' -ForegroundColor White; Write-Host ''; Write-Host 'Keep this window open while testing!' -ForegroundColor Red; Write-Host '' } else { Write-Host 'No HTTPS tunnel found yet. Please check ngrok output.' -ForegroundColor Red } } catch { Write-Host 'Ngrok is starting... Please wait a moment and run:' -ForegroundColor Yellow; Write-Host 'pnpm ngrok:url' -ForegroundColor White; Write-Host ''; Write-Host 'Or check the ngrok window for the URL' -ForegroundColor White }"

echo.
echo ============================================================
echo   Ngrok is running in the background
echo ============================================================
echo.
echo If you don't see the URL above, you can:
echo   1. Run: pnpm ngrok:url
echo   2. Or open http://localhost:4040 in your browser
echo   3. Or check the ngrok window
echo.
echo Press any key to stop ngrok...
pause >nul

REM Stop ngrok
taskkill /F /IM ngrok.exe >nul 2>&1
del ngrok_output.txt >nul 2>&1

echo.
echo Ngrok stopped.
pause

