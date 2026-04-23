@echo off
chcp 65001 > nul
cd /d "c:\Users\user\Documents\SIA - VÍDEOS\OneDrive\Desktop\Projeto de Gerenciamento\frontend"
echo Iniciando servidor Rails na porta 3001...
bundle exec rails server -p 3001
