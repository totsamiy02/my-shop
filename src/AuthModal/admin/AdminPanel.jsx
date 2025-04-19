import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../header/header.jsx';
import Footer from '../../footer/footer.jsx';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ConfirmationModal from '../../Notification/ConfirmationModal.jsx';
import './AdminPanel.css';

function AdminPanel() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('add');
    const [editingProduct, setEditingProduct] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    
    const [productForm, setProductForm] = useState({
        name: '',
        price: '',
        description: '',
        quantity: '',
        brand: 'Noname',
        weight: 'N/A',
        category_id: '',
        image: null
    });
    const [previewImage, setPreviewImage] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                
                const [productsResponse, categoriesResponse] = await Promise.all([
                    fetch('/api/admin/products', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch('/api/admin/categories', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);
                
                if (!productsResponse.ok) throw new Error('Ошибка загрузки товаров');
                if (!categoriesResponse.ok) throw new Error('Ошибка загрузки категорий');
                
                const productsData = await productsResponse.json();
                const categoriesData = await categoriesResponse.json();
                
                setProducts(productsData);
                setCategories(categoriesData);
                setLoading(false);
            } catch (error) {
                toast.error(error.message);
                setLoading(false);
            }
        };
        
        fetchData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProductForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProductForm(prev => ({
                ...prev,
                image: file
            }));
            
            const reader = new FileReader();
            reader.onload = (event) => {
                setPreviewImage(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!productForm.name || !productForm.price) {
            toast.error('Пожалуйста, заполните обязательные поля (Название и Цена)');
            return;
        }
        
        setShowSaveModal(true);
    };

    const confirmSave = async () => {
        setShowSaveModal(false);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            
            Object.entries(productForm).forEach(([key, value]) => {
                if (value !== null && value !== '') {
                    formData.append(key, value);
                }
            });
            
            let response;
            if (editingProduct) {
                response = await fetch(`/api/admin/products/${editingProduct.id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
            } else {
                response = await fetch('/api/admin/products', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка при сохранении товара');
            }
            
            const savedProduct = await response.json();
            
            if (editingProduct) {
                setProducts(prev => prev.map(p => 
                    p.id === savedProduct.id ? savedProduct : p
                ));
                toast.success('Товар успешно обновлен!');
            } else {
                setProducts(prev => [savedProduct, ...prev]);
                toast.success('Товар успешно добавлен!');
            }
            
            resetForm();
        } catch (error) {
            toast.error(error.message);
            console.error('Ошибка:', error);
        }
    };

    const resetForm = () => {
        setProductForm({
            name: '',
            price: '',
            description: '',
            quantity: '',
            brand: 'Noname',
            weight: 'N/A',
            category_id: '',
            image: null
        });
        setPreviewImage(null);
        setEditingProduct(null);
        setActiveTab('add');
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setProductForm({
            name: product.name,
            price: product.price,
            description: product.description || '',
            quantity: product.quantity || '',
            brand: product.brand || 'Noname',
            weight: product.weight || 'N/A',
            category_id: product.category_id || '',
            image: null
        });
        setPreviewImage(product.image || null);
        setActiveTab('add');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteClick = (productId) => {
        setProductToDelete(productId);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        setShowDeleteModal(false);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/products/${productToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка при удалении товара');
            }
            
            setProducts(prev => prev.filter(p => p.id !== productToDelete));
            toast.success('Товар успешно удален!');
        } catch (error) {
            toast.error(error.message);
            console.error('Ошибка:', error);
        }
    };

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="admin-spinner"></div>
                <p>Загрузка данных...</p>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <Header />
            
            <main className="admin-container">
                <div className="admin-header">
                    <h1>Панель администратора</h1>
                    <div className="admin-tabs">
                        <button 
                            className={`admin-tab ${activeTab === 'add' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab('add');
                                if (editingProduct) resetForm();
                            }}
                        >
                            {editingProduct ? 'Редактирование товара' : 'Добавить товар'}
                        </button>
                        <button 
                            className={`admin-tab ${activeTab === 'list' ? 'active' : ''}`}
                            onClick={() => setActiveTab('list')}
                        >
                            Список товаров
                        </button>
                    </div>
                </div>
                
                <div className="admin-content">
                    {activeTab === 'add' && (
                        <form onSubmit={handleSubmit} className="admin-product-form">
                            <div className="admin-form-section">
                                <h2>Основная информация</h2>
                                
                                <div className="admin-form-group">
                                    <label htmlFor="name">Название товара *</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={productForm.name}
                                        onChange={handleInputChange}
                                        placeholder="Введите название товара"
                                        required
                                    />
                                    <span className="admin-form-hint">Минимум 3 символа, максимум 100</span>
                                </div>
                                
                                <div className="admin-form-group">
                                    <label htmlFor="price">Цена *</label>
                                    <input
                                        type="number"
                                        id="price"
                                        name="price"
                                        value={productForm.price}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                    <span className="admin-form-hint">Цена в рублях</span>
                                </div>
                                
                                <div className="admin-form-group">
                                    <label htmlFor="description">Описание товара</label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={productForm.description}
                                        onChange={handleInputChange}
                                        placeholder="Подробное описание товара"
                                        rows="4"
                                    />
                                </div>
                                
                                <div className="admin-form-row">
                                    <div className="admin-form-group">
                                        <label htmlFor="quantity">Количество</label>
                                        <input
                                            type="number"
                                            id="quantity"
                                            name="quantity"
                                            value={productForm.quantity}
                                            onChange={handleInputChange}
                                            placeholder="0"
                                            min="0"
                                        />
                                    </div>
                                    
                                    <div className="admin-form-group">
                                        <label htmlFor="brand">Бренд</label>
                                        <input
                                            type="text"
                                            id="brand"
                                            name="brand"
                                            value={productForm.brand}
                                            onChange={handleInputChange}
                                            placeholder="Noname"
                                        />
                                    </div>
                                </div>
                                
                                <div className="admin-form-row">
                                    <div className="admin-form-group">
                                        <label htmlFor="weight">Вес</label>
                                        <input
                                            type="text"
                                            id="weight"
                                            name="weight"
                                            value={productForm.weight}
                                            onChange={handleInputChange}
                                            placeholder="N/A"
                                        />
                                    </div>
                                    
                                    <div className="admin-form-group">
                                        <label htmlFor="category_id">Категория</label>
                                        <select
                                            id="category_id"
                                            name="category_id"
                                            value={productForm.category_id}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">-- Выберите категорию --</option>
                                            {categories.map(category => (
                                                <option key={category.id} value={category.id}>
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="admin-form-section">
                                <h2>Изображение товара</h2>
                                
                                <div className="admin-image-upload-container">
                                    {previewImage ? (
                                        <div className="admin-image-preview">
                                            <img 
                                                src={previewImage} 
                                                alt="Превью товара" 
                                                className="admin-product-image-preview"
                                            />
                                            <button 
                                                type="button"
                                                className="admin-change-image-button"
                                                onClick={() => {
                                                    setPreviewImage(null);
                                                    setProductForm(prev => ({ ...prev, image: null }));
                                                }}
                                            >
                                                Удалить изображение
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="admin-image-upload">
                                            <label htmlFor="image-upload" className="admin-upload-label">
                                                <div className="admin-upload-icon">+</div>
                                                <div className="admin-upload-text">Загрузить изображение</div>
                                                <input
                                                    type="file"
                                                    id="image-upload"
                                                    name="image"
                                                    accept="image/*"
                                                    onChange={handleImageChange}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="admin-form-actions">
                                <button 
                                    type="button"
                                    className="admin-cancel-button"
                                    onClick={resetForm}
                                >
                                    Отмена
                                </button>
                                <button 
                                    type="submit"
                                    className="admin-submit-button"
                                    disabled={!productForm.name || !productForm.price}
                                >
                                    {editingProduct ? 'Сохранить изменения' : 'Добавить товар'}
                                </button>
                            </div>
                        </form>
                    )}
                    
                    {activeTab === 'list' && (
                        <div className="admin-products-list">
                            <h2>Список товаров ({products.length})</h2>
                            {products.length === 0 ? (
                                <p className="admin-no-products">Нет добавленных товаров</p>
                            ) : (
                                <div className="admin-products-grid">
                                    {products.map(product => (
                                        <div key={product.id} className="admin-product-card">
                                            <div className="admin-product-image-container">
                                                {product.image ? (
                                                    <img 
                                                        src={product.image} 
                                                        alt={product.name}
                                                        className="admin-product-image"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = '/img/no-image.png';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="admin-no-image">Нет изображения</div>
                                                )}
                                            </div>
                                            <div className="admin-product-info">
                                                <h3 className="admin-product-name">{product.name}</h3>
                                                <p className="admin-product-price">{product.price} ₽</p>
                                                <p className="admin-product-brand">Бренд: {product.brand}</p>
                                                <p className="admin-product-quantity">На складе: {product.quantity || 0} шт.</p>
                                                {product.category_name && (
                                                    <p className="admin-product-category">Категория: {product.category_name}</p>
                                                )}
                                            </div>
                                            <div className="admin-product-actions">
                                                <button 
                                                    className="admin-edit-button"
                                                    onClick={() => handleEditProduct(product)}
                                                >
                                                    Редактировать
                                                </button>
                                                <button 
                                                    className="admin-delete-button"
                                                    onClick={() => handleDeleteClick(product.id)}
                                                >
                                                    Удалить
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
            
            <Footer />

            {/* Модальное окно подтверждения удаления */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Подтверждение удаления"
                message="Вы уверены, что хотите удалить этот товар? Это действие нельзя отменить."
                confirmText="Удалить"
            />
            
            {/* Модальное окно подтверждения сохранения */}
            <ConfirmationModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onConfirm={confirmSave}
                title={editingProduct ? "Подтверждение изменений" : "Подтверждение добавления"}
                message={editingProduct 
                    ? "Вы уверены, что хотите сохранить изменения товара?" 
                    : "Вы уверены, что хотите добавить новый товар?"}
                confirmText={editingProduct ? "Сохранить" : "Добавить"}
            />
        </div>
    );
}

export default AdminPanel;