const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

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

// Проверить, есть ли товар в избранном
router.get('/check/:productId', authenticateToken, (req, res) => {
    const productId = req.params.productId;
    
    req.db.get(
        `SELECT 1 FROM favorites WHERE user_id = ? AND product_id = ?`,
        [req.user.userId, productId],
        (err, row) => {
            if (err) {
                console.error('Error checking favorite:', err);
                return res.status(500).json({ error: 'Ошибка при проверке избранного' });
            }
            res.json({ isFavorite: !!row });
        }
    );
});

// Добавляем проверку перед действиями
router.post('/add', authenticateToken, async (req, res) => {
    const { productId } = req.body;
    
    // Сначала проверяем, есть ли уже товар в избранном
    req.db.get(
        `SELECT 1 FROM favorites WHERE user_id = ? AND product_id = ?`,
        [req.user.userId, productId],
        (err, row) => {
            if (err) {
                console.error('Error checking favorite:', err);
                return res.status(500).json({ error: 'Ошибка сервера' });
            }
            
            if (row) {
                // Если уже есть - возвращаем успех, а не ошибку
                return res.json({ success: true, message: 'Товар уже в избранном' });
            }
            
            // Если нет - добавляем
            req.db.run(
                `INSERT INTO favorites (user_id, product_id) VALUES (?, ?)`,
                [req.user.userId, productId],
                function(err) {
                    if (err) {
                        console.error('Error adding favorite:', err);
                        return res.status(500).json({ error: 'Ошибка при добавлении' });
                    }
                    res.json({ success: true });
                }
            );
        }
    );
});

router.post('/remove', authenticateToken, async (req, res) => {
    const { productId } = req.body;
    
    // Сначала проверяем, есть ли товар в избранном
    req.db.get(
        `SELECT 1 FROM favorites WHERE user_id = ? AND product_id = ?`,
        [req.user.userId, productId],
        (err, row) => {
            if (err) {
                console.error('Error checking favorite:', err);
                return res.status(500).json({ error: 'Ошибка сервера' });
            }
            
            if (!row) {
                // Если нет - возвращаем успех, а не ошибку
                return res.json({ success: true, message: 'Товара не было в избранном' });
            }
            
            // Если есть - удаляем
            req.db.run(
                `DELETE FROM favorites WHERE user_id = ? AND product_id = ?`,
                [req.user.userId, productId],
                function(err) {
                    if (err) {
                        console.error('Error removing favorite:', err);
                        return res.status(500).json({ error: 'Ошибка при удалении' });
                    }
                    res.json({ success: true });
                }
            );
        }
    );
});

// Получить все избранное пользователя
router.get('/', authenticateToken, (req, res) => {
    req.db.all(
        `SELECT p.* FROM favorites f
         JOIN products p ON f.product_id = p.id
         WHERE f.user_id = ?`,
        [req.user.userId],
        (err, favorites) => {
            if (err) {
                console.error('Error fetching favorites:', err);
                return res.status(500).json({ error: 'Ошибка при получении избранного' });
            }
            res.json(favorites);
        }
    );
});

module.exports = router;