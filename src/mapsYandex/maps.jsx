import React, { useEffect } from 'react';
import './maps.css';

function Map() {
  useEffect(() => {
    if (!window.ymaps) return; // Если API ещё не загружено

    let map; // Переменная для хранения экземпляра карты

    window.ymaps.ready(() => {
      // Если карта уже существует — удаляем её
      if (window.myMap) {
        window.myMap.destroy();
      }

      // Создаём новую карту
      map = new window.ymaps.Map('map', {
        center: [48.0027, 37.8052],
        zoom: 14,
        controls: ['zoomControl'],
      });

      const placemark = new window.ymaps.Placemark([48.0027, 37.8052], {
        balloonContent: 'Офис компании',
      });

      map.geoObjects.add(placemark);
      window.myMap = map; // Сохраняем ссылку на карту в глобальной области
    });

    // Очистка при размонтировании компонента
    return () => {
      if (map) {
        map.destroy(); // Уничтожаем карту при удалении компонента
        delete window.myMap;
      }
    };
  }, []);

  return <div id="map" className="map-container" />;
}

export default Map;