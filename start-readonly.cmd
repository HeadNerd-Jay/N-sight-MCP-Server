@echo off
set NSIGHT_API_KEY=REDACTED_API_KEY
set NSIGHT_SERVER_URL=https://www.am.remote.management
"C:\Program Files\nodejs\node.exe" "%~dp0dist\readonly-server.js"
