import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../header/header.jsx';
import Footer from '../../footer/footer.jsx';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './ProfilePage.css';

function ProfilePage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: ''
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/');
            return;
        }

        const fetchUserData = async () => {
            try {
                const response = await fetch('/api/user', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    setUser(userData);
                    setFormData({
                        firstName: userData.first_name,
                        lastName: userData.last_name,
                        phone: userData.phone
                    });
                } else {
                    localStorage.removeItem('token');
                    navigate('/');
                }
            } catch (error) {
                console.error('Ошибка при получении данных пользователя:', error);
                toast.error('Ошибка при загрузке данных профиля');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAvatarChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setAvatarFile(e.target.files[0]);
            
            const reader = new FileReader();
            reader.onload = (event) => {
                setUser(prev => ({
                    ...prev,
                    avatar: event.target.result
                }));
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSaveProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            
            // Обновляем аватарку, если она была изменена
            if (avatarFile) {
                const avatarFormData = new FormData();
                avatarFormData.append('avatar', avatarFile);
                
                const avatarResponse = await fetch('/api/user/avatar', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: avatarFormData
                });
                
                if (!avatarResponse.ok) {
                    throw new Error('Ошибка при обновлении аватарки');
                }
                
                const avatarResult = await avatarResponse.json();
                setUser(prev => ({
                    ...prev,
                    avatar: avatarResult.avatar
                }));
            }
            
            // Обновляем основные данные
            const profileResponse = await fetch('/api/user', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phone
                })
            });
            
            if (!profileResponse.ok) {
                const errorData = await profileResponse.json();
                throw new Error(errorData.error || 'Ошибка при обновлении профиля');
            }
            
            const updatedUser = await profileResponse.json();
            setUser(prev => ({
                ...prev,
                first_name: updatedUser.first_name,
                last_name: updatedUser.last_name,
                phone: updatedUser.phone
            }));
            
            toast.success('Профиль успешно обновлен!');
            setEditMode(false);
            setAvatarFile(null);
        } catch (error) {
            toast.error(error.message);
            console.error('Ошибка:', error);
        }
    };

    const handleSavePassword = async () => {
        try {
            const token = localStorage.getItem('token');
            
            if (passwordData.newPassword !== passwordData.confirmPassword) {
                throw new Error('Новые пароли не совпадают');
            }
            
            const response = await fetch('/api/user/password', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка при изменении пароля');
            }
            
            toast.success('Пароль успешно изменен!');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setShowPasswordForm(false);
        } catch (error) {
            toast.error(error.message);
            console.error('Ошибка:', error);
        }
    };

    const navigateToAdminPanel = () => {
        navigate('/admin');
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Загрузка данных...</p>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <Header />
            
            <main className="profile-container">
                <div className="profile-header">
                    <h1>Личный кабинет</h1>
                    {!editMode && (
                        <button 
                            className="edit-button"
                            onClick={() => setEditMode(true)}
                        >
                            Редактировать
                        </button>
                    )}
                </div>
                
                {user && (
                    <div className="profile-content">
                        <div className="profile-avatar-section">
                            <div className="avatar-container">
                                <img 
                                    src={user.avatar || './img/avatar.jpg'} 
                                    alt="Аватар" 
                                    className="profile-avatar"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = './img/avatar.jpg';
                                    }}
                                />
                                {editMode && (
                                    <>
                                        <input 
                                            type="file" 
                                            id="avatar-upload" 
                                            accept="image/*" 
                                            onChange={handleAvatarChange}
                                            style={{ display: 'none' }}
                                        />
                                        <label htmlFor="avatar-upload" className="avatar-upload-button">
                                            Изменить фото
                                        </label>
                                    </>
                                )}
                            </div>
                            
                            <div className={`user-status ${user.role}`}>
                                {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                            </div>
                        </div>
                        
                        <div className="profile-info">
                            {editMode ? (
                                <>
                                    <div className="form-group">
                                        <label>Имя</label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleInputChange}
                                            placeholder="Введите ваше имя"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Фамилия</label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleInputChange}
                                            placeholder="Введите вашу фамилию"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            value={user.email}
                                            disabled
                                            placeholder="Ваш email"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Телефон</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder="Введите ваш телефон"
                                        />
                                    </div>

                                    {!showPasswordForm && (
                                        <button 
                                            className="change-password-button"
                                            onClick={() => setShowPasswordForm(true)}
                                        >
                                            Изменить пароль
                                        </button>
                                    )}

                                    {showPasswordForm && (
                                        <div className="password-form">
                                            <h3>Изменение пароля</h3>
                                            <div className="form-group">
                                                <label>Текущий пароль</label>
                                                <input
                                                    type="password"
                                                    name="currentPassword"
                                                    value={passwordData.currentPassword}
                                                    onChange={handlePasswordChange}
                                                    placeholder="Введите текущий пароль"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Новый пароль</label>
                                                <input
                                                    type="password"
                                                    name="newPassword"
                                                    value={passwordData.newPassword}
                                                    onChange={handlePasswordChange}
                                                    placeholder="Введите новый пароль"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Подтвердите пароль</label>
                                                <input
                                                    type="password"
                                                    name="confirmPassword"
                                                    value={passwordData.confirmPassword}
                                                    onChange={handlePasswordChange}
                                                    placeholder="Подтвердите новый пароль"
                                                />
                                            </div>
                                            <div className="password-form-actions">
                                                <button 
                                                    className="cancel-password-button"
                                                    onClick={() => setShowPasswordForm(false)}
                                                >
                                                    Отмена
                                                </button>
                                                <button 
                                                    className="save-password-button"
                                                    onClick={handleSavePassword}
                                                    disabled={
                                                        !passwordData.currentPassword ||
                                                        !passwordData.newPassword ||
                                                        passwordData.newPassword !== passwordData.confirmPassword
                                                    }
                                                >
                                                    Сохранить пароль
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-actions">
                                        <button 
                                            className="cancel-button"
                                            onClick={() => {
                                                setEditMode(false);
                                                setShowPasswordForm(false);
                                            }}
                                        >
                                            Отмена
                                        </button>
                                        <button 
                                            className="save-button"
                                            onClick={handleSaveProfile}
                                        >
                                            Сохранить изменения
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
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
                                    {user.role === 'admin' && (
                                        <button 
                                            className="admin-panel-button"
                                            onClick={navigateToAdminPanel}
                                        >
                                            Панель администратора
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </main>
            
            <Footer />
        </div>
    );
}

export default ProfilePage;