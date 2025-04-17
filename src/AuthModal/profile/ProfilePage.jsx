import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../header/header.jsx';
import Footer from '../../footer/footer.jsx';
import './ProfilePage.css';

function ProfilePage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        
        if (!token) {
            navigate('/');
            return;
        }

        const fetchUserData = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/user', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    setUser(userData);
                } else {
                    localStorage.removeItem('token');
                    navigate('/');
                }
            } catch (error) {
                console.error('Ошибка при получении данных пользователя:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [navigate]);

    if (loading) {
        return <div>Загрузка...</div>;
    }

    return (
        <div className="profile-page">
            <Header />
            
            <main className="profile-container">
                <h1>Личный кабинет</h1>
                
                {user && (
                    <div className="profile-info">
                        <div className="info-row">
                            <span className="info-label">Имя:</span>
                            <span className="info-value">{user.first_name}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Фамилия:</span>
                            <span className="info-value">{user.last_name}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Email:</span>
                            <span className="info-value">{user.email}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Телефон:</span>
                            <span className="info-value">{user.phone}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Статус:</span>
                            <span className={`info-value ${user.role}`}>
                                {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                            </span>
                        </div>
                    </div>
                )}
            </main>
            
            <Footer />
        </div>
    );
}

export default ProfilePage;