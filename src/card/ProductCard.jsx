import { useState, useEffect } from 'react';
import './ProductCard.css';
import heartOutline from '../img/сердце.svg';
import heartFilled from '../img/сердце черное.svg';
import { useAuth } from '../hook/AuthContext';
import { useFavorites } from '../hook/FavoritesContext';

function ProductCard({ id, image, title, price, quantity, handleAddToBasket, onCardClick }) {
  const { isAuthenticated } = useAuth();
  const { addFavorite, removeFavorite, favorites } = useFavorites();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setIsFavorite(favorites.some(item => item.id === id));
  }, [favorites, id]);

  const toggleFavorite = async (e) => {
    e.stopPropagation();
    if (isProcessing) return;
    
    if (!isAuthenticated) {
      window.dispatchEvent(new CustomEvent('openAuthModal', {
        detail: { mode: 'login' }
      }));
      return;
    }

    setIsProcessing(true);
    
    try {
      if (isFavorite) {
        await removeFavorite(id);
      } else {
        await addFavorite(id);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isOutOfStock = quantity <= 0;

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
      <span className={`product-stock ${isOutOfStock ? 'out-of-stock' : ''}`}>
        {isOutOfStock ? 'Нет в наличии' : `В наличии: ${quantity} шт.`}
      </span>
      <button
        className={`add-to-basket-button ${isOutOfStock ? 'disabled' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isOutOfStock) {
            handleAddToBasket({
              image,
              title,
              price,
              id,
              availableQuantity: quantity
            });
          }
        }}
        disabled={isOutOfStock}
      >
        {isOutOfStock ? 'Нет в наличии' : 'Добавить в корзину'}
      </button>
    </div>
  );
}

export default ProductCard;