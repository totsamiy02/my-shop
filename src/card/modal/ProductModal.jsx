import { useState, useEffect } from 'react';
import './ProductModal.css';
import { useAuth } from '../../hook/AuthContext';

function ProductModal({ product, onClose, onAddToCart }) {
    const [isZoomed, setIsZoomed] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isZoomClosing, setIsZoomClosing] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const { user } = useAuth();

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

    useEffect(() => {
        if (!user) {
            setIsFavorite(false);
            return;
        }

        const checkFavoriteStatus = async () => {
            try {
                const response = await fetch(`/api/favorites/check/${product.id}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const data = await response.json();
                setIsFavorite(data.isFavorite);
            } catch (error) {
                console.error('Error checking favorite status:', error);
            }
        };

        checkFavoriteStatus();
    }, [product.id, user]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    const toggleZoom = (e) => {
        e.stopPropagation();
        setIsZoomed(true);
    };

    const closeZoom = () => {
        setIsZoomClosing(true);
        setTimeout(() => {
            setIsZoomed(false);
            setIsZoomClosing(false);
        }, 300);
    };

    const toggleFavorite = async (e) => {
        e.stopPropagation();

        if (!user) {
            alert('Для добавления в избранное необходимо войти в систему');
            return;
        }

        try {
            if (isFavorite) {
                await fetch(`/api/favorites/remove`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ productId: product.id })
                });
            } else {
                await fetch(`/api/favorites/add`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ productId: product.id })
                });
            }
            setIsFavorite(!isFavorite);
            window.dispatchEvent(new Event('favoritesUpdated'));
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    const handleAddToCart = (e) => {
        e.stopPropagation();
        
        onAddToCart({
            id: product.id,
            title: product.name,
            price: product.price,
            image: product.image,
            quantity: 1,
            maxQuantity: product.quantity
        });

        handleClose();
    };

    return (
        <>
            <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
                <div className={`product-modal ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
                    <button className="modal-close-btn" onClick={handleClose}>×</button>

                    <button 
                        className={`modal-favorite-btn ${isFavorite ? 'active' : ''}`} 
                        onClick={toggleFavorite}
                        aria-label={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
                    >
                        <HeartIcon filled={isFavorite} />
                    </button>

                    <div className="modal-content-wrapper">
                        <div className="image-content-block">
                            <img
                                src={product.image}
                                alt={product.name}
                                className="product-display-image"
                                onClick={toggleZoom}
                            />
                        </div>

                        <div className="info-content-block">
                            <h2 className="product-title-heading">{product.name}</h2>
                            <div className="product-price-tag">{product.price}₽</div>
                            <div className="availability-info">В наличии: {product.quantity} шт.</div>
                            <div className="product-description-text">
                                {product.description || 'Описание товара отсутствует.'}
                            </div>

                            <button
                                className="add-to-basket-button"
                                onClick={handleAddToCart}
                                disabled={product.quantity === 0}
                            >
                                {product.quantity === 0 ? 'Нет в наличии' : 'Добавить в корзину'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isZoomed && (
                <div className={`zoom-overlay ${isZoomClosing ? 'zoom-closing' : ''}`} onClick={closeZoom}>
                    <div className="zoom-image-wrapper" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={product.image}
                            alt={product.name}
                            className={`zoomed-image ${isZoomClosing ? 'zoom-closing' : ''}`}
                        />
                    </div>
                    <button className="zoom-close-btn" onClick={closeZoom}>×</button>
                </div>
            )}
        </>
    );
}

export default ProductModal;