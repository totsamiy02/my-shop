import React from 'react';
import { useTranslation } from 'react-i18next';
import '../index.css';
import '../reset/reset.css';
import './contact.css';
import Header from '../header/header';
import Footer from '../footer/footer';
import Map from '../mapsYandex/maps';
import phoneIcon from '../img/phone-icon.svg';
import vkIcon from '../img/VK.svg';
import instagramIcon from '../img/Instagram.svg';
import telegramIcon from '../img/Telegram.svg';
import whatsappIcon from '../img/Whatsapp.svg';

function Contacts() {
    const { t } = useTranslation();

    return (
      <React.StrictMode>
        <Header />
        <div className="container contacts-container">
          <div className="map-phone-container">
            <div className="map-section">
              <div className="office-title">{t('contacts.office_title')}</div>
              <div className="map-wrapper">
                <Map />
              </div>
              <div className="office-address">
                {t('contacts.address')}
              </div>
              <div className="phone-block">
                <img src={phoneIcon} alt={t('contacts.phone')} className="phone-icon" />
                <span>+7 (495) 123-45-67</span>
              </div>
            </div>
          </div>
  
          <div className="social-icons-block">
            <a href="https://vk.com" className="social-link">
              <img src={vkIcon} alt="VK" className="social-icon" />
            </a>
            <a href="https://telegram.com" className="social-link">
              <img src={telegramIcon} alt="Telegram" className="social-icon" />
            </a>
            <a href="https://instagram.com" className="social-link">
              <img src={instagramIcon} alt="Instagram" className="social-icon" />
            </a>
            <a href="https://whatsapp.com" className="social-link">
              <img src={whatsappIcon} alt="Whatsapp" className="social-icon" />
            </a>
          </div>
        </div>
        <Footer />
      </React.StrictMode>
    );
}
  
export default Contacts;