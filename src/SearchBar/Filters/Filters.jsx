import { useEffect, useState } from 'react';
import './Filters.css';

function ProductFilters({ onFilterApply }) {
    const [categories, setCategories] = useState([]);
    const [priceRange, setPriceRange] = useState([0, 10000]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filtersVisible, setFiltersVisible] = useState(false);

    // Загрузка категорий
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('/api/categories');
                if (!response.ok) throw new Error('Ошибка загрузки');
                const data = await response.json();
                setCategories(data);
            } catch (err) {
                console.error('Ошибка:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategories();
    }, []);

    const handlePriceChange = (e, index) => {
        const value = Math.min(10000, Math.max(0, parseInt(e.target.value) || 0));
        const newPriceRange = [...priceRange];
        newPriceRange[index] = value;
        setPriceRange(newPriceRange);
    };

    const handleApplyFilters = () => {
        onFilterApply({
            minPrice: priceRange[0],
            maxPrice: priceRange[1],
            category: selectedCategory
        });
        setFiltersVisible(false); // Закрываем фильтры после применения
    };

    const resetFilters = () => {
        setPriceRange([0, 10000]);
        setSelectedCategory('');
        onFilterApply({
            minPrice: 0,
            maxPrice: 10000,
            category: ''
        });
        setFiltersVisible(false); // Закрываем фильтры после сброса
    };

    return (
        <div className="filters-dropdown">
            <button 
                className="filters-toggle-button"
                onClick={() => setFiltersVisible(!filtersVisible)}
                aria-expanded={filtersVisible}
            >
                Фильтры
                <span className={`toggle-icon ${filtersVisible ? 'open' : ''}`}>
                    {filtersVisible ? '▲' : '▼'}
                </span>
            </button>

            <div className={`filters-panel ${filtersVisible ? 'visible' : ''}`}>
                <div className="filters-header">
                    <h3>Фильтры товаров</h3>
                    <button 
                        className="close-filters"
                        onClick={() => setFiltersVisible(false)}
                        aria-label="Закрыть фильтры"
                    >
                        ×
                    </button>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Цена, ₽</label>
                    <div className="price-sliders">
                        <input
                            type="range"
                            min="0"
                            max="10000"
                            step="100"
                            value={priceRange[0]}
                            onChange={(e) => handlePriceChange(e, 0)}
                            className="price-slider"
                            aria-label="Минимальная цена"
                        />
                        <input
                            type="range"
                            min="0"
                            max="10000"
                            step="100"
                            value={priceRange[1]}
                            onChange={(e) => handlePriceChange(e, 1)}
                            className="price-slider"
                            aria-label="Максимальная цена"
                        />
                    </div>
                    <div className="price-inputs">
                        <div className="price-input-group">
                            <span>От</span>
                            <input
                                type="number"
                                min="0"
                                max="10000"
                                value={priceRange[0]}
                                onChange={(e) => handlePriceChange(e, 0)}
                            />
                        </div>
                        <div className="price-input-group">
                            <span>До</span>
                            <input
                                type="number"
                                min="0"
                                max="10000"
                                value={priceRange[1]}
                                onChange={(e) => handlePriceChange(e, 1)}
                            />
                        </div>
                    </div>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Категория</label>
                    {isLoading ? (
                        <div className="category-loader">Загрузка...</div>
                    ) : error ? (
                        <div className="category-error">{error}</div>
                    ) : (
                        <div className="custom-select">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                aria-label="Выберите категорию"
                            >
                                <option value="">Все категории</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                            <span className="select-arrow">▼</span>
                        </div>
                    )}
                </div>

                <div className="filter-actions">
                    <button 
                        className="apply-button"
                        onClick={handleApplyFilters}
                        disabled={isLoading}
                    >
                        Применить
                    </button>
                    <button 
                        className="reset-button"
                        onClick={resetFilters}
                    >
                        Сбросить
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ProductFilters;