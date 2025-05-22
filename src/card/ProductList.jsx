import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProductCard from './ProductCard';
import Notification from '../Notification/Notification';
import ProductModal from '../card/modal/ProductModal';
import usePagination from '../hook/usePagination';
import SearchWithFilters from '../SearchBar/SearchWithFilters';
import '../card/ProductCard.css';

function ProductList() {
    const { t } = useTranslation();
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationProductName, setNotificationProductName] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [basket, setBasket] = useState(() => {
        const savedBasket = localStorage.getItem('basket');
        return savedBasket ? JSON.parse(savedBasket) : [];
    });
    const [initialLoad, setInitialLoad] = useState(true);

    const {
        currentPage,
        totalPages,
        getCurrentData,
        nextPage,
        prevPage,
        goToPage,
    } = usePagination(filteredProducts, 21);

    const fetchProducts = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error(t('product_list.load_error'));
            }
            const data = await response.json();
            setProducts(data);
            setFilteredProducts(data); // Устанавливаем данные без фильтрации
            setInitialLoad(false); // Помечаем что первоначальная загрузка завершена
        } catch (error) {
            console.error(error);
            setError(error.message);
            setFilteredProducts([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        if (!initialLoad && products.length > 0) {
            localStorage.setItem('basket', JSON.stringify(basket));
        }
    }, [basket, initialLoad]);

    const handleFiltersChange = (filters) => {
        if (initialLoad) return; // Не применяем фильтры пока идет первоначальная загрузка

        let filtered = [...products]; // Создаем копию всех товаров
        
        // Применяем фильтры только если они заданы
        if (filters.query) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(filters.query.toLowerCase())
            );
        }

        filtered = filtered.filter(p => 
            p.price >= filters.minPrice && p.price <= filters.maxPrice
        );

        if (filters.category) {
            filtered = filtered.filter(p => p.category_id == filters.category);
        }

        // Сортировка применяется только если явно выбрана
        if (filters.priceSort === 'asc') {
            filtered.sort((a, b) => a.price - b.price);
        } else if (filters.priceSort === 'desc') {
            filtered.sort((a, b) => b.price - a.price);
        }

        setFilteredProducts(filtered);
        goToPage(1);
    };

    // Остальные методы остаются без изменений
    const handleAddToBasket = (product) => {
        const productInDb = products.find(p => p.id === product.id);
        if (!productInDb || productInDb.quantity <= 0) return;

        setBasket(prevBasket => {
            const existingProduct = prevBasket.find(item => item.id === product.id);

            if (existingProduct) {
                if (existingProduct.quantity >= productInDb.quantity) {
                    alert(t('product_list.max_quantity', { quantity: productInDb.quantity }));
                    return prevBasket;
                }
                return prevBasket.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prevBasket, {
                ...product,
                quantity: 1,
                maxQuantity: productInDb.quantity
            }];
        });

        setNotificationProductName(product.name || product.title);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
    };

    const handleOrderComplete = () => {
        setBasket([]);
        fetchProducts();
    };

    return (
        <div className="product-list-container">
            <SearchWithFilters 
                onFiltersChange={handleFiltersChange} 
                disabled={initialLoad || isLoading}
            />

            {isLoading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>{t('product_list.loading')}</p>
                </div>
            ) : error ? (
                <div className="error-message">
                    <p>{error}</p>
                    <button 
                        onClick={fetchProducts}
                        className="retry-button"
                    >
                        {t('product_list.retry')}
                    </button>
                </div>
            ) : (
                <>
                    <div className="product-grid">
                        {filteredProducts.length === 0 ? (
                            <div className="no-products">
                                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#FF6B00">
                                    <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                                    <path d="M18 6L6 18" strokeWidth="1.5" />
                                    <path d="M6 6l12 12" strokeWidth="1.5" />
                                </svg>
                                <p>{t('product_list.no_products')}</p>
                                <button
                                    onClick={() => {
                                        setFilteredProducts(products);
                                        goToPage(1);
                                    }}
                                    className="reset-filters-button"
                                >
                                    {t('product_list.reset_filters')}
                                </button>
                            </div>
                        ) : (
                            getCurrentData().map((product) => (
                                <ProductCard
                                    key={product.id}
                                    id={product.id}
                                    image={product.image}
                                    title={product.name}
                                    price={product.price}
                                    quantity={product.quantity}
                                    handleAddToBasket={handleAddToBasket}
                                    onCardClick={() => setSelectedProduct(product)}
                                />
                            ))
                        )}
                    </div>

                    {filteredProducts.length > 21 && (
                        <div className="pagination-controls">
                            <button onClick={prevPage} disabled={currentPage === 1}>
                                {t('product_list.previous')}
                            </button>
                            <span>
                                {t('product_list.page')} {currentPage} {t('product_list.of')} {totalPages}
                            </span>
                            <button onClick={nextPage} disabled={currentPage === totalPages}>
                                {t('product_list.next')}
                            </button>
                        </div>
                    )}
                </>
            )}

            <Notification 
                message={`Товар "${notificationProductName}" добавлен в корзину`} 
                show={showNotification} 
            />

            {selectedProduct && (
                <ProductModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    onAddToCart={handleAddToBasket}
                />
            )}
        </div>
    );
}

export default ProductList;