const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Кеш для избранного
const favoritesCache = new Map();

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

// Добавить в избранное
router.post('/add', authenticateToken, async (req, res) => {
    const { productId } = req.body;
    
    req.db.get(
        `SELECT 1 FROM favorites WHERE user_id = ? AND product_id = ?`,
        [req.user.userId, productId],
        (err, row) => {
            if (err) {
                console.error('Error checking favorite:', err);
                return res.status(500).json({ error: 'Ошибка сервера' });
            }
            
            if (row) {
                return res.json({ success: true, message: 'Товар уже в избранном' });
            }
            
            req.db.run(
                `INSERT INTO favorites (user_id, product_id) VALUES (?, ?)`,
                [req.user.userId, productId],
                function(err) {
                    if (err) {
                        console.error('Error adding favorite:', err);
                        return res.status(500).json({ error: 'Ошибка при добавлении' });
                    }
                    
                    // Очищаем кеш для этого пользователя
                    favoritesCache.delete(`favorites_${req.user.userId}`);
                    res.json({ success: true });
                }
            );
        }
    );
});

// Удалить из избранного
router.post('/remove', authenticateToken, async (req, res) => {
    const { productId } = req.body;
    
    req.db.get(
        `SELECT 1 FROM favorites WHERE user_id = ? AND product_id = ?`,
        [req.user.userId, productId],
        (err, row) => {
            if (err) {
                console.error('Error checking favorite:', err);
                return res.status(500).json({ error: 'Ошибка сервера' });
            }
            
            if (!row) {
                return res.json({ success: true, message: 'Товара не было в избранном' });
            }
            
            req.db.run(
                `DELETE FROM favorites WHERE user_id = ? AND product_id = ?`,
                [req.user.userId, productId],
                function(err) {
                    if (err) {
                        console.error('Error removing favorite:', err);
                        return res.status(500).json({ error: 'Ошибка при удалении' });
                    }
                    
                    // Очищаем кеш для этого пользователя
                    favoritesCache.delete(`favorites_${req.user.userId}`);
                    res.json({ success: true });
                }
            );
        }
    );
});

// Получить все избранное пользователя
router.get('/', authenticateToken, (req, res) => {
    const cacheKey = `favorites_${req.user.userId}`;
    const cached = favoritesCache.get(cacheKey);
    
    if (cached) {
        return res.json(cached);
    }

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
            
            const result = Array.isArray(favorites) ? favorites : [];
            favoritesCache.set(cacheKey, result);
            setTimeout(() => favoritesCache.delete(cacheKey), 10000); // Очистка кеша через 10 сек
            
            res.json(result);
        }
    );
});

module.exports = router;