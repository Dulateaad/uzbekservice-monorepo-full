# Cloud Run — beclean backend (Flask + Telegram bot)
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Cloud Run использует PORT из переменной окружения (по умолчанию 8080)
ENV PORT=8080
EXPOSE 8080

# Запуск только Flask API (бот работает в отдельном потоке внутри)
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 main:app
