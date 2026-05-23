@echo off
:: Enable UTF-8 characters in CMD for accents and emojis
chcp 65001 > nul
title BookRats - Iniciar Aplicativo

echo ===================================================
echo             🐀 INICIANDO BOOKRATS 🐀
echo ===================================================
echo.

:: Step 1: Check if .env file exists
if not exist .env (
    color 0C
    echo [ERRO] O arquivo ".env" não foi encontrado na raiz do projeto!
    echo.
    echo Por favor, solicite o arquivo ".env" ao desenvolvedor,
    echo cole-o na pasta do projeto e tente iniciar novamente.
    echo.
    pause
    exit /b
)

:: Step 2: Check if node_modules folder exists
if not exist node_modules (
    echo [INFO] A pasta "node_modules" não foi encontrada.
    echo Instalando as dependências do projeto pela primeira vez...
    echo (Isso pode levar alguns minutos. Por favor, aguarde...)
    echo.
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [ERRO] Ocorreu um erro ao instalar as dependências.
        echo Certifique-se de que o Node.js está instalado corretamente.
        echo.
        pause
        exit /b
    )
)

:: Step 3: Run the application
echo [INFO] Inicializando o servidor Expo...
echo.
call npx expo start
