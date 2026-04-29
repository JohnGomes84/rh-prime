import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'approval' | 'alert' | 'info' | 'error';
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: number;
  read?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (!userId) return;

    // Conectar ao WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws?userId=${userId}`;
    
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);
    };

    websocket.onmessage = (event) => {
      try {
        const notification: Notification = JSON.parse(event.data);
        notification.id = `${notification.timestamp}-${Math.random()}`;
        notification.read = false;
        setNotifications((prev) => [notification, ...prev]);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      setIsConnected(false);
    };

    websocket.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
      // Reconectar após 3 segundos
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [userId]);

  const addNotification = useCallback((notification: Notification) => {
    const id = `${notification.timestamp}-${Math.random()}`;
    setNotifications((prev) => [{ ...notification, id, read: false }, ...prev]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        removeNotification,
        markAsRead,
        markAllAsRead,
        isConnected,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
