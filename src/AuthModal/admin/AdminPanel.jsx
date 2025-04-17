import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../header/header.jsx';
import Footer from '../../footer/footer.jsx';
import './AdminPanel.css';

function AdminPanel() {
    const navigate = useNavigate();

    return (
        <div className="admin-page">
            <Header />
            
            <main className="admin-container">
                <h1>Панель администратора</h1>
                <div className="admin-content">
                    <p>Здесь будут инструменты управления сайтом</p>
                    <button 
                        className="back-button"
                        onClick={() => navigate('/profile')}
                    >
                        Вернуться в профиль
                    </button>
                </div>
            </main>
            
            <Footer />
        </div>
    );
}

export default AdminPanel;