import { useState, useEffect } from 'react';
import './ProductCard.css';
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

  const HeartIcon = ({ filled }) => (
    <svg 
      width="22" 
      height="22" 
      viewBox="0 0 16 16" 
      fill={filled ? "#ff8800" : "none"}
      stroke={filled ? "#ff8800" : "#000000"}
    >
      <path 
        d="M1.24264 8.24264L8 15L14.7574 8.24264C15.553 7.44699 16 6.36786 16 5.24264V5.05234C16 2.8143 14.1857 1 11.9477 1C10.7166 1 9.55233 1.55959 8.78331 2.52086L8 3.5L7.21669 2.52086C6.44767 1.55959 5.28338 1 4.05234 1C1.8143 1 0 2.8143 0 5.05234V5.24264C0 6.36786 0.44699 7.44699 1.24264 8.24264Z" 
        fill={filled ? "#ff8800" : "none"}
      />
    </svg>
  );

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
          <HeartIcon filled={isFavorite} />
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