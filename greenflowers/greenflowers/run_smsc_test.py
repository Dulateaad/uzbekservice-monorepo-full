import subprocess
import sys
import os

os.chdir('back')

try:
    print("🚀 Запуск теста SMSC.KZ интеграции...\n")
    result = subprocess.run(['node', 'test-smsc.js'], 
                          capture_output=True, 
                          text=True,
                          timeout=30)
    
    print("STDOUT:")
    print(result.stdout)
    
    if result.stderr:
        print("\nSTDERR:")
        print(result.stderr)
    
    print(f"\n✅ Тест завершен с кодом: {result.returncode}")
    
except subprocess.TimeoutExpired:
    print("❌ Timeout: тест превышил время ожидания")
except Exception as e:
    print(f"❌ Ошибка: {e}")
