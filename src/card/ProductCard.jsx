import { useState, useEffect } from 'react';
import './ProductCard.css';
import heartOutline from '../img/сердце.svg';
import heartFilled from '../img/сердце черное.svg';

function ProductCard({ image, title, price, quantity, handleAddToBasket, onCardClick, id }) {
    const [isFavorite, setIsFavorite] = useState(false);

    // Получаем текущие избранные товары
    const getFavorites = () => {
        return JSON.parse(localStorage.getItem('favorites')) || [];
    };

    useEffect(() => {
        const checkFavoriteStatus = () => {
            const favorites = getFavorites();
            setIsFavorite(favorites.some(item => item.id === id));
        };

        checkFavoriteStatus();

        const handleStorageChange = () => {
            checkFavoriteStatus();
        };

        window.addEventListener('favoritesUpdated', handleStorageChange);
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('favoritesUpdated', handleStorageChange);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [id]);

    const toggleFavorite = (e) => {
        e.stopPropagation();
        const favorites = getFavorites();
        
        if (isFavorite) {
            // Удаляем из избранного
            const updatedFavorites = favorites.filter(item => item.id !== id);
            localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
        } else {
            // Добавляем в избранное
            const product = { 
                id, 
                image, 
                title, 
                price,
                quantity // Добавляем quantity для полноты информации
            };
            
            // Проверяем, нет ли уже такого товара
            if (!favorites.some(item => item.id === id)) {
                localStorage.setItem('favorites', JSON.stringify([...favorites, product]));
            }
        }
        
        // Обновляем состояние
        setIsFavorite(!isFavorite);
        
        // Оповещаем другие компоненты об изменении
        window.dispatchEvent(new Event('favoritesUpdated'));
    };

    return (
        <div className="product-card" onClick={onCardClick}>
            <button className="favorite-button" onClick={toggleFavorite}>
                <img 
                    src={isFavorite ? heartFilled : heartOutline} 
                    alt={isFavorite ? "Удалить из избранного" : "Добавить в избранное"} 
                />
            </button>
            <img src={image} alt={title} className="product-image" />
            <div className="product-info">
                <span className="product-title">{title}</span>
                <span className="product-price">{price}₽</span>
            </div>
            <span className="product-stock">В наличии: {quantity} шт.</span>
            <button 
                className="add-to-basket-button" 
                onClick={(e) => {
                    e.stopPropagation();
                    handleAddToBasket({ image, title, price, id });
                }}
                disabled={quantity === 0}
            >
                {quantity === 0 ? 'Нет в наличии' : 'Добавить в корзину'}
            </button>
        </div>
    );
}

export default ProductCard;