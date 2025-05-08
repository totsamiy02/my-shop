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

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMINS_FILE = path.join(__dirname, 'admins.json');

// ==============================================
// УПРАВЛЕНИЕ АДМИНАМИ
// ==============================================

let activeAdmins = loadAdmins();

function loadAdmins() {
  try {
    if (fs.existsSync(ADMINS_FILE)) {
      const data = fs.readFileSync(ADMINS_FILE, 'utf8');
      return new Set(JSON.parse(data));
    }
  } catch (err) {
    console.error('Ошибка загрузки admins.json:', err);
  }
  return new Set();
}

function saveAdmins() {
  try {
    fs.writeFileSync(ADMINS_FILE, JSON.stringify([...activeAdmins]));
    console.log(`Админы сохранены (${activeAdmins.size})`);
  } catch (err) {
    console.error('Ошибка сохранения admins.json:', err);
  }
}

// ==============================================
// НАСТРОЙКА ИНТЕРФЕЙСА БОТА
// ==============================================

function setupBotMenu() {
  // Устанавливаем список команд для быстрого доступа
  bot.setMyCommands([
    { command: '/start', description: 'Авторизация администратора' },
    { command: '/admins', description: 'Список активных админов' },
    { command: '/logout', description: 'Выйти из админки' }
  ]);

  // Добавляем кнопочное меню в интерфейс бота
  bot.setChatMenuButton({
    menu_button: {
      type: 'commands'
    }
  }).catch(err => console.error('Ошибка настройки меню:', err));
}

// ==============================================
// ОБРАБОТЧИКИ КОМАНД С ДОБАВЛЕНИЕМ МЕНЮ
// ==============================================

// Стартовая команда
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  if (activeAdmins.has(chatId)) {
    return bot.sendMessage(
      chatId,
      `👋 Вы уже авторизованы!\n\n` +
      `Используйте /admins для просмотра активных администраторов\n` +
      `/logout для выхода из системы`,
      {
        reply_markup: {
          keyboard: [
            [{ text: '/admins' }],
            [{ text: '/logout' }]
          ],
          resize_keyboard: true,
          one_time_keyboard: false
        }
      }
    );
  }
  
  bot.sendMessage(
    chatId, 
    '🔐 Введите пароль администратора:',
    {
      reply_markup: {
        remove_keyboard: true // Убираем клавиатуру для неавторизованных
      }
    }
  );
});

// Обработка сообщений (проверка пароля)
bot.on('message', (msg) => {
  if (msg.text?.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  
  if (msg.text === ADMIN_PASSWORD) {
    activeAdmins.add(chatId);
    saveAdmins();
    
    bot.sendMessage(
      chatId,
      '✅ Вы успешно авторизованы!\n\n' +
      'Теперь вы будете получать уведомления о новых заказах.\n' +
      'Используйте меню внизу для быстрого доступа к командам.',
      {
        reply_markup: {
          keyboard: [
            [{ text: '/admins' }],
            [{ text: '/logout' }]
          ],
          resize_keyboard: true,
          one_time_keyboard: false
        }
      }
    );
  } else if (!activeAdmins.has(chatId)) {
    bot.sendMessage(chatId, '❌ Неверный пароль! Попробуйте снова.');
  }
});

// Список активных админов (без изменений)
bot.onText(/\/admins/, (msg) => {
  const chatId = msg.chat.id;
  
  if (!activeAdmins.has(chatId)) {
    return bot.sendMessage(chatId, '❌ Доступно только администраторам!');
  }
  
  if (activeAdmins.size === 0) {
    return bot.sendMessage(chatId, 'ℹ️ Нет активных администраторов');
  }
  
  let message = `👥 Активные администраторы (${activeAdmins.size}):\n`;
  activeAdmins.forEach(adminId => {
    message += `— ID: ${adminId}\n`;
  });
  
  bot.sendMessage(chatId, message);
});

// Выход из системы (без изменений)
bot.onText(/\/logout/, (msg) => {
  const chatId = msg.chat.id;
  
  if (!activeAdmins.has(chatId)) {
    return bot.sendMessage(chatId, 'ℹ️ Вы не авторизованы');
  }
  
  activeAdmins.delete(chatId);
  saveAdmins();
  bot.sendMessage(
    chatId, 
    '🚪 Вы вышли из системы администратора',
    {
      reply_markup: {
        remove_keyboard: true // Убираем клавиатуру после выхода
      }
    }
  );
});

// ==============================================
// СИСТЕМА УВЕДОМЛЕНИЙ О ЗАКАЗАХ (без изменений)
// ==============================================

async function sendOrderNotification(orderData) {
  if (activeAdmins.size === 0) {
    console.warn('Нет активных админов для отправки уведомления!');
    return false;
  }

  try {
    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const orderDate = new Date().toLocaleString('ru-RU');
    
    let message = `🛒 *НОВЫЙ ЗАКАЗ #${orderId}* [${orderDate}]\n`;
    message += '══════════════════\n';
    message += `👤 *Клиент:* ${orderData.firstName} ${orderData.lastName}\n`;
    message += `📱 *Телефон:* \`${orderData.phone}\`\n`;
    message += `🏠 *Адрес:* ${orderData.address}\n\n`;
    message += '📦 *Состав заказа:*\n';
    
    orderData.basket.forEach(item => {
      message += `▫️ ${item.title} - ${item.quantity} × ${item.price}₽ = *${item.quantity * item.price}₽*\n`;
    });
    
    message += `\n💰 *ИТОГО: ${orderData.totalAmount}₽*`;

    const options = {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{
            text: '✅ Заказ выполнен',
            callback_data: `complete:${orderId}`
          }]
        ]
      }
    };

    const sendPromises = Array.from(activeAdmins).map(chatId => {
      return bot.sendMessage(chatId, message, options)
        .catch(err => console.error(`Ошибка отправки для чата ${chatId}:`, err));
    });

    await Promise.all(sendPromises);
    return true;
  } catch (error) {
    console.error('Ошибка отправки уведомления:', error);
    return false;
  }
}

// Обработчик кнопок (без изменений)
bot.on('callback_query', async (callbackQuery) => {
  try {
    const [action, orderId] = callbackQuery.data.split(':');
    const msg = callbackQuery.message;

    if (action === 'complete') {
      await bot.editMessageText(`✅ ВЫПОЛНЕНО #${orderId}\n${msg.text}`, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown'
      });
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Заказ выполнен' });
    }
  } catch (error) {
    console.error('Ошибка обработки callback:', error);
  }
});

// ==============================================
// ЗАПУСК БОТА
// ==============================================

setupBotMenu();

if (!process.env.WEBHOOK_URL) {
  bot.startPolling().then(() => {
    console.log(`🤖 Бот запущен. Активных админов: ${activeAdmins.size}`);
    if (activeAdmins.size === 0) {
      console.warn('⚠️ Нет авторизованных администраторов!');
    }
  }).catch(err => {
    console.error('Ошибка запуска бота:', err);
    process.exit(1);
  });
}

module.exports = { sendOrderNotification, bot };