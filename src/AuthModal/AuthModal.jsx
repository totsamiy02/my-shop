import React, { useState, useEffect } from 'react';
import './AuthModal.css';

const countries = [
  { name: 'Россия', flag: '🇷🇺', code: '+7', phoneCode: '7' },
  { name: 'Беларусь', flag: '🇧🇾', code: '+375', phoneCode: '375' },
  { name: 'Казахстан', flag: '🇰🇿', code: '+7', phoneCode: '7' },
  { name: 'Украина', flag: '🇺🇦', code: '+380', phoneCode: '380' }
];

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
        email: '',
        code: ['', '', '', '', '', ''],
        newPassword: '',
        confirmPassword: ''
    });
    
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [resetStep, setResetStep] = useState(0);
    const [timer, setTimer] = useState(0);
    const [codeVerified, setCodeVerified] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState(countries[0]);
    const [showCountrySelect, setShowCountrySelect] = useState(false);
    const [touchedFields, setTouchedFields] = useState({});

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [timer]);

    const formatPhoneNumber = (phoneNumber) => {
        if (!phoneNumber) return '';
        
        const digits = phoneNumber.replace(/\D/g, '');
        const countryCode = selectedCountry.phoneCode;
        
        if (digits.startsWith(countryCode)) {
            const localNumber = digits.substring(countryCode.length);
            const match = localNumber.match(/^(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
            
            let formatted = `${selectedCountry.code} `;
            if (match[1]) formatted += `(${match[1]}`;
            if (match[2]) formatted += `) ${match[2]}`;
            if (match[3]) formatted += `-${match[3]}`;
            if (match[4]) formatted += `-${match[4]}`;
            
            return formatted;
        }
        return `${selectedCountry.code} ${digits}`;
    };

    const handlePhoneChange = (e) => {
        const input = e.target.value;
        const digits = input.replace(/\D/g, '');
        
        const phoneWithCountryCode = selectedCountry.phoneCode + digits.substring(selectedCountry.phoneCode.length);
        
        setFormData({
            ...formData,
            phone: phoneWithCountryCode
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'phone') {
            handlePhoneChange(e);
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

    const handleCodeChange = (index, value) => {
        if (/^\d?$/.test(value)) {
            const newCode = [...resetData.code];
            newCode[index] = value;
            
            setResetData({
                ...resetData,
                code: newCode
            });
            
            if (value && index < 5) {
                document.getElementById(`code-input-${index + 1}`).focus();
            }
            
            if (newCode.every(c => c) && index === 5) {
                verifyCode(newCode.join(''));
            }
        }
    };

    const validate = () => {
        const newErrors = {};
        
        if (resetStep > 0) {
            if (resetStep === 1 && !resetData.email) {
                newErrors.email = 'Введите email';
            }
            if (resetStep === 2 && !resetData.code.every(c => c)) {
                newErrors.code = 'Введите полный код подтверждения';
            }
            if (resetStep === 3) {
                if (!resetData.newPassword || resetData.newPassword.length < 8) {
                    newErrors.newPassword = 'Пароль должен содержать минимум 8 символов';
                }
                if (resetData.newPassword !== resetData.confirmPassword) {
                    newErrors.confirmPassword = 'Пароли не совпадают';
                }
            }
        } else {
            if (mode === 'register') {
                if (!formData.firstName.trim()) newErrors.firstName = 'Введите имя';
                if (!formData.lastName.trim()) newErrors.lastName = 'Введите фамилию';
                
                const phoneDigits = formData.phone.replace(/\D/g, '');
                if (phoneDigits.length < 11) {
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
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const verifyCode = async (code) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/verify-reset-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: resetData.email,
                    code: code
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Неверный код подтверждения');
            }
            
            setCodeVerified(true);
            setResetStep(3);
            setMessage('Код подтвержден. Теперь задайте новый пароль.');
        } catch (error) {
            setMessage('Неверный код подтверждения. Попробуйте еще раз.');
        } finally {
            setIsLoading(false);
        }
    };

    const selectCountry = (country) => {
        setSelectedCountry(country);
        const digits = formData.phone.replace(/\D/g, '').substring(selectedCountry.phoneCode.length);
        setFormData({
            ...formData,
            phone: country.phoneCode + digits
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (resetStep > 0) {
            if (resetStep === 1) {
                await sendResetCode();
                return;
            }
            
            if (resetStep === 3) {
                await resetPassword();
                return;
            }
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
                    phone: formData.phone,
                    email: formData.email,
                    password: formData.password
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
                    firstName: '',
                    lastName: '',
                    phone: '',
                    email: '',
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

    const sendResetCode = async () => {
        if (!validate()) return;
        
        setIsLoading(true);
        setMessage('');
        
        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: resetData.email })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка сервера');
            }
            
            setMessage('6-значный код отправлен на ваш email. Проверьте почту.');
            setResetStep(2);
            setTimer(300);
            setCodeVerified(false);
            setResetData(prev => ({
                ...prev,
                code: ['', '', '', '', '', '']
            }));
        } catch (error) {
            setMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const resetPassword = async () => {
        if (!validate()) return;
        
        setIsLoading(true);
        setMessage('');
        
        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: resetData.code.join(''),
                    newPassword: resetData.newPassword
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка сброса пароля');
            }
            
            setMessage('Пароль успешно изменен! Теперь вы можете войти.');
            setTimeout(() => {
                setResetStep(0);
                setResetData({
                    email: '',
                    code: ['', '', '', '', '', ''],
                    newPassword: '',
                    confirmPassword: ''
                });
                setCodeVerified(false);
                onModeChange('login');
            }, 2000);
        } catch (error) {
            setMessage(error.message || 'Ошибка при сбросе пароля');
        } finally {
            setIsLoading(false);
        }
    };

    const startPasswordReset = () => {
        setResetData({
            ...resetData,
            email: formData.email,
            code: ['', '', '', '', '', '']
        });
        setResetStep(1);
        setMessage('');
        setErrors({});
        setCodeVerified(false);
    };

    const cancelReset = () => {
        setResetStep(0);
        setMessage('');
        setErrors({});
        setResetData({
            email: '',
            code: ['', '', '', '', '', ''],
            newPassword: '',
            confirmPassword: ''
        });
        setCodeVerified(false);
    };

    const resendCode = async () => {
        if (timer > 0) return;
        
        setIsLoading(true);
        setMessage('');
        
        try {
            const response = await fetch('/api/resend-reset-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: resetData.email })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка сервера');
            }
            
            setMessage('Новый код отправлен на ваш email');
            setTimer(300);
            setCodeVerified(false);
            setResetData(prev => ({
                ...prev,
                code: ['', '', '', '', '', '']
            }));
        } catch (error) {
            setMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBlur = (fieldName) => {
        setTouchedFields({...touchedFields, [fieldName]: true});
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="auth-modal">
                <button className="close-button" onClick={onClose}>×</button>
                
                <h2>
                    {resetStep === 1 ? 'Восстановление пароля' :
                     resetStep === 2 ? 'Введите код подтверждения' :
                     resetStep === 3 ? 'Новый пароль' :
                     mode === 'login' ? 'Вход' : 'Регистрация'}
                </h2>
                
                {message && (
                    <div className={`message ${message.includes('успеш') || message.includes('отправлен') ? 'success' : 'error'}`}>
                        {message}
                    </div>
                )}
                
                <form onSubmit={handleSubmit}>
                    {resetStep === 0 ? (
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
                                            onBlur={() => handleBlur('firstName')}
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
                                            onBlur={() => handleBlur('lastName')}
                                            placeholder="Введите вашу фамилию"
                                            className={errors.lastName ? 'error' : ''}
                                        />
                                        {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                                    </div>
                                    
                                    <div className="form-group phone-group">
                                        <label>Номер телефона</label>
                                        <div className="phone-input-container">
                                            <div 
                                                className="country-selector"
                                                onClick={() => setShowCountrySelect(!showCountrySelect)}
                                            >
                                                <span className="flag">{selectedCountry.flag}</span>
                                                <span className="code">{selectedCountry.code}</span>
                                                <span className="arrow">▼</span>
                                            </div>
                                            {showCountrySelect && (
                                                <div className="country-dropdown">
                                                    {countries.map(country => (
                                                        <div 
                                                            key={country.code}
                                                            className="country-option"
                                                            onClick={() => selectCountry(country)}
                                                        >
                                                            <span className="flag">{country.flag}</span>
                                                            <span className="name">{country.name}</span>
                                                            <span className="code">{country.code}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formatPhoneNumber(formData.phone)}
                                                onChange={handlePhoneChange}
                                                onBlur={() => handleBlur('phone')}
                                                placeholder={`${selectedCountry.code} (XXX) XXX-XX-XX`}
                                                className={`phone-input ${errors.phone ? 'error' : ''}`}
                                            />
                                        </div>
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
                                    onBlur={() => handleBlur('email')}
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
                                        onBlur={() => handleBlur('password')}
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
                                        onBlur={() => handleBlur('confirmPassword')}
                                        placeholder="Повторите пароль"
                                        className={errors.confirmPassword ? 'error' : ''}
                                    />
                                    {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                                </div>
                            )}
                            
                            <button 
                                type="submit" 
                                className="submit-button" 
                                disabled={isLoading}
                            >
                                {isLoading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
                            </button>
                            
                            <div className="auth-switch">
                                {mode === 'login' ? (
                                    <>
                                        <p>Нет аккаунта? <button type="button" onClick={() => onModeChange('register')}>Зарегистрироваться</button></p>
                                        <p>Забыли пароль? <button type="button" onClick={startPasswordReset}>Восстановить</button></p>
                                    </>
                                ) : (
                                    <p>Уже есть аккаунт? <button type="button" onClick={() => onModeChange('login')}>Войти</button></p>
                                )}
                            </div>
                        </>
                    ) : resetStep === 1 ? (
                        <>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={resetData.email}
                                    onChange={handleResetChange}
                                    onBlur={() => handleBlur('email')}
                                    placeholder="Введите email для восстановления"
                                    className={errors.email ? 'error' : ''}
                                />
                                {errors.email && <span className="error-text">{errors.email}</span>}
                            </div>
                            
                            <button type="submit" className="submit-button" disabled={isLoading}>
                                {isLoading ? 'Отправка...' : 'Отправить код'}
                            </button>
                            
                            <button 
                                type="button" 
                                className="cancel-button" 
                                onClick={cancelReset}
                                disabled={isLoading}
                            >
                                Отмена
                            </button>
                        </>
                    ) : resetStep === 2 ? (
                        <>
                            <div className="form-group">
                                <label>6-значный код подтверждения</label>
                                <div className="code-inputs">
                                    {[0, 1, 2, 3, 4, 5].map((index) => (
                                        <input
                                            key={index}
                                            id={`code-input-${index}`}
                                            type="text"
                                            maxLength={1}
                                            value={resetData.code[index]}
                                            onChange={(e) => handleCodeChange(index, e.target.value)}
                                            className={`code-input ${codeVerified ? 'verified' : ''}`}
                                            inputMode="numeric"
                                        />
                                    ))}
                                </div>
                                {errors.code && <span className="error-text">{errors.code}</span>}
                                {codeVerified && (
                                    <div className="verification-success">
                                        <span>✓</span> Код подтвержден
                                    </div>
                                )}
                            </div>
                            
                            <div className="timer">
                                {timer > 0 ? (
                                    <span>Можно запросить новый код через {Math.floor(timer / 60)}:{timer % 60 < 10 ? '0' : ''}{timer % 60}</span>
                                ) : (
                                    <button 
                                        type="button" 
                                        className="resend-button"
                                        onClick={resendCode}
                                    >
                                        Отправить код повторно
                                    </button>
                                )}
                            </div>
                            
                            <button 
                                type="button" 
                                className="cancel-button" 
                                onClick={cancelReset}
                                disabled={isLoading}
                            >
                                Отмена
                            </button>
                        </>
                    ) : resetStep === 3 ? (
                        <>
                            <div className="form-group">
                                <label>Новый пароль</label>
                                <div className="password-input">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="newPassword"
                                        value={resetData.newPassword}
                                        onChange={handleResetChange}
                                        onBlur={() => handleBlur('newPassword')}
                                        placeholder="Введите новый пароль"
                                        className={errors.newPassword ? 'error' : ''}
                                    />
                                    <button 
                                        type="button" 
                                        className="show-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                {errors.newPassword && <span className="error-text">{errors.newPassword}</span>}
                            </div>
                            
                            <div className="form-group">
                                <label>Подтверждение пароля</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={resetData.confirmPassword}
                                    onChange={handleResetChange}
                                    onBlur={() => handleBlur('confirmPassword')}
                                    placeholder="Повторите новый пароль"
                                    className={errors.confirmPassword ? 'error' : ''}
                                />
                                {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                            </div>
                            
                            <button type="submit" className="submit-button" disabled={isLoading}>
                                {isLoading ? 'Сохранение...' : 'Сменить пароль'}
                            </button>
                            
                            <button 
                                type="button" 
                                className="cancel-button" 
                                onClick={cancelReset}
                                disabled={isLoading}
                            >
                                Отмена
                            </button>
                        </>
                    ) : null}
                </form>
            </div>
        </div>
    );
};

export default AuthModal;