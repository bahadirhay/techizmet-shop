@echo off
cd /d %~dp0
start "" http://localhost:9000
.venv\Scripts\python server.py
