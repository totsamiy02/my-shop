import React from 'react';
import { useTranslation } from 'react-i18next';
import '../index.css';
import './footer.css';
import logo from '../img/logo.svg';
import vk from '../img/VK.svg';
import Whatsapp from '../img/Whatsapp.svg';
import instagramIcon from '../img/Instagram.svg';
import tg from '../img/Telegram.svg';
import { Link } from 'react-router-dom';
import i18n from 'i18next';

function Footer() {
    const { t } = useTranslation();

    const handleLangChange = (lang) => {
        i18n.changeLanguage(lang);
    };

    return (
        <footer className="footer">
            <div className="footer_all container">
                <div className="logo">
                    <Link to="/">
                        <img src={logo} alt={t('header.logo_alt')} />
                    </Link>
                </div>

                <nav className="links">
                    <Link to="/favorites">{t('footer.favorites')}</Link>
                    <Link to="/basket">{t('footer.basket')}</Link>
                    <Link to="/contacts">{t('footer.contacts')}</Link>
                </nav>

                <div className="terms-language">
                    <Link to="/terms-of-service" className="terms">{t('footer.terms')}</Link>
                    <div className="language-buttons">
                        <button
                            className={i18n.language === 'ru' ? 'active' : ''}
                            onClick={() => handleLangChange('ru')}
                        >
                            {t('footer.language.ru')}
                        </button>
                        <button
                            className={i18n.language === 'en' ? 'active' : ''}
                            onClick={() => handleLangChange('en')}
                        >
                            {t('footer.language.en')}
                        </button>
                    </div>
                </div>

                <div className="social-icons">
                    <a href="https://vk.com" target="_blank" rel="noopener noreferrer">
                        <img src={vk} alt="VK" className="social-icon" />
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