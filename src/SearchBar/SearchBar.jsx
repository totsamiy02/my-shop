import './SearchBar.css';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function SearchBar() {
    const [query, setQuery] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Загружаем историю при монтировании
    useEffect(() => {
        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        setSearchHistory(history);
    }, []);

    const handleSearch = () => {
        const trimmedQuery = query.trim();
        if (trimmedQuery) {
            // Обновляем историю
            const updatedHistory = [trimmedQuery, ...searchHistory.filter(item => item !== trimmedQuery)].slice(0, 5);
            setSearchHistory(updatedHistory);
            localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
            
            navigate(`/search?query=${encodeURIComponent(trimmedQuery)}`);
            setQuery('');
            setShowHistory(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const clearSearch = () => {
        setQuery('');
        inputRef.current.focus();
    };

    const selectFromHistory = (item) => {
        setQuery(item);
        inputRef.current.focus();
        setShowHistory(false);
    };

    const clearHistory = () => {
        localStorage.removeItem('searchHistory');
        setSearchHistory([]);
    };

    return (
        <div className="search-container">
            <div className="search-bar" onFocus={() => setShowHistory(true)} onBlur={() => setTimeout(() => setShowHistory(false), 200)}>
                <svg 
                    className="search-icon" 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                </svg>
                
                <input 
                    ref={inputRef}
                    type="text"
                    placeholder="Найти товар"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="search-input"
                    aria-label="Поиск товаров"
                />
                
                {query && (
                    <button 
                        className="clear-button"
                        onClick={clearSearch}
                        aria-label="Очистить поиск"
                    >
                        <svg 
                            width="18" 
                            height="18" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2"
                        >
                            <path d="M18 6L6 18" />
                            <path d="M6 6l12 12" />
                        </svg>
                    </button>
                )}
                
                <button 
                    className="search-button"
                    onClick={handleSearch}
                    disabled={!query.trim()}
                    aria-label="Выполнить поиск"
                >
                    Поиск
                </button>
            </div>

            {showHistory && searchHistory.length > 0 && (
                <div className="search-history-dropdown">
                    <div className="search-history-header">
                        <span>Недавние запросы</span>
                        <button onClick={clearHistory} className="clear-history-button">
                            Очистить
                        </button>
                    </div>
                    <ul className="search-history-list">
                        {searchHistory.map((item, index) => (
                            <li 
                                key={index} 
                                onClick={() => selectFromHistory(item)}
                                className={query === item ? 'selected' : ''}
                            >
                                <svg 
                                    width="16" 
                                    height="16" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2"
                                >
                                    <path d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
                                </svg>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default SearchBar;