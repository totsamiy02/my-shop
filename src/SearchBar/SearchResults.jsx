import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Header from '../header/header';
import Footer from '../footer/footer';
import ProductCard from '../card/ProductCard';
import '../card/ProductCard.css';
import Notification from '../Notification/Notification';
import './SearchResult.css';
import ProductModal from '../card/modal/ProductModal'; // Добавляем импорт модального окна

function SearchResults() {
    const location = useLocation();
    const [products, setProducts] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [basket, setBasket] = useState(() => {
        const savedBasket = localStorage.getItem('basket');
        return savedBasket ? JSON.parse(savedBasket) : [];
    });
    const [showNotification, setShowNotification] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null); // Добавляем состояние для выбранного товара

    const query = new URLSearchParams(location.search).get('query')?.toLowerCase() || '';

    useEffect(() => {
        setIsLoading(true);
        fetch('http://localhost:3001/api/products')
            .then(res => res.json())
            .then(data => {
                setProducts(data);
                setIsLoading(false);
            });
    }, []);

    useEffect(() => {
        const results = products.filter(product =>
            product.name.toLowerCase().includes(query)
        );
        setFiltered(results);
    }, [products, query]);

    useEffect(() => {
        localStorage.setItem('basket', JSON.stringify(basket));
    }, [basket]);

    const handleAddToBasket = (product) => {
        const productInDb = products.find(p => p.name === product.title);
        if (!productInDb || productInDb.quantity <= 0) return;

        const existingProduct = basket.find(item => item.title === product.title);

        if (existingProduct) {
            if (existingProduct.quantity >= productInDb.quantity) {
                alert(`Максимальное количество: ${productInDb.quantity} шт.`);
                return;
            }
            setBasket(basket.map(item =>
                item.title === product.title
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setBasket([...basket, {
                ...product,
                id: Date.now(),
                quantity: 1,
                maxQuantity: productInDb.quantity
            }]);
        }

        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
    };

    // Обработчик клика по карточке товара
    const handleProductClick = (product) => {
        setSelectedProduct(product);
    };

    return (
        <div className="search-results-page">
            <Header />
            <div className="container">
                <div className="search-results-header">
                    <h2 className="search-results-title">Результаты поиска: "{query}"</h2>
                    <p className="search-results-count">{filtered.length} товаров</p>
                </div>
                
                {isLoading ? (
                    <div className="loading-results">
                        <div className="spinner"></div>
                    </div>
                ) : filtered.length > 0 ? (
                    <div className="products-grid">
                        {filtered.map(product => (
                            <ProductCard
                                key={product.id}
                                id={product.id}
                                image={product.image}
                                title={product.name}
                                price={product.price}
                                quantity={product.quantity}
                                handleAddToBasket={handleAddToBasket}
                                onCardClick={() => handleProductClick(product)} // Передаем обработчик клика
                            />
                        ))}
                    </div>
                ) : (
                    <div className="no-results-container">
                        <div className="no-results-image">
                            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#FF6B00">
                                <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
                                <path d="M18 6L6 18" strokeWidth="1.5"/>
                                <path d="M6 6l12 12" strokeWidth="1.5"/>
                            </svg>
                        </div>
                        <h3 className="no-results-title">Ничего не найдено</h3>
                        <p className="no-results-text">Попробуйте изменить запрос или посмотрите другие товары</p>
                        <button 
                            className="no-results-button"
                            onClick={() => window.location.href = '/'}
                        >
                            Вернуться в каталог
                        </button>
                    </div>
                )}

                {showNotification && (
                    <Notification message="Товар добавлен в корзину!" show={showNotification} />
                )}

                {/* Добавляем модальное окно */}
                {selectedProduct && (
                    <ProductModal
                        product={selectedProduct}
                        onClose={() => setSelectedProduct(null)}
                        handleAddToBasket={handleAddToBasket}
                    />
                )}
            </div>
            <Footer />
        </div>
    );
}

export default SearchResults;