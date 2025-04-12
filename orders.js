// order.js
import React from 'react';

function Order({ order }) {
  return (
    <div className="order">
      <h2>Заказ №{order.id}</h2>
      <p>Имя: {order.firstName} {order.lastName}</p>
      <p>Адрес: {order.address}</p>
      <p>Email: {order.email}</p>
      <p>Телефон: {order.phone}</p>
      <p>Способ оплаты: {order.paymentMethod}</p>
      <h3>Товары:</h3>
      <ul>
        {order.cartItems.map(item => (
          <li key={item.id}>{item.name} - {item.quantity} шт. по {item.price}₽</li>
        ))}
      </ul>
    </div>
  );
}

export default Order;
