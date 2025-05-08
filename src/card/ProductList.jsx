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
    const [showNotification, setShowNotification] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [basket, setBasket] = useState(() => {
        const savedBasket = localStorage.getItem('basket');
        return savedBasket ? JSON.parse(savedBasket) : [];
    });
    const [searchQuery, setSearchQuery] = useState('');

    const {
        currentPage,
        totalPages,
        getCurrentData,
        nextPage,
        prevPage,
        goToPage,
    } = usePagination(filteredProducts, 21);

    const fetchProducts = () => {
        fetch('/api/products')
            .then((res) => res.json())
            .then((data) => {
                setProducts(data);
                setFilteredProducts(data);
            })
            .catch((error) => console.error(t('product_list.load_error'), error));
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        localStorage.setItem('basket', JSON.stringify(basket));
    }, [basket]);

    const handleFiltersChange = (filters) => {
        let filtered = products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(filters.query.toLowerCase());
            const matchesPrice = p.price >= filters.minPrice && p.price <= filters.maxPrice;
            const matchesCategory = !filters.category || p.category_id == filters.category;
            return matchesSearch && matchesPrice && matchesCategory;
        });

        if (filters.priceSort === 'asc') {
            filtered = [...filtered].sort((a, b) => a.price - b.price);
        } else if (filters.priceSort === 'desc') {
            filtered = [...filtered].sort((a, b) => b.price - a.price);
        }

        setFilteredProducts(filtered);
        setSearchQuery(filters.query);
        goToPage(1);
    };

    const handleAddToBasket = (product) => {
        const productInDb = products.find(p => p.name === product.title);
        if (!productInDb || productInDb.quantity <= 0) return;

        setBasket(prevBasket => {
            const existingProduct = prevBasket.find(item => item.title === product.title);

            if (existingProduct) {
                if (existingProduct.quantity >= productInDb.quantity) {
                    alert(t('product_list.max_quantity', { quantity: productInDb.quantity }));
                    return prevBasket;
                }
                return prevBasket.map(item =>
                    item.title === product.title
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prevBasket, {
                ...product,
                id: Date.now(),
                quantity: 1
            }];
        });

        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
    };

    const handleOrderComplete = () => {
        setBasket([]);
        fetchProducts();
    };

    return (
        <div className="product-list-container">
            <div className="product-list-header">
                {searchQuery && <div className="search-query">{t('product_list.search_query', { query: searchQuery })}</div>}
            </div>

            <SearchWithFilters onFiltersChange={handleFiltersChange} />

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
                            onClick={() => handleFiltersChange({
                                query: '',
                                minPrice: 0,
                                maxPrice: 10000,
                                category: '',
                                priceSort: 'none'
                            })}
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
                            addToCartText={t('product_list.add_to_cart')}
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

            <Notification message={t('product_list.item_added')} show={showNotification} />

            {selectedProduct && (
                <ProductModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    onAddToCart={handleAddToBasket}
                    onOrderComplete={handleOrderComplete}
                    addToCartText={t('product_list.add_to_cart')}
                />
            )}
        </div>
    );
}

export default ProductList;