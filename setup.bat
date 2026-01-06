@echo off
echo ========================================
echo   MALULOS POS - Instalacion Automatica
echo ========================================
echo.

echo [1/4] Instalando dependencias del frontend...
call npm install
if errorlevel 1 goto error

echo.
echo [2/4] Instalando dependencias del backend...
cd server
call npm install
if errorlevel 1 goto error
cd ..

echo.
echo [3/4] Inicializando base de datos SQLite...
call npm run init-db
if errorlevel 1 goto error

echo.
echo [4/4] Configuracion completada!
echo.
echo ========================================
echo   INSTALACION EXITOSA!
echo ========================================
echo.
echo Para iniciar la aplicacion:
echo   npm run dev:all
echo.
echo Acceso local:
echo   Frontend: http://localhost:5174
echo   Backend:  http://localhost:3000
echo.
echo Usuarios predeterminados:
echo   Admin:  PIN 1234
echo   Cajero: PIN 2222
echo   Mesero: PIN 3333
echo.
pause
exit /b 0

:error
echo.
echo ========================================
echo   ERROR EN LA INSTALACION
echo ========================================
echo.
echo Revisa los mensajes de error arriba.
echo.
pause
exit /b 1
