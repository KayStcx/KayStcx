import React, { useEffect, useState } from 'react';
import { useNotifications, Notification } from '../context/NotificationContext';
import { X, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const ToastMessage: React.FC<{ notification: Notification; onClose: () => void }> = ({ notification, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <AlertTriangle className="w-5 h-5 text-red-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
    };

    const colors = {
        success: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
        error: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    };

    return (
        <div className={`flex items-start gap-3 p-4 mb-3 border rounded-lg shadow-lg ${colors[notification.type]} transition-all duration-300`}>
            <div className="flex-shrink-0 mt-0.5">{icons[notification.type]}</div>
            <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{notification.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notification.message}</p>
            </div>
            <button onClick={onClose} className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export default function ToastContainer() {
    const { notifications } = useNotifications();
    const [activeToasts, setActiveToasts] = useState<Notification[]>([]);

    useEffect(() => {
        // Only show unread notifications from the last 10 seconds as toasts on load/receive
        const recentUnread = notifications.filter(
            (n) => !n.isRead && new Date().getTime() - new Date(n.createdAt).getTime() < 10000
        );

        // Simplistic diff to add new ones
        if (recentUnread.length > 0 && activeToasts.length === 0) {
            setActiveToasts(recentUnread.slice(0, 3)); // Show up to 3 toasts max
        } else if (recentUnread.length > activeToasts.length) {
            setActiveToasts(recentUnread.slice(0, 3));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notifications]);

    const removeToast = (id: string) => {
        setActiveToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 max-w-full flex flex-col items-end">
            {activeToasts.map((toast) => (
                <ToastMessage key={toast.id} notification={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}
