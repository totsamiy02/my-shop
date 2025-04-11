import '../index.css';
import ProductCard from './ProductCard';
import { useEffect, useState } from 'react';
import Notification from '../Notification/Notification';
import ProductModal from '../card/modal/ProductModal';

function ProductList() {
    const [products, setProducts] = useState([]);
    const [showNotification, setShowNotification] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [basket, setBasket] = useState(() => {
        const savedBasket = localStorage.getItem('basket');
        return savedBasket ? JSON.parse(savedBasket) : [];
    });

    useEffect(() => {
        fetch('http://localhost:3001/api/products')
            .then((res) => res.json())
            .then((data) => setProducts(data))
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

    const handleProductClick = (product) => {
        setSelectedProduct(product);
    };

    return (
        <div className="container">
            <div className="container_all">
                <h2 className="category-heading">Спортивное питание</h2>
                <div className="product-grid">
                    {products.map((product) => (
                        <ProductCard
                            key={product.id}
                            id={product.id} // Убедитесь в уникальности
                            image={product.image}
                            title={product.name}
                            price={product.price}
                            quantity={product.quantity}
                            handleAddToBasket={handleAddToBasket}
                            onCardClick={() => handleProductClick(product)}
                        />
                    ))}
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