import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import '../index.css';
import './advertising_banner.css';

const Banner = () => {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const timerRef = useRef(null);
  const slideChangeTime = 10000; // 10 секунд

  const slides = [
    {
      title: t('banner.slide1.title'),
      subtitle: t('banner.slide1.subtitle'),
      bgClass: "slide-protein"
    },
    {
      title: t('banner.slide2.title'),
      subtitle: t('banner.slide2.subtitle'),
      bgClass: "slide-belt"
    },
    {
      title: t('banner.slide3.title'),
      subtitle: t('banner.slide3.subtitle'),
      bgClass: "slide-yoga"
    },
    {
      title: t('banner.slide4.title'),
      subtitle: t('banner.slide4.subtitle'),
      bgClass: "slide-gloves"
    },
    {
      title: t('banner.slide5.title'),
      subtitle: t('banner.slide5.subtitle'),
      bgClass: "slide-equipment"
    }
  ];

  // Запуск таймера автоматического переключения
  const startTimer = () => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      goToNextSlide();
    }, slideChangeTime);
  };

  // Очистка таймера
  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Переход к следующему слайду
  const goToNextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % slides.length);
    startTimer();
  };

  // Переход к конкретному слайду
  const goToSlide = (index) => {
    setCurrentSlide(index);
    startTimer();
  };

  // Инициализация таймера при монтировании
  useEffect(() => {
    startTimer();
    return () => clearTimer();
  }, []);

  return (
    <div className="banner-slider">
      <div className="slider-container">
        {slides.map((slide, index) => (
          <div 
            key={index}
            className={`slide ${slide.bgClass} ${index === currentSlide ? 'active' : ''}`}
            aria-hidden={index !== currentSlide}
          >
            <div className="slide-content">
              <h2>{slide.title}</h2>
              <p>{slide.subtitle}</p>
            </div>
            <div className="slide-overlay"></div>
          </div>
        ))}
      </div>
      
      <div className="slider-dots">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentSlide ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Перейти к слайду ${index + 1}: ${slides[index].title}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Banner;