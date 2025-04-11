import React from 'react';

import '../index.css';
import '../reset/reset.css';

import './terms_of_Service.css';


import Header from '../header/header';
import Footer from '../footer/footer';

function TermsOfService() {
    const text = `Задача организации, в особенности же курс на социально-ориентированный национальный проект требует от нас системного анализа модели развития! Таким образом, постоянное информационно-техническое обеспечение нашей деятельности требует от нас анализа системы масштабного изменения ряда параметров! С другой стороны социально-экономическое развитие напрямую зависит от всесторонне сбалансированных нововведений?`;

    return (
        <React.StrictMode>
            <Header />
            <div className="terms-container">
                <div className="terms-box">
                    <h2>Условия сервиса</h2>
                    <p>{text}</p>
                </div>
                <div className="terms-box">
                    <h2>Условия сервиса</h2>
                    <p>{text}</p>
                </div>
                <div className="terms-box">
                    <h2>Условия сервиса</h2>
                    <p>{text}</p>
                </div>
            </div>
            <Footer />
        </React.StrictMode>
    );
}

export default TermsOfService;