import React, { useState, useEffect } from 'react';
import '../index.css';
import './basket.css';
import Header from '../header/header';
import Footer from '../footer/footer';
import { useNavigate } from 'react-router-dom';
import cartImage from '../img/Иллюстрация.svg';
import CheckoutModal from './CheckoutModal/CheckoutModal';

function Basket() {
    const navigate = useNavigate();
    const [basket, setBasket] = useState([]);
    const [products, setProducts] = useState([]);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        address: '',
        email: '',
        phone: '',
        paymentMethod: 'card',
        cardNumber: '',
        cardHolder: '',
        cardExpiry: '',
        cardCVC: '',
    });
    const [formSuccess, setFormSuccess] = useState(false);

    // Загрузка корзины и продуктов
    useEffect(() => {
        const savedBasket = JSON.parse(localStorage.getItem('basket')) || [];
        setBasket(savedBasket);

        fetch('/api/products')
            .then(res => res.json())
            .then(data => {
                setProducts(data);
                // Обновляем maxQuantity в корзине
                const updatedBasket = savedBasket.map(item => {
                    const product = data.find(p => p.name === item.title);
                    return {
                        ...item,
                        maxQuantity: product ? product.quantity : 0
                    };
                });
                setBasket(updatedBasket);
                localStorage.setItem('basket', JSON.stringify(updatedBasket));
            })
            .catch(error => console.error('Ошибка:', error));
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleCheckoutSubmit = (e) => {
        e.preventDefault();
        setFormSuccess(true);
        setBasket([]);
        localStorage.setItem('basket', JSON.stringify([]));
        setFormData({
            firstName: '',
            lastName: '',
            address: '',
            email: '',
            phone: '',
            paymentMethod: 'card',
            cardNumber: '',
            cardHolder: '',
            cardExpiry: '',
            cardCVC: '',
        });
        setTimeout(() => {
            setFormSuccess(false);
            setIsCheckoutOpen(false);
        }, 2500);
    };

    const handleGoToCatalog = () => {
        navigate('/');
    };

    const removeProduct = (productId) => {
        const updatedBasket = basket.filter(item => item.id !== productId);
        setBasket(updatedBasket);
        localStorage.setItem('basket', JSON.stringify(updatedBasket));
    };

    const updateQuantity = (productId, newQuantity) => {
        const updatedBasket = basket.map(item => {
            if (item.id === productId) {
                // Ограничиваем количество от 1 до maxQuantity
                const quantity = Math.max(1, Math.min(newQuantity, item.maxQuantity));
                return { ...item, quantity };
            }
            return item;
        });
        setBasket(updatedBasket);
        localStorage.setItem('basket', JSON.stringify(updatedBasket));
    };

    const handleQuantityChange = (productId, e) => {
        const value = parseInt(e.target.value) || 1;
        updateQuantity(productId, value);
    };

    const incrementQuantity = (productId) => {
        const item = basket.find(i => i.id === productId);
        if (item) updateQuantity(productId, item.quantity + 1);
    };

    const decrementQuantity = (productId) => {
        const item = basket.find(i => i.id === productId);
        if (item) updateQuantity(productId, item.quantity - 1);
    };

    // Рассчитываем общую сумму
    const totalAmount = Math.floor(
        basket.reduce((sum, item) => {
            const itemTotal = Number(item.price) * Number(item.quantity);
            return sum + (isNaN(itemTotal) ? 0 : itemTotal);
        }, 0)
    );

    return (
        <div className="basket-page">
            <Header />
            <div className="cart-section container">
                {basket.length === 0 ? (
                    <div className="cart-empty-section">
                        <div className="cart-image-container">
                            <img 
                                src={cartImage}
                                alt="Корзина пуста" 
                                className="cart-image"
                            />
                        </div>
                        <h1 className="cart-title">Корзина пуста</h1>
                        <p className="cart-subtitle">Но это никогда не поздно исправить :)</p>
                        <button 
                            className="catalog-button"
                            onClick={handleGoToCatalog}
                        >
                            В каталог товаров
                        </button>
                    </div>
                ) : (
                    <div className="cart-items-container">
                        <div className="cart-items">
                            {basket.map(item => (
                                <div key={item.id} className="cart-item">
                                    <figure className="cart-item-image-container">
                                        <img src={item.image} alt={item.title} className="cart-item-image" />
                                    </figure>
                                    <div className="cart-item-info">
                                        <h3 className="cart-item-name">{item.title}</h3>
                                        <span className="cart-item-price">{Math.floor(item.price)}₽</span>
                                        <span className="cart-item-stock">
                                            Доступно: {item.maxQuantity} шт. | В корзине: {item.quantity} шт.
                                        </span>
                                        <div className="cart-item-quantity">
                                            <button 
                                                onClick={() => decrementQuantity(item.id)}
                                                className="quantity-button"
                                                disabled={item.quantity <= 1}
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                min="1"
                                                max={item.maxQuantity}
                                                value={item.quantity}
                                                onChange={(e) => handleQuantityChange(item.id, e)}
                                                className="quantity-input"
                                            />
                                            <button 
                                                onClick={() => incrementQuantity(item.id)}
                                                className="quantity-button"
                                                disabled={item.quantity >= item.maxQuantity}
                                            >
                                                +
                                            </button>
                                        </div>
                                        <button 
                                            onClick={() => removeProduct(item.id)}
                                            className="remove-button"
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="cart-summary">
                            <div className="cart-total">
                                <span className="total-label">Общая сумма: </span>
                                <span className="total-amount">{totalAmount}₽</span>
                            </div>
                            <button 
                                className="checkout-button"
                                onClick={() => setIsCheckoutOpen(true)}
                            >
                                Оформить заказ
                            </button>
                            <button 
                                className="catalog-button secondary"
                                onClick={handleGoToCatalog}
                            >
                                Вернуться в каталог
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <CheckoutModal
                formData={formData}
                handleInputChange={handleInputChange}
                handleCheckoutSubmit={handleCheckoutSubmit}
                isCheckoutOpen={isCheckoutOpen}
                setIsCheckoutOpen={setIsCheckoutOpen}
                formSuccess={formSuccess}
            />

            <Footer />
        </div>
    );
}

export default Basket;