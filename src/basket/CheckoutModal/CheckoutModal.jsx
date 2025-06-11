import React, { useState, useEffect } from 'react';
import './CheckoutModal.css';

const CheckoutModal = ({ formData, handleInputChange, handleCheckoutSubmit, isCheckoutOpen, setIsCheckoutOpen, formSuccess }) => {
    const [touchedFields, setTouchedFields] = useState({});
    const [showSuccess, setShowSuccess] = useState(false);
    
    useEffect(() => {
        if (formSuccess) {
            setShowSuccess(true);
            const timer = setTimeout(() => {
                setIsCheckoutOpen(false);
                setShowSuccess(false);
            }, 3000); // Автоматическое закрытие через 3 секунды
            return () => clearTimeout(timer);
        }
    }, [formSuccess, setIsCheckoutOpen]);

    const handleBlur = (fieldName) => {
        setTouchedFields({...touchedFields, [fieldName]: true});
    };

    const formatCardNumber = (value) => {
        return value.replace(/\D/g, '')
                   .replace(/(\d{4})/g, '$1 ')
                   .trim()
                   .substring(0, 19);
    };

    const formatExpiryDate = (value) => {
        return value.replace(/\D/g, '')
                   .replace(/(\d{2})(\d)/, '$1/$2')
                   .substring(0, 5);
    };

    const formatCVC = (value) => {
        return value.replace(/\D/g, '').substring(0, 3);
    };

    const formatPhone = (value) => {
        const cleaned = value.replace(/[^\d+]/g, '');
        const hasPlus = cleaned.startsWith('+');
        const digits = hasPlus ? cleaned.substring(1) : cleaned;
        
        if (digits.length === 0) return hasPlus ? '+' : '';
        
        let formatted = hasPlus ? '+' : '';
        
        if (digits.length > 0) {
            formatted += digits.substring(0, 1);
        }
        if (digits.length > 1) {
            formatted += ` (${digits.substring(1, 4)}`;
        }
        if (digits.length > 4) {
            formatted += `) ${digits.substring(4, 7)}`;
        }
        if (digits.length > 7) {
            formatted += `-${digits.substring(7, 9)}`;
        }
        if (digits.length > 9) {
            formatted += `-${digits.substring(9, 11)}`;
        }
        
        return formatted;
    };

    const validatePhone = (phone) => {
        const regex = /^\+\d \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
        return regex.test(phone);
    };

    const handleFieldChange = (e) => {
        const { name, value } = e.target;
        let formattedValue = value;

        if (name === 'cardNumber') {
            formattedValue = formatCardNumber(value);
        } else if (name === 'cardExpiry') {
            formattedValue = formatExpiryDate(value);
        } else if (name === 'cardCVC') {
            formattedValue = formatCVC(value);
        } else if (name === 'phone') {
            formattedValue = formatPhone(value);
        }

        handleInputChange({
            target: {
                name,
                value: formattedValue
            }
        });
    };

    const isFormValid = () => {
        const requiredFields = ['firstName', 'lastName', 'address', 'email', 'phone'];
        const allFieldsFilled = requiredFields.every(field => formData[field]);
        
        // Проверяем данные карты только если выбран способ оплаты картой
        const cardFieldsValid = formData.paymentMethod !== 'card' || 
                              (formData.cardNumber && formData.cardNumber.replace(/\s/g, '').length === 16 &&
                               formData.cardHolder && 
                               formData.cardExpiry && formData.cardExpiry.length === 5 &&
                               formData.cardCVC && formData.cardCVC.length === 3);
        
        return allFieldsFilled && cardFieldsValid && validatePhone(formData.phone);
    };
    
    return (
        isCheckoutOpen && (
            <div className="modal-overlay">
                <div className="modal-window">
                    {!showSuccess && (
                        <button 
                            className="modal-close" 
                            onClick={() => setIsCheckoutOpen(false)}
                            aria-label="Закрыть окно"
                        >
                            ×
                        </button>
                    )}
                    
                    {showSuccess ? (
                        <div className="success-container">
                            <div className="success-icon">✓</div>
                            <p className="success-message">Заказ успешно оформлен!</p>
                            <p className="success-description">Мы свяжемся с вами для подтверждения</p>
                        </div>
                    ) : (
                        <>
                            <h2 className="modal-title">Оформление заказа</h2>
                            <div className="form-scrollable">
                                <form onSubmit={handleCheckoutSubmit} className="checkout-form">
                                    <div className="form-group">
                                        <input
                                            type="text"
                                            name="firstName"
                                            placeholder="Имя"
                                            required
                                            value={formData.firstName}
                                            onChange={handleInputChange}
                                            onBlur={() => handleBlur('firstName')}
                                            className={touchedFields.firstName && !formData.firstName ? 'error' : ''}
                                            pattern="[А-Яа-яЁёA-Za-z\s]+"
                                            title="Только буквы"
                                        />
                                        {touchedFields.firstName && !formData.firstName && (
                                            <span className="error-message">Поле обязательно для заполнения</span>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <input
                                            type="text"
                                            name="lastName"
                                            placeholder="Фамилия"
                                            required
                                            value={formData.lastName}
                                            onChange={handleInputChange}
                                            onBlur={() => handleBlur('lastName')}
                                            className={touchedFields.lastName && !formData.lastName ? 'error' : ''}
                                            pattern="[А-Яа-яЁёA-Za-z\s]+"
                                            title="Только буквы"
                                        />
                                        {touchedFields.lastName && !formData.lastName && (
                                            <span className="error-message">Поле обязательно для заполнения</span>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <input
                                            type="text"
                                            name="address"
                                            placeholder="Адрес доставки"
                                            required
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            onBlur={() => handleBlur('address')}
                                            className={touchedFields.address && !formData.address ? 'error' : ''}
                                        />
                                        {touchedFields.address && !formData.address && (
                                            <span className="error-message">Поле обязательно для заполнения</span>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="Электронная почта"
                                            required
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            onBlur={() => handleBlur('email')}
                                            className={touchedFields.email && !formData.email ? 'error' : ''}
                                        />
                                        {touchedFields.email && !formData.email && (
                                            <span className="error-message">Введите корректный email</span>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <input
                                            type="tel"
                                            name="phone"
                                            placeholder="+7 (999) 999-99-99"
                                            required
                                            value={formData.phone}
                                            onChange={handleFieldChange}
                                            onBlur={() => handleBlur('phone')}
                                            className={touchedFields.phone && (!formData.phone || !validatePhone(formData.phone)) ? 'error' : ''}
                                        />
                                        {touchedFields.phone && !formData.phone && (
                                            <span className="error-message">Поле обязательно для заполнения</span>
                                        )}
                                        {touchedFields.phone && formData.phone && !validatePhone(formData.phone) && (
                                            <span className="error-message">Введите корректный номер (+7 (999) 999-99-99)</span>
                                        )}
                                    </div>

                                    <div className="payment-method">
                                        <h3 className="payment-title">Способ оплаты</h3>
                                        <label className="payment-option">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="card"
                                                checked={formData.paymentMethod === 'card'}
                                                onChange={handleInputChange}
                                            />
                                            <span className="radio-custom"></span>
                                            Банковская карта
                                        </label>
                                        <label className="payment-option">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="cash"
                                                checked={formData.paymentMethod === 'cash'}
                                                onChange={handleInputChange}
                                            />
                                            <span className="radio-custom"></span>
                                            Оплата при получении
                                        </label>
                                    </div>

                                    {formData.paymentMethod === 'card' && (
                                    <div className="card-details">
                                        <h3 className="card-title">Данные карты</h3>
                                        <div className="form-group">
                                            <input
                                                type="text"
                                                name="cardNumber"
                                                placeholder="Номер карты (0000 0000 0000 0000)"
                                                value={formData.cardNumber}
                                                onChange={handleFieldChange}
                                                onBlur={() => handleBlur('cardNumber')}
                                                className={touchedFields.cardNumber && !formData.cardNumber ? 'error' : ''}
                                                required
                                            />
                                            {touchedFields.cardNumber && !formData.cardNumber && (
                                                <span className="error-message">Введите номер карты</span>
                                            )}
                                        </div>
                                        <div className="form-group">
                                            <input
                                                type="text"
                                                name="cardHolder"
                                                placeholder="Имя владельца карты"
                                                value={formData.cardHolder}
                                                onChange={handleInputChange}
                                                onBlur={() => handleBlur('cardHolder')}
                                                className={touchedFields.cardHolder && !formData.cardHolder ? 'error' : ''}
                                                required
                                            />
                                            {touchedFields.cardHolder && !formData.cardHolder && (
                                                <span className="error-message">Введите имя владельца</span>
                                            )}
                                        </div>
                                        <div className="card-row">
                                            <div className="form-group">
                                                <input
                                                    type="text"
                                                    name="cardExpiry"
                                                    placeholder="MM/YY"
                                                    value={formData.cardExpiry}
                                                    onChange={handleFieldChange}
                                                    onBlur={() => handleBlur('cardExpiry')}
                                                    className={touchedFields.cardExpiry && !formData.cardExpiry ? 'error' : ''}
                                                    required
                                                />
                                                {touchedFields.cardExpiry && !formData.cardExpiry && (
                                                    <span className="error-message">Введите срок</span>
                                                )}
                                            </div>
                                            <div className="form-group">
                                                <input
                                                    type="text"
                                                    name="cardCVC"
                                                    placeholder="CVC"
                                                    value={formData.cardCVC}
                                                    onChange={handleFieldChange}
                                                    onBlur={() => handleBlur('cardCVC')}
                                                    className={touchedFields.cardCVC && !formData.cardCVC ? 'error' : ''}
                                                    required
                                                    maxLength="3"
                                                />
                                                {touchedFields.cardCVC && !formData.cardCVC && (
                                                    <span className="error-message">Введите CVC</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    )}

                                    <button 
                                        type="submit" 
                                        className="checkout-button"
                                        disabled={!isFormValid()}
                                    >
                                        Подтвердить заказ
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )
    );
};

export default CheckoutModal;