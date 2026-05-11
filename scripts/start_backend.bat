@echo off
chcp 65001 > nul
cd /d "%~dp0.."
echo Iniciando backend Rust...
cd backend
cargo run
