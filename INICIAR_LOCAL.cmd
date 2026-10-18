@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Instala Node.js 24 LTS y vuelve a abrir este archivo.
 pause
 exit /b 1
)
node -e "if(process.versions.node.split('.')[0] !== '24') process.exit(1)"
if errorlevel 1 (
 echo Esta version necesita Node.js 24 LTS.
 pause
 exit /b 1
)
if not exist node_modules (
 call npm.cmd ci
 if errorlevel 1 (
  echo No se pudieron instalar las dependencias. Revisa la conexion y la salida anterior.
  pause
  exit /b 1
 )
)
echo Abre http://127.0.0.1:3000 en tu navegador.
call npm.cmd run dev:local
pause
