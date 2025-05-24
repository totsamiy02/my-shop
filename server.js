require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { sendOrderNotification } = require('./telegramBot');
const { startBot } = require('./telegramBot');

const app = express();
const port = process.env.PORT || 3001;

const ADMIN_EMAILS = ['arikbilenko@gmail.com'];

// Настройки CORS
const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.set('trust proxy', 1);

// Настройка Multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'temp_uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Недопустимый тип файла. Разрешены только JPEG, PNG и GIF'));
    }
  }
});

// Инициализация базы данных
const db = new sqlite3.Database('./store.db', (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to SQLite database');
        
        // Создаем таблицы, если они не существуют
        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    phone TEXT NOT NULL UNIQUE,
                    email TEXT NOT NULL UNIQUE,
                    password TEXT NOT NULL,
                    role TEXT DEFAULT 'user',
                    avatar TEXT DEFAULT '/img/avatar.jpg',
                    reset_token TEXT,
                    reset_token_expires INTEGER,
                    failed_login_attempts INTEGER DEFAULT 0,
                    last_failed_login INTEGER
                )
            `);
            
            db.run(`
                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    slug TEXT UNIQUE
                )
            `);
            
            db.run(`
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    price REAL NOT NULL,
                    description TEXT,
                    image TEXT,
                    quantity INTEGER DEFAULT 0,
                    brand TEXT NOT NULL DEFAULT 'Noname',
                    category_id INTEGER,
                    weight TEXT DEFAULT 'N/A',
                    FOREIGN KEY(category_id) REFERENCES categories(id)
                )
            `);
        });
    }
});


// Лимитер для защиты от атак
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 200, 
    message: 'Слишком много попыток входа. Пожалуйста, попробуйте позже.',
    skipSuccessfulRequests: true
});

// Middleware для проверки JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
        if (err) {
            console.error('JWT verification error:', err);
            return res.sendStatus(403);
        }
        
        // Универсальное решение - поддерживаем оба варианта
        const userId = decoded.userId || decoded.id;
        
        if (!userId) {
            console.error('Invalid token data:', decoded);
            return res.sendStatus(403);
        }
        
        // Добавляем user в запрос с универсальными полями
        req.user = {
            id: userId,
            userId: userId,  // Дублируем для совместимости
            role: decoded.role
        };
        
        next();
    });
}

// Проверка API
app.get('/api/check', (req, res) => {
    res.json({ status: 'API работает', timestamp: new Date() });
});

// Маршруты аутентификации
app.post('/api/register', async (req, res) => {
    try {
        const { firstName, lastName, phone, email, password, confirmPassword } = req.body;
        
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Пароли не совпадают' });
        }
        
        if (password.length < 8) {
            return res.status(400).json({ error: 'Пароль должен содержать минимум 8 символов' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const isAdmin = ADMIN_EMAILS.includes(email);
        
        db.run(
            `INSERT INTO users (first_name, last_name, phone, email, password, role) VALUES (?, ?, ?, ?, ?, ?)`,
            [firstName, lastName, phone, email, hashedPassword, isAdmin ? 'admin' : 'user'],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed: users.email')) {
                        return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
                    }
                    if (err.message.includes('UNIQUE constraint failed: users.phone')) {
                        return res.status(400).json({ error: 'Пользователь с таким телефоном уже существует' });
                    }
                    return res.status(500).json({ error: 'Ошибка при регистрации' });
                }
                
                db.get(
                    `SELECT id, first_name, last_name, email, phone, role, avatar FROM users WHERE id = ?`,
                    [this.lastID],
                    (err, user) => {
                        if (err || !user) {
                            return res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
                        }
                        
                        const token = jwt.sign(
                            { userId: user.id, role: user.role },
                            process.env.JWT_SECRET || 'your-secret-key',
                            { expiresIn: '1h' }
                        );
                        
                        res.status(201).json({ 
                            token,
                            user: {
                                id: user.id,
                                firstName: user.first_name,
                                lastName: user.last_name,
                                role: user.role,
                                avatar: user.avatar
                            },
                            message: 'Регистрация успешна' 
                        });
                    }
                );
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Валидация входных данных
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Необходимо указать email и пароль',
                details: {
                    email: !email ? 'Требуется email' : null,
                    password: !password ? 'Требуется пароль' : null
                }
            });
        }

        db.get(
            `SELECT 
                id, 
                first_name, 
                last_name, 
                email, 
                password, 
                role, 
                avatar, 
                failed_login_attempts, 
                last_failed_login 
            FROM users 
            WHERE email = ?`,
            [email],
            async (err, user) => {
                if (err) {
                    console.error('Ошибка базы данных при входе:', err);
                    return res.status(500).json({ 
                        error: 'Ошибка сервера',
                        details: 'Database query failed'
                    });
                }
                
                if (!user) {
                    return res.status(401).json({ 
                        error: 'Неверные учетные данные',
                        details: 'Пользователь с таким email не найден'
                    });
                }
                
                // Проверка блокировки после неудачных попыток
                const isBlocked = user.failed_login_attempts >= 5 && 
                                Date.now() - user.last_failed_login < 300000; // 5 минут блокировки
                
                if (isBlocked) {
                    const timeLeft = Math.ceil((300000 - (Date.now() - user.last_failed_login)) / 1000);
                    return res.status(429).json({ 
                        error: 'Слишком много неудачных попыток',
                        details: `Попробуйте через ${timeLeft} секунд`,
                        retryAfter: timeLeft
                    });
                }
                
                // Проверка пароля
                const isMatch = await bcrypt.compare(password, user.password);
                
                if (!isMatch) {
                    // Обновляем счетчик неудачных попыток
                    db.run(
                        `UPDATE users SET 
                        failed_login_attempts = failed_login_attempts + 1,
                        last_failed_login = ?
                        WHERE id = ?`,
                        [Date.now(), user.id],
                        function(err) {
                            if (err) {
                                console.error('Ошибка при обновлении счетчика попыток:', err);
                            }
                        }
                    );
                    
                    return res.status(401).json({ 
                        error: 'Неверные учетные данные',
                        details: 'Неправильный пароль',
                        attemptsLeft: 5 - user.failed_login_attempts
                    });
                }
                
                // Сброс счетчика при успешном входе
                db.run(
                    `UPDATE users SET 
                    failed_login_attempts = 0,
                    last_failed_login = NULL
                    WHERE id = ?`,
                    [user.id]
                );
                
                // Генерация токена с дополнительными данными для совместимости
                const token = jwt.sign(
                    { 
                        userId: user.id,  // Основной идентификатор
                        id: user.id,      // Для обратной совместимости
                        role: user.role,
                        email: user.email,
                        firstName: user.first_name,
                        lastName: user.last_name
                    },
                    process.env.JWT_SECRET || 'your-secret-key',
                    { expiresIn: '1h' }
                );
                
                // Формирование ответа
                res.json({ 
                    success: true,
                    token, 
                    user: {
                        id: user.id,
                        firstName: user.first_name,
                        lastName: user.last_name,
                        email: user.email,
                        role: user.role,
                        avatar: user.avatar || '/img/avatar.jpg'
                    },
                    tokenExpiresIn: 3600 // 1 час в секундах
                });
            }
        );
    } catch (error) {
        console.error('Ошибка в обработчике входа:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: error.message
        });
    }
});

// востановление паролей

const transporter = nodemailer.createTransport({
  host: 'smtp.yandex.ru',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Эндпоинт для отправки кода восстановления
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    // Проверяем существование пользователя
    db.get(
      `SELECT * FROM users WHERE email = ?`, 
      [email],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Ошибка базы данных' });
        }

        if (!user) {
          return res.status(400).json({ error: 'Пользователь с таким email не найден' });
        }

        // Генерируем 6-значный код
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const resetCodeExpires = Date.now() + 300000; // 5 минут

        // Сохраняем код в БД
        db.run(
          `UPDATE users SET 
           reset_token = ?,
           reset_token_expires = ?
           WHERE id = ?`,
          [resetCode, resetCodeExpires, user.id],
          async (err) => {
            if (err) {
              console.error('Database update error:', err);
              return res.status(500).json({ error: 'Ошибка при обновлении данных' });
            }

            // Красивое письмо с HTML-версткой
            const mailOptions = {
              from: `"Поддержка магазина" <${process.env.EMAIL_USER}>`,
              to: email,
              subject: 'Код подтверждения для сброса пароля',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                  <div style="background-color: #ff6b00; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Восстановление пароля</h1>
                  </div>
                  <div style="padding: 20px;">
                    <p style="font-size: 16px;">Для сброса пароля используйте следующий код подтверждения:</p>
                    <div style="background-color: #f5f5f5; padding: 15px; text-align: center; margin: 20px 0; border-radius: 4px;">
                      <span style="font-size: 28px; letter-spacing: 5px; font-weight: bold; color: #333;">${resetCode}</span>
                    </div>
                    <p style="font-size: 14px; color: #666;">Код действителен в течение 5 минут.</p>
                    <p style="font-size: 14px; color: #666;">Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
                  </div>
                  <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                    <p>Это письмо отправлено автоматически, пожалуйста, не отвечайте на него.</p>
                  </div>
                </div>
              `,
              // Добавляем текстовую версию для почтовых клиентов, которые не поддерживают HTML
              text: `Для сброса пароля используйте следующий код: ${resetCode}\nКод действителен в течение 5 минут.\nЕсли вы не запрашивали сброс пароля, проигнорируйте это письмо.`
            };

            // Добавляем DKIM подпись и другие заголовки для предотвращения спама
            mailOptions.headers = {
              'X-Mailer': 'OurShop Mailer',
              'X-Priority': '1',
              'X-MSMail-Priority': 'High',
              'Importance': 'High'
            };

            try {
              await transporter.sendMail(mailOptions);
              res.json({ 
                success: true,
                message: 'Код подтверждения отправлен на ваш email' 
              });
            } catch (mailError) {
              console.error('Mail sending error:', mailError);
              res.status(500).json({ error: 'Ошибка при отправке письма' });
            }
          }
        );
      }
    );
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.post('/api/resend-reset-code', async (req, res) => {
  const { email } = req.body;

  try {
    // Проверяем существование пользователя
    db.get(
      `SELECT * FROM users WHERE email = ?`, 
      [email],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Ошибка базы данных' });
        }

        if (!user) {
          return res.status(400).json({ error: 'Пользователь с таким email не найден' });
        }

        // Генерируем новый 6-значный код
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const resetCodeExpires = Date.now() + 300000; // 5 минут

        // Обновляем код в БД
        db.run(
          `UPDATE users SET 
           reset_token = ?,
           reset_token_expires = ?
           WHERE id = ?`,
          [resetCode, resetCodeExpires, user.id],
          async (err) => {
            if (err) {
              console.error('Database update error:', err);
              return res.status(500).json({ error: 'Ошибка при обновлении данных' });
            }

            // Отправляем письмо
            const mailOptions = {
              from: `"Поддержка магазина" <${process.env.EMAIL_USER}>`,
              to: email,
              subject: 'Новый код подтверждения',
              html: `
                <h2>Новый код подтверждения</h2>
                <p>Для сброса пароля используйте следующий код:</p>
                <h3 style="font-size: 24px; letter-spacing: 2px;">${resetCode}</h3>
                <p>Код действителен в течение 5 минут.</p>
              `
            };

            try {
              await transporter.sendMail(mailOptions);
              res.json({ 
                success: true,
                message: 'Новый код подтверждения отправлен' 
              });
            } catch (mailError) {
              console.error('Mail sending error:', mailError);
              res.status(500).json({ error: 'Ошибка при отправке письма' });
            }
          }
        );
      }
    );
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.post('/api/verify-reset-code', async (req, res) => {
  const { email, code } = req.body;

  try {
    // Проверяем код и срок его действия
    db.get(
      `SELECT * FROM users 
       WHERE email = ? 
       AND reset_token = ?
       AND reset_token_expires > ?`,
      [email, code, Date.now()],
      (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Ошибка базы данных' });
        }

        if (!user) {
          return res.status(400).json({ error: 'Неверный или просроченный код подтверждения' });
        }

        res.json({ 
          success: true,
          message: 'Код подтвержден' 
        });
      }
    );
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Эндпоинт для сброса пароля
app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Проверяем токен и срок его действия
    db.get(
      `SELECT * FROM users 
       WHERE reset_token = ? 
       AND reset_token_expires > ?`,
      [token, Date.now()],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Ошибка базы данных' });
        }

        if (!user) {
          return res.status(400).json({ error: 'Неверный или просроченный код подтверждения' });
        }

        // Хешируем новый пароль
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Обновляем пароль и очищаем токен
        db.run(
          `UPDATE users SET 
           password = ?,
           reset_token = NULL,
           reset_token_expires = NULL
           WHERE id = ?`,
          [hashedPassword, user.id],
          function(err) {
            if (err) {
              console.error('Database update error:', err);
              return res.status(500).json({ error: 'Ошибка при обновлении пароля' });
            }
            
            res.json({ 
              success: true,
              message: 'Пароль успешно изменен' 
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Маршруты для работы с пользователями
app.get('/api/user/check-phone', authenticateToken, (req, res) => {
    const { phone } = req.query;
    
    if (!phone) {
        return res.status(400).json({ error: 'Не указан номер телефона' });
    }
    
    db.get(
        `SELECT id FROM users WHERE phone = ? AND id != ?`,
        [phone, req.user.userId],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка сервера' });
            }
            
            res.json({ exists: !!row });
        }
    );
});

app.get('/api/user', authenticateToken, (req, res) => {
    db.get(
        `SELECT id, first_name, last_name, email, phone, role, avatar FROM users WHERE id = ?`,
        [req.user.userId],  // Используем userId
        (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Ошибка сервера' });
            }
            
            if (!user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            
            res.json(user);
        }
    );
});

app.put('/api/user', authenticateToken, (req, res) => {
    const { firstName, lastName, phone } = req.body;
    
    // Сначала проверяем дубликат телефона
    db.get(
        `SELECT id FROM users WHERE phone = ? AND id != ?`,
        [phone, req.user.userId],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка проверки номера телефона' });
            }
            
            if (row) {
                return res.status(400).json({ error: 'Номер телефона уже зарегистрирован' });
            }
            
            // Если дубликата нет, обновляем данные
            db.run(
                `UPDATE users SET 
                first_name = ?,
                last_name = ?,
                phone = ?
                WHERE id = ?`,
                [firstName, lastName, phone, req.user.userId],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Ошибка при обновлении данных' });
                    }
                    
                    db.get(
                        `SELECT id, first_name, last_name, email, phone, role, avatar FROM users WHERE id = ?`,
                        [req.user.userId],
                        (err, user) => {
                            if (err || !user) {
                                return res.status(500).json({ error: 'Ошибка при получении обновленных данных' });
                            }
                            res.json(user);
                        }
                    );
                }
            );
        }
    );
});

app.put('/api/user/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    // Проверяем MIME-тип еще раз (двойная проверка)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Недопустимый тип файла' });
    }

    const publicImgPath = path.join(__dirname, 'public', 'img');
    if (!fs.existsSync(publicImgPath)) {
      fs.mkdirSync(publicImgPath, { recursive: true });
    }

    // Получаем текущий аватар пользователя
    const user = await new Promise((resolve, reject) => {
      db.get(
        `SELECT avatar FROM users WHERE id = ?`,
        [req.user.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    // Удаляем старый аватар, если он существует и не дефолтный
    if (user?.avatar && !user.avatar.includes('avatar.jpg')) {
      const oldAvatarPath = path.join(publicImgPath, path.basename(user.avatar));
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlink(oldAvatarPath, (err) => {
          if (err) console.error('Ошибка при удалении старого аватара:', err);
        });
      }
    }

    // Генерируем новое имя файла
    const newFileName = `avatar-${req.user.userId}-${Date.now()}${path.extname(req.file.originalname)}`;
    const targetPath = path.join(publicImgPath, newFileName);
    const avatarUrl = `/img/${newFileName}`;

    // Перемещаем файл из временной папки
    await fs.promises.rename(req.file.path, targetPath);

    // Обновляем запись в БД
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET avatar = ? WHERE id = ?`,
        [avatarUrl, req.user.userId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ avatar: avatarUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    
    // Удаляем временный файл в случае ошибки
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Ошибка при обновлении аватарки' });
  }
});

// Маршруты для товаров (публичные)
app.get('/api/products', (req, res) => {
    const query = `
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id
    `;
    
    db.all(query, (err, products) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка получения товаров' });
        }
        res.json(products);
    });
});

app.get('/api/products/:id', (req, res) => {
    const query = `
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
    `;
    
    db.get(query, [req.params.id], (err, product) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка получения товара' });
        }
        if (!product) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        res.json(product);
    });
});

// Маршруты для категорий (публичные)
app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories', (err, categories) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка получения категорий' });
        }
        res.json(categories);
    });
});

app.get('/api/categories/:slug', (req, res) => {
    db.get(
        'SELECT * FROM categories WHERE slug = ?',
        [req.params.slug],
        (err, category) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка получения категории' });
            }
            if (!category) {
                return res.status(404).json({ error: 'Категория не найдена' });
            }
            
            db.all(
                'SELECT * FROM products WHERE category_id = ?',
                [category.id],
                (err, products) => {
                    if (err) {
                        return res.status(500).json({ error: 'Ошибка получения товаров категории' });
                    }
                    res.json({ category, products });
                }
            );
        }
    );
});

// Маршруты для админки товаров
app.get('/api/admin/products', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    
    const query = `
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.id DESC
    `;
    
    db.all(query, (err, products) => {
        if (err) {
            console.error('Error fetching admin products:', err);
            return res.status(500).json({ error: 'Ошибка получения товаров' });
        }
        res.json(products);
    });
});

app.post('/api/admin/products', authenticateToken, upload.single('image'), (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    
    const { name, price, description, quantity, brand, weight, category_id } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    db.run(
        `INSERT INTO products (name, price, description, image, quantity, brand, weight, category_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, price, description, imageUrl, quantity, brand, weight, category_id],
        function(err) {
            if (err) {
                console.error('Error adding product:', err);
                return res.status(500).json({ error: 'Ошибка при добавлении товара' });
            }
            
            db.get(
                `SELECT p.*, c.name as category_name 
                 FROM products p LEFT JOIN categories c ON p.category_id = c.id
                 WHERE p.id = ?`,
                [this.lastID],
                (err, product) => {
                    if (err || !product) {
                        console.error('Error fetching new product:', err);
                        return res.status(500).json({ error: 'Ошибка при получении товара' });
                    }
                    res.status(201).json(product);
                }
            );
        }
    );
});

app.put('/api/admin/products/:id', authenticateToken, upload.single('image'), (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    
    const { name, price, description, quantity, brand, weight, category_id } = req.body;
    const productId = req.params.id;
    let imageUrl = null;
    
    if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
    }
    
    db.get(
        `SELECT * FROM products WHERE id = ?`,
        [productId],
        (err, product) => {
            if (err) {
                console.error('Error fetching product for update:', err);
                return res.status(500).json({ error: 'Ошибка при получении товара' });
            }
            if (!product) return res.status(404).json({ error: 'Товар не найден' });
            
            const updateQuery = `
                UPDATE products SET 
                    name = ?,
                    price = ?,
                    description = ?,
                    ${imageUrl ? 'image = ?,' : ''}
                    quantity = ?,
                    brand = ?,
                    weight = ?,
                    category_id = ?
                WHERE id = ?
            `;
            
            const params = [
                name || product.name,
                price || product.price,
                description || product.description,
                ...(imageUrl ? [imageUrl] : []),
                quantity || product.quantity,
                brand || product.brand,
                weight || product.weight,
                category_id || product.category_id,
                productId
            ];
            
            db.run(
                updateQuery,
                params,
                function(err) {
                    if (err) {
                        console.error('Error updating product:', err);
                        return res.status(500).json({ error: 'Ошибка при обновлении товара' });
                    }
                    
                    db.get(
                        `SELECT p.*, c.name as category_name 
                         FROM products p LEFT JOIN categories c ON p.category_id = c.id
                         WHERE p.id = ?`,
                        [productId],
                        (err, updatedProduct) => {
                            if (err || !updatedProduct) {
                                console.error('Error fetching updated product:', err);
                                return res.status(500).json({ error: 'Ошибка при получении обновленного товара' });
                            }
                            res.json(updatedProduct);
                        }
                    );
                }
            );
        }
    );
});

app.delete('/api/admin/products/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    
    db.get(`SELECT image FROM products WHERE id = ?`, [req.params.id], (err, product) => {
        if (err) {
            console.error('Ошибка при получении товара:', err);
            return res.status(500).json({ error: 'Ошибка при получении товара' });
        }
        
        if (!product) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        // Удаляем товар из БД
        db.run(`DELETE FROM products WHERE id = ?`, [req.params.id], function(err) {
            if (err) {
                console.error('Ошибка при удалении товара:', err);
                return res.status(500).json({ error: 'Ошибка при удалении товара' });
            }

            // Если есть изображение - удаляем файл
            if (product.image && product.image.startsWith('/uploads/')) {
                try {
                    const filename = product.image.split('/uploads/')[1];
                    const imagePath = path.join(__dirname, 'uploads', filename);
                    
                    console.log(`Пытаемся удалить: ${imagePath}`);
                    
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                        console.log('Изображение успешно удалено');
                    } else {
                        console.log('Файл изображения не найден');
                    }
                } catch (fileErr) {
                    console.error('Ошибка при удалении файла:', fileErr);
                }
            }
            
            res.json({ 
                success: true, 
                message: product.image ? 'Товар и изображение удалены' : 'Товар удален' 
            });
        });
    });
});

// Маршруты для админки категорий
app.get('/api/admin/categories', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    
    db.all(
        `SELECT * FROM categories ORDER BY name`,
        (err, categories) => {
            if (err) {
                console.error('Error fetching admin categories:', err);
                return res.status(500).json({ error: 'Ошибка при получении категорий' });
            }
            res.json(categories);
        }
    );
});

// Маршруты для статистики заказов
app.get('/api/admin/orders/stats', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    
    const queries = {
        stats: `
            SELECT 
                (SELECT COUNT(*) FROM orders) as totalOrders,
                (SELECT COUNT(*) FROM orders WHERE date(created_at) = date('now')) as todayOrders,
                (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status != 'cancelled') as totalRevenue,
                (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE date(created_at) = date('now') AND status != 'cancelled') as todayRevenue
        `,
        popularProducts: `
            SELECT p.id, p.name, p.image, 
                   COALESCE(SUM(oi.quantity), 0) as total_quantity, 
                   COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
            GROUP BY p.id
            ORDER BY total_quantity DESC, total_revenue DESC
            LIMIT 5
        `,
        recentOrders: `
            SELECT o.id, o.total_amount, o.status, o.created_at, 
                   u.first_name || ' ' || u.last_name as customer_name
            FROM orders o
            JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT 10
        `
    };
    
    db.serialize(() => {
        const results = {};
        
        // Запрос статистики
        db.get(queries.stats, (err, stats) => {
            if (err) {
                console.error('Error fetching stats:', err);
                results.stats = {
                    totalOrders: 0,
                    todayOrders: 0,
                    totalRevenue: 0,
                    todayRevenue: 0
                };
            } else {
                results.stats = stats;
            }
            
            // Запрос популярных товаров
            db.all(queries.popularProducts, (err, products) => {
                if (err) {
                    console.error('Error fetching popular products:', err);
                    results.popularProducts = [];
                } else {
                    results.popularProducts = products.filter(p => p.total_quantity > 0);
                }
                
                // Запрос последних заказов
                db.all(queries.recentOrders, (err, orders) => {
                    if (err) {
                        console.error('Error fetching recent orders:', err);
                        results.recentOrders = [];
                    } else {
                        results.recentOrders = orders;
                    }
                    
                    res.json(results);
                });
            });
        });
    });
});

// Полная история заказов с пагинацией
app.get('/api/admin/orders/history', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const query = `
        SELECT o.id, o.total_amount, o.status, o.created_at, 
               u.first_name || ' ' || u.last_name as customer_name,
               COUNT(oi.id) as items_count
        FROM orders o
        JOIN users u ON o.user_id = u.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
    `;
    
    const countQuery = `SELECT COUNT(*) as total FROM orders`;
    
    db.serialize(() => {
        db.get(countQuery, (err, countResult) => {
            if (err) {
                console.error('Error counting orders:', err);
                return res.status(500).json({ error: 'Ошибка при получении количества заказов' });
            }
            
            db.all(query, [limit, offset], (err, orders) => {
                if (err) {
                    console.error('Error fetching orders:', err);
                    return res.status(500).json({ error: 'Ошибка при получении заказов' });
                }
                
                res.json({
                    orders,
                    total: countResult.total,
                    page,
                    totalPages: Math.ceil(countResult.total / limit)
                });
            });
        });
    });
});

// Детали конкретного заказа
app.get('/api/admin/orders/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    
    const orderId = req.params.id;
    
    const orderQuery = `
        SELECT o.*, u.first_name || ' ' || u.last_name as customer_name
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
    `;
    
    const itemsQuery = `
        SELECT oi.*, p.name as product_name, p.image as product_image
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
    `;
    
    db.serialize(() => {
        db.get(orderQuery, [orderId], (err, order) => {
            if (err) {
                console.error('Error fetching order:', err);
                return res.status(500).json({ error: 'Ошибка при получении заказа' });
            }
            
            if (!order) {
                return res.status(404).json({ error: 'Заказ не найден' });
            }
            
            db.all(itemsQuery, [orderId], (err, items) => {
                if (err) {
                    console.error('Error fetching order items:', err);
                    return res.status(500).json({ error: 'Ошибка при получении товаров заказа' });
                }
                
                res.json({
                    ...order,
                    items
                });
            });
        });
    });
});

// Роуты для корзины
const cartRouter = express.Router();

// Получить содержимое корзины
cartRouter.get('/', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    db.all(`
        SELECT ci.id, ci.quantity, 
               p.id as product_id, p.name, p.price, p.image, p.quantity as max_quantity
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = ?
    `, [userId], (err, items) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка при получении корзины' });
        }
        
        res.json(items);
    });
});

// Добавить товар в корзину
cartRouter.post('/add', authenticateToken, async (req, res) => {
    const { productId } = req.body;
    
    // Универсальное получение ID пользователя (поддерживает оба варианта)
    const userId = req.user.id || req.user.userId;
    
    // Валидация входных данных
    if (!productId || isNaN(productId)) {
        return res.status(400).json({ 
            error: 'Неверный ID товара',
            details: 'productId должен быть числом'
        });
    }

    if (!userId) {
        return res.status(401).json({
            error: 'Пользователь не идентифицирован',
            details: 'Токен не содержит userID'
        });
    }

    try {
        // 1. Проверяем существование товара
        const product = await new Promise((resolve, reject) => {
            db.get(`
                SELECT id, quantity as maxQuantity 
                FROM products 
                WHERE id = ?
            `, [productId], (err, row) => {
                if (err) {
                    console.error('Ошибка при проверке товара:', err);
                    reject(new Error('Ошибка базы данных'));
                } else {
                    resolve(row);
                }
            });
        });

        if (!product) {
            return res.status(404).json({ 
                error: 'Товар не найден',
                productId
            });
        }

        // 2. Проверяем наличие товара в корзине
        const cartItem = await new Promise((resolve, reject) => {
            db.get(`
                SELECT id, quantity 
                FROM cart_items 
                WHERE user_id = ? AND product_id = ?
            `, [userId, productId], (err, row) => {
                if (err) {
                    console.error('Ошибка при проверке корзины:', err);
                    reject(new Error('Ошибка базы данных'));
                } else {
                    resolve(row);
                }
            });
        });

        let result;
        if (cartItem) {
            // 3. Проверяем доступное количество
            if (cartItem.quantity >= product.maxQuantity) {
                return res.status(400).json({
                    error: 'Достигнуто максимальное количество',
                    maxQuantity: product.maxQuantity,
                    currentQuantity: cartItem.quantity
                });
            }

            // 4. Обновляем количество существующего товара
            result = await new Promise((resolve, reject) => {
                db.run(`
                    UPDATE cart_items 
                    SET quantity = quantity + 1 
                    WHERE id = ?
                `, [cartItem.id], function(err) {
                    if (err) {
                        console.error('Ошибка обновления корзины:', err);
                        reject(new Error('Ошибка базы данных'));
                    } else {
                        resolve({ 
                            quantity: cartItem.quantity + 1,
                            action: 'updated' 
                        });
                    }
                });
            });
        } else {
            // 5. Добавляем новый товар в корзину
            result = await new Promise((resolve, reject) => {
                db.run(`
                    INSERT INTO cart_items 
                    (user_id, product_id, quantity) 
                    VALUES (?, ?, 1)
                `, [userId, productId], function(err) {
                    if (err) {
                        console.error('Ошибка добавления в корзину:', err);
                        reject(new Error('Ошибка базы данных'));
                    } else {
                        resolve({ 
                            quantity: 1,
                            action: 'added' 
                        });
                    }
                });
            });
        }

        // 6. Возвращаем успешный ответ
        res.json({ 
            success: true,
            productId,
            userId,
            ...result
        });

    } catch (error) {
        console.error('Ошибка в обработчике корзины:', error);
        
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Обновить количество товара в корзине
cartRouter.put('/update', authenticateToken, (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user.id;
    
    if (!productId || quantity === undefined) {
        return res.status(400).json({ error: 'Не указаны ID товара или количество' });
    }
    
    if (quantity < 1) {
        return res.status(400).json({ error: 'Количество должно быть не менее 1' });
    }
    
    // 1. Проверяем доступное количество товара
    db.get('SELECT quantity FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка при проверке товара' });
        }
        
        if (!product) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        if (quantity > product.quantity) {
            return res.status(400).json({ 
                error: 'Запрошенное количество превышает доступное', 
                maxQuantity: product.quantity 
            });
        }
        
        // 2. Обновляем количество в корзине
        db.run(
            `UPDATE cart_items 
             SET quantity = ?, 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = ? AND product_id = ?`,
            [quantity, userId, productId],
            function(err) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Ошибка при обновлении корзины' });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Товар не найден в корзине' });
                }
                
                res.json({ success: true });
            }
        );
    });
});

// Удалить товар из корзины
cartRouter.delete('/remove', authenticateToken, (req, res) => {
    const { productId } = req.body;
    const userId = req.user.id;
    
    if (!productId) {
        return res.status(400).json({ error: 'Не указан ID товара' });
    }
    
    db.run(
        'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?',
        [userId, productId],
        function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка при удалении из корзины' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Товар не найден в корзине' });
            }
            
            res.json({ success: true });
        }
    );
});

// Очистить корзину
cartRouter.delete('/clear', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    db.run(
        'DELETE FROM cart_items WHERE user_id = ?',
        [userId],
        function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка при очистке корзины' });
            }
            
            res.json({ 
                success: true, 
                deletedCount: this.changes 
            });
        }
    );
});

// Подключаем роуты корзины
app.use('/api/cart', cartRouter);


// Роуты для заказов
app.post('/api/orders/checkout', authenticateToken, async (req, res) => {
  try {
    const { formData, basket, totalAmount } = req.body;
    const userId = req.user.id;

    // 1. Сохраняем заказ в БД
    const orderId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO orders (
          user_id, total_amount, status,
          first_name, last_name, address,
          email, phone, payment_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          totalAmount,
          'processing',
          formData.firstName,
          formData.lastName,
          formData.address,
          formData.email,
          formData.phone.replace(/\D/g, ''),
          formData.paymentMethod
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // 2. Сохраняем товары заказа
    await Promise.all(basket.map(item => {
      return new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO order_items (
            order_id, product_id, quantity, price
          ) VALUES (?, ?, ?, ?)`,
          [orderId, item.product_id, item.quantity, item.price],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }));

    // 3. Отправляем уведомление в Telegram
    let telegramSent = false;
    try {
      telegramSent = await sendOrderNotification({
        orderId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address,
        basket: basket.map(item => ({
          title: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image || null
        })),
        totalAmount,
        paymentMethod: formData.paymentMethod
      });
    } catch (tgError) {
      console.error('Ошибка Telegram:', tgError);
    }

    // 4. Очищаем корзину
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM cart_items WHERE user_id = ?',
        [userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ 
      success: true,
      orderId,
      telegramNotification: telegramSent
    });

  } catch (error) {
    console.error('Ошибка оформления заказа:', error);
    res.status(500).json({ 
      error: 'Ошибка при оформлении заказа',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


const favoritesRoutes = require('./src/routes/favoritesRoutes');
app.use('/api/favorites', (req, res, next) => {
    req.db = db; // Передаем экземпляр базы данных
    next();
}, favoritesRoutes);

const ordersRouter = require('./src/routes/orders');
app.use('/api/orders', ordersRouter);

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ error: 'Не найдено' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
    // startBot(); // Запускаем бота

    // Создаем необходимые папки при запуске
    const foldersToCreate = ['uploads', 'public/img'];
    foldersToCreate.forEach(folder => {
        const folderPath = path.join(__dirname, folder);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            console.log(`Создана папка: ${folderPath}`);
        }
    });
});
