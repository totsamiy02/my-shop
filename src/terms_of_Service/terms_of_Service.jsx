import React from 'react';
import { useTranslation } from 'react-i18next';
import '../index.css';
import '../reset/reset.css';
import './terms_of_Service.css';
import Header from '../header/header';
import Footer from '../footer/footer';

function TermsOfService() {
    const { t } = useTranslation();
    
    const sections = [
        {
            title: t('terms.section1.title'),
            content: t('terms.section1.content')
        },
        {
            title: t('terms.section2.title'),
            content: t('terms.section2.content')
        },
        {
            title: t('terms.section3.title'),
            content: t('terms.section3.content')
        },
        {
            title: t('terms.section4.title'),
            content: t('terms.section4.content')
        },
        {
            title: t('terms.section5.title'),
            content: t('terms.section5.content')
        },
        {
            title: t('terms.section6.title'),
            content: t('terms.section6.content')
        }
    ];

    return (
        <React.StrictMode>
            <Header />
            <div className="terms-hero">
                <h1>{t('terms.title')}</h1>
                <p>{t('terms.subtitle')}</p>
            </div>
            <div className="terms-container">
                {sections.map((section, index) => (
                    <div className="terms-box" key={index}>
                        <div className="terms-icon">
                            <span>{index + 1}</span>
                        </div>
                        <div className="terms-content">
                            <h2>{section.title}</h2>
                            <p>{section.content}</p>
                        </div>
                    </div>
                ))}
            </div>
            <Footer />
        </React.StrictMode>
    );
}

export default TermsOfService;