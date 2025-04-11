import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../header/header';
import Footer from '../footer/footer';
import './FavoritesPage.css';
// import { useFavorites } from '../hook/useFavorites';

function FavoritesPage() {
    const [favorites, setFavorites] = useState([]);

    useEffect(() => {
        const updateFavorites = () => {
            const savedFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
            setFavorites(savedFavorites);
        };

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


    return (
        <>
            <Header/>
            <div className="favorites-page">
                <div className="favorites-header">
                    <h1>Избранное</h1>
                    {favorites.length > 0 && (
                        <div className="favorites-subheader">{favorites.length} товаров</div>
                    )}
                </div>

                {favorites.length === 0 ? (
                    <div className="empty-favorites">
                        <div className="empty-icon">♡</div>
                        <h2>В избранном пока ничего нет</h2>
                        <p>Добавляйте товары в избранное, нажимая на сердечко</p>
                        <Link to="/" className="back-to-catalog">Перейти в каталог</Link>
                    </div>
                ) : (
                    <div className="favorites-grid-container">
                        <div className="favorites-grid">
                            {favorites.map(product => (
                                <div key={product.id} className="favorite-card">
                                    <div className="card-image">
                                        <img src={product.image} alt={product.title} />
                                    </div>
                                    <div className="card-content">
                                        <h3 className="card-title">{product.title}</h3>
                                        <div className="card-price">{product.price}₽</div>
                                        <div className="card-actions">
                                            <Link to={`/product/${product.id}`} className="details-link">Подробнее</Link>
                                            <button 
                                                className="remove-button"
                                                onClick={() => removeFromFavorites(product.id)}
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <Footer/>
        </>
    );
}

export default FavoritesPage;