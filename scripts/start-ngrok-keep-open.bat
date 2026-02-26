@echo off
title Ngrok - Omise Webhook
color 0A
echo.
echo ============================================================
echo   Ngrok - Omise Webhook
echo ============================================================
echo.
echo Starting ngrok on port 3000...
echo.
echo IMPORTANT: 
echo   - Keep this window open!
echo   - Look for the "Forwarding" line below
echo   - Copy the HTTPS URL and add /api/omise-webhook
echo.
echo ============================================================
echo.

ngrok http 3000

echo.
echo ============================================================
echo   Ngrok stopped
echo ============================================================
echo.
pause

