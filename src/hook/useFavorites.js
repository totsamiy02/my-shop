import { useState, useEffect } from 'react';
import { useAuth } from '../hook/AuthContext';

export function useFavorites() {
    const [count, setCount] = useState(0);
    const { user } = useAuth();

    const fetchCount = async () => {
        if (!user) {
            setCount(0);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setCount(0);
                return;
            }

            const response = await fetch('/api/favorites', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.status === 401 || response.status === 403) {
                setCount(0);
                return;
            }
            
            if (!response.ok) throw new Error('Failed to fetch favorites');
            
            const data = await response.json();
            setCount(Array.isArray(data) ? data.length : 0);
        } catch (error) {
            console.error('Error fetching favorites count:', error);
            setCount(0);
        }
    };

    useEffect(() => {
        fetchCount();

        const handleUpdate = () => {
            fetchCount().catch(console.error);
        };

        window.addEventListener('favoritesUpdated', handleUpdate);
        return () => window.removeEventListener('favoritesUpdated', handleUpdate);
    }, [user]);

    return count;
}