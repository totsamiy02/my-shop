import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchUserData(token);
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchUserData = async (token) => {
        try {
            const response = await fetch('/api/user', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const userData = await response.json();
                setUser({
                    id: userData.id,
                    firstName: userData.first_name,
                    lastName: userData.last_name,
                    role: userData.role,
                    avatar: userData.avatar || '/img/avatar.jpg'
                });
                setIsAuthenticated(true);
            } else {
                logout();
            }
        } catch (error) {
            console.error('Ошибка при получении данных пользователя:', error);
            logout();
        } finally {
            setIsLoading(false);
        }
    };

    const login = (token, userData) => {
        localStorage.setItem('token', token);
        setUser(userData);
        setIsAuthenticated(true);
        window.dispatchEvent(new Event('authStateChanged'));
        window.dispatchEvent(new Event('favoritesForceUpdate'));
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
        window.dispatchEvent(new Event('authStateChanged'));
        window.dispatchEvent(new Event('favoritesForceUpdate'));
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}