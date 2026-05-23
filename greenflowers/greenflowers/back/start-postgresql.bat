@echo off
REM Запуск как администратор для включения PostgreSQL
echo Запуск PostgreSQL сервиса...
net start postgresql-x64-17
if %ERRORLEVEL% == 0 (
    echo.
    echo ✅ PostgreSQL запущен успешно!
    echo.
    timeout /t 2
) else if %ERRORLEVEL% == 2 (
    echo ✅ PostgreSQL уже запущен
) else (
    echo ❌ Ошибка при запуске PostgreSQL
    echo Убедись что запустил как администратор
    echo.
    pause
    exit /b 1
)
