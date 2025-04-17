import React, { useState } from 'react';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, mode, onModeChange, onLoginSuccess }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Форматирование номера телефона
        if (name === 'phone') {
            let formattedValue = value.replace(/\D/g, '');
            
            if (formattedValue.length > 0) {
                formattedValue = '+7 (' + formattedValue.substring(1, 4) + ') - ' + 
                                 formattedValue.substring(4, 7) + ' - ' + 
                                 formattedValue.substring(7, 9) + ' - ' + 
                                 formattedValue.substring(9, 11);
            }
            
            setFormData({
                ...formData,
                [name]: formattedValue
            });
            return;
        }
        
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const validate = () => {
        const newErrors = {};
        
        if (mode === 'register') {
            if (!formData.firstName.trim()) newErrors.firstName = 'Введите имя';
            if (!formData.lastName.trim()) newErrors.lastName = 'Введите фамилию';
            if (!formData.phone || formData.phone.replace(/\D/g, '').length !== 11) {
                newErrors.phone = 'Введите корректный номер телефона';
            }
        }
        
        if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
            newErrors.email = 'Введите корректный email';
        }
        
        if (!formData.password || formData.password.length < 8) {
            newErrors.password = 'Пароль должен содержать минимум 8 символов';
        }
        
        if (mode === 'register' && formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Пароли не совпадают';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        
        setIsLoading(true);
        setMessage('');
        
        try {
            const url = mode === 'login' 
                ? '/api/login' 
                : '/api/register';
            
            const payload = mode === 'login'
                ? { email: formData.email, password: formData.password }
                : {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phone.replace(/\D/g, ''),
                    email: formData.email,
                    password: formData.password,
                    confirmPassword: formData.confirmPassword
                };
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Произошла ошибка');
            }
            
            if (mode === 'login') {
                onLoginSuccess(data.token, data.user);
            } else {
                setMessage('Регистрация прошла успешно! Теперь вы можете войти.');
                onModeChange('login');
                setFormData({
                    ...formData,
                    password: '',
                    confirmPassword: ''
                });
            }
        } catch (error) {
            setMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!formData.email) {
            setErrors({ ...errors, email: 'Введите email для восстановления' });
            return;
        }
        
        setIsLoading(true);
        setMessage('');
        
        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: formData.email })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Произошла ошибка');
            }
            
            setMessage(data.message);
            onModeChange('login');
        } catch (error) {
            setMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="auth-modal">
                <button className="close-button" onClick={onClose}>×</button>
                
                <h2>{mode === 'login' ? 'Вход' : 'Регистрация'}</h2>
                
                {message && (
                    <div className={`message ${message.includes('успеш') ? 'success' : 'error'}`}>
                        {message}
                    </div>
                )}
                
                <form onSubmit={handleSubmit}>
                    {mode === 'register' && (
                        <>
                            <div className="form-group">
                                <label htmlFor="firstName">Имя</label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    placeholder="Введите ваше имя"
                                    className={errors.firstName ? 'error' : ''}
                                />
                                {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="lastName">Фамилия</label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    placeholder="Введите вашу фамилию"
                                    className={errors.lastName ? 'error' : ''}
                                />
                                {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="phone">Номер телефона</label>
                                <input
                                    type="text"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+7 (XXX) - XXX - XX - XX"
                                    className={errors.phone ? 'error' : ''}
                                />
                                {errors.phone && <span className="error-text">{errors.phone}</span>}
                            </div>
                        </>
                    )}
                    
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Введите ваш email"
                            className={errors.email ? 'error' : ''}
                        />
                        {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password">Пароль</label>
                        <div className="password-input">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Введите пароль"
                                className={errors.password ? 'error' : ''}
                            />
                            <button 
                                type="button" 
                                className="show-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                        {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>
                    
                    {mode === 'register' && (
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Подтверждение пароля</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Повторите пароль"
                                className={errors.confirmPassword ? 'error' : ''}
                            />
                            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                        </div>
                    )}
                    
                    <button type="submit" className="submit-button" disabled={isLoading}>
                        {isLoading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
                    </button>
                </form>
                
                <div className="auth-switch">
                    {mode === 'login' ? (
                        <>
                            <p>Нет аккаунта? <button onClick={() => onModeChange('register')}>Зарегистрироваться</button></p>
                            <p>Забыли пароль? <button onClick={handleForgotPassword}>Восстановить</button></p>
                        </>
                    ) : (
                        <p>Уже есть аккаунт? <button onClick={() => onModeChange('login')}>Войти</button></p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthModal;