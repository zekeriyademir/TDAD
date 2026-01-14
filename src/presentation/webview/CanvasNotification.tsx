/**
 * CanvasNotification - Toast notification component for canvas actions
 *
 * Shows brief, informative notifications when users trigger workflow actions
 * (BDD, Tests, Run, Fix buttons). Auto-dismisses after a short delay.
 */

import React, { useEffect, useState } from 'react';
import '../../styles/canvas-notification.css';

export interface NotificationData {
    id: string;
    message: string;
    subMessage?: string;
    type: 'success' | 'info' | 'warning' | 'error';
}

interface CanvasNotificationProps {
    notification: NotificationData | null;
    onDismiss: () => void;
}

const CanvasNotification: React.FC<CanvasNotificationProps> = ({ notification, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (notification) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onDismiss, 300); // Wait for fade-out animation
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [notification, onDismiss]);

    if (!notification) {
        return null;
    }

    const getIcon = () => {
        switch (notification.type) {
            case 'success': return '✅';
            case 'info': return '📋';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            default: return '📋';
        }
    };

    return (
        <div className={`canvas-notification canvas-notification--${notification.type} ${isVisible ? 'canvas-notification--visible' : ''}`}>
            <span className="canvas-notification__icon">{getIcon()}</span>
            <div className="canvas-notification__content">
                <span className="canvas-notification__message">{notification.message}</span>
                {notification.subMessage && (
                    <span className="canvas-notification__sub-message">{notification.subMessage}</span>
                )}
            </div>
            <button className="canvas-notification__close" onClick={() => {
                setIsVisible(false);
                setTimeout(onDismiss, 300);
            }}>×</button>
        </div>
    );
};

export default CanvasNotification;
