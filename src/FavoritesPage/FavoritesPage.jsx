import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../header/header';
import Footer from '../footer/footer';
import ProductCard from '../card/ProductCard';
import Notification from '../Notification/Notification';
import ProductModal from '../card/modal/ProductModal';
import './FavoritesPage.css';
import { useAuth } from '../hook/AuthContext';
import { useFavorites } from '../hook/FavoritesContext';

function FavoritesPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { favorites, fetchFavorites } = useFavorites();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const handleAuthChange = () => {
      if (isAuthenticated && isMounted) {
        fetchFavorites().finally(() => {
          if (isMounted) setIsLoading(false);
        });
      } else if (isMounted) {
        setIsLoading(false);
      }
    };

    handleAuthChange();

    const handleFavoritesUpdated = () => {
      if (isMounted && isAuthenticated) {
        fetchFavorites();
      }
    };

    window.addEventListener('authStateChanged', handleAuthChange);
    window.addEventListener('favoritesUpdated', handleFavoritesUpdated);
    
    return () => {
      isMounted = false;
      window.removeEventListener('authStateChanged', handleAuthChange);
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdated);
    };
  }, [isAuthenticated, fetchFavorites]);

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

  if (!isAuthenticated) {
    return (
      <>
        <Header />
        <div className="fav-auth-container">
          <div className="fav-auth-content">
            <h2>{t('favorites.auth_required')}</h2>
            <p>{t('favorites.auth_message')}</p>
            <button 
              className="fav-auth-btn"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openAuthModal', {
                  detail: { mode: 'login', returnTo: '/favorites' }
                }));
              }}
            >
              {t('favorites.login_button')}
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="fav-loading">
          <div className="loader"></div>
          <p>{t('favorites.loading')}</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      
      <div className="fav-main-container">
        <h1 className="fav-main-title">{t('favorites.title')}</h1>
        
        {favorites.length === 0 ? (
          <div className="fav-empty-state">
            <div className="fav-empty-icon">♡</div>
            <h2>{t('favorites.empty_title')}</h2>
            <p>{t('favorites.empty_message')}</p>
            <Link to="/" className="fav-catalog-link">
              {t('favorites.go_to_catalog')}
            </Link>
          </div>
        ) : (
          <div className="fav-products-grid">
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
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={() => {
            handleAddToBasket(selectedProduct);
            setSelectedProduct(null);
          }}
        />
      )}

      <Notification 
        message={t('favorites.item_added')} 
        show={showNotification} 
        onClose={() => setShowNotification(false)}
      />
      
      <Footer />
    </>
  );
}

export default FavoritesPage;