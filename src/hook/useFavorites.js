import { useState, useEffect } from 'react';

export function useFavorites() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const updateCount = () => {
            const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
            setCount(favorites.length);
        };

        updateCount();

        window.addEventListener('favoritesUpdated', updateCount);
        window.addEventListener('storage', updateCount);

        return () => {
            window.removeEventListener('favoritesUpdated', updateCount);
            window.removeEventListener('storage', updateCount);
        };
    }, []);

    return count;
}