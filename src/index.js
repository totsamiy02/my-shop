import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hook/AuthContext.js'; // Добавляем импорт AuthProvider

import './index.css';
import './reset/reset.css';

import Header from './header/header.jsx';
import Banner from './banner/advertising_banner';
import ProductList from './card/ProductList';
import Footer from './footer/footer';
import TermsOfService from './terms_of_Service/terms_of_Service.jsx';
import Contacts from './contact/contact.jsx';
import Basket from './basket/basket.jsx';
import FavoritesPage from './FavoritesPage/FavoritesPage.jsx';
import ProfilePage from './AuthModal/profile/ProfilePage.jsx';
import AdminPanel from './AuthModal/admin/AdminPanel.jsx';
import PrivateRoute from './AuthModal/admin/PrivateRoute.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider> {/* Обертываем все приложение в AuthProvider */}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <>
              <Header />
              <Banner />
              <ProductList />
              <Footer />
            </>
          } />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/basket" element={<Basket />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<PrivateRoute adminOnly={true}><AdminPanel /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);