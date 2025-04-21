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

// Добавить в избранное
router.post('/:productId', authenticateToken, (req, res) => {
    const productId = req.params.productId;
    
    req.db.run(
        `INSERT INTO favorites (user_id, product_id) VALUES (?, ?)`,
        [req.user.userId, productId],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'Товар уже в избранном' });
                }
                console.error('Error adding to favorites:', err);
                return res.status(500).json({ error: 'Ошибка при добавлении в избранное' });
            }
            res.status(201).json({ success: true });
        }
    );
});

// Удалить из избранного
router.delete('/:productId', authenticateToken, (req, res) => {
    const productId = req.params.productId;
    
    req.db.run(
        `DELETE FROM favorites WHERE user_id = ? AND product_id = ?`,
        [req.user.userId, productId],
        function(err) {
            if (err) {
                console.error('Error removing from favorites:', err);
                return res.status(500).json({ error: 'Ошибка при удалении из избранного' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Товар не найден в избранном' });
            }
            res.json({ success: true });
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