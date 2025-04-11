import '../index.css';
import './advertising_banner.css';
// import bannerImage from '../img/banner-image.jpg'; // Добавьте свое изображение

function Banner() {
    return (
        <div className="container banner">
            <div className="content">
                <div className="text">
                    <h1>Спортивные товары</h1>
                    <p>Лучшее качество по доступным ценам</p>
                </div>
                <div className="image-container">
                    <div className="image"></div>
                </div>
            </div>
        </div>
    );
}

export default Banner;