import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import axios from 'axios';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

// Конфигурация Click (получить из Firebase Config или environment variables)
const CLICK_MERCHANT_ID = functions.config().click?.merchant_id || process.env.CLICK_MERCHANT_ID || '';
const CLICK_SERVICE_ID = functions.config().click?.service_id || process.env.CLICK_SERVICE_ID || '';
const CLICK_SECRET_KEY = functions.config().click?.secret_key || process.env.CLICK_SECRET_KEY || '';

// Конфигурация OneID (получить из Firebase Config или environment variables)
const ONEID_CLIENT_ID = functions.config().oneid?.client_id || process.env.ONEID_CLIENT_ID || 'odo_uz';
const ONEID_CLIENT_SECRET = functions.config().oneid?.client_secret || process.env.ONEID_CLIENT_SECRET || '8H8dcZ118ix2arY7w5ObjrfN';
// Используем HTTP redirect_uri вместо custom scheme (OneID требует HTTP/HTTPS)
const ONEID_REDIRECT_URI = functions.config().oneid?.redirect_uri || process.env.ONEID_REDIRECT_URI || 'https://us-central1-odo-uz-app.cloudfunctions.net/oneidCallback';

// OneID OAuth2 endpoints
const ONEID_AUTHORIZATION_URL = 'https://sso.egov.uz/sso/oauth/Authorization.do';
const ONEID_TOKEN_URL = 'https://sso.egov.uz/sso/oauth/Authorization.do';
const ONEID_USER_INFO_URL = 'https://sso.egov.uz/sso/oauth/Authorization.do';

// Конфигурация Telegram Bot (получить из Firebase Config или environment variables)
const TELEGRAM_BOT_TOKEN = functions.config().telegram?.bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = functions.config().telegram?.chat_id || process.env.TELEGRAM_CHAT_ID || '';

// Конфигурация Email (получить из Firebase Config или environment variables)
const EMAIL_HOST = functions.config().email?.host || process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(functions.config().email?.port || process.env.EMAIL_PORT || '587');
const EMAIL_USER = functions.config().email?.user || process.env.EMAIL_USER || '';
const EMAIL_PASSWORD = functions.config().email?.password || process.env.EMAIL_PASSWORD || '';
const EMAIL_FROM = functions.config().email?.from || process.env.EMAIL_FROM || EMAIL_USER || 'noreply@anama.app';
const EMAIL_FROM_NAME = functions.config().email?.from_name || process.env.EMAIL_FROM_NAME || 'Anama App';

interface ClickPrepareRequest {
  orderId: string;
  amount: number;
  userId: string;
  cardType?: string;
}

interface ClickPrepareResponse {
  paymentUrl: string;
  transactionId: string;
}

/**
 * Генерация подписи для Click API
 */
function generateClickSignature(
  clickTransId: string,
  serviceId: string,
  secretKey: string,
  merchantTransId: string,
  amount: string,
  action: string,
  signTime: string
): string {
  const signString = `${clickTransId}${serviceId}${secretKey}${merchantTransId}${amount}${action}${signTime}`;
  return crypto.createHash('md5').update(signString).digest('hex');
}

/**
 * Подготовка платежа через Click (Prepare)
 * 
 * Endpoint: POST /clickPrepare
 * 
 * Создает транзакцию и возвращает URL для оплаты
 */
export const clickPrepare = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { orderId, amount, userId, cardType }: ClickPrepareRequest = req.body;

    if (!orderId || !amount || !userId) {
      res.status(400).json({ error: 'Missing required fields: orderId, amount, userId' });
      return;
    }

    // Проверяем конфигурацию
    if (!CLICK_MERCHANT_ID || !CLICK_SERVICE_ID || !CLICK_SECRET_KEY) {
      res.status(500).json({ error: 'Click configuration not set' });
      return;
    }

    // Генерируем уникальный ID транзакции
    const transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    const merchantTransId = orderId;
    const amountStr = Math.round(amount).toString();
    const action = '1'; // Prepare action
    const signTime = Date.now().toString();

    // Генерируем подпись
    const signString = `${transactionId}${CLICK_SERVICE_ID}${CLICK_SECRET_KEY}${merchantTransId}${amountStr}${action}${signTime}`;
    const sign = crypto.createHash('md5').update(signString).digest('hex');

    // Вызываем Click API Prepare
    const clickPrepareUrl = 'https://my.click.uz/services/pay';
    const prepareParams = new URLSearchParams({
      service_id: CLICK_SERVICE_ID,
      merchant_id: CLICK_MERCHANT_ID,
      transaction_param: merchantTransId,
      amount: amountStr,
      action: action,
      sign_time: signTime,
      sign_string: sign,
      click_trans_id: transactionId,
    });

    if (cardType) {
      prepareParams.append('card_type', cardType);
    }

    // Сохраняем транзакцию в Firestore
    await admin.firestore().collection('payments').doc(transactionId).set({
      transaction_id: transactionId,
      order_id: orderId,
      user_id: userId,
      amount: amount,
      status: 'pending',
      payment_method: 'click',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      click_prepare_params: Object.fromEntries(prepareParams),
    });

    // Формируем URL для оплаты
    const paymentUrl = `${clickPrepareUrl}?${prepareParams.toString()}`;

    const response: ClickPrepareResponse = {
      paymentUrl,
      transactionId,
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error in clickPrepare:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * Подтверждение платежа через Click (Complete)
 * 
 * Endpoint: POST /clickComplete
 * 
 * Вызывается после успешной оплаты для подтверждения транзакции
 */
export const clickComplete = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const {
      click_trans_id,
      merchant_trans_id,
      amount,
      action,
      sign_time,
      sign_string,
      error,
      error_note,
    } = req.body;

    // Верифицируем подпись
    const expectedSign = generateClickSignature(
      click_trans_id,
      CLICK_SERVICE_ID,
      CLICK_SECRET_KEY,
      merchant_trans_id,
      amount,
      action,
      sign_time
    );

    if (sign_string !== expectedSign) {
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    // Обновляем статус транзакции
    const transactionRef = admin.firestore().collection('payments').doc(click_trans_id);
    const transactionDoc = await transactionRef.get();

    if (!transactionDoc.exists) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const transactionData = transactionDoc.data()!;
    const orderId = transactionData.order_id;

    if (error === '0') {
      // Успешная оплата
      await transactionRef.update({
        status: 'completed',
        completed_at: admin.firestore.FieldValue.serverTimestamp(),
        click_response: req.body,
      });

      // Обновляем статус заказа
      await admin.firestore().collection('orders').doc(orderId).update({
        payment_status: 'paid',
        paid_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({
        error: '0',
        error_note: 'Success',
      });
    } else {
      // Ошибка оплаты
      await transactionRef.update({
        status: 'failed',
        error_message: error_note || 'Payment failed',
        click_response: req.body,
      });

      res.status(200).json({
        error: error || '-1',
        error_note: error_note || 'Payment failed',
      });
    }
  } catch (error: any) {
    console.error('Error in clickComplete:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * Webhook для получения уведомлений от Click
 * 
 * Endpoint: POST /clickWebhook
 * 
 * Настроить в личном кабинете Click как URL для уведомлений
 */
export const clickWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const {
      click_trans_id,
      merchant_trans_id,
      amount,
      action,
      sign_time,
      sign_string,
      error,
      error_note,
    } = req.body;

    // Верифицируем подпись
    const expectedSign = generateClickSignature(
      click_trans_id,
      CLICK_SERVICE_ID,
      CLICK_SECRET_KEY,
      merchant_trans_id,
      amount,
      action,
      sign_time
    );

    if (sign_string !== expectedSign) {
      console.error('Invalid signature in webhook');
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    // Обновляем транзакцию
    const transactionRef = admin.firestore().collection('payments').doc(click_trans_id);
    const transactionDoc = await transactionRef.get();

    if (!transactionDoc.exists) {
      console.error('Transaction not found:', click_trans_id);
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const transactionData = transactionDoc.data()!;
    const orderId = transactionData.order_id;

    if (error === '0') {
      // Успешная оплата
      await transactionRef.update({
        status: 'completed',
        completed_at: admin.firestore.FieldValue.serverTimestamp(),
        click_response: req.body,
      });

      // Обновляем статус заказа
      await admin.firestore().collection('orders').doc(orderId).update({
        payment_status: 'paid',
        paid_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Ошибка оплаты
      await transactionRef.update({
        status: 'failed',
        error_message: error_note || 'Payment failed',
        click_response: req.body,
      });
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error in clickWebhook:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// ============================================================================
// OneID OAuth2 Integration
// ============================================================================


interface OneIdUser {
  sub: string;
  pin?: string;
  full_name?: string;
  full_name_latin?: string;
  full_name_cyrillic?: string;
  birth_date?: string;
  email?: string;
  phone?: string;
}

/**
 * Форматирование данных пользователя OneID
 */
function formatOneIdUser(data: any): OneIdUser {
  return {
    sub: data.sub || data.user_id || data.id || '',
    pin: data.pin || data.pinfl || null,
    full_name: data.full_name || data.name || data.full_name_latin || null,
    full_name_latin: data.full_name_latin || data.full_name || null,
    full_name_cyrillic: data.full_name_cyrillic || null,
    birth_date: data.birth_date || data.birthdate || null,
    email: data.email || null,
    phone: data.phone || data.mobile || data.phone_number || null,
  };
}

/**
 * Генерация случайного state для CSRF защиты
 */
function generateOneIdState(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Health check для OneID endpoints
 */
export const oneidHealth = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.json({
    status: 'ok',
    service: 'oneid',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /oneidLogin
 * Редирект на OneID авторизацию
 * Query params:
 *   - redirect_uri: URI для возврата (default: odouzapp://oneid/callback)
 *   - state: CSRF токен
 */
export const oneidLogin = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  try {
    const { redirect_uri, state } = req.query;
    
    const finalRedirectUri = (redirect_uri as string) || ONEID_REDIRECT_URI;
    const finalState = (state as string) || generateOneIdState();
    
    // Формируем URL для авторизации в OneID
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: ONEID_CLIENT_ID,
      redirect_uri: finalRedirectUri,
      scope: 'openid profile email',
      state: finalState,
    });
    
    const authUrl = `${ONEID_AUTHORIZATION_URL}?${authParams.toString()}`;
    
    console.log('🔐 Redirecting to OneID:', authUrl);
    
    // Редиректим на OneID
    res.redirect(authUrl);
  } catch (error: any) {
    console.error('❌ Error in oneidLogin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET/POST /oneidCallback
 * Обработка callback от OneID (OAuth2 redirect)
 * OneID отправляет GET запрос с code и state в query параметрах
 */
export const oneidCallback = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // OneID отправляет callback как GET запрос с параметрами в query string
    const code = req.method === 'GET' ? req.query.code as string : req.body?.code;
    const error = req.method === 'GET' ? req.query.error as string : req.body?.error;
    
    // Если есть ошибка от OneID
    if (error) {
      console.error('❌ OneID callback error:', error);
      res.status(400).json({
        error: 'OneID authorization failed',
        message: error,
        details: req.method === 'GET' ? req.query : req.body,
      });
      return;
    }
    
    if (!code) {
      res.status(400).json({ error: 'Authorization code is required' });
      return;
    }
    
    // Используем наш HTTP redirect_uri для обмена кода на токен
    const finalRedirectUri = ONEID_REDIRECT_URI;
    
    console.log('🔄 Exchanging code for token...');
    
    // Обмениваем код на токен через OneID
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: ONEID_CLIENT_ID,
      client_secret: ONEID_CLIENT_SECRET,
      redirect_uri: finalRedirectUri,
    });
    
    let tokenResponse;
    try {
      tokenResponse = await axios.post(
        ONEID_TOKEN_URL,
        tokenParams.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000,
        }
      );
    } catch (error: any) {
      console.error('❌ Error exchanging code for token:', error.response?.data || error.message);
      res.status(500).json({
        error: 'Failed to exchange code for token',
        details: error.response?.data || error.message,
      });
      return;
    }
    
    const { access_token, refresh_token } = tokenResponse.data;
    
    if (!access_token) {
      res.status(500).json({ error: 'Access token not received' });
      return;
    }
    
    console.log('✅ Token received, fetching user info...');
    
    // Получаем информацию о пользователе
    let userInfo;
    try {
      const userInfoResponse = await axios.get(ONEID_USER_INFO_URL, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
        timeout: 30000,
      });
      
      userInfo = userInfoResponse.data;
    } catch (error: any) {
      console.error('❌ Error fetching user info:', error.response?.data || error.message);
      // Если не удалось получить user info, возвращаем токен без user data
      userInfo = {};
    }
    
    // Форматируем ответ в нужном формате
    const response = {
      access_token,
      refresh_token: refresh_token || null,
      user: formatOneIdUser(userInfo),
    };
    
    console.log('✅ User authenticated:', response.user?.full_name || response.user?.sub);
    
    // Если это GET запрос (callback от OneID), редиректим на мобильное приложение с токеном
    if (req.method === 'GET') {
      // Редиректим на мобильное приложение через deep link
      const mobileRedirectUri = `odouzapp://oneid/callback?access_token=${access_token}&refresh_token=${refresh_token || ''}&user=${encodeURIComponent(JSON.stringify(response.user))}`;
      res.redirect(mobileRedirectUri);
      return;
    }
    
    // Для POST запросов возвращаем JSON
    res.json(response);
  } catch (error: any) {
    console.error('❌ Error in oneidCallback:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});

/**
 * GET /oneidUser
 * Получение информации о пользователе по access token
 * Headers:
 *   - Authorization: Bearer {access_token}
 */
export const oneidUser = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header required' });
      return;
    }
    
    const accessToken = authHeader.substring(7);
    
    console.log('📥 Fetching user info with token...');
    
    try {
      const userInfoResponse = await axios.get(ONEID_USER_INFO_URL, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        timeout: 30000,
      });
      
      const userInfo = formatOneIdUser(userInfoResponse.data);
      
      res.json(userInfo);
    } catch (error: any) {
      console.error('❌ Error fetching user info:', error.response?.data || error.message);
      res.status(500).json({
        error: 'Failed to fetch user info',
        details: error.response?.data || error.message,
      });
    }
  } catch (error: any) {
    console.error('❌ Error in oneidUser:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});

// ============================================================================
// Telegram Bot Integration (для книжного магазина)
// ============================================================================

interface TelegramMessageRequest {
  message: string;
  orderId: string;
}

/**
 * POST /sendTelegramMessage
 * Отправка сообщения в Telegram бот
 * Body:
 *   - message: текст сообщения
 *   - orderId: ID заказа
 */
export const sendTelegramMessage = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { message, orderId }: TelegramMessageRequest = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('❌ Telegram bot configuration not set');
      res.status(500).json({ error: 'Telegram bot not configured' });
      return;
    }

    // Отправляем сообщение в Telegram через Bot API
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const telegramResponse = await axios.post(
      telegramApiUrl,
      {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      },
      {
        timeout: 10000,
      }
    );

    if (telegramResponse.data.ok) {
      console.log(`✅ Message sent to Telegram for order ${orderId}`);
      res.json({
        success: true,
        messageId: telegramResponse.data.result.message_id,
        orderId: orderId,
      });
    } else {
      console.error('❌ Telegram API error:', telegramResponse.data);
      res.status(500).json({
        error: 'Failed to send message to Telegram',
        details: telegramResponse.data,
      });
    }
  } catch (error: any) {
    console.error('❌ Error in sendTelegramMessage:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});

/**
 * Интерфейс для запроса отправки OTP на email
 */
interface SendOtpEmailRequest {
  email: string;
  otp: string;
  language?: string; // 'ru' | 'kk' | 'en'
}

/**
 * POST /sendParentalConsentOtp
 * Отправка OTP кода на email родителя для подтверждения согласия
 * Body:
 *   - email: email адрес родителя
 *   - otp: код подтверждения (6 цифр)
 *   - language: язык письма (ru, kk, en) - опционально, по умолчанию 'ru'
 */
export const sendParentalConsentOtp = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { email, otp, language = 'ru' }: SendOtpEmailRequest = req.body;

    if (!email || !otp) {
      res.status(400).json({ error: 'Email and OTP are required' });
      return;
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Валидация OTP (6 цифр)
    if (!/^\d{6}$/.test(otp)) {
      res.status(400).json({ error: 'OTP must be 6 digits' });
      return;
    }

    if (!EMAIL_USER || !EMAIL_PASSWORD) {
      console.error('❌ Email configuration not set');
      res.status(500).json({ error: 'Email service not configured' });
      return;
    }

    // Создаем transporter для отправки email
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465, // true для 465, false для других портов
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
      },
    });

    // Тексты письма в зависимости от языка
    const emailTexts: Record<string, { subject: string; html: string; text: string }> = {
      ru: {
        subject: 'Код подтверждения для Anama App',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .otp-code { background: #fff; border: 2px dashed #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #667eea; margin: 20px 0; border-radius: 8px; letter-spacing: 5px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Anama App</h1>
      <p>Подтверждение родительского согласия</p>
    </div>
    <div class="content">
      <p>Здравствуйте!</p>
      <p>Вы запросили код подтверждения для подтверждения родительского согласия в приложении Anama.</p>
      
      <div class="otp-code">${otp}</div>
      
      <p>Введите этот код в приложении для подтверждения согласия.</p>
      
      <div class="warning">
        <strong>⚠️ Важно:</strong> Код действителен в течение 10 минут. Не передавайте этот код третьим лицам.
      </div>
      
      <p>Если вы не запрашивали этот код, просто проигнорируйте это письмо.</p>
      
      <p>С уважением,<br>Команда Anama App</p>
    </div>
    <div class="footer">
      <p>Это письмо отправлено автоматически. Пожалуйста, не отвечайте на него.</p>
      <p>© ${new Date().getFullYear()} Anama App. Все права защищены.</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `
Anama App - Код подтверждения

Здравствуйте!

Вы запросили код подтверждения для подтверждения родительского согласия в приложении Anama.

Ваш код подтверждения: ${otp}

Введите этот код в приложении для подтверждения согласия.

⚠️ Важно: Код действителен в течение 10 минут. Не передавайте этот код третьим лицам.

Если вы не запрашивали этот код, просто проигнорируйте это письмо.

С уважением,
Команда Anama App
        `.trim(),
      },
      kk: {
        subject: 'Anama App - Растау коды',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .otp-code { background: #fff; border: 2px dashed #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #667eea; margin: 20px 0; border-radius: 8px; letter-spacing: 5px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Anama App</h1>
      <p>Ата-ана келісімін растау</p>
    </div>
    <div class="content">
      <p>Сәлеметсіз бе!</p>
      <p>Сіз Anama қолданбасында ата-ана келісімін растау үшін растау кодын сұрадыңыз.</p>
      
      <div class="otp-code">${otp}</div>
      
      <p>Келісімді растау үшін бұл кодты қолданбаға енгізіңіз.</p>
      
      <div class="warning">
        <strong>⚠️ Маңызды:</strong> Код 10 минут ішінде жарамды. Бұл кодты үшінші тұлғаларға бермеңіз.
      </div>
      
      <p>Егер сіз бұл кодты сұрамаған болсаңыз, бұл хатты елемеңіз.</p>
      
      <p>Құрметпен,<br>Anama App командасы</p>
    </div>
    <div class="footer">
      <p>Бұл хат автоматты түрде жіберілді. Оған жауап бермеңіз.</p>
      <p>© ${new Date().getFullYear()} Anama App. Барлық құқықтар қорғалған.</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `
Anama App - Растау коды

Сәлеметсіз бе!

Сіз Anama қолданбасында ата-ана келісімін растау үшін растау кодын сұрадыңыз.

Сіздің растау кодыңыз: ${otp}

Келісімді растау үшін бұл кодты қолданбаға енгізіңіз.

⚠️ Маңызды: Код 10 минут ішінде жарамды. Бұл кодты үшінші тұлғаларға бермеңіз.

Егер сіз бұл кодты сұрамаған болсаңыз, бұл хатты елемеңіз.

Құрметпен,
Anama App командасы
        `.trim(),
      },
      en: {
        subject: 'Anama App - Verification Code',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .otp-code { background: #fff; border: 2px dashed #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #667eea; margin: 20px 0; border-radius: 8px; letter-spacing: 5px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Anama App</h1>
      <p>Parental Consent Verification</p>
    </div>
    <div class="content">
      <p>Hello!</p>
      <p>You have requested a verification code to confirm parental consent in the Anama app.</p>
      
      <div class="otp-code">${otp}</div>
      
      <p>Enter this code in the app to confirm consent.</p>
      
      <div class="warning">
        <strong>⚠️ Important:</strong> The code is valid for 10 minutes. Do not share this code with third parties.
      </div>
      
      <p>If you did not request this code, please ignore this email.</p>
      
      <p>Best regards,<br>The Anama App Team</p>
    </div>
    <div class="footer">
      <p>This email was sent automatically. Please do not reply.</p>
      <p>© ${new Date().getFullYear()} Anama App. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `
Anama App - Verification Code

Hello!

You have requested a verification code to confirm parental consent in the Anama app.

Your verification code: ${otp}

Enter this code in the app to confirm consent.

⚠️ Important: The code is valid for 10 minutes. Do not share this code with third parties.

If you did not request this code, please ignore this email.

Best regards,
The Anama App Team
        `.trim(),
      },
    };

    const emailContent = emailTexts[language] || emailTexts.ru;

    // Отправляем email
    const mailOptions = {
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
      to: email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ OTP email sent to ${email}, messageId: ${info.messageId}`);

    res.json({
      success: true,
      messageId: info.messageId,
      email: email,
    });
  } catch (error: any) {
    console.error('❌ Error sending OTP email:', error);
    res.status(500).json({
      error: 'Failed to send email',
      details: error.message,
    });
  }
});

