import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../header/header';
import Footer from '../footer/footer';
import ProductModal from '../card/modal/ProductModal';
import Notification from '../Notification/Notification';
import './FavoritesPage.css';
import heartOutline from '../img/сердце.svg';
import heartFilled from '../img/сердце черное.svg';

function FavoritesPage() {
    const [favorites, setFavorites] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [products, setProducts] = useState([]);
    const [showNotification, setShowNotification] = useState(false);

    useEffect(() => {
        const updateFavorites = () => {
            const savedFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
            setFavorites(savedFavorites);
        };

        fetch('/api/products')
            .then(res => res.json())
            .then(data => setProducts(data))
            .catch(error => console.error('Ошибка загрузки товаров:', error));

        updateFavorites();
        window.addEventListener('favoritesUpdated', updateFavorites);

        return () => {
            window.removeEventListener('favoritesUpdated', updateFavorites);
        };
    }, []);

    const removeFromFavorites = (productId) => {
        const updatedFavorites = favorites.filter(item => item.id !== productId);
        setFavorites(updatedFavorites);
        localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
        window.dispatchEvent(new Event('favoritesUpdated'));
    };

    const handleAddToBasket = (product) => {
        const basket = JSON.parse(localStorage.getItem('basket')) || [];
        const existingItem = basket.find(item => item.title === product.title);
        
        const updatedBasket = existingItem
            ? basket.map(item => 
                item.title === product.title 
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            )
            : [...basket, { ...product, id: Date.now(), quantity: 1 }];
        
        localStorage.setItem('basket', JSON.stringify(updatedBasket));
        window.dispatchEvent(new Event('basketUpdated'));
        
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
    };

    return (
        <>
            <Header/>
            <div className="favorites-page">
                <div className="favorites-header">
                    <h1>Избранное</h1>
                    {favorites.length > 0 && (
                        <div className="favorites-count">{favorites.length} {favorites.length === 1 ? 'товар' : 
                            favorites.length > 1 && favorites.length < 5 ? 'товара' : 'товаров'}</div>
                    )}
                </div>

                {favorites.length === 0 ? (
                    <div className="empty-favorites">
                        <div className="empty-icon">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#FF6B00">
                                <path d="M19.5 12.572L12 20l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572"/>
                            </svg>
                        </div>
                        <h2>В избранном пока ничего нет</h2>
                        <p>Сохраняйте понравившиеся товары, нажимая на ♡</p>
                        <Link to="/" className="back-to-catalog">Перейти в каталог</Link>
                    </div>
                ) : (
                    <div className="favorites-grid">
                        {favorites.map(product => {
                            const fullProduct = products.find(p => p.id === product.id) || product;
                            return (
                                <div key={product.id} className="product-card">
                                    <div className="card-image">
                                        <img 
                                            src={product.image} 
                                            alt={product.title} 
                                            onClick={() => setSelectedProduct(fullProduct)}
                                        />
                                        <button 
                                            className="favorite-button active"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFromFavorites(product.id);
                                            }}
                                            aria-label="Удалить из избранного"
                                        >
                                            <img src={heartFilled} alt="" />
                                        </button>
                                    </div>
                                    <div className="card-content">
                                        <h3 className="card-title">{product.title}</h3>
                                        <div className="card-price">{product.price.toLocaleString()} ₽</div>
                                        <div className="card-actions">
                                            <button 
                                                className="details-button"
                                                onClick={() => setSelectedProduct(fullProduct)}
                                            >
                                                Подробнее
                                            </button>
                                            <button 
                                                className="add-to-cart"
                                                onClick={() => handleAddToBasket(product)}
                                            >
                                                В корзину
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedProduct && (
                <ProductModal 
                    product={selectedProduct} 
                    onClose={() => setSelectedProduct(null)} 
                    handleAddToBasket={handleAddToBasket}
                />
            )}

            <Notification 
                message="Товар добавлен в корзину" 
                show={showNotification} 
                onClose={() => setShowNotification(false)}
            />

            <Footer/>
        </>
    );
}

export default FavoritesPage;