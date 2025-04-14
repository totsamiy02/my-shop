import React from 'react';
import '../index.css';
import './header.css';
import logo from '../img/logo.svg';
import heartIcon from '../img/сердце.svg';
import stor from '../img/корзина.svg';
import { Link } from 'react-router-dom';
import { useFavorites } from '../hook/useFavorites';

function Header() {
    const favoritesCount = useFavorites();

    return (
        <div className="header">
            <div className="header_main container">
                <div className="header_left">
                    <Link to="/" className="logo">
                        <img src={logo} alt="logo" />
                    </Link>
                </div>
                <div className="header_right">
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
            </div>
        </div>
    );
}

export default Header;