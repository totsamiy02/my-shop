const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ==============================================
// НАСТРОЙКИ И ИНИЦИАЛИЗАЦИЯ
// ==============================================

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('Требуется TELEGRAM_BOT_TOKEN в .env');
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: false,
  filepath: false
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMINS_FILE = path.join(__dirname, 'admins.json');
const LOGS_FILE = path.join(__dirname, 'bot.log');

// Создаем файлы при их отсутствии
if (!fs.existsSync(ADMINS_FILE)) {
  fs.writeFileSync(ADMINS_FILE, '[]');
}
if (!fs.existsSync(LOGS_FILE)) {
  fs.writeFileSync(LOGS_FILE, '');
}

// ==============================================
// УПРАВЛЕНИЕ АДМИНАМИ
// ==============================================

let activeAdmins = loadAdmins();

function loadAdmins() {
  try {
    const data = fs.readFileSync(ADMINS_FILE, 'utf8');
    const admins = JSON.parse(data);
    
    if (!Array.isArray(admins)) {
      throw new Error('Invalid admins.json format');
    }
    
    logAction(`Загружено ${admins.length} администраторов из файла`);
    return new Set(admins);
    
  } catch (err) {
    if (err.code === 'ENOENT') {
      logAction('Файл admins.json не найден, создаем новый');
    } else {
      logError('Ошибка загрузки admins.json:', err);
    }
    return new Set();
  }
}

function saveAdmins() {
  try {
    const adminsArray = [...activeAdmins];
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(adminsArray, null, 2));
    logAction(`Админы сохранены (${adminsArray.length})`);
  } catch (err) {
    logError('Ошибка сохранения admins.json:', err);
  }
}

// ==============================================
// ЛОГГИРОВАНИЕ
// ==============================================

function logAction(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ACTION: ${message}\n`;
  
  try {
    fs.appendFileSync(LOGS_FILE, logMessage);
  } catch (err) {
    console.error('Ошибка записи в лог:', err);
  }
  
  console.log(logMessage.trim());
}

function logError(message, error) {
  const timestamp = new Date().toISOString();
  const errorMessage = error ? `${message} ${error.stack || error}` : message;
  const logMessage = `[${timestamp}] ERROR: ${errorMessage}\n`;
  
  try {
    fs.appendFileSync(LOGS_FILE, logMessage);
  } catch (err) {
    console.error('Ошибка записи в лог:', err);
  }
  
  console.error(logMessage.trim());
}

// ==============================================
// ИНТЕРФЕЙС БОТА
// ==============================================

function setupBotMenu() {
  try {
    bot.setMyCommands([
      { command: '/start', description: 'Авторизация администратора' },
      { command: '/admins', description: 'Список активных админов' },
      { command: '/stats', description: 'Статистика бота' },
      { command: '/status', description: 'Проверить статус бота' },
      { command: '/logout', description: 'Выйти из админки' }
    ]);

    logAction('Меню бота настроено');
  } catch (err) {
    logError('Ошибка настройки меню:', err);
  }
}

// ==============================================
// ОБРАБОТЧИКИ КОМАНД
// ==============================================

// Стартовая команда
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  logAction(`Команда /start от ${chatId}`);
  
  if (activeAdmins.has(chatId)) {
    const keyboard = {
      reply_markup: {
        keyboard: [
          [{ text: '📊 Статистика' }, { text: '👥 Админы' }],
          [{ text: '🚪 Выйти' }]
        ],
        resize_keyboard: true
      }
    };
    
    return bot.sendMessage(
      chatId,
      `👋 Добро пожаловать в панель администратора!\n\n` +
      `Используйте меню ниже для управления уведомлениями.`,
      keyboard
    ).catch(err => logError('Ошибка отправки сообщения:', err));
  }
  
  bot.sendMessage(
    chatId, 
    '🔐 Введите пароль администратора для доступа:',
    { reply_markup: { remove_keyboard: true }}
  ).catch(err => logError('Ошибка отправки сообщения:', err));
});

// Команда проверки статуса
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const isAdmin = activeAdmins.has(chatId);
  
  bot.sendMessage(
    chatId,
    `Статус бота:\n\n` +
    `Активных админов: ${activeAdmins.size}\n` +
    `Ваш статус: ${isAdmin ? '✅ Администратор' : '❌ Не администратор'}\n` +
    `Ваш chat ID: ${chatId}`
  ).catch(err => logError('Ошибка отправки статуса:', err));
});

// Обработка сообщений
const authAttempts = new Map();
const MAX_ATTEMPTS = 5;
const BLOCK_TIME = 5 * 60 * 1000; // 5 минут

bot.on('message', (msg) => {
  if (msg.text?.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const now = Date.now();
  logAction(`Сообщение от ${chatId}: ${msg.text}`);
  
  if (authAttempts.has(chatId)) {
    const { attempts, lastAttempt, blockedUntil } = authAttempts.get(chatId);
    
    if (blockedUntil && now < blockedUntil) {
      const timeLeft = Math.ceil((blockedUntil - now) / 1000 / 60);
      return bot.sendMessage(
        chatId,
        `❌ Слишком много попыток. Попробуйте через ${timeLeft} минут.`
      ).catch(err => logError('Ошибка отправки сообщения:', err));
    }
  }

  if (msg.text === ADMIN_PASSWORD) {
    activeAdmins.add(chatId);
    saveAdmins();
    authAttempts.delete(chatId);
    
    const keyboard = {
      reply_markup: {
        keyboard: [
          [{ text: '📊 Статистика' }, { text: '👥 Админы' }],
          [{ text: '🚪 Выйти' }]
        ],
        resize_keyboard: true
      }
    };
    
    bot.sendMessage(
      chatId,
      '✅ Вы успешно авторизованы!\n\n' +
      'Теперь вы будете получать уведомления о новых заказах.',
      keyboard
    ).then(() => {
      logAction(`Новый администратор: ${chatId}`);
    }).catch(err => {
      logError('Ошибка отправки сообщения:', err);
    });
  } else if (!activeAdmins.has(chatId)) {
    const attemptData = authAttempts.get(chatId) || { attempts: 0 };
    attemptData.attempts++;
    attemptData.lastAttempt = now;
    
    if (attemptData.attempts >= MAX_ATTEMPTS) {
      attemptData.blockedUntil = now + BLOCK_TIME;
      const timeLeft = Math.ceil(BLOCK_TIME / 1000 / 60);
      bot.sendMessage(
        chatId,
        `❌ Слишком много попыток. Попробуйте через ${timeLeft} минут.`
      ).catch(err => logError('Ошибка отправки сообщения:', err));
    } else {
      bot.sendMessage(
        chatId,
        `❌ Неверный пароль! Осталось попыток: ${MAX_ATTEMPTS - attemptData.attempts}`
      ).catch(err => logError('Ошибка отправки сообщения:', err));
    }
    
    authAttempts.set(chatId, attemptData);
  }
});

// ==============================================
// ОТПРАВКА УВЕДОМЛЕНИЙ О ЗАКАЗАХ
// ==============================================

async function sendOrderNotification(orderData) {
  if (!bot || !bot.isPolling()) {
    logError('Бот не инициализирован или не запущен');
    return false;
  }

  if (!orderData || !orderData.orderId) {
    logError('Неверные данные заказа для уведомления');
    return false;
  }

  if (activeAdmins.size === 0) {
    logAction('Нет активных администраторов для отправки уведомления');
    return false;
  }

  try {
    const orderId = orderData.orderId;
    const orderDate = new Date().toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let message = `🛒 <b>НОВЫЙ ЗАКАЗ #${orderId}</b> [${orderDate}]\n`;
    message += '══════════════════\n';
    message += `👤 <b>Клиент:</b> ${orderData.firstName} ${orderData.lastName || ''}\n`;
    message += `📱 <b>Телефон:</b> <code>${formatPhoneNumber(orderData.phone)}</code>\n`;
    message += `🏠 <b>Адрес:</b> ${orderData.address || 'Не указан'}\n\n`;
    message += '📦 <b>Состав заказа:</b>\n';
    
    orderData.basket.forEach((item, index) => {
      message += `${index + 1}. ${item.title}\n`;
      message += `   ${item.quantity} × ${item.price}₽ = <b>${item.quantity * item.price}₽</b>\n`;
    });
    
    message += `\n💰 <b>ИТОГО: ${orderData.totalAmount}₽</b>`;
    message += `\n\n⏳ <i>Статус: В обработке</i>`;

    // Убираем кнопку с tel: и оставляем только кнопку "Выполнить"
    const options = {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Выполнить', callback_data: `complete:${orderId}` }]
        ]
      }
    };

    const sendPromises = [];
    activeAdmins.forEach(chatId => {
      sendPromises.push(
        bot.sendMessage(chatId, message, options)
          .then(() => {
            logAction(`Уведомление отправлено админу ${chatId}`);
            return true;
          })
          .catch(err => {
            logError(`Ошибка отправки админу ${chatId}:`, err);
            return false;
          })
      );
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(Boolean).length;
    
    logAction(`Уведомление о заказе #${orderId} отправлено ${successCount} из ${activeAdmins.size} админам`);
    
    return successCount > 0;
  } catch (error) {
    logError('Критическая ошибка при отправке уведомления:', error);
    return false;
  }
}

function formatPhoneNumber(phone) {
  if (!phone) return 'Не указан';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `+${cleaned[0]} (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9)}`;
  }
  return cleaned;
}


// ==============================================
// ЗАПУСК И УПРАВЛЕНИЕ БОТОМ
// ==============================================

let isPolling = false;

function startBot() {
  if (isPolling) {
    logAction('Бот уже запущен');
    return;
  }

  try {
    bot.startPolling();
    isPolling = true;
    setupBotMenu();
    logAction(`🤖 Бот запущен. Активных админов: ${activeAdmins.size}`);
    
    if (activeAdmins.size === 0) {
      logAction('⚠️ Нет авторизованных администраторов!');
    }
  } catch (err) {
    logError('Ошибка запуска бота:', err);
    process.exit(1);
  }
}

function stopBot() {
  if (isPolling) {
    bot.stopPolling();
    isPolling = false;
    logAction('Бот остановлен');
  }
}

// Автоматический запуск бота при подключении модуля
startBot();

// Очистка при завершении
process.on('SIGINT', () => {
  logAction('Бот завершает работу...');
  stopBot();
  process.exit();
});

module.exports = {
  bot,
  sendOrderNotification,
  startBot,
  stopBot,
  activeAdmins
};