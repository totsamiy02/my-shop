import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../index.css';
import './basket.css';
import Header from '../header/header';
import Footer from '../footer/footer';
import { useNavigate } from 'react-router-dom';
import cartImage from '../img/Иллюстрация.svg';
import CheckoutModal from './CheckoutModal/CheckoutModal';

function Basket() {
    const { t } = useTranslation();
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
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const savedBasket = JSON.parse(localStorage.getItem('basket')) || [];
                setBasket(savedBasket);

                const response = await fetch('/api/products');
                if (!response.ok) {
                    throw new Error(t('basket.load_products_error'));
                }
                
                const data = await response.json();
                setProducts(data);
                
                const updatedBasket = savedBasket.map(item => {
                    const product = data.find(p => p.name === item.title);
                    return {
                        ...item,
                        maxQuantity: product ? product.quantity : 0
                    };
                });
                
                setBasket(updatedBasket);
                localStorage.setItem('basket', JSON.stringify(updatedBasket));
            } catch (error) {
                console.error(t('basket.load_error'), error);
                setError(t('basket.load_error_message'));
            }
        };

        loadData();
    }, [t]);

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
        return null;
    };

    const handleCheckoutSubmit = async (e) => {
        e.preventDefault();
        
        const validationError = validateForm();
        if (validationError) {
            alert(validationError);
            return;
        }
      
        try {
            setIsLoading(true);
            const cleanedPhone = formData.phone.replace(/\D/g, '');
            
            const response = await fetch('/api/orders/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    formData: {
                        ...formData,
                        phone: cleanedPhone
                    },
                    basket: basket.map(item => ({
                        title: item.title,
                        price: item.price,
                        quantity: item.quantity
                    })),
                    totalAmount
                }),
            });
        
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || t('basket.server_error'));
            }
        
            setBasket([]);
            localStorage.setItem('basket', JSON.stringify([]));
            setFormSuccess(true);
            
        } catch (error) {
            console.error(t('basket.checkout_error'), error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
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
                {error && (
                    <div className="error-message">
                        {error}
                        <button onClick={() => setError(null)}>×</button>
                    </div>
                )}

                {basket.length === 0 ? (
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
                                            {t('basket.available')}: {item.maxQuantity} {t('basket.pcs')} | {t('basket.in_cart')}: {item.quantity} {t('basket.pcs')}
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
                                disabled={basket.length === 0}
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
                error={error}
                isLoading={isLoading}
                t={t}
            />

            <Footer />
        </div>
    );
}

export default Basket;