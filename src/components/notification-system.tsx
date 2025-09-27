"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BellIcon, XIcon, CheckIcon, ClockIcon, CalendarIcon, UsersIcon, TrophyIcon } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, isToday, isTomorrow, isYesterday } from "date-fns";
import { id as localeId } from 'date-fns/locale';

interface Notification {
  id: string;
  type: 'scrim_created' | 'scrim_updated' | 'scrim_reminder' | 'match_result' | 'attendance_update';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: {
    scheduleId?: number;
    fraksi?: string;
    opponent?: string;
    scrimTime?: string;
    scrimDate?: string;
  };
}

export function NotificationSystem() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      
      if (data.ok) {
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST'
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, read: true }))
        );
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.filter(notif => notif.id !== notificationId)
        );
        toast.success('Notification deleted');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    
    // Set up periodic refresh for real-time updates
    const interval = setInterval(fetchNotifications, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'scrim_created':
      case 'scrim_updated':
        return <CalendarIcon className="h-4 w-4 text-blue-400" />;
      case 'scrim_reminder':
        return <ClockIcon className="h-4 w-4 text-amber-400" />;
      case 'match_result':
        return <TrophyIcon className="h-4 w-4 text-green-400" />;
      case 'attendance_update':
        return <UsersIcon className="h-4 w-4 text-purple-400" />;
      default:
        return <BellIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatNotificationTime = (timestamp: string) => {
    const date = parseISO(timestamp);
    const now = new Date();
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isTomorrow(date)) {
      return 'Tomorrow';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'dd MMM', { locale: localeId });
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-8 w-8 p-0"
      >
        <BellIcon className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-gray-800 border-gray-700 shadow-xl z-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs text-gray-400 hover:text-white h-6 px-2"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-gray-700 rounded-lg p-3 animate-pulse">
                      <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <BellIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 hover:bg-gray-700/50 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-blue-500/5 border-l-2 border-blue-400' : ''
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`text-sm font-medium truncate ${
                              !notification.read ? 'text-white' : 'text-gray-300'
                            }`}>
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">
                                {formatNotificationTime(notification.timestamp)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                                className="h-4 w-4 p-0 text-gray-500 hover:text-red-400"
                              >
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <p className={`text-xs ${
                            !notification.read ? 'text-gray-300' : 'text-gray-400'
                          }`}>
                            {notification.message}
                          </p>
                          
                          {notification.data && (
                            <div className="mt-2 flex items-center gap-2">
                              {notification.data.fraksi && (
                                <Badge variant="secondary" className="text-xs">
                                  {notification.data.fraksi}
                                </Badge>
                              )}
                              {notification.data.opponent && (
                                <Badge variant="outline" className="text-xs">
                                  vs {notification.data.opponent}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {!notification.read && (
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
