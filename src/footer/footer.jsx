import React from 'react';
import '../index.css';
import './footer.css';
import logo from '../img/logo.svg';
import vk from '../img/VK.svg';
import Whatsapp from '../img/Whatsapp.svg';
import instagramIcon from '../img/Instagram.svg';
import tg from '../img/Telegram.svg';
import { Link } from 'react-router-dom';

function Footer() {
    const [activeLang, setActiveLang] = React.useState('ru');

    const handleLangChange = (lang) => {
        setActiveLang(lang);
    };

    return (
        <footer className="footer">
            <div className="footer_all container">
                <div className="logo">
                    <Link to="/">
                        <img src={logo} alt="Логотип" />
                    </Link>
                </div>

                <nav className="links">
                    <Link to="/favorites">Избранное</Link>
                    <Link to="/basket">Корзина</Link>
                    <Link to="/contacts">Контакты</Link>
                </nav>

                <div className="terms-language">
                    <Link to="/terms-of-service" className="terms">Условия сервиса</Link>
                    <div className="language-buttons">
                        <button
                            className={activeLang === 'ru' ? 'active' : ''}
                            onClick={() => handleLangChange('ru')}
                        >
                            Рус
                        </button>
                        <button
                            className={activeLang === 'en' ? 'active' : ''}
                            onClick={() => handleLangChange('en')}
                        >
                            Eng
                        </button>
                    </div>
                </div>

                <div className="social-icons">
                    <a href="https://vk.com" target="_blank" rel="noopener noreferrer">
                        <img src={vk} alt="ВКонтакте" className="social-icon" />
                    </a>
                    <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
                        <img src={Whatsapp} alt="WhatsApp" className="social-icon" />
                    </a>
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                        <img src={instagramIcon} alt="Instagram" className="social-icon" />
                    </a>
                    <a href="https://t.me/" target="_blank" rel="noopener noreferrer">
                        <img src={tg} alt="Telegram" className="social-icon" />
                    </a>
                </div>
            </div>
        </footer>
    );
}

export default Footer;