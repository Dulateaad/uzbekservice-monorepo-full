# Скрипт для восстановления/переустановки PostgreSQL пароля на Windows
# Выполнить как администратор PowerShell

$postgresPath = Get-Command psql.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $postgresPath) {
    Write-Host "❌ PostgreSQL не найдена в PATH"
    exit 1
}

$postgresDir = Split-Path -Parent $postgresPath
Write-Host "✅ PostgreSQL найдена: $postgresDir"

# Найдём pg_hba.conf
$pgDataPath = Get-ChildItem -Path "$postgresDir\..\data" -Name "pg_hba.conf" -ErrorAction SilentlyContinue
if (-not $pgDataPath) {
    $pgDataPath = "C:\Program Files\PostgreSQL\*\data\pg_hba.conf"
    $pgHbaFile = Get-ChildItem -Path $pgDataPath -ErrorAction SilentlyContinue | Select-Object -First 1
} else {
    $pgHbaFile = "$postgresDir\..\data\pg_hba.conf"
}

if ($pgHbaFile) {
    Write-Host "✅ pg_hba.conf найден: $pgHbaFile"
    Write-Host ""
    Write-Host "🔧 Для сброса пароля:"
    Write-Host "1. Открой файл: $pgHbaFile"
    Write-Host "2. Найди строку: local   all             all                                     scram-sha-256"
    Write-Host "3. Измени 'scram-sha-256' на 'trust'"
    Write-Host "4. Перезагрузи PostgreSQL сервис"
    Write-Host "5. Запусти: psql -U postgres -c \"ALTER USER postgres WITH PASSWORD 'postgres';\""
    Write-Host "6. Верни 'trust' обратно на 'scram-sha-256'"
    Write-Host "7. Перезагрузи сервис"
} else {
    Write-Host "❌ pg_hba.conf не найден"
    Write-Host "Ищи файл в: C:\Program Files\PostgreSQL\X\data\"
}
