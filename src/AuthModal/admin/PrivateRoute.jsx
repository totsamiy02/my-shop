import React from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/" replace />;
  }

  try {
    const user = jwtDecode(token);
    
    if (adminOnly && user.role !== 'admin') {
      return <Navigate to="/profile" replace />;
    }
    
    return children;
  } catch (error) {
    console.error('Ошибка декодирования токена:', error);
    localStorage.removeItem('token');
    return <Navigate to="/" replace />;
  }
};

export default PrivateRoute;