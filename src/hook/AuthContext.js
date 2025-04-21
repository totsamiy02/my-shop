import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setUser(null);
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/user', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setUser({
                    id: data.id,
                    firstName: data.first_name,
                    lastName: data.last_name,
                    role: data.role,
                    avatar: data.avatar
                });
            } else {
                logout();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            logout();
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = (userData, token) => {
        localStorage.setItem('token', token);
        setUser(userData);
        window.dispatchEvent(new Event('authStateChanged'));
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        window.dispatchEvent(new Event('authStateChanged'));
        window.dispatchEvent(new Event('favoritesUpdated'));
    };

    useEffect(() => {
        checkAuth();
        
        const handleAuthChange = () => checkAuth();
        window.addEventListener('authStateChanged', handleAuthChange);
        
        return () => {
            window.removeEventListener('authStateChanged', handleAuthChange);
        };
    }, [checkAuth]);

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);