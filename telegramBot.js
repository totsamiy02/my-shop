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
  polling: false, // Отключаем авто-поллинг для ручного управления
  filepath: false
});
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMINS_FILE = path.join(__dirname, 'admins.json');
const LOGS_FILE = path.join(__dirname, 'bot.log');

// ==============================================
// УПРАВЛЕНИЕ АДМИНАМИ
// ==============================================

let activeAdmins = loadAdmins();

function loadAdmins() {
  try {
    if (fs.existsSync(ADMINS_FILE)) {
      const data = fs.readFileSync(ADMINS_FILE, 'utf8');
      const admins = JSON.parse(data);
      if (Array.isArray(admins)) {
        return new Set(admins);
      }
    }
  } catch (err) {
    logError('Ошибка загрузки admins.json:', err);
  }
  return new Set();
}

function saveAdmins() {
  try {
    fs.writeFileSync(ADMINS_FILE, JSON.stringify([...activeAdmins], null, 2));
    logAction(`Админы сохранены (${activeAdmins.size})`);
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
  fs.appendFileSync(LOGS_FILE, logMessage);
  console.log(logMessage.trim());
}

function logError(message, error) {
  const timestamp = new Date().toISOString();
  const errorMessage = error ? `${message} ${error.stack || error}` : message;
  const logMessage = `[${timestamp}] ERROR: ${errorMessage}\n`;
  fs.appendFileSync(LOGS_FILE, logMessage);
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
      { command: '/logout', description: 'Выйти из админки' }
    ]);

    bot.setChatMenuButton({
      menu_button: {
        type: 'commands'
      }
    });
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
    );
  }
  
  bot.sendMessage(
    chatId, 
    '🔐 Введите пароль администратора для доступа:',
    { reply_markup: { remove_keyboard: true }}
  );
});

// Обработка сообщений
const authAttempts = new Map();
const MAX_ATTEMPTS = 5;
const BLOCK_TIME = 5 * 60 * 1000; // 5 минут

bot.on('message', (msg) => {
  if (msg.text?.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const now = Date.now();
  
  if (authAttempts.has(chatId)) {
    const { attempts, lastAttempt, blockedUntil } = authAttempts.get(chatId);
    
    if (blockedUntil && now < blockedUntil) {
      const timeLeft = Math.ceil((blockedUntil - now) / 1000 / 60);
      return bot.sendMessage(
        chatId,
        `❌ Слишком много попыток. Попробуйте через ${timeLeft} минут.`
      );
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
    );
    logAction(`Новый администратор: ${chatId}`);
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
      );
    } else {
      bot.sendMessage(
        chatId,
        `❌ Неверный пароль! Осталось попыток: ${MAX_ATTEMPTS - attemptData.attempts}`
      );
    }
    
    authAttempts.set(chatId, attemptData);
  }
});

// Команда списка админов
bot.onText(/\/admins|👥 Админы/, (msg) => {
  const chatId = msg.chat.id;
  
  if (!activeAdmins.has(chatId)) {
    return bot.sendMessage(chatId, '❌ Доступно только администраторам!');
  }
  
  if (activeAdmins.size === 0) {
    return bot.sendMessage(chatId, 'ℹ️ Нет активных администраторов');
  }
  
  let message = `👥 Активные администраторы (${activeAdmins.size}):\n\n`;
  activeAdmins.forEach(adminId => {
    message += `— ID: <code>${adminId}</code>\n`;
  });
  
  bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
});

// Команда статистики
bot.onText(/\/stats|📊 Статистика/, (msg) => {
  const chatId = msg.chat.id;
  
  if (!activeAdmins.has(chatId)) {
    return bot.sendMessage(chatId, '❌ Доступно только администраторам!');
  }
  
  const stats = {
    activeAdmins: activeAdmins.size,
    memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
    uptime: formatUptime(process.uptime())
  };
  
  let message = `📊 <b>Статистика бота</b>\n\n`;
  message += `👥 Администраторов: ${stats.activeAdmins}\n`;
  message += `🧠 Память: ${stats.memoryUsage}\n`;
  message += `⏱ Время работы: ${stats.uptime}`;
  
  bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
});

function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 60 * 60));
  seconds %= 24 * 60 * 60;
  const hours = Math.floor(seconds / (60 * 60));
  seconds %= 60 * 60;
  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Выход из системы
bot.onText(/\/logout|🚪 Выйти/, (msg) => {
  const chatId = msg.chat.id;
  
  if (!activeAdmins.has(chatId)) {
    return bot.sendMessage(chatId, 'ℹ️ Вы не авторизованы');
  }
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Да', callback_data: 'logout_confirm' }],
        [{ text: '❌ Нет', callback_data: 'logout_cancel' }]
      ]
    }
  };
  
  bot.sendMessage(
    chatId, 
    'Вы уверены, что хотите выйти из системы администратора?',
    keyboard
  );
});

// Обработчик кнопок
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  try {
    if (data.startsWith('complete:')) {
      const orderId = data.split(':')[1];
      await bot.editMessageText(
        `✅ ВЫПОЛНЕНО #${orderId}\n${callbackQuery.message.text}`,
        {
          chat_id: chatId,
          message_id: callbackQuery.message.message_id,
          parse_mode: 'Markdown'
        }
      );
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Заказ выполнен' });
    } 
    else if (data === 'logout_confirm') {
      activeAdmins.delete(chatId);
      saveAdmins();
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        {
          chat_id: chatId,
          message_id: callbackQuery.message.message_id
        }
      );
      bot.sendMessage(
        chatId, 
        '🚪 Вы вышли из системы администратора',
        { reply_markup: { remove_keyboard: true }}
      );
      logAction(`Администратор вышел: ${chatId}`);
    }
    else if (data === 'logout_cancel') {
      await bot.deleteMessage(chatId, callbackQuery.message.message_id);
      bot.sendMessage(
        chatId,
        'Выход отменен',
        {
          reply_markup: {
            keyboard: [
              [{ text: '📊 Статистика' }, { text: '👥 Админы' }],
              [{ text: '🚪 Выйти' }]
            ],
            resize_keyboard: true
          }
        }
      );
    }
  } catch (error) {
    logError('Ошибка обработки callback:', error);
  }
});

// ==============================================
// УПРАВЛЕНИЕ ПОЛЛИНГОМ И ЭКСПОРТ
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

// Функция отправки уведомлений о заказах
async function sendOrderNotification(orderData) {
  if (!isPolling) {
    logError('Бот не запущен, невозможно отправить уведомление');
    return false;
  }

  if (activeAdmins.size === 0) {
    logAction('Попытка отправки уведомления без активных админов');
    return false;
  }

  try {
    const orderId = orderData.orderId || `ORD-${Date.now().toString().slice(-6)}`;
    const orderDate = new Date().toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let message = `🛒 <b>НОВЫЙ ЗАКАЗ #${orderId}</b> [${orderDate}]\n`;
    message += '══════════════════\n';
    message += `👤 <b>Клиент:</b> ${orderData.firstName} ${orderData.lastName}\n`;
    message += `📱 <b>Телефон:</b> <code>${orderData.phone}</code>\n`;
    message += `🏠 <b>Адрес:</b> ${orderData.address}\n\n`;
    message += '📦 <b>Состав заказа:</b>\n';
    
    orderData.basket.forEach((item, index) => {
      message += `${index + 1}. ${item.title}\n`;
      message += `   ${item.quantity} × ${item.price}₽ = <b>${item.quantity * item.price}₽</b>\n`;
    });
    
    message += `\n💰 <b>ИТОГО: ${orderData.totalAmount}₽</b>`;
    message += `\n\n⏳ <i>Статус: В обработке</i>`;

    const options = {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Выполнить', callback_data: `complete:${orderId}` },
            { text: '📞 Позвонить', url: `tel:${orderData.phone}` }
          ]
        ]
      }
    };

    const results = await Promise.allSettled(
      Array.from(activeAdmins).map(chatId => 
        bot.sendMessage(chatId, message, options)
    ));

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    logAction(`Уведомление о заказе #${orderId} отправлено ${successCount} админам`);
    
    return successCount > 0;
  } catch (error) {
    logError('Ошибка отправки уведомления:', error);
    return false;
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