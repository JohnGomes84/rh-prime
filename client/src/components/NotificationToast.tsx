import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';

export function NotificationToast() {
  const { notifications } = useNotifications();
  const [visibleToasts, setVisibleToasts] = useState<string[]>([]);

  useEffect(() => {
    // Mostrar apenas as 3 notificações mais recentes
    const recentNotifications = notifications.slice(0, 3).map((n) => n.id);
    setVisibleToasts(recentNotifications);
  }, [notifications]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'approval':
        return 'bg-green-50 border-green-200';
      case 'alert':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50 pointer-events-none">
      {notifications
        .filter((n) => visibleToasts.includes(n.id))
        .map((notification) => (
          <div
            key={notification.id}
            className={`p-4 border rounded-lg shadow-lg flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-300 pointer-events-auto max-w-sm ${getBackgroundColor(
              notification.type
            )}`}
          >
            <div className="mt-0.5">{getIcon(notification.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{notification.title}</p>
              <p className="text-sm text-gray-600 line-clamp-2">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => {
                setVisibleToasts((prev) =>
                  prev.filter((id) => id !== notification.id)
                );
              }}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
    </div>
  );
}
