import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { trpc } from '@/lib/trpc';

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
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const userId = meQuery.data?.id ? String(meQuery.data.id) : null;

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let websocket: WebSocket | null = null;

    const connect = () => {
      if (cancelled) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws?userId=${userId}`;
      websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('[WebSocket] Connected');
        reconnectAttemptsRef.current = 0;
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
        setIsConnected(false);
        if (cancelled) return;

        reconnectAttemptsRef.current += 1;
        if (reconnectAttemptsRef.current > 3) {
          console.warn('[WebSocket] Disabled after repeated disconnects');
          return;
        }

        const delayMs = reconnectAttemptsRef.current * 3000;
        reconnectTimerRef.current = window.setTimeout(connect, delayMs);
      };
    };

    connect();

    return () => {
      cancelled = true;
      setIsConnected(false);
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      websocket?.close();
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
