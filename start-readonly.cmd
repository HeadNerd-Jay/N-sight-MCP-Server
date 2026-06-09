@echo off
:: N-sight MCP Read-Only Server — Windows launcher
::
:: Credentials are NOT stored here. The server loads them automatically
:: from the .env file in this directory via dotenv.
::
:: Setup (one time):
::   1. Copy .env.example to .env
::   2. Fill in NSIGHT_API_KEY and NSIGHT_SERVER_URL in .env
::
"C:\Program Files\nodejs\node.exe" "%~dp0dist\readonly-server.js"
