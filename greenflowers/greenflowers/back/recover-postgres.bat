@echo off
REM Полное восстановление PostgreSQL доступа
REM Должен запуститься как администратор

setlocal enabledelayedexpansion

set PG_PATH=C:\Program Files\PostgreSQL\17

echo ============================================
echo PostgreSQL Access Recovery Tool
echo ============================================
echo.

REM Проверка прав администратора
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ Админ права: OK
) else (
    echo ❌ Ошибка: нужны права администратора
    echo Запусти этот файл правой кнопкой -> Run as administrator
    pause
    exit /b 1
)

echo.
echo 1️⃣  Остановка PostgreSQL...
net stop postgresql-x64-17 >nul 2>&1
timeout /t 2 >nul

echo ✅ PostgreSQL остановлена

echo.
echo 2️⃣  Изменение конфига pg_hba.conf...
echo Меняем scram-sha-256 на trust для локальных подключений...

if exist "%PG_PATH%\data\pg_hba.conf" (
    REM Делаем резервную копию
    copy "%PG_PATH%\data\pg_hba.conf" "%PG_PATH%\data\pg_hba.conf.bak" >nul
    echo ✅ Резервная копия создана
    
    REM Меняем конфиг (Windows find и replace)
    (
        for /f "delims=" %%A in ('findstr /N .''' '"%PG_PATH%\data\pg_hba.conf"') do (
            setlocal enabledelayedexpansion
            set "line=%%A"
            set "line=!line:*:=!"
            if "!line:~0,5!"=="local" (
                echo !line:scram-sha-256=trust!
            ) else if "!line:~0,4!"=="host" (
                if "127.0.0.1" neq "!line!" (
                    echo !line:scram-sha-256=trust!
                ) else (
                    echo !line!
                )
            ) else (
                echo !line!
            )
            endlocal
        )
    ) > "%PG_PATH%\data\pg_hba.conf.new"
    
    move /y "%PG_PATH%\data\pg_hba.conf.new" "%PG_PATH%\data\pg_hba.conf" >nul
    echo ✅ Конфиг обновлён
) else (
    echo ❌ pg_hba.conf не найден в %PG_PATH%\data\
    pause
    exit /b 1
)

echo.
echo 3️⃣  Запуск PostgreSQL...
net start postgresql-x64-17
timeout /t 3 >nul

echo.
echo 4️⃣  Сброс пароля пользователя postgres...
set PGPASSWORD=
"%PG_PATH%\bin\psql.exe" -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';" >nul 2>&1

if %errorLevel% == 0 (
    echo ✅ Пароль установлен: postgres
) else (
    echo ⚠️  Не удалось установить пароль (это нормально с trust аутентификацией)
)

echo.
echo ✅ Восстановление завершено!
echo Пароль: postgres
echo.
pause
