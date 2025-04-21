import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../header/header';
import Footer from '../footer/footer';
import ProductCard from '../card/ProductCard';
import Notification from '../Notification/Notification';
import './FavoritesPage.css';
import { useAuth } from '../hook/AuthContext';

function FavoritesPage() {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showNotification, setShowNotification] = useState(false);
    const navigate = useNavigate();

    const fetchFavorites = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token || !user) {
                setFavorites([]);
                return;
            }

            const response = await fetch('/api/favorites', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                setFavorites([]);
                return;
            }

            if (!response.ok) throw new Error('Failed to fetch favorites');
            
            const data = await response.json();
            setFavorites(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching favorites:', error);
            setFavorites([]);
        }
    };

    useEffect(() => {
        if (user) {
            fetchFavorites();
        } else {
            setFavorites([]);
        }

        const handleUpdate = () => fetchFavorites();
        window.addEventListener('favoritesUpdated', handleUpdate);
        
        return () => {
            window.removeEventListener('favoritesUpdated', handleUpdate);
        };
    }, [user]);

    const handleAddToBasket = (product) => {
        const basket = JSON.parse(localStorage.getItem('basket')) || [];
        const existingItem = basket.find(item => item.id === product.id);
        
        const updatedBasket = existingItem
            ? basket.map(item => 
                item.id === product.id 
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
              )
            : [...basket, { 
                id: product.id,
                title: product.name || product.title, 
                price: product.price,
                image: product.image,
                quantity: 1 
              }];
        
        localStorage.setItem('basket', JSON.stringify(updatedBasket));
        window.dispatchEvent(new Event('basketUpdated'));
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
    };

    if (!user) {
        return (
            <>
                <Header />
                <div className="auth-required-container">
                    <div className="auth-required-content">
                        <h2>Требуется авторизация</h2>
                        <p>Войдите в аккаунт, чтобы просматривать избранные товары</p>
                        <button 
                            className="auth-button"
                            onClick={() => navigate('/login')}
                        >
                            Войти
                        </button>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />
            
            <div className="favorites-container">
                <h1 className="favorites-title">Избранное</h1>
                
                {favorites.length === 0 ? (
                    <div className="empty-favorites">
                        <div className="empty-icon">♡</div>
                        <h2>В избранном пока ничего нет</h2>
                        <p>Добавляйте товары, нажимая на значок сердца</p>
                        <Link to="/" className="browse-button">
                            Перейти в каталог
                        </Link>
                    </div>
                ) : (
                    <div className="favorites-grid">
                        {favorites.map(product => (
                            <ProductCard
                                key={product.id}
                                id={product.id}
                                image={product.image}
                                title={product.name}
                                price={product.price}
                                quantity={product.quantity}
                                onCardClick={() => setSelectedProduct(product)}
                                handleAddToBasket={() => handleAddToBasket(product)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {selectedProduct && (
                <div className="product-modal-overlay">
                    <div className="product-modal">
                        <button 
                            className="modal-close"
                            onClick={() => setSelectedProduct(null)}
                        >
                            &times;
                        </button>
                        <img 
                            src={selectedProduct.image} 
                            alt={selectedProduct.name} 
                            className="modal-product-image"
                        />
                        <div className="modal-product-info">
                            <h2>{selectedProduct.name}</h2>
                            <div className="modal-product-price">{selectedProduct.price}₽</div>
                            <button
                                className="modal-add-to-cart"
                                onClick={() => {
                                    handleAddToBasket(selectedProduct);
                                    setSelectedProduct(null);
                                }}
                            >
                                Добавить в корзину
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Notification 
                message="Товар добавлен в корзину" 
                show={showNotification} 
                onClose={() => setShowNotification(false)}
            />
            
            <Footer />
        </>
    );
}

export default FavoritesPage;