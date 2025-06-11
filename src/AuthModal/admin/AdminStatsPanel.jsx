import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './AdminStatsPanel.css';

function AdminStatsPanel() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ordersHistory, setOrdersHistory] = useState([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [totalHistoryPages, setTotalHistoryPages] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderModal, setShowOrderModal] = useState(false);

    useEffect(() => {
        fetchStats();
        fetchOrdersHistory();
    }, [historyPage]);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/orders/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Ошибка загрузки статистики');
            
            const data = await response.json();
            setStats(data);
            setLoading(false);
        } catch (error) {
            toast.error(error.message);
            setLoading(false);
        }
    };

    const fetchOrdersHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/orders/history?page=${historyPage}&limit=30`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Ошибка загрузки истории заказов');
            
            const data = await response.json();
            setOrdersHistory(data.orders);
            setTotalHistoryPages(data.totalPages);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const fetchOrderDetails = async (orderId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Ошибка загрузки деталей заказа');
            
            const data = await response.json();
            setSelectedOrder(data);
            setShowOrderModal(true);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (!response.ok) throw new Error('Ошибка обновления статуса');
            
            setOrdersHistory(prev => prev.map(order => 
                order.id === orderId ? { ...order, status: newStatus } : order
            ));
            
            if (stats?.recentOrders) {
                setStats(prev => ({
                    ...prev,
                    recentOrders: prev.recentOrders.map(order => 
                        order.id === orderId ? { ...order, status: newStatus } : order
                    )
                }));
            }
            
            toast.success('Статус заказа обновлен');
            return true;
        } catch (error) {
            toast.error(error.message);
            return false;
        }
    };

    const formatDate = (dateString) => {
        const options = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('ru-RU', options);
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('ru-RU', { 
            style: 'currency', 
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    };

    const OrderModal = ({ order, onClose, onStatusUpdate }) => {
        const [status, setStatus] = useState(order.status);
        const [isUpdating, setIsUpdating] = useState(false);
      
        const handleStatusUpdate = async () => {
            setIsUpdating(true);
            const success = await onStatusUpdate(order.id, status);
            setIsUpdating(false);
            if (success) onClose();
        };
      
        return (
            <div className="admin-order-modal">
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>Детали заказа #{order.id}</h2>
                        <button className="modal-close" onClick={onClose}>&times;</button>
                    </div>
                    
                    <div className="modal-body">
                        <div className="order-details-grid">
                            <div className="order-general-info">
                                <h3>Общая информация</h3>
                                <div className="admin-info-row">
                                    <span className="admin-info-label">Клиент:</span>
                                    <span className="admin-info-value">{order.customer_name}</span>
                                </div>
                                <div className="admin-info-row">
                                    <span className="admin-info-label">Телефон:</span>
                                    <span className="admin-info-value">{order.phone}</span>
                                </div>
                                <div className="admin-info-row">
                                    <span className="admin-info-label">Email:</span>
                                    <span className="admin-info-value">{order.email}</span>
                                </div>
                                <div className="admin-info-row">
                                    <span className="admin-info-label">Адрес:</span>
                                    <span className="admin-info-value">{order.address}</span>
                                </div>
                                <div className="admin-info-row">
                                    <span className="admin-info-label">Способ оплаты:</span>
                                    <span className="admin-info-value">{order.payment_method}</span>
                                </div>
                                <div className="admin-info-row">
                                    <span className="admin-info-label">Дата заказа:</span>
                                    <span className="admin-info-value">{formatDate(order.created_at)}</span>
                                </div>

                                <div className="status-selector">
                                    <label className="status-label">Статус заказа:</label>
                                    <div className="status-controls">
                                        <select 
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            disabled={isUpdating}
                                            className="status-select"
                                        >
                                            <option value="processing">В обработке</option>
                                            <option value="shipped">Отправлен</option>
                                            <option value="delivered">Доставлен</option>
                                            <option value="cancelled">Отменен</option>
                                        </select>
                                        <button 
                                            onClick={handleStatusUpdate}
                                            disabled={isUpdating}
                                            className="status-update-btn"
                                        >
                                            {isUpdating ? (
                                                <span className="spinner"></span>
                                            ) : (
                                                'Обновить статус'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="order-items-info">
                                <h3>Товары в заказе ({order.items.length})</h3>
                                <div className="order-items-list">
                                    {order.items.map(item => (
                                        <div key={item.id} className="order-item">
                                            <div className="item-image-container">
                                                {item.product_image ? (
                                                    <img 
                                                        src={item.product_image} 
                                                        alt={item.product_name} 
                                                        className="item-image"
                                                    />
                                                ) : (
                                                    <div className="no-image">Нет фото</div>
                                                )}
                                            </div>
                                            <div className="item-details">
                                                <div className="item-name">{item.product_name}</div>
                                                <div className="item-meta">
                                                    <span className="item-quantity">{item.quantity} шт.</span>
                                                    <span className="item-price">{formatPrice(item.price)}</span>
                                                </div>
                                                <div className="item-total">{formatPrice(item.price * item.quantity)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="order-summary">
                                    <div className="order-total">
                                        <span className="total-label">Итого:</span>
                                        <span className="total-value">{formatPrice(order.total_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="admin-stats-loading">
                <div className="admin-spinner"></div>
                <p>Загрузка статистики...</p>
            </div>
        );
    }

    return (
        <div className="admin-stats-container">
            <div className="admin-stats-grid">
                {/* Статистика */}
                <div className="admin-stats-card stat-card">
                    <div className="stat-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                            <path d="M7 12h2v5H7zm4-7h2v12h-2zm4 4h2v8h-2z"/>
                        </svg>
                    </div>
                    <div className="stat-info">
                        <div className="stat-title">Всего заказов</div>
                        <div className="stat-value">{stats?.stats.totalOrders || 0}</div>
                        <div className="stat-change positive">
                            +{stats?.stats.todayOrders || 0} сегодня
                        </div>
                    </div>
                </div>
                
                <div className="admin-stats-card stat-card">
                    <div className="stat-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
                        </svg>
                    </div>
                    <div className="stat-info">
                        <div className="stat-title">Общий доход</div>
                        <div className="stat-value">{formatPrice(stats?.stats.totalRevenue || 0)}</div>
                        <div className="stat-change positive">
                            +{formatPrice(stats?.stats.todayRevenue || 0)} сегодня
                        </div>
                    </div>
                </div>
                
                {/* Популярные товары */}
                <div className="admin-stats-card popular-products">
                    <h3 className="section-title">Топ 5 товаров</h3>
                    <div className="popular-products-list">
                        {stats?.popularProducts?.slice(0, 5).map((product, index) => (
                            <div key={product.id} className="popular-product-item">
                                <div className={`product-rank rank-${index + 1}`}>
                                    {index + 1}
                                </div>
                                <div className="product-image-container">
                                    {product.image ? (
                                        <img src={product.image} alt={product.name} className="product-images" />
                                    ) : (
                                        <div className="no-image">Нет фото</div>
                                    )}
                                </div>
                                <div className="product-details">
                                    <div className="product-name">{product.name}</div>
                                    <div className="product-stats">
                                        <span className="sales">
                                            <span className="stat-icon">🛒</span>
                                            {product.total_quantity} шт.
                                        </span>
                                        <span className="revenue">
                                            <span className="stat-icon">💰</span>
                                            {formatPrice(product.total_revenue)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Последние заказы */}
                <div className="admin-stats-card recent-orders">
                    <h3 className="section-title">Последние заказы</h3>
                    <div className="recent-orders-list">
                        {stats?.recentOrders?.slice(0, 5).map(order => (
                            <div 
                                key={order.id} 
                                className="recent-order-item"
                                onClick={() => fetchOrderDetails(order.id)}
                            >
                                <div className="order-main-info">
                                    <span className="order-id">#{order.id}</span>
                                    <span className="order-customer">{order.customer_name}</span>
                                </div>
                                <div className="order-secondary-info">
                                    <span className="order-amount">{formatPrice(order.total_amount)}</span>
                                    <span className={`order-status ${order.status}`}>
                                        {order.status === 'processing' && 'В обработке'}
                                        {order.status === 'shipped' && 'Отправлен'}
                                        {order.status === 'delivered' && 'Доставлен'}
                                        {order.status === 'cancelled' && 'Отменен'}
                                    </span>
                                    <span className="order-date">{formatDate(order.created_at)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* История заказов */}
            <div className="admin-stats-card orders-history">
                <div className="orders-history-header">
                    <h3 className="section-title">История заказов</h3>
                    <div className="history-pagination">
                        <button 
                            className={`pagination-btn ${historyPage === 1 ? 'disabled' : ''}`}
                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                            disabled={historyPage === 1}
                        >
                            ← Назад
                        </button>
                        <span className="page-info">
                            Страница {historyPage} из {totalHistoryPages}
                        </span>
                        <button 
                            className={`pagination-btn ${historyPage === totalHistoryPages ? 'disabled' : ''}`}
                            onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                            disabled={historyPage === totalHistoryPages}
                        >
                            Вперед →
                        </button>
                    </div>
                </div>
                
                <div className="orders-history-table">
                    <div className="table-header">
                        <div className="header-cell">ID</div>
                        <div className="header-cell">Клиент</div>
                        <div className="header-cell">Сумма</div>
                        <div className="header-cell">Статус</div>
                        <div className="header-cell">Дата</div>
                        <div className="header-cell">Товаров</div>
                    </div>
                    
                    {ordersHistory.length > 0 ? (
                        ordersHistory.map(order => (
                            <div 
                                key={order.id} 
                                className="order-row"
                                onClick={() => fetchOrderDetails(order.id)}
                            >
                                <div className="order-cell order-id">#{order.id}</div>
                                <div className="order-cell order-customer">{order.customer_name}</div>
                                <div className="order-cell order-amount">{formatPrice(order.total_amount)}</div>
                                <div className="order-cell">
                                    <span className={`order-status ${order.status}`}>
                                        {order.status === 'processing' && 'В обработке'}
                                        {order.status === 'shipped' && 'Отправлен'}
                                        {order.status === 'delivered' && 'Доставлен'}
                                        {order.status === 'cancelled' && 'Отменен'}
                                    </span>
                                </div>
                                <div className="order-cell order-date">{formatDate(order.created_at)}</div>
                                <div className="order-cell order-items-count">{order.items_count}</div>
                            </div>
                        ))
                    ) : (
                        <div className="no-orders">
                            Нет заказов в истории
                        </div>
                    )}
                </div>
            </div>
            
            {/* Модальное окно */}
            {showOrderModal && selectedOrder && (
                <OrderModal
                    order={selectedOrder}
                    onClose={() => setShowOrderModal(false)}
                    onStatusUpdate={updateOrderStatus}
                />
            )}
        </div>
    );
}

export default AdminStatsPanel;