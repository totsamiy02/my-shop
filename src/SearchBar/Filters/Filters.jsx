// src/components/Filters/Filters.jsx
import { useEffect, useState } from 'react';
import './Filters.css';

function Filters({ categories, onFilterChange }) {
    const [selectedCategory, setSelectedCategory] = useState('');
    const [priceRange, setPriceRange] = useState([0, 20000]);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);

    useEffect(() => {
        onFilterChange({
            category: selectedCategory,
            minPrice: priceRange[0],
            maxPrice: priceRange[1]
        });
    }, [selectedCategory, priceRange, onFilterChange]);

    const handlePriceChange = (e, index) => {
        const newPriceRange = [...priceRange];
        newPriceRange[index] = parseInt(e.target.value);
        setPriceRange(newPriceRange);
    };

    return (
        <div className="filters-container">
            <div className="filter-group">
                <button 
                    className="category-filter-button"
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                >
                    {selectedCategory || 'Все категории'}
                    <span className={`arrow ${isCategoryOpen ? 'up' : 'down'}`}></span>
                </button>
                
                {isCategoryOpen && (
                    <div className="category-dropdown">
                        <div 
                            className="category-option"
                            onClick={() => {
                                setSelectedCategory('');
                                setIsCategoryOpen(false);
                            }}
                        >
                            Все категории
                        </div>
                        {categories.map(category => (
                            <div 
                                key={category.id}
                                className="category-option"
                                onClick={() => {
                                    setSelectedCategory(category.id);
                                    setIsCategoryOpen(false);
                                }}
                            >
                                {category.name}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="filter-group price-filter">
                <label>Цена: {priceRange[0]}₽ - {priceRange[1]}₽</label>
                <div className="price-slider-container">
                    <input
                        type="range"
                        min="0"
                        max="20000"
                        value={priceRange[0]}
                        onChange={(e) => handlePriceChange(e, 0)}
                        className="price-slider"
                    />
                    <input
                        type="range"
                        min="0"
                        max="20000"
                        value={priceRange[1]}
                        onChange={(e) => handlePriceChange(e, 1)}
                        className="price-slider"
                    />
                </div>
            </div>
        </div>
    );
}

export default Filters;