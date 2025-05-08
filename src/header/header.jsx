import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../index.css';
import './header.css';
import logo from '../img/logo.svg';
import heartIcon from '../img/сердце.svg';
import stor from '../img/корзина.svg';
import { Link, useNavigate } from 'react-router-dom';
import { useFavorites } from '../hook/FavoritesContext';
import AuthModal from '../AuthModal/AuthModal';
import { useAuth } from '../hook/AuthContext';

function Header() {
  const { t } = useTranslation();
  const { user, isAuthenticated, login, logout } = useAuth();
  const { count } = useFavorites();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const navigate = useNavigate();

  useEffect(() => {
    const handleOpenAuthModal = (e) => {
      const mode = e.detail?.mode || 'login';
      setAuthMode(mode);
      setIsAuthModalOpen(true);
      
      if (e.detail?.returnTo) {
        navigate(e.detail.returnTo);
      }
    };

    window.addEventListener('openAuthModal', handleOpenAuthModal);
    return () => {
      window.removeEventListener('openAuthModal', handleOpenAuthModal);
    };
  }, [navigate]);

  const handleLoginSuccess = (token, userData) => {
    login(token, userData);
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleUserClick = () => {
    if (user) {
      navigate('/profile');
    }
  };

  const handleAvatarError = (e) => {
    e.target.onerror = null;
    e.target.src = '/img/avatar.jpg';
  };

  return (
    <div className="header">
      <div className="header_main container">
        <div className="header_left">
          <Link to="/" className="logo">
            <img src={logo} alt={t('header.logo_alt')} />
          </Link>
        </div>
        <div className="header_right">
          <div className="header_icons">
            <Link to="/favorites" className="favorites-link">
              <img src={heartIcon} alt={t('header.favorites')} className="icon" />
              {count > 0 && <span className="favorites-badge">{count}</span>}
            </Link>
            <Link to="/basket">
              <img src={stor} alt={t('header.basket')} className="icon" />
            </Link>
          </div>
          
          {isAuthenticated ? (
            <div className="user-profile-container">
              <div className="user-profile" onClick={handleUserClick}>
                <img 
                  src={user?.avatar} 
                  alt="Avatar" 
                  className="user-avatar"
                  onError={handleAvatarError}
                />
                <div className="user-info">
                  <span className="user-name">{user?.lastName} {user?.firstName}</span>
                  <span className={`user-role ${user?.role}`}>
                    {user?.role === 'admin' ? t('header.admin') : t('header.user')}
                  </span>
                </div>
              </div>
              <button className="logout-button" onClick={handleLogout}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="#ff6b00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 17L21 12L16 7" stroke="#ff6b00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12H9" stroke="#ff6b00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t('header.logout')}
              </button>
            </div>
          ) : (
            <button 
              className="auth-button"
              onClick={() => {
                setAuthMode('login');
                setIsAuthModalOpen(true);
              }}
            >
              {t('header.login')}
            </button>
          )}
        </div>
      </div>
      
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authMode}
        onModeChange={setAuthMode}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default Header;