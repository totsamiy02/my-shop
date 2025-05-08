import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext();

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState([]);
  const [count, setCount] = useState(0);
  const { isAuthenticated } = useAuth();

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFavorites([]);
        setCount(0);
        return;
      }

      const response = await fetch('/api/favorites', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const favs = Array.isArray(data) ? data : [];
        setFavorites(favs);
        setCount(favs.length);
      } else if (response.status === 401) {
        setFavorites([]);
        setCount(0);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setFavorites([]);
      setCount(0);
    }
  };

  const addFavorite = async (productId) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return false;

        const response = await fetch('/api/favorites/add', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productId })
        });

        const data = await response.json();
        
        if (response.ok || data.success) {
            await fetchFavorites();
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error adding favorite:', error);
        return false;
    }
  };

  const removeFavorite = async (productId) => {
      try {
          const token = localStorage.getItem('token');
          if (!token) return false;

          const response = await fetch('/api/favorites/remove', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ productId })
          });

          const data = await response.json();
          
          if (response.ok || data.success) {
              await fetchFavorites();
              return true;
          }
          return false;
      } catch (error) {
          console.error('Error removing favorite:', error);
          return false;
      }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    } else {
      setFavorites([]);
      setCount(0);
    }

    const handleUpdate = () => fetchFavorites();
    window.addEventListener('favoritesUpdated', handleUpdate);
    
    return () => {
      window.removeEventListener('favoritesUpdated', handleUpdate);
    };
  }, [isAuthenticated]);

  return (
    <FavoritesContext.Provider value={{ 
      favorites, 
      count, 
      addFavorite, 
      removeFavorite,
      fetchFavorites 
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}