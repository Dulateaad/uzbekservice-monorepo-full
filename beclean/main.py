# pip install pyTelegramBotAPI==4.12.0 flask

from flask import Flask, request, jsonify
from flask_cors import CORS
import telebot
import threading

# =============================
# CONFIG
# =============================
BOT_TOKEN = "8563599110:AAGn83R9NLM6coQ1vkLvsjh0bJqWgxpCfF8"
ADMIN_CHAT_IDS = [
    7593008791,1542351599,
    1298555678,1722760600, 8518059493  # если это группа/канал
]

bot = telebot.TeleBot(BOT_TOKEN, parse_mode="HTML")
app = Flask(__name__)
CORS(app)  # Разрешить запросы с beclean.uz

# =============================
# TELEGRAM COMMANDS
# =============================
@bot.message_handler(commands=['start'])
def start(message):
    bot.send_message(message.chat.id, "✅ Бот заявок запущен")


@bot.message_handler(commands=['myid'])
def myid(message):
    bot.send_message(message.chat.id, f"Ваш chat_id: {message.chat.id}")


# =============================
# API ENDPOINT — сюда сайт шлет заявки
# =============================
@app.route("/lead", methods=["POST"])
def receive_lead():
    data = request.json or {}

    name = data.get("name", "—")
    phone = data.get("phone", "—")
    info = data.get("info", "—")
    source = data.get("source", "website")

    text = (
        "📥 <b>Новая заявка</b>\n\n"
        f"👤 Имя: {name}\n"
        f"📞 Телефон: {phone}\n"
        f"📝 Инфо: {info}\n"
        f"🌍 Источник: {source}"
    )

    for chat_id in ADMIN_CHAT_IDS:
        try:
            bot.send_message(chat_id, text)
        except Exception as e:
            print(f"Failed to send to {chat_id}: {e}")

    return jsonify({"status": "ok"})


# =============================
# HEALTH CHECK
# =============================
@app.route("/")
def home():
    return "Lead bot is running"


# =============================
# RUN BOT (в фоне при запуске через gunicorn)
# =============================
def run_bot():
    print("Telegram bot started...")
    bot.infinity_polling()


# Запуск бота в отдельном потоке при импорте (для gunicorn/Cloud Run)
_bot_thread = threading.Thread(target=run_bot, daemon=True)
_bot_thread.start()


if __name__ == "__main__":
    print("Flask API started...")
    app.run(host="0.0.0.0", port=5000)
