import { useState, useEffect } from 'react';
import './ProductModal.css';
import heartOutline from '../../img/сердце.svg';
import heartFilled from '../../img/сердце черное.svg';
import { useAuth } from '../../hook/AuthContext';

function ProductModal({ product, onClose, onAddToCart }) {
    const [isZoomed, setIsZoomed] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isZoomClosing, setIsZoomClosing] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const { user } = useAuth();

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
                await fetch(`/api/favorites/${product.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
            } else {
                await fetch(`/api/favorites/${product.id}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
            }
            setIsFavorite(!isFavorite);
            window.dispatchEvent(new Event('favoritesUpdated'));
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
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
                        <img 
                            src={isFavorite ? heartFilled : heartOutline} 
                            alt={isFavorite ? "Удалить из избранного" : "Добавить в избранное"} 
                        />
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToCart({
                                        image: product.image,
                                        title: product.name,
                                        price: product.price,
                                        id: product.id
                                    });
                                    handleClose();
                                }}
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