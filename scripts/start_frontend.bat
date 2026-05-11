@echo off
chcp 65001 > nul
cd /d "%~dp0..\frontend"
echo Iniciando servidor Rails (frontend)...
bundle exec rails server -p 3002
