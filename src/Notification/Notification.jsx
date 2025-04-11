import React from 'react';
import './Notification.css'; // подключаем стили

function Notification({ message, show }) {
    return (
        show && (
            <div className={`notification ${show ? 'show' : ''}`}>
                {message}
            </div>
        )
    );
}

export default Notification;