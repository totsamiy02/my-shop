import React, { useState, useEffect } from 'react';
import '../index.css';
import './header.css';
import logo from '../img/logo.svg';
import heartIcon from '../img/сердце.svg';
import stor from '../img/корзина.svg';
import { Link, useNavigate } from 'react-router-dom';
import { useFavorites } from '../hook/useFavorites';
import AuthModal from '../AuthModal/AuthModal';

function Header() {
    const favoritesCount = useFavorites();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState('login');
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchUserData(token);
        }
    }, []);

    const fetchUserData = async (token) => {
        try {
            const response = await fetch('/api/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                setUser({
                    id: userData.id,
                    firstName: userData.first_name,
                    lastName: userData.last_name,
                    role: userData.role,
                    avatar: userData.avatar || '/img/avatar.jpg'
                });
            } else {
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Ошибка при получении данных пользователя:', error);
        }
    };

    const handleLoginSuccess = (token, userData) => {
        localStorage.setItem('token', token);
        setUser(userData);
        setIsAuthModalOpen(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
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
                        <img src={logo} alt="logo" />
                    </Link>
                </div>
                <div className="header_right">
                    <div className="header_icons">
                        <Link to="/favorites" className="favorites-link">
                            <img src={heartIcon} alt="Избранное" className="icon" />
                            {favoritesCount > 0 && (
                                <span className="favorites-badge">{favoritesCount}</span>
                            )}
                        </Link>
                        <Link to="/basket">
                            <img src={stor} alt="Корзина" className="icon" />
                        </Link>
                    </div>
                    
                    {user ? (
                        <div className="user-profile-container">
                            <div className="user-profile" onClick={handleUserClick}>
                                <img 
                                    src={user.avatar} 
                                    alt="Аватар" 
                                    className="user-avatar"
                                    onError={handleAvatarError}
                                />
                                <div className="user-info">
                                    <span className="user-name">{user.firstName} {user.lastName}</span>
                                    <span className={`user-role ${user.role}`}>
                                        {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                                    </span>
                                </div>
                            </div>
                            <button className="logout-button" onClick={handleLogout}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="#ff6b00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M16 17L21 12L16 7" stroke="#ff6b00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M21 12H9" stroke="#ff6b00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
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
                            Вход
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