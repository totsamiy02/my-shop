import React from 'react';
import './Notification.css';

function Notification({ message, show }) {
    return (
        <div className={`notification ${show ? 'show' : ''}`}>
            <div className="notification-content">
                <div className="notification-icon">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                    </svg>
                </div>
                <div className="notification-text">{message}</div>
            </div>
        </div>
    );
}

export default Notification;