import { useState, useEffect, useRef } from 'react';
import './SearchWithFilters.css';

function SearchWithFilters({ onFiltersChange }) {
    const [query, setQuery] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [priceRange, setPriceRange] = useState([0, 10000]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categories, setCategories] = useState([]);
    const [priceSort, setPriceSort] = useState('asc');
    const inputRef = useRef(null);

    useEffect(() => {
        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        setSearchHistory(history);

        fetch('/api/categories')
            .then(res => res.json())
            .then(data => setCategories(data))
            .catch(err => console.error('Ошибка загрузки категорий:', err));
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            applyFilters({
                query,
                minPrice: priceRange[0],
                maxPrice: priceRange[1],
                category: selectedCategory,
                priceSort
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [query, priceRange, selectedCategory, priceSort]);

    const applyFilters = (filters) => {
        if (onFiltersChange) {
            onFiltersChange(filters);
        }
    };

    const togglePriceSort = () => {
        setPriceSort(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    const handleSearch = () => {
        const trimmedQuery = query.trim();
        if (trimmedQuery) {
            const updatedHistory = [trimmedQuery, ...searchHistory.filter(item => item !== trimmedQuery)].slice(0, 5);
            setSearchHistory(updatedHistory);
            localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
            setShowHistory(false);
        }
    };

    const handleFilterApply = () => {
        applyFilters({
            query,
            minPrice: priceRange[0],
            maxPrice: priceRange[1],
            category: selectedCategory,
            priceSort
        });
        setFiltersVisible(false);
    };

    const resetAllFilters = () => {
        setPriceRange([0, 10000]);
        setSelectedCategory('');
        setPriceSort('asc');
        setQuery('');
        applyFilters({
            query: '',
            minPrice: 0,
            maxPrice: 10000,
            category: '',
            priceSort: 'asc'
        });
    };

    const resetSearch = () => {
        setQuery('');
        applyFilters({
            query: '',
            minPrice: priceRange[0],
            maxPrice: priceRange[1],
            category: selectedCategory,
            priceSort
        });
    };

    const handleMinPriceChange = (e) => {
        const value = e.target.value;
        if (value === '' || /^[0-9]+$/.test(value)) {
            const numValue = value === '' ? '' : Math.min(10000, parseInt(value, 10));
            setPriceRange([numValue, priceRange[1]]);
        }
    };

    const handleMaxPriceChange = (e) => {
        const value = e.target.value;
        if (value === '' || /^[0-9]+$/.test(value)) {
            const numValue = value === '' ? '' : Math.min(10000, parseInt(value, 10));
            setPriceRange([priceRange[0], numValue]);
        }
    };

    const handlePriceBlur = (isMin) => {
        setPriceRange(prev => {
            const min = prev[0] === '' ? 0 : prev[0];
            const max = prev[1] === '' ? 10000 : prev[1];
            return [min, max];
        });
    };

    return (
        <div className="search-with-filters">
            <div className="search-bar">
                <div className="search-input-container">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Найти товар..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => !filtersVisible && setShowHistory(true)}
                        onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                    />
                    {query && (
                        <button 
                            className="clear-search-button"
                            onClick={resetSearch}
                            aria-label="Очистить поиск"
                        >
                            ×
                        </button>
                    )}
                </div>
                <button 
                    className="filter-toggle"
                    onClick={() => {
                        setFiltersVisible(!filtersVisible);
                        setShowHistory(false);
                    }}
                    aria-label="Фильтры"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M4 21V14" />
                        <path d="M4 10V3" />
                        <path d="M12 21V12" />
                        <path d="M12 8V3" />
                        <path d="M20 21V16" />
                        <path d="M20 12V3" />
                        <path d="M1 14h6" />
                        <path d="M9 8h6" />
                        <path d="M17 16h6" />
                    </svg>
                    {filtersVisible ? 'Скрыть' : 'Фильтры'}
                </button>
            </div>

            {filtersVisible && (
                <div className="filters-dropdown">
                    <div className="price-filter">
                        <label>Цена, ₽</label>
                        <div className="range-inputs">
                            <input
                                type="text"
                                value={priceRange[0] === '' ? '' : priceRange[0]}
                                onChange={handleMinPriceChange}
                                onBlur={() => handlePriceBlur(true)}
                                min="0"
                                max="10000"
                                aria-label="Минимальная цена"
                                inputMode="numeric"
                                placeholder="0"
                            />
                            <span>-</span>
                            <input
                                type="text"
                                value={priceRange[1] === '' ? '' : priceRange[1]}
                                onChange={handleMaxPriceChange}
                                onBlur={() => handlePriceBlur(false)}
                                min="0"
                                max="10000"
                                aria-label="Максимальная цена"
                                inputMode="numeric"
                                placeholder="10000"
                            />
                            <button 
                                className="compact-sort-button"
                                onClick={togglePriceSort}
                                aria-label={priceSort === 'asc' ? 'Сортировка по возрастанию' : 'Сортировка по убыванию'}
                                title={priceSort === 'asc' ? 'По возрастанию' : 'По убыванию'}
                            >
                                {priceSort === 'asc' ? '↑' : '↓'}
                            </button>
                        </div>
                    </div>

                    <div className="category-filter">
                        <label>Категория</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            aria-label="Выберите категорию"
                        >
                            <option value="">Все категории</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-actions">
                        <button className="reset-button" onClick={resetAllFilters}>
                            Сбросить всё
                        </button>
                        <button className="apply-button" onClick={handleFilterApply}>
                            Применить фильтры
                        </button>
                    </div>
                </div>
            )}

            {showHistory && !filtersVisible && searchHistory.length > 0 && (
                <div className="search-history">
                    <div className="history-header">
                        <span>История поиска</span>
                        <button 
                            onClick={() => {
                                localStorage.removeItem('searchHistory');
                                setSearchHistory([]);
                            }}
                            aria-label="Очистить историю"
                        >
                            Очистить
                        </button>
                    </div>
                    {searchHistory.map((item, i) => (
                        <div 
                            key={i} 
                            onClick={() => { 
                                setQuery(item); 
                                inputRef.current.focus();
                            }}
                            className="history-item"
                        >
                            {item}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SearchWithFilters;