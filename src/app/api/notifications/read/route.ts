import { NextRequest, NextResponse } from 'next/server';
import { notifications } from '../route';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId } = body;
    
    if (!notificationId) {
      return NextResponse.json(
        { ok: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }
    
    const notification = notifications.find((n) => n.id === notificationId);
    
    if (!notification) {
      return NextResponse.json(
        { ok: false, error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    notification.read = true;
    
    return NextResponse.json({
      ok: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}
