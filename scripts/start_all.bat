@echo off
chcp 65001 > nul
echo Iniciando SIA Gestao - todos os servicos...
echo.
echo [1/2] Backend Rust (porta 3001)
start "SIA - Backend" cmd /k "cd /d "%~dp0..\backend" && cargo run"
echo [2/2] Frontend Rails (porta 3002)
start "SIA - Frontend" cmd /k "cd /d "%~dp0..\frontend" && bundle exec rails server -p 3002"
echo.
echo Servicos iniciados. Verifique as janelas abertas.
