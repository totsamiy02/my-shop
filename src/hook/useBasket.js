import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export const useBasket = () => {
    const { isAuthenticated } = useAuth();
    const [basket, setBasket] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchBasket = async () => {
        if (!isAuthenticated) {
            setBasket([]);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            
            const response = await fetch('/api/cart', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Ошибка при загрузке корзины');
            }
            
            const data = await response.json();
            setBasket(data);
        } catch (error) {
            console.error('Ошибка получения корзины:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const addToBasket = async (productId) => {
    if (!isAuthenticated) {
        window.dispatchEvent(new CustomEvent('openAuthModal', {
            detail: { 
                mode: 'login',
                message: 'Для добавления в корзину необходимо авторизоваться'
            }
        }));
        throw new Error('Требуется авторизация');
    }

    try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ productId })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка сервера при добавлении в корзину');
        }
        
        await fetchBasket();
        return data;
    } catch (error) {
        console.error('Ошибка добавления в корзину:', error);
        setError(error.message);
        
        // Показываем пользователю понятное сообщение об ошибке
        if (error.message.includes('максимальное количество')) {
            throw new Error('Достигнуто максимальное количество товара');
        } else if (error.message.includes('Товар не найден')) {
            throw new Error('Товар не найден');
        } else {
            throw new Error('Не удалось добавить товар в корзину');
        }
    } finally {
        setIsLoading(false);
    }
};

    const updateBasketItem = async (productId, quantity) => {
        try {
            setIsLoading(true);
            setError(null);
            
            const response = await fetch('/api/cart/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ productId, quantity })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка сервера при обновлении корзины');
            }
            
            await fetchBasket();
            return data;
        } catch (error) {
            console.error('Ошибка обновления корзины:', error);
            setError(error.message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const removeFromBasket = async (productId) => {
        try {
            setIsLoading(true);
            setError(null);
            
            const response = await fetch('/api/cart/remove', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ productId })
            });
            
            if (!response.ok) {
                throw new Error('Ошибка сервера при удалении из корзины');
            }
            
            await fetchBasket();
        } catch (error) {
            console.error('Ошибка удаления из корзины:', error);
            setError(error.message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const clearBasket = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const response = await fetch('/api/cart/clear', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Ошибка сервера при очистке корзины');
            }
            
            setBasket([]);
        } catch (error) {
            console.error('Ошибка очистки корзины:', error);
            setError(error.message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBasket();
    }, [isAuthenticated]);

    return {
        basket,
        isLoading,
        error,
        addToBasket,
        updateBasketItem,
        removeFromBasket,
        clearBasket,
        fetchBasket
    };
};