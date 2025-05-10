import { useState, useEffect } from 'react';

export function useFavorites() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let isMounted = true;

        const fetchCount = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                if (isMounted) setCount(0);
                return;
            }

            try {
                const response = await fetch('/api/favorites', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok && isMounted) {
                    const data = await response.json();
                    setCount(Array.isArray(data) ? data.length : 0);
                }
            } catch (error) {
                if (isMounted) setCount(0);
            }
        };

        fetchCount();

        const handleUpdate = () => fetchCount();
        window.addEventListener('favoritesForceUpdate', handleUpdate);
        
        return () => {
            isMounted = false;
            window.removeEventListener('favoritesForceUpdate', handleUpdate);
        };
    }, []);

    return count;
}