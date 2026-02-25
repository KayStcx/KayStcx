import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export type NotificationType = 'info' | 'success' | 'error';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

interface NotificationContextProps {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within NotificationProvider');
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [socket, setSocket] = useState<Socket | null>(null);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            // Ensure your backend runs on port 3001 or correct the URL
            const response = await fetch('http://localhost:3001/notifications', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        fetchNotifications();

        const newSocket = io('http://localhost:3001', {
            auth: { token },
        });

        newSocket.on('newNotification', (notification: Notification) => {
            setNotifications((prev) => [notification, ...prev]);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const markAsRead = async (id: string) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`http://localhost:3001/notifications/${id}/read`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
            );
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`http://localhost:3001/notifications/read-all`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return (
        <NotificationContext.Provider
            value={{ notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications }}
        >
            {children}
        </NotificationContext.Provider>
    );
};
