const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3001;

app.use(cors({
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
}));

const db = new sqlite3.Database('./store.db');

// Маршрут получения всех товаров
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products', (err, rows) => {
        if (err) {
            res.status(500).json({ error: 'Ошибка получения данных из БД' });
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/categories', (req, res) => {
    console.log("Запрос на получение категорий"); // Логируем запрос

    db.all('SELECT * FROM categories', (err, rows) => {
        if (err) {
            console.error('Ошибка при запросе к базе данных:', err); // Логируем ошибку
            res.status(500).json({ error: 'Ошибка получения категорий из БД' });
        } else {
            console.log('Категории получены:', rows); // Логируем полученные данные
            res.json(rows);
        }
    });
});

// Запускаем сервер
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});