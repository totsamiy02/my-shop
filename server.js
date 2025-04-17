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

const app = express();
const port = process.env.PORT || 3001;

// Настройки CORS
const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:3001'], // Разрешаем оба origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Инициализация базы данных
const db = new sqlite3.Database('./store.db', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
    
    // Проверка существования таблиц (опционально)
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
      if (err || !row) {
        console.error('Users table does not exist or error checking:', err);
      }
    });
  }
});

// Настройка почтового транспорта
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Лимитер для защиты от атак
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 6, // максимум 6 попыток
  message: 'Слишком много попыток входа. Пожалуйста, попробуйте позже.',
  skipSuccessfulRequests: true
});

// Middleware для проверки JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Маршруты аутентификации
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password, confirmPassword } = req.body;
    
    // Валидация
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Пароли не совпадают' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 8 символов' });
    }
    
    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Сохранение пользователя
    db.run(
      `INSERT INTO users (first_name, last_name, phone, email, password) VALUES (?, ?, ?, ?, ?)`,
      [firstName, lastName, phone, email, hashedPassword],
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
        
        // Получаем данные созданного пользователя
        db.get(
          `SELECT id, first_name, last_name, email, phone, role FROM users WHERE id = ?`,
          [this.lastID],
          (err, user) => {
            if (err || !user) {
              return res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
            }
            
            // Генерация JWT токена
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
                role: user.role
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
    
    db.get(
      `SELECT * FROM users WHERE email = ?`,
      [email],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Ошибка сервера' });
        }
        
        if (!user) {
          return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        // Проверка блокировки
        if (user.failed_login_attempts >= 6 && 
            Date.now() - user.last_failed_login < 60000) {
          return res.status(429).json({ 
            error: 'Слишком много неудачных попыток. Попробуйте через минуту.' 
          });
        }
        
        // Проверка пароля
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
          // Увеличиваем счетчик неудачных попыток
          db.run(
            `UPDATE users SET 
            failed_login_attempts = failed_login_attempts + 1,
            last_failed_login = ?
            WHERE id = ?`,
            [Date.now(), user.id]
          );
          
          return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        // Сброс счетчика при успешном входе
        db.run(
          `UPDATE users SET 
          failed_login_attempts = 0,
          last_failed_login = NULL
          WHERE id = ?`,
          [user.id]
        );
        
        // Генерация JWT токена
        const token = jwt.sign(
          { userId: user.id, role: user.role },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '1h' }
        );
        
        res.json({ 
          token, 
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role
          } 
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/forgot-password', (req, res) => {
  const { email } = req.body;
  
  db.get(
    `SELECT * FROM users WHERE email = ?`,
    [email],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка сервера' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'Пользователь с таким email не найден' });
      }
      
      // Генерация токена сброса
      const resetToken = crypto.randomBytes(20).toString('hex');
      const resetTokenExpires = Date.now() + 3600000; // 1 час
      
      db.run(
        `UPDATE users SET 
        reset_token = ?,
        reset_token_expires = ?
        WHERE id = ?`,
        [resetToken, resetTokenExpires, user.id],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Ошибка сервера' });
          }
          
          // Отправка письма
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Восстановление пароля',
            html: `
              <h2>Восстановление пароля</h2>
              <p>Вы запросили сброс пароля для аккаунта ${user.email}.</p>
              <p>Ваш код для сброса пароля: <strong>${resetToken}</strong></p>
              <p>Код действителен в течение 1 часа.</p>
              <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
            `
          };
          
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Ошибка отправки письма:', error);
              return res.status(500).json({ error: 'Ошибка отправки письма' });
            }
            
            res.json({ message: 'Письмо с инструкциями отправлено на ваш email' });
          });
        }
      );
    }
  );
});

// Маршруты для работы с пользователями
app.get('/api/user', authenticateToken, (req, res) => {
  db.get(
    `SELECT id, first_name, last_name, email, phone, role FROM users WHERE id = ?`,
    [req.user.userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка сервера' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      
      res.json(user);
    }
  );
});

// Маршруты для товаров
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

// Маршруты для категорий
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
      
      // Получаем товары этой категории
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
});