@echo off
echo ============================================================
echo   Starting ngrok for Omise Webhook
echo ============================================================
echo.
echo Starting ngrok on port 3000...
echo.
echo IMPORTANT: Keep this window open!
echo.
echo After ngrok starts, you can:
echo   1. Open http://localhost:4040 in your browser to see the URL
echo   2. Or run: pnpm ngrok:url
echo.
echo ============================================================
echo.

ngrok http 3000

pause

