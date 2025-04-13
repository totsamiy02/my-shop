import '../index.css';
import ProductCard from './ProductCard';
import { useEffect, useState } from 'react';
import Notification from '../Notification/Notification';
import ProductModal from '../card/modal/ProductModal';
import usePagination from '../hook/usePagination';
import ProductFilters from '../SearchBar/Filters/Filters';

function ProductList() {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [showNotification, setShowNotification] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [basket, setBasket] = useState(() => {
        const savedBasket = localStorage.getItem('basket');
        return savedBasket ? JSON.parse(savedBasket) : [];
    });
    const [filters, setFilters] = useState({
        minPrice: 0,
        maxPrice: 10000,
        category: ''
    });

    const {
        currentPage,
        totalPages,
        getCurrentData,
        nextPage,
        prevPage,
        goToPage,
    } = usePagination(filteredProducts.length > 0 ? filteredProducts : products, 21);

    useEffect(() => {
        fetch('/api/products')
            .then((res) => res.json())
            .then((data) => {
                setProducts(data);
                setFilteredProducts(data);
            })
            .catch((error) => console.error('Ошибка при загрузке товаров:', error));
    }, []);

    useEffect(() => {
        localStorage.setItem('basket', JSON.stringify(basket));
    }, [basket]);

    const handleAddToBasket = (product) => {
        const productInDb = products.find(p => p.name === product.title);
        if (!productInDb || productInDb.quantity <= 0) return;
    
        const existingProduct = basket.find(item => item.title === product.title);
        
        if (existingProduct) {
            if (existingProduct.quantity >= product.availableQuantity) {
                alert(`Максимальное количество: ${product.availableQuantity} шт.`);
                return;
            }
            setBasket(basket.map(item => 
                item.title === product.title 
                ? { 
                    ...item, 
                    quantity: item.quantity + 1,
                    maxQuantity: product.availableQuantity
                } 
                : item
            ));
        } else {
            setBasket([...basket, { 
                ...product, 
                id: Date.now(),
                quantity: 1,
                maxQuantity: product.availableQuantity
            }]);
        }
    
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
    };

    const handleProductClick = (product) => {
        setSelectedProduct(product);
    };

    const handleFilterApply = (newFilters) => {
        console.log("Фильтруем товары по:", newFilters);
    
        setFilters(newFilters);
        const filtered = products.filter(product => {
            const priceMatch = product.price >= newFilters.minPrice && product.price <= newFilters.maxPrice;
            const categoryMatch = !newFilters.category || product.category_id === parseInt(newFilters.category);
            return priceMatch && categoryMatch;
        });
        setFilteredProducts(filtered);
    };

    return (
        <div className="container">
            <div className="container_all">
                <h2 className="category-heading">Спортивное питание</h2>
                
                <ProductFilters onFilterApply={handleFilterApply} />
                
                <div className="product-grid">
                    {filteredProducts.length === 0 ? (
                        <div className="no-products-message">
                            Товары не найдены по заданным фильтрам. Попробуйте изменить параметры фильтрации.
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
                                onCardClick={() => handleProductClick(product)}
                            />
                        ))
                    )}
                </div>
                
                {/* Блок пагинации */}
                <div className="pagination">
                    <button 
                        onClick={prevPage} 
                        disabled={currentPage === 1}
                    >
                        Назад
                    </button>
                    
                    <span>Страница {currentPage} из {totalPages}</span>
                    
                    <button 
                        onClick={nextPage} 
                        disabled={currentPage === totalPages}
                    >
                        Вперед
                    </button>
                </div>
                
                {showNotification && (
                    <Notification message="Товар добавлен в корзину!" show={showNotification} />
                )}
                
                {selectedProduct && (
                    <ProductModal
                        product={selectedProduct}
                        onClose={() => setSelectedProduct(null)}
                        handleAddToBasket={handleAddToBasket}
                    />
                )}
            </div>
        </div>
    );
}

export default ProductList;
