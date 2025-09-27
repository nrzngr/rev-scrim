import { NextRequest, NextResponse } from 'next/server';
import { deleteScheduleWithRelatedRecords } from '@/lib/supabase';
import { createNotification } from '@/app/api/notifications/route';

export async function DELETE(request: NextRequest) {
  try {
    console.log('Processing DELETE request for schedule');
    const body = await request.json();
    
    const { id, fraksi } = body;
    
    if (!id || typeof id !== 'number') {
      return NextResponse.json(
        { ok: false, error: 'Valid ID is required' },
        { status: 400 }
      );
    }
    
    if (!fraksi || (fraksi !== "Fraksi 1" && fraksi !== "Fraksi 2")) {
      return NextResponse.json(
        { ok: false, error: 'Valid fraksi is required' },
        { status: 400 }
      );
    }
    
    console.log(`Attempting to delete schedule ${id} from ${fraksi}`);
    
    // Delete the schedule and all related records
    let result;
    try {
      result = await deleteScheduleWithRelatedRecords(id, fraksi as "Fraksi 1" | "Fraksi 2");
      console.log('deleteScheduleWithRelatedRecords function call successful. Result:', result);
    } catch (deleteError) {
      console.error('Caught specific error from deleteScheduleWithRelatedRecords function:', deleteError);
      // Re-throw the error to be caught by the outer try-catch
      throw deleteError;
    }
    
    // The deleteScheduleWithRelatedRecords function throws an error on failure,
    // so if we reach here, it was successful.
    console.log('Successfully deleted schedule and related records');
    
    // Create notification for deleted scrim
    try {
      createNotification(
        'scrim_deleted',
        `Scrim Schedule Deleted - ${fraksi}`,
        `Schedule ID ${id} from ${fraksi} has been deleted.`,
        {
          scheduleId: id,
          fraksi,
          deletedAt: new Date().toISOString()
        }
      );
    } catch (notificationError) {
      console.error('Failed to create deletion notification:', notificationError);
      // Don't fail the operation if notification fails
    }
    
    return NextResponse.json({ 
      ok: true, 
      message: result.message || 'Schedule deleted successfully' 
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error in /api/sheets/delete:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
