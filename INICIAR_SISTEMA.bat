@echo off
title Fazenda Sao Caetano
echo ==========================================
echo      SISTEMA FAZENDA SAO CAETANO
echo ==========================================
echo.

:: Verifica se ja tem as dependencias
if exist "node_modules" goto :PULAR_INSTALACAO

echo [AVISO] node_modules nao encontrada.
echo Instalando dependencias (aguarde)...
call npm install
echo Instalacao concluida!
echo.

:PULAR_INSTALACAO
echo Abrindo o navegador em 2 segundos...
timeout /t 2 >nul
start http://localhost:3000

echo Iniciando o servidor...
echo Pressione CTRL+C para fechar.
echo.
call npm run dev

pause