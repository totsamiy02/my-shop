import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hook/AuthContext';
import { useBasket } from '../hook/useBasket';
import Header from '../header/header';
import Footer from '../footer/footer';
import cartImage from '../img/Иллюстрация.svg';
import CheckoutModal from './CheckoutModal/CheckoutModal';
import Notification from '../Notification/Notification';
import '../index.css';
import './basket.css';

function Basket() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { 
        basket, 
        isLoading, 
        error, 
        updateBasketItem, 
        removeFromBasket, 
        clearBasket,
        fetchBasket
    } = useBasket();
    
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
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [notification, setNotification] = useState({ 
        show: false, 
        message: '', 
        duration: 3000 
    });

    useEffect(() => {
        if (!isAuthenticated) {
            setNotification({
                show: true,
                message: 'Для просмотра корзины необходимо авторизоваться',
                duration: 3000
            });
            
            window.dispatchEvent(new CustomEvent('openAuthModal', {
                detail: { 
                    mode: 'login',
                    returnUrl: '/basket'
                }
            }));
            
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const validateForm = () => {
        if (!formData.firstName.trim()) {
            return t('basket.validation.first_name');
        }
        if (!formData.phone.trim()) {
            return t('basket.validation.phone');
        }
        if (basket.length === 0) {
            return t('basket.validation.empty_basket');
        }
        
        const outOfStockItems = basket.filter(item => item.max_quantity <= 0);
        if (outOfStockItems.length > 0) {
            return 'Некоторые товары в корзине отсутствуют на складе';
        }
        
        return null;
    };

    const handleCheckoutSubmit = async (e) => {
        e.preventDefault();
        
        const validationError = validateForm();
        if (validationError) {
            setNotification({
                show: true,
                message: validationError,
                duration: 3000
            });
            return;
        }

        try {
            const cleanedPhone = formData.phone.replace(/\D/g, '');
            const orderData = {
                formData: {
                    ...formData,
                    phone: cleanedPhone
                },
                basket: basket.map(item => ({
                    product_id: item.product_id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    image: item.image
                })),
                totalAmount
            };

            const response = await fetch('/api/orders/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(orderData)
            });

            const result = await response.json();
            
            if (result.success) {
                setNotification({
                    show: true,
                    message: 'Заказ оформлен!',
                    duration: 3000
                });
                await clearBasket();
                setIsCheckoutOpen(false);
                setFormSuccess(true);
            } else {
                throw new Error('Ошибка оформления заказа');
            }
        } catch (error) {
            setNotification({
                show: true,
                message: error.message || 'Ошибка при оформлении заказа',
                duration: 3000
            });
        }
    };

    const handleCloseNotification = () => {
        setNotification(prev => ({ ...prev, show: false }));
    };

    const handleGoToCatalog = () => {
        navigate('/');
    };

    const handleQuantityChange = async (productId, e) => {
        const value = parseInt(e.target.value) || 1;
        const item = basket.find(i => i.product_id === productId);
        
        if (!item) return;
        
        let newQuantity = value;
        if (newQuantity > item.max_quantity) {
            newQuantity = item.max_quantity;
        } else if (newQuantity < 1) {
            newQuantity = 1;
        }
        
        try {
            await updateBasketItem(productId, newQuantity);
        } catch (error) {
            setNotification({
                show: true,
                message: error.message,
                duration: 3000
            });
        }
    };

    const incrementQuantity = async (productId) => {
        const item = basket.find(i => i.product_id === productId);
        if (item && item.quantity < item.max_quantity) {
            try {
                await updateBasketItem(productId, item.quantity + 1);
            } catch (error) {
                setNotification({
                    show: true,
                    message: error.message,
                    duration: 3000
                });
            }
        }
    };

    const decrementQuantity = async (productId) => {
        const item = basket.find(i => i.product_id === productId);
        if (item && item.quantity > 1) {
            try {
                await updateBasketItem(productId, item.quantity - 1);
            } catch (error) {
                setNotification({
                    show: true,
                    message: error.message,
                    duration: 3000
                });
            }
        }
    };

    const removeProduct = async (productId) => {
        try {
            await removeFromBasket(productId);
            setNotification({
                show: true,
                message: 'Товар удален из корзины',
                duration: 3000
            });
        } catch (error) {
            setNotification({
                show: true,
                message: error.message,
                duration: 3000
            });
        }
    };

    const totalAmount = basket.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
    }, 0);

    const hasOutOfStockItems = basket.some(item => item.max_quantity <= 0);

    if (!isAuthenticated) {
        return (
            <div className="auth-required-container">
                <Header />
                <div className="auth-required-message">
                    <h2>Доступ ограничен</h2>
                    <p>Для просмотра корзины необходимо авторизоваться</p>
                    <button
                        className="auth-button"
                        onClick={() => window.dispatchEvent(new CustomEvent('openAuthModal', {
                            detail: { mode: 'login' }
                        }))}
                    >
                        Войти
                    </button>
                    <button 
                        className="catalog-button"
                        onClick={handleGoToCatalog}
                    >
                        Вернуться в каталог
                    </button>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="basket-page">
            <Header />
            <div className="cart-section container">
                <Notification 
                    message={notification.message} 
                    show={notification.show} 
                    duration={notification.duration}
                    onClose={handleCloseNotification}
                />

                {isLoading && basket.length === 0 ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>{t('basket.loading')}</p>
                    </div>
                ) : error ? (
                    <div className="error-message">
                        <p>{error}</p>
                        <button 
                            onClick={fetchBasket}
                            className="retry-button"
                        >
                            {t('basket.retry')}
                        </button>
                    </div>
                ) : basket.length === 0 ? (
                    <div className="cart-empty-section">
                        <div className="cart-image-container">
                            <img 
                                src={cartImage}
                                alt={t('basket.empty_cart')} 
                                className="cart-image"
                            />
                        </div>
                        <h1 className="cart-title">{t('basket.empty_cart')}</h1>
                        <p className="cart-subtitle">{t('basket.empty_message')}</p>
                        <button 
                            className="catalog-button"
                            onClick={handleGoToCatalog}
                        >
                            {t('basket.go_to_catalog')}
                        </button>
                    </div>
                ) : (
                    <div className="cart-items-container">
                        {hasOutOfStockItems && (
                            <div className="out-of-stock-warning">
                                Некоторые товары в корзине отсутствуют на складе. Пожалуйста, удалите их для оформления заказа.
                            </div>
                        )}
                        <div className="cart-items">
                            {basket.map(item => (
                                <div key={item.id} className={`cart-item ${item.max_quantity <= 0 ? 'out-of-stock' : ''}`}>
                                    <figure className="cart-item-image-container">
                                        <img src={item.image} alt={item.name} className="cart-item-image" />
                                    </figure>
                                    <div className="cart-item-info">
                                        <h3 className="cart-item-name">{item.name}</h3>
                                        <span className="cart-item-price">{item.price}₽</span>
                                        <span className={`cart-item-stock ${item.max_quantity <= 0 ? 'out-of-stock' : ''}`}>
                                            {item.max_quantity <= 0 ? 'Нет в наличии' : `В наличии: ${item.max_quantity} шт.`} | {t('basket.in_cart')}: {item.quantity} {t('basket.pcs')}
                                        </span>
                                        <div className="cart-item-quantity">
                                            <button 
                                                onClick={() => decrementQuantity(item.product_id)}
                                                className="quantity-button"
                                                disabled={item.quantity <= 1 || item.max_quantity <= 0}
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                min="1"
                                                max={item.max_quantity}
                                                value={item.quantity}
                                                onChange={(e) => handleQuantityChange(item.product_id, e)}
                                                className="quantity-input"
                                                disabled={item.max_quantity <= 0}
                                            />
                                            <button 
                                                onClick={() => incrementQuantity(item.product_id)}
                                                className="quantity-button"
                                                disabled={item.quantity >= item.max_quantity || item.max_quantity <= 0}
                                            >
                                                +
                                            </button>
                                        </div>
                                        <button 
                                            onClick={() => removeProduct(item.product_id)}
                                            className="remove-button"
                                        >
                                            {t('basket.remove')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="cart-summary">
                            <div className="cart-total">
                                <span className="total-label">{t('basket.total')}: </span>
                                <span className="total-amount">{totalAmount}₽</span>
                            </div>
                            <button 
                                className="checkout-button"
                                onClick={() => setIsCheckoutOpen(true)}
                                disabled={basket.length === 0 || isLoading || hasOutOfStockItems}
                            >
                                {t('basket.checkout')}
                            </button>
                            <button 
                                className="catalog-button secondary"
                                onClick={handleGoToCatalog}
                            >
                                {t('basket.back_to_catalog')}
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
                isLoading={isLoading}
                t={t}
            />

            <Footer />
        </div>
    );
}

export default Basket;