import { NextRequest, NextResponse } from 'next/server';

// Define notification data interface
interface NotificationData {
  scheduleId?: number;
  fraksi?: string;
  playerName?: string;
  reason?: string;
  status?: string;
  opponent?: string;
  result?: string;
  [key: string]: unknown;
}

// In-memory storage for notifications (in production, use a database)
export const notifications: Array<{
  id: string;
  type: 'scrim_created' | 'scrim_updated' | 'scrim_deleted' | 'scrim_reminder' | 'match_result' | 'attendance_update';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: NotificationData;
}> = [];

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Create notification function (can be called from other parts of the app)
export function createNotification(
  type: 'scrim_created' | 'scrim_updated' | 'scrim_deleted' | 'scrim_reminder' | 'match_result' | 'attendance_update',
  title: string,
  message: string,
  data?: NotificationData
): void {
  const notification = {
    id: generateId(),
    type,
    title,
    message,
    timestamp: new Date().toISOString(),
    read: false,
    data
  };
  
  notifications.unshift(notification); // Add to beginning
  
  // Keep only last 100 notifications
  if (notifications.length > 100) {
    notifications.splice(100);
  }
  
  console.log('Notification created:', notification);
}

export async function GET(request: NextRequest) {
  try {
    // Return notifications sorted by timestamp (newest first)
    const sortedNotifications = [...notifications].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return NextResponse.json({
      ok: true,
      data: sortedNotifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, message, data } = body;
    
    if (!type || !title || !message) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const notification = {
      id: generateId(),
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      data
    };
    
    notifications.unshift(notification);
    
    // Keep only last 100 notifications
    if (notifications.length > 100) {
      notifications.splice(100);
    }
    
    return NextResponse.json({
      ok: true,
      data: notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    
    if (!notificationId) {
      return NextResponse.json(
        { ok: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }
    
    const index = notifications.findIndex(n => n.id === notificationId);
    
    if (index === -1) {
      return NextResponse.json(
        { ok: false, error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    notifications.splice(index, 1);
    
    return NextResponse.json({
      ok: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
