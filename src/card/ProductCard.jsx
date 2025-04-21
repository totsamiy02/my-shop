import { useState, useEffect, useCallback } from 'react';
import './ProductCard.css';
import heartOutline from '../img/сердце.svg';
import heartFilled from '../img/сердце черное.svg';
import { useAuth } from '../hook/AuthContext';

function ProductCard({ id, image, title, price, quantity, handleAddToBasket, onCardClick }) {
    const { user } = useAuth();
    const [isFavorite, setIsFavorite] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const checkFavoriteStatus = useCallback(async () => {
        if (!user) {
            setIsFavorite(false);
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            setIsFavorite(false);
            return;
        }

        try {
            const response = await fetch(`/api/favorites/check/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.status === 401 || response.status === 403) {
                setIsFavorite(false);
                return;
            }
            
            if (!response.ok) throw new Error('Failed to check favorite');
            
            const data = await response.json();
            setIsFavorite(data.isFavorite);
        } catch (error) {
            console.error('Error checking favorite status:', error);
            setIsFavorite(false);
        }
    }, [user, id]);

    useEffect(() => {
        checkFavoriteStatus();
    }, [checkFavoriteStatus]);

    const toggleFavorite = async (e) => {
        e.stopPropagation();
        
        if (!user) {
            alert('Для добавления в избранное необходимо войти в систему');
            return;
        }

        if (isProcessing) return;
        setIsProcessing(true);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Требуется авторизация');
                return;
            }

            const response = await fetch(
                `/api/favorites/${id}`,
                {
                    method: isFavorite ? 'DELETE' : 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status === 401 || response.status === 403) {
                setIsFavorite(false);
                return;
            }

            if (!response.ok) throw new Error('Request failed');
            
            setIsFavorite(!isFavorite);
            window.dispatchEvent(new Event('favoritesUpdated'));
        } catch (error) {
            console.error('Error toggling favorite:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="product-card" onClick={onCardClick}>
            <button 
                className={`favorite-button ${isFavorite ? 'active' : ''}`}
                onClick={toggleFavorite}
                disabled={isProcessing}
                aria-label={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
            >
                {isProcessing ? (
                    <div className="favorite-spinner"></div>
                ) : (
                    <img 
                        src={isFavorite ? heartFilled : heartOutline} 
                        alt={isFavorite ? "Удалить из избранного" : "Добавить в избранное"} 
                    />
                )}
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
                    handleAddToBasket({ 
                        image, 
                        title, 
                        price, 
                        id,
                        availableQuantity: quantity
                    });
                }}
                disabled={quantity === 0}
            >
                {quantity === 0 ? 'Нет в наличии' : 'Добавить в корзину'}
            </button>
        </div>
    );
}

export default ProductCard;