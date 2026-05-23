#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import urllib.request
import urllib.parse
import os
import time
import json
import sys

# Обеспечиваем UTF-8 вывод
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Читаем .env файл
def load_env():
    env_vars = {}
    try:
        with open('.env', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    except:
        pass
    return env_vars

env = load_env()
smsc_login = env.get("SMSC_LOGIN")
smsc_password = env.get("SMSC_PASSWORD")

if not smsc_login or not smsc_password:
    print("❌ SMSC credentials not found in .env")
    exit(1)

base_phone = "77777777777"  # Другой тестовый номер
code = str(int(time.time()) % 1000000)  # Уникальный код каждый раз
message = f"Test code: {code}"

print("\n" + "=" * 70)
print("🧪 SMSC.KZ API - Тест форматов номера телефона")
print("=" * 70)
print(f"SMSC Login: {smsc_login}")
print(f"Test Phone: {base_phone}")
print(f"Message: {message}")
print(f"Code: {code}")
print("=" * 70)

# Тестируем разные форматы номера
phone_formats = [
    ("Формат 1: без плюса (полный)", base_phone),
    ("Формат 2: с плюсом", f"+{base_phone}"),
    ("Формат 3: 10 цифр (без 7)", base_phone[1:]),
    ("Формат 4: URL encoded +", f"%2B{base_phone}"),
    ("Формат 5: с кодом страны 8", "8" + base_phone[1:]),
]

results = []
success_formats = []

for idx, (format_desc, phone_value) in enumerate(phone_formats, 1):
    print(f"\n[{idx}] {format_desc}")
    print(f"    Номер: {phone_value}")

    try:
        params = urllib.parse.urlencode({
            "login": smsc_login,
            "psw": smsc_password,
            "phones": phone_value,
            "mes": message,
            "charset": "utf-8"
        })
        sms_url = f"https://smsc.kz/sys/send.php?{params}"

        start_time = time.time()
        with urllib.request.urlopen(sms_url, timeout=10) as response:
            response_data = response.read().decode('utf-8').strip()
            status_code = response.status
        end_time = time.time()

        response_text = response_data
        elapsed = end_time - start_time

        print(f"    Status: {status_code} | Ответ: {response_text[:60]}...")
        print(f"    Время: {elapsed:.2f}s")

        # Анализируем ответ
        if response_text.startswith("ERROR"):
            error_code = response_text.split("=")[1].split()[0] if "=" in response_text else "unknown"
            print(f"    ❌ Ошибка #{error_code}: {response_text}")
            results.append({
                "format": format_desc,
                "phone": phone_value,
                "status": f"ERROR_{error_code}",
                "response": response_text
            })
        elif "," in response_text:
            parts = response_text.split(",", 1)
            msg_id = parts[0].strip()
            status = parts[1].strip() if len(parts) > 1 else "0"
            status_code_num = int(status) if status.lstrip('-').isdigit() else -999

            if status_code_num == 0:
                print(f"    ✅ УСПЕХ! ID: {msg_id}")
                success_formats.append((format_desc, phone_value, msg_id))
                results.append({
                    "format": format_desc,
                    "phone": phone_value,
                    "status": "success",
                    "message_id": msg_id,
                    "response": response_text
                })
            elif status_code_num == 1:
                print(f"    ⏳ В очереди. ID: {msg_id}")
                results.append({
                    "format": format_desc,
                    "phone": phone_value,
                    "status": "queued",
                    "message_id": msg_id,
                    "response": response_text
                })
            else:
                print(f"    ⚠️  Статус {status}: {response_text}")
                results.append({
                    "format": format_desc,
                    "phone": phone_value,
                    "status": f"status_{status}",
                    "response": response_text
                })
        else:
            print(f"    ⚠️  Неожиданный ответ: {response_text}")
            results.append({
                "format": format_desc,
                "phone": phone_value,
                "status": "unexpected",
                "response": response_text
            })

    except urllib.error.URLError as error:
        print(f"    ❌ Ошибка подключения: {str(error)}")
        results.append({
            "format": format_desc,
            "phone": phone_value,
            "status": "url_error",
            "error": str(error)
        })
    except Exception as error:
        print(f"    ❌ Ошибка: {str(error)}")
        results.append({
            "format": format_desc,
            "phone": phone_value,
            "status": "error",
            "error": str(error)
        })

    # Задержка между запросами
    if idx < len(phone_formats):
        time.sleep(1)

# Итоги
print("\n" + "=" * 70)
print("📊 ИТОГИ ТЕСТИРОВАНИЯ:")
print("=" * 70)

if success_formats:
    print(f"\n✅ Успешные форматы ({len(success_formats)}):")
    for fmt, phone, msg_id in success_formats:
        print(f"   • {fmt}")
        print(f"     Номер: {phone}")
        print(f"     Message ID: {msg_id}")
else:
    print(f"\n❌ Ни один формат не успешен. Проверьте:")
    print("   - Баланс счёта на SMSC.KZ")
    print("   - Доступность API")
    print("   - Логин/пароль в .env")

print("\n💡 РЕКОМЕНДАЦИЯ:")
if success_formats:
    best_format = success_formats[0]
    print(f"   Используйте: {best_format[0]}")
    print(f"   Пример: {best_format[1]}")
else:
    print("   Попробуйте формат: '7' + 10 цифр номера (77XX1234567)")

# Сохраним результаты
with open("smsc_format_test_results.json", "w", encoding="utf-8") as f:
    json.dump({
        "test_time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "test_phone": base_phone,
        "test_code": code,
        "results": results,
        "success_count": len(success_formats),
        "successful_formats": [{"format": f, "phone": p, "message_id": m} for f, p, m in success_formats]
    }, f, ensure_ascii=False, indent=2)

print(f"\n📁 Результаты сохранены в: smsc_format_test_results.json")
print("=" * 70)
