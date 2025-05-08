import { useState, useEffect } from 'react';

export function useFavorites() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const fetchCount = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setCount(0);
                return;
            }

            try {
                const response = await fetch('/api/favorites', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setCount(Array.isArray(data) ? data.length : 0);
                }
            } catch (error) {
                setCount(0);
            }
        };

        fetchCount();

        const handleUpdate = () => fetchCount();
        window.addEventListener('favoritesForceUpdate', handleUpdate);
        return () => window.removeEventListener('favoritesForceUpdate', handleUpdate);
    }, []);

    return count;
}