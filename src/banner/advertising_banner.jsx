import '../index.css';
import './advertising_banner.css';
import { useTranslation } from 'react-i18next';

function Banner() {
    const { t } = useTranslation();
    
    return (
        <div className="container banner">
            <div className="content">
                <div className="text">
                    <h1>{t('banner.title')}</h1>
                    <p>{t('banner.subtitle')}</p>
                </div>
                <div className="image-container">
                    <div className="image"></div>
                </div>
            </div>
        </div>
    );
}

export default Banner;