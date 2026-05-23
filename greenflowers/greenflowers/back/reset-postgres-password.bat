@echo off
echo.
echo 🔧 PostgreSQL Password Reset Utility
echo.

REM Найдем PostgreSQL инсталляцию
for /d %%i in ("C:\Program Files\PostgreSQL\*") do (
  if exist "%%i\bin\psql.exe" (
    set PSQL_PATH=%%i\bin\psql.exe
    set PG_VER=%%~nxi
    goto found
  )
)

:notfound
echo ❌ PostgreSQL не найдена
pause
exit /b 1

:found
echo ✅ Найдена PostgreSQL версия: %PG_VER%
echo ✅ Путь: %PSQL_PATH%
echo.
echo 🔐 Для смены пароля нужны права администратора PostgreSQL
echo.
echo Используй эту команду в cmd (от имени администратора):
echo.
echo "%PSQL_PATH%" -U postgres -c "ALTER USER postgres WITH PASSWORD 'Sula2206';"
echo.
pause
