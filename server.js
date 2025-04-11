// server.js
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3001;

app.use(cors()); // разрешаем CORS
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

// Запускаем сервер
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});