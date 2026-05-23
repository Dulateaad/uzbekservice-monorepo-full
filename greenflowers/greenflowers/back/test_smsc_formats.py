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

base_phone = "77012345678"
code = "123456"
message = f"Код: {code}"

print("\n🧪 Тестирование SMSC.KZ API с разными форматами номера")
print(f"SMSC Login: {smsc_login}")
print(f"Message: {message}")
print("─" * 70)

phone_formats = [
    ("без плюса", base_phone),
    ("с плюсом", f"+{base_phone}"),
    ("с URL кодированием +", f"%2B{base_phone}"),
    ("только 10 цифр", base_phone[1:]),
    ("другой формат", "7" + base_phone[1:]),
]

results = []
success_count = 0
fail_count = 0

for format_name, phone_value in phone_formats:
    print(f"\n📤 Формат номера: {format_name}")
    print(f"   Значение: {phone_value}")

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

        print(f"   HTTP Status: {status_code}")
        print(f"   Ответ: \"{response_text}\"")
        print(f"   Время ответа: {elapsed:.2f}s")

        if "," in response_text:
            parts = response_text.split(",")
            msg_id = parts[0]
            status = parts[1] if len(parts) > 1 else "unknown"

            print(f"   Message ID: {msg_id}, Статус: {status}")

            if status == "0":
                print(f"   ✅ УСПЕХ! Сообщение отправлено")
                success_count += 1
                results.append({
                    "format": format_name,
                    "phone": phone_value,
                    "status": "success",
                    "response": response_text
                })
            elif status == "1":
                print(f"   ⏳ В очереди")
                success_count += 1
                results.append({
                    "format": format_name,
                    "phone": phone_value,
                    "status": "queued",
                    "response": response_text
                })
            else:
                error_codes = {
                    "-1": "Ошибка в номере телефона",
                    "-2": "Ошибка в тексте сообщения",
                    "-3": "Неправильные параметры",
                    "-4": "Ошибка аутентификации",
                    "-5": "Недостаточно средств",
                }
                error_msg = error_codes.get(str(status), f"Неизвестный статус: {status}")
                print(f"   ❌ {error_msg}")
                fail_count += 1
                results.append({
                    "format": format_name,
                    "phone": phone_value,
                    "status": "error",
                    "response": response_text,
                    "error": error_msg
                })
        else:
            print(f"   ⚠️  Неожиданный формат ответа")
            fail_count += 1

    except urllib.error.URLError as error:
        print(f"   ❌ Ошибка подключения: {str(error)}")
        fail_count += 1
        results.append({
            "format": format_name,
            "phone": phone_value,
            "status": "timeout",
            "error": str(error)
        })
    except Exception as error:
        print(f"   ❌ Ошибка: {str(error)}")
        fail_count += 1
        results.append({
            "format": format_name,
            "phone": phone_value,
            "status": "error",
            "error": str(error)
        })

    time.sleep(1)  # Задержка между запросами

print("\n" + "─" * 70)
print(f"\n📊 Итоги тестирования:")
print(f"   ✅ Успешно/В очереди: {success_count}")
print(f"   ❌ Ошибок: {fail_count}")

print("\n📝 Рекомендация:")
if success_count > 0:
    working_formats = [r for r in results if r["status"] in ["success", "queued"]]
    if working_formats:
        print(f"   Используйте формат: {working_formats[0]['format']}")
        print(f"   Пример номера: {working_formats[0]['phone']}")
else:
    print("   ❌ Ни один формат не работает. Проверьте:")
    print("   - Доступность API SMSC.KZ")
    print("   - Правильность логина и пароля в .env")
    print("   - Баланс счёта на SMSC.KZ")

# Сохранить результаты в JSON
with open("smsc_test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"\n✓ Результаты сохранены в smsc_test_results.json")
