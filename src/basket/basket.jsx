// Basket.jsx
import '../index.css';
import './basket.css';
import { useState, useEffect } from 'react';
import Header from '../header/header.jsx'; 
import Footer from '../footer/footer.jsx'; 
import { useNavigate } from 'react-router-dom';
import cartImage from '../img/Иллюстрация.svg';
import CheckoutModal from './CheckoutModal/CheckoutModal.jsx'; 

function Basket() {
    const navigate = useNavigate();
    const [basket, setBasket] = useState([]);
    const [products, setProducts] = useState([]); // Состояние для продуктов

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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleCheckoutSubmit = (e) => {
        e.preventDefault();
        setFormSuccess(true);
        
        // Очищаем корзину
        setBasket([]);
        localStorage.setItem('basket', JSON.stringify([]));
        
        // Очищаем форму (опционально)
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

    // Функция для получения доступного количества товара на складе
    const getAvailableQuantity = (productName) => {
        const product = products.find(item => item.name === productName);
        return product ? product.quantity : 0;
    };

    // Загружаем корзину и список продуктов при монтировании
    useEffect(() => {
        const savedBasket = JSON.parse(localStorage.getItem('basket')) || [];
        setBasket(savedBasket);

        fetch('http://localhost:3001/api/products')
            .then((res) => res.json())
            .then((data) => setProducts(data))
            .catch((error) => console.error('Ошибка при загрузке товаров:', error));
    }, []);

    const handleGoToCatalog = () => {
        navigate('/');
    };

    const removeProduct = (productId) => {
        const updatedBasket = basket.filter(item => item.id !== productId);
        setBasket(updatedBasket);
        localStorage.setItem('basket', JSON.stringify(updatedBasket));
    };

    const increaseQuantity = (productId) => {
        const productInBasket = basket.find(item => item.id === productId);
        const productInDb = products.find(p => p.name === productInBasket.title);

        if (!productInDb || productInBasket.quantity >= productInDb.quantity) {
            alert(`Максимальное количество: ${productInDb.quantity} шт.`);
            return;
        }

        const updatedBasket = basket.map(item => 
            item.id === productId 
                ? { ...item, quantity: item.quantity + 1 } 
                : item
        );
        setBasket(updatedBasket);
        localStorage.setItem('basket', JSON.stringify(updatedBasket));
    };

    const decreaseQuantity = (productId) => {
        const updatedBasket = basket.map(item => 
            item.id === productId && item.quantity > 1
                ? { ...item, quantity: item.quantity - 1 }
                : item
        );
        setBasket(updatedBasket);
        localStorage.setItem('basket', JSON.stringify(updatedBasket));
    };

    // Рассчитываем сумму без копеек
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
                                            Доступно: {getAvailableQuantity(item.title)} шт. | В корзине: {item.quantity} шт.
                                        </span>
                                        <div className="cart-item-quantity">
                                            <button 
                                                onClick={() => increaseQuantity(item.id)} 
                                                className="quantity-button"
                                                disabled={item.quantity >= getAvailableQuantity(item.title)}
                                            >
                                                +
                                            </button>
                                            <span>{item.quantity}</span>
                                            <button 
                                                onClick={() => decreaseQuantity(item.id)} 
                                                className="quantity-button"
                                                disabled={item.quantity <= 1}
                                            >
                                                -
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
