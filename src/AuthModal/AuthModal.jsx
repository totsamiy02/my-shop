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
    const [resetData, setResetData] = useState({
        code: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [resetPasswordMode, setResetPasswordMode] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
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

    const handleResetChange = (e) => {
        const { name, value } = e.target;
        setResetData(prev => ({
            ...prev,
            [name]: value
        }));
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
        
        if ((mode === 'register' || resetPasswordMode) && 
            (resetPasswordMode 
                ? resetData.newPassword !== resetData.confirmPassword 
                : formData.password !== formData.confirmPassword)) {
            newErrors.confirmPassword = 'Пароли не совпадают';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (resetPasswordMode) {
            await handleResetPassword();
            return;
        }
        
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
                setTimeout(() => onClose(), 500);
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
                throw new Error(data.error || 'Ошибка сервера');
            }
            
            setMessage(data.message || 'Код подтверждения отправлен на ваш email');
            setResetPasswordMode(true);
        } catch (error) {
            setMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        
        if (!validate()) {
            return;
        }
        
        if (!resetData.code) {
            setMessage('Введите код подтверждения');
            return;
        }
        
        setIsLoading(true);
        setMessage('');
        
        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: resetData.code,
                    newPassword: resetData.newPassword
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка сброса пароля');
            }
            
            setMessage('Пароль успешно изменен! Теперь вы можете войти.');
            setTimeout(() => {
                setResetPasswordMode(false);
                setResetData({
                    code: '',
                    newPassword: '',
                    confirmPassword: ''
                });
            }, 2000);
        } catch (error) {
            console.error('Reset error:', error);
            setMessage(error.message || 'Ошибка при сбросе пароля');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelReset = () => {
        setResetPasswordMode(false);
        setMessage('');
        setErrors({});
        setResetData({
            code: '',
            newPassword: '',
            confirmPassword: ''
        });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="auth-modal">
                <button className="close-button" onClick={onClose}>×</button>
                
                <h2>
                    {resetPasswordMode 
                        ? 'Сброс пароля' 
                        : mode === 'login' 
                            ? 'Вход' 
                            : 'Регистрация'}
                </h2>
                
                {message && (
                    <div className={`message ${message.includes('успеш') || message.includes('изменен') ? 'success' : 'error'}`}>
                        {message}
                    </div>
                )}
                
                <form onSubmit={resetPasswordMode ? handleResetPassword : handleSubmit}>
                    {resetPasswordMode ? (
                        <>
                            <div className="form-group">
                                <label>Код подтверждения</label>
                                <input
                                    type="text"
                                    name="code"
                                    value={resetData.code}
                                    onChange={handleResetChange}
                                    placeholder="Введите код из письма"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Новый пароль</label>
                                <div className="password-input">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="newPassword"
                                        value={resetData.newPassword}
                                        onChange={handleResetChange}
                                        placeholder="Введите новый пароль"
                                    />
                                    <button 
                                        type="button" 
                                        className="show-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Подтверждение пароля</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={resetData.confirmPassword}
                                    onChange={handleResetChange}
                                    placeholder="Повторите новый пароль"
                                />
                                {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                            </div>
                            
                            <button type="submit" className="submit-button" disabled={isLoading}>
                                {isLoading ? 'Сохранение...' : 'Сменить пароль'}
                            </button>
                            
                            <button 
                                type="button" 
                                className="cancel-button" 
                                onClick={handleCancelReset}
                                disabled={isLoading}
                            >
                                Отмена
                            </button>
                        </>
                    ) : (
                        <>
                            {mode === 'register' && (
                                <>
                                    <div className="form-group">
                                        <label>Имя</label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            placeholder="Введите ваше имя"
                                            className={errors.firstName ? 'error' : ''}
                                        />
                                        {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Фамилия</label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            placeholder="Введите вашу фамилию"
                                            className={errors.lastName ? 'error' : ''}
                                        />
                                        {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Номер телефона</label>
                                        <input
                                            type="text"
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
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Введите ваш email"
                                    className={errors.email ? 'error' : ''}
                                />
                                {errors.email && <span className="error-text">{errors.email}</span>}
                            </div>
                            
                            <div className="form-group">
                                <label>Пароль</label>
                                <div className="password-input">
                                    <input
                                        type={showPassword ? "text" : "password"}
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
                                    <label>Подтверждение пароля</label>
                                    <input
                                        type={showPassword ? "text" : "password"}
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
                        </>
                    )}
                </form>
                
                {!resetPasswordMode && (
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
                )}
            </div>
        </div>
    );
};

export default AuthModal;