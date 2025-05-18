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
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
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
                
                if (user.failed_login_attempts >= 6 && 
                    Date.now() - user.last_failed_login < 60000) {
                    return res.status(429).json({ 
                        error: 'Слишком много неудачных попыток. Попробуйте через минуту.' 
                    });
                }
                
                const isMatch = await bcrypt.compare(password, user.password);
                
                if (!isMatch) {
                    db.run(
                        `UPDATE users SET 
                        failed_login_attempts = failed_login_attempts + 1,
                        last_failed_login = ?
                        WHERE id = ?`,
                        [Date.now(), user.id]
                    );
                    return res.status(401).json({ error: 'Неверный email или пароль' });
                }
                
                db.run(
                    `UPDATE users SET 
                    failed_login_attempts = 0,
                    last_failed_login = NULL
                    WHERE id = ?`,
                    [user.id]
                );
                
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
                        role: user.role,
                        avatar: user.avatar
                    } 
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
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

        // Генерируем токен
        const resetToken = crypto.randomBytes(20).toString('hex');
        const resetTokenExpires = Date.now() + 3600000; // 1 час

        // Сохраняем токен в БД
        db.run(
          `UPDATE users SET 
           reset_token = ?,
           reset_token_expires = ?
           WHERE id = ?`,
          [resetToken, resetTokenExpires, user.id],
          async (err) => {
            if (err) {
              console.error('Database update error:', err);
              return res.status(500).json({ error: 'Ошибка при обновлении данных' });
            }

            // Отправляем письмо
            const mailOptions = {
              from: `"Поддержка магазина" <${process.env.EMAIL_USER}>`,
              to: email,
              subject: 'Восстановление пароля',
              html: `
                <h2>Восстановление пароля</h2>
                <p>Для сброса пароля используйте следующий код:</p>
                <h3 style="font-size: 24px; letter-spacing: 2px;">${resetToken}</h3>
                <p>Код действителен в течение 1 часа.</p>
                <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
              `
            };

            try {
              await transporter.sendMail(mailOptions);
              res.json({ 
                success: true,
                message: 'Код восстановления отправлен на ваш email' 
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
app.get('/api/user', authenticateToken, (req, res) => {
    db.get(
        `SELECT id, first_name, last_name, email, phone, role, avatar FROM users WHERE id = ?`,
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

app.put('/api/user', authenticateToken, (req, res) => {
    const { firstName, lastName, phone } = req.body;
    
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
    require('./telegramBot'); // Запускаем бота
    
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
