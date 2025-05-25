import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../header/header.jsx';
import Footer from '../../footer/footer.jsx';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './OrderHistoryPage.css';

function OrderHistoryPage() {
    const [orders, setOrders] = useState([]);
    const [ohpLoading, setOhpLoading] = useState(true);
    const [ohpSelectedOrder, setOhpSelectedOrder] = useState(null);
    const [ohpShowModal, setOhpShowModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOrders = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const response = await fetch('/api/user/orders', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) throw new Error('Ошибка загрузки заказов');
                
                const data = await response.json();
                setOrders(data);
                setOhpLoading(false);
            } catch (error) {
                toast.error(error.message);
                setOhpLoading(false);
            }
        };

        fetchOrders();
    }, [navigate]);

    const ohpFormatDate = (dateString) => {
        const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('ru-RU', options);
    };

    const ohpFormatPrice = (price) => {
        return new Intl.NumberFormat('ru-RU', { 
            style: 'currency', 
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    };

    if (ohpLoading) {
        return (
            <div className="ohp-loading-container">
                <div className="ohp-loading-spinner"></div>
                <p>Загрузка истории заказов...</p>
            </div>
        );
    }

    return (
        <div className="ohp-page">
            <Header />
            
            <main className="ohp-container">
                <div className="ohp-header">
                    <h1 className="ohp-title">История заказов</h1>
                    <button 
                        className="ohp-back-button"
                        onClick={() => navigate('/profile')}
                    >
                        Назад в профиль
                    </button>
                </div>
                
                {orders.length === 0 ? (
                    <div className="ohp-empty">
                        <p className="ohp-empty-text">У вас пока нет заказов</p>
                        <button 
                            className="ohp-catalog-button"
                            onClick={() => navigate('/')}
                        >
                            Перейти в каталог
                        </button>
                    </div>
                ) : (
                    <div className="ohp-orders-grid">
                        {orders.map(order => (
                            <div 
                                key={order.id} 
                                className="ohp-order-card"
                                onClick={() => {
                                    setOhpSelectedOrder(order);
                                    setOhpShowModal(true);
                                }}
                            >
                                <div className="ohp-card-header">
                                    <span className="ohp-order-number">Заказ #{order.id}</span>
                                    <span className="ohp-order-date">{ohpFormatDate(order.created_at)}</span>
                                </div>
                                
                                <div className="ohp-status-wrapper">
                                    <span className={`ohp-status ohp-status-${order.status}`}>
                                        {order.status === 'processing' && 'В обработке'}
                                        {order.status === 'shipped' && 'Отправлен'}
                                        {order.status === 'delivered' && 'Доставлен'}
                                        {order.status === 'cancelled' && 'Отменен'}
                                    </span>
                                </div>
                                
                                <div className="ohp-summary">
                                    <div className="ohp-items-count">
                                        {order.items_count} {order.items_count === 1 ? 'товар' : order.items_count < 5 ? 'товара' : 'товаров'}
                                    </div>
                                    <div className="ohp-order-total">
                                        {ohpFormatPrice(order.total_amount)}
                                    </div>
                                </div>
                                
                                <div className="ohp-card-footer">
                                    <span className="ohp-delivery-address">{order.address}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            
            <Footer />

            {/* Модальное окно с деталями заказа */}
            {ohpShowModal && ohpSelectedOrder && (
                <div className="ohp-modal">
                    <div className="ohp-modal-overlay" onClick={() => setOhpShowModal(false)}></div>
                    <div className="ohp-modal-content">
                        <div className="ohp-modal-header">
                            <h2 className="ohp-modal-title">Детали заказа #{ohpSelectedOrder.id}</h2>
                            <button 
                                className="ohp-modal-close"
                                onClick={() => setOhpShowModal(false)}
                            >
                                &times;
                            </button>
                        </div>
                        
                        <div className="ohp-modal-body">
                            <div className="ohp-details">
                                <div className="ohp-customer-section">
                                    <h3 className="ohp-section-title">Информация о покупателе</h3>
                                    <p className="ohp-info-row"><strong>Имя:</strong> {ohpSelectedOrder.first_name} {ohpSelectedOrder.last_name}</p>
                                    <p className="ohp-info-row"><strong>Email:</strong> {ohpSelectedOrder.email}</p>
                                    <p className="ohp-info-row"><strong>Телефон:</strong> {ohpSelectedOrder.phone}</p>
                                    <p className="ohp-info-row"><strong>Адрес:</strong> {ohpSelectedOrder.address}</p>
                                    <p className="ohp-info-row"><strong>Способ оплаты:</strong> {ohpSelectedOrder.payment_method}</p>
                                    <p className="ohp-info-row"><strong>Дата заказа:</strong> {ohpFormatDate(ohpSelectedOrder.created_at)}</p>
                                    <p className="ohp-info-row"><strong>Статус:</strong> 
                                        <span className={`ohp-status-badge ohp-status-${ohpSelectedOrder.status}`}>
                                            {ohpSelectedOrder.status === 'processing' && 'В обработке'}
                                            {ohpSelectedOrder.status === 'shipped' && 'Отправлен'}
                                            {ohpSelectedOrder.status === 'delivered' && 'Доставлен'}
                                            {ohpSelectedOrder.status === 'cancelled' && 'Отменен'}
                                        </span>
                                    </p>
                                </div>
                                
                                <div className="ohp-items-section">
                                    <h3 className="ohp-section-title">Товары в заказе</h3>
                                    <div className="ohp-items-list">
                                        {ohpSelectedOrder.items.map(item => (
                                            <div key={item.id} className="ohp-item">
                                                <div className="ohp-item-image-box">
                                                    {item.product_image ? (
                                                        <img 
                                                            src={item.product_image} 
                                                            alt={item.product_name}
                                                            className="ohp-item-img"
                                                        />
                                                    ) : (
                                                        <div className="ohp-no-image">Нет фото</div>
                                                    )}
                                                </div>
                                                <div className="ohp-item-details">
                                                    <h4 className="ohp-item-name">{item.product_name}</h4>
                                                    <div className="ohp-item-meta">
                                                        <span className="ohp-item-qty">{item.quantity} шт.</span>
                                                        <span className="ohp-item-price">{ohpFormatPrice(item.price)}</span>
                                                    </div>
                                                    <div className="ohp-item-sum">{ohpFormatPrice(item.price * item.quantity)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="ohp-total-section">
                                    <div className="ohp-total-row">
                                        <span>Итого:</span>
                                        <span className="ohp-grand-total">{ohpFormatPrice(ohpSelectedOrder.total_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OrderHistoryPage;