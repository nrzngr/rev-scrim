import { NextRequest, NextResponse } from 'next/server';
import { notifications } from '../route';

export async function POST(request: NextRequest) {
  try {
    // Mark all notifications as read
    notifications.forEach((notification) => {
      notification.read = true;
    });
    
    return NextResponse.json({
      ok: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}
