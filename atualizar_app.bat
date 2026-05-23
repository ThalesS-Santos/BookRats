@echo off
:: Enable UTF-8 characters in CMD for accents and emojis
chcp 65001 > nul
title BookRats - Atualizar Código

echo ===================================================
echo         🐀 ATUALIZANDO BOOKRATS DO GITHUB 🐀
echo ===================================================
echo.

:: Step 1: Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] O "Git" não está instalado neste computador ou não está no PATH!
    echo Instale o Git para conseguir baixar as atualizações do GitHub.
    echo.
    pause
    exit /b
)

:: Step 2: Pull updates
echo [INFO] Buscando novas atualizações no GitHub...
call git pull origin main
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERRO] Falha ao atualizar o código do GitHub.
    echo Verifique sua conexão de rede ou se há conflitos locais no repositório.
    echo.
    pause
    exit /b
)

:: Step 3: Update dependencies if package.json has changed
echo.
echo [INFO] Atualização de código concluída com sucesso!
echo [INFO] Atualizando dependências de pacotes (caso haja mudanças)...
call npm install

echo.
echo ===================================================
echo   ✨ PROJETO ATUALIZADO E PRONTO PARA RODAR! ✨
echo ===================================================
echo.
pause
