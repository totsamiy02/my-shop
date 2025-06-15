import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../header/header.jsx';
import Footer from '../../footer/footer.jsx';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ConfirmationModal from '../../Notification/ConfirmationModal.jsx';
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
    const [initialFormData, setInitialFormData] = useState({
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
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [phoneError, setPhoneError] = useState('');
    const [isPhoneDuplicate, setIsPhoneDuplicate] = useState(false);
    const navigate = useNavigate();

    const formatPhoneNumber = (phone) => {
        if (!phone) return '';
        
        // Оставляем только цифры
        const digits = phone.replace(/\D/g, '');
        
        // Удаляем лишние цифры (если введено больше 11)
        const trimmedDigits = digits.length > 11 ? digits.substring(0, 11) : digits;
        
        // Форматируем номер по шаблону +7 (XXX) XXX-XX-XX
        const match = trimmedDigits.match(/^(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
        
        if (!match) return `+7 ${trimmedDigits}`;
        
        let formatted = '+7';
        if (match[2]) formatted += ` (${match[2]}`;
        if (match[3]) formatted += `) ${match[3]}`;
        if (match[4]) formatted += `-${match[4]}`;
        if (match[5]) formatted += `-${match[5]}`;
        
        return formatted;
    };

    const formatDisplayPhone = (phone) => {
        if (!phone) return 'Не указан';
        return formatPhoneNumber(phone);
    };

    const validatePhone = (phone) => {
        if (!phone) return true;
        
        const digits = phone.replace(/\D/g, '');
        return digits.startsWith('7') && digits.length === 11;
    };

    const checkPhoneDuplicate = async (phone) => {
        if (!phone || phone === initialFormData.phone) {
            setIsPhoneDuplicate(false);
            return false;
        }
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/user/check-phone?phone=${encodeURIComponent(phone)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Ошибка проверки номера');
            }
            
            const data = await response.json();
            setIsPhoneDuplicate(data.exists);
            return data.exists;
        } catch (error) {
            console.error('Phone check error:', error);
            return false;
        }
    };

    const PhoneDisplay = ({ phone }) => {
        const isValid = validatePhone(phone);
        
        return (
            <div className="phone-display">
                {formatDisplayPhone(phone)}
                {!isValid && phone && (
                    <span className="phone-warning"> (некорректный формат)</span>
                )}
            </div>
        );
    };

    const checkAndSetPhoneError = (phone) => {
        if (!phone) {
            setPhoneError('');
            return true;
        }
        
        const digits = phone.replace(/\D/g, '');
        
        if (!digits.startsWith('7')) {
            setPhoneError('Номер должен начинаться с +7');
            return false;
        }
        
        if (digits.length !== 11) {
            setPhoneError('Номер должен содержать 11 цифр');
            return false;
        }
        
        setPhoneError('');
        return true;
    };

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const response = await fetch('/api/user', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const userData = await response.json();
                setUser(userData);
                
                const initialData = {
                    firstName: userData.first_name || '',
                    lastName: userData.last_name || '',
                    phone: userData.phone || ''
                };
                
                setFormData(initialData);
                setInitialFormData(initialData);
            } catch (error) {
                toast.error('Не удалось загрузить профиль');
                navigate('/login');
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

    const handlePhoneChange = (e) => {
        const input = e.target.value;
        const digits = input.replace(/\D/g, '');
        
        let normalizedDigits = digits;
        if (digits.startsWith('7') || digits.startsWith('8')) {
            normalizedDigits = '7' + digits.substring(1);
        } else if (digits.length > 0) {
            normalizedDigits = '7' + digits;
        }
        
        const limitedDigits = normalizedDigits.length > 11 ? 
            normalizedDigits.substring(0, 11) : 
            normalizedDigits;
        
        setFormData(prev => ({
            ...prev,
            phone: limitedDigits
        }));
        
        checkAndSetPhoneError(limitedDigits);
        
        // Проверка на дубликат с задержкой
        const timer = setTimeout(async () => {
            const isDuplicate = await checkPhoneDuplicate(limitedDigits);
            if (isDuplicate) {
                setPhoneError('Этот номер уже зарегистрирован');
            }
        }, 500);
        
        return () => clearTimeout(timer);
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

    const handleCancelEdit = () => {
        setFormData(initialFormData);
        setEditMode(false);
        setShowPasswordForm(false);
        setPhoneError('');
        setAvatarFile(null);
        setIsPhoneDuplicate(false);
    };

    const handleSaveProfile = async () => {
        try {
            let phoneToSave = formData.phone;
            
            if (phoneToSave && !checkAndSetPhoneError(phoneToSave)) {
                toast.error('Пожалуйста, введите корректный номер телефона');
                return;
            }
            
            const isDuplicate = await checkPhoneDuplicate(phoneToSave);
            if (isDuplicate) {
                toast.error('Этот номер телефона уже зарегистрирован');
                return;
            }

            const token = localStorage.getItem('token');
            
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
            
            const profileResponse = await fetch('/api/user', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: phoneToSave
                })
            });
            
            if (!profileResponse.ok) {
                const errorData = await profileResponse.json();
                const errorMessage = errorData.error || 'Ошибка при обновлении профиля';
                
                if (errorData.error?.includes('уже существует')) {
                    toast.error('Этот номер телефона уже зарегистрирован');
                    setIsPhoneDuplicate(true);
                } else {
                    toast.error(errorMessage);
                }
                return;
            }
            
            const updatedUser = await profileResponse.json();
            
            const updatedInitialData = {
                firstName: updatedUser.first_name || '',
                lastName: updatedUser.last_name || '',
                phone: updatedUser.phone || ''
            };
            
            setUser(prev => ({
                ...prev,
                first_name: updatedUser.first_name,
                last_name: updatedUser.last_name,
                phone: updatedUser.phone
            }));
            
            setInitialFormData(updatedInitialData);
            setFormData(updatedInitialData);
            
            toast.success('Профиль успешно обновлен!');
            setEditMode(false);
            setAvatarFile(null);
            setPhoneError('');
            setIsPhoneDuplicate(false);
        } catch (error) {
            console.error('Save profile error:', error);
            toast.error(error.message || 'Произошла ошибка при сохранении');
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
        }
    };

    const handleActionConfirmation = (action) => {
        setPendingAction(action);
        setShowConfirmationModal(true);
    };

    const handleConfirmAction = () => {
        setShowConfirmationModal(false);
        if (pendingAction === 'saveProfile') {
            handleSaveProfile();
        } else if (pendingAction === 'savePassword') {
            handleSavePassword();
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
                    {user?.role === 'admin' && (
                        <button 
                            className="admin-panel-button"
                            onClick={navigateToAdminPanel}
                        >
                            Панель администратора
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
                                            maxLength={50}
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
                                            maxLength={50}
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
                                            value={formatPhoneNumber(formData.phone)}
                                            onChange={handlePhoneChange}
                                            placeholder="+7 (XXX) XXX-XX-XX"
                                            className={`phone-input ${phoneError ? 'invalid' : ''}`}
                                            maxLength={18}
                                        />
                                        {phoneError && (
                                            <div className="phone-error">{phoneError}</div>
                                        )}
                                        {isPhoneDuplicate && (
                                            <div className="phone-error" style={{color: 'red'}}>
                                                Этот номер уже зарегистрирован
                                            </div>
                                        )}
                                        <div className="phone-hint">Формат: +7 (XXX) XXX-XX-XX</div>
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
                                                    maxLength={50}
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
                                                    maxLength={50}
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
                                                    maxLength={50}
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
                                                    onClick={() => handleActionConfirmation('savePassword')}
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
                                            onClick={handleCancelEdit}
                                        >
                                            Отменить изменения
                                        </button>
                                        <button 
                                            className="save-button"
                                            onClick={() => handleActionConfirmation('saveProfile')}
                                            disabled={phoneError || isPhoneDuplicate}
                                        >
                                            Сохранить профиль
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
                                        <span className="info-value">
                                            <PhoneDisplay phone={user.phone} />
                                        </span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label">Статус:</span>
                                        <span className={`info-value ${user.role}`}>
                                            {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                                        </span>
                                    </div>

                                    <div className="profile-actions">
                                        <button 
                                            className="edit-button"
                                            onClick={() => setEditMode(true)}
                                        >
                                            Редактировать профиль
                                        </button>
                                         <button 
                                            className="order-history-button"
                                            onClick={() => navigate('/orders')}
                                        >
                                            История заказов
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </main>
            
            <Footer />

            <ConfirmationModal
                isOpen={showConfirmationModal}
                onClose={() => setShowConfirmationModal(false)}
                onConfirm={handleConfirmAction}
                title="Подтверждение действия"
                message="Вы уверены, что хотите сохранить изменения?"
                confirmText="Сохранить"
                cancelText="Отмена"
            />
        </div>
    );
}

export default ProfilePage;