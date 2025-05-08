const express = require('express');
const router = express.Router();
const { sendOrderNotification } = require('../../telegramBot');

router.post('/checkout', async (req, res) => {
  try {
    const { formData, basket, totalAmount } = req.body;

    // Валидация данных
    if (!formData?.phone || !formData?.firstName) {
      return res.status(400).json({ error: 'Укажите имя и телефон' });
    }

    if (!Array.isArray(basket) || basket.length === 0) {
      return res.status(400).json({ error: 'Корзина пуста' });
    }

    // Очистка номера телефона
    const cleanedPhone = formData.phone.replace(/\D/g, '');

    // Отправка уведомления
    const success = await sendOrderNotification({
      ...formData,
      phone: cleanedPhone,
      basket: basket.map(item => ({
        title: item.title,
        price: item.price,
        quantity: item.quantity
      })),
      totalAmount
    });

    if (!success) {
      throw new Error('Не удалось отправить уведомление');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка оформления заказа:', error);
    res.status(500).json({ 
      error: error.message || 'Ошибка сервера',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;