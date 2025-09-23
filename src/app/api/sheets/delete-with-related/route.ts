import { NextRequest, NextResponse } from 'next/server';
import { deleteScheduleWithRelatedRecords } from '@/lib/google-sheets';

export async function DELETE(request: NextRequest) {
  try {
    console.log('Processing delete schedule with related records request');
    const body = await request.json();
    
    const { scheduleId, fraksi } = body;
    
    // Validate required fields
    if (!scheduleId || typeof scheduleId !== 'number') {
      console.error('Invalid scheduleId provided:', scheduleId);
      return NextResponse.json(
        { ok: false, error: 'Valid scheduleId is required' },
        { status: 400 }
      );
    }
    
    if (!fraksi || (fraksi !== "Fraksi 1" && fraksi !== "Fraksi 2")) {
      console.error('Invalid fraksi provided:', fraksi);
      return NextResponse.json(
        { ok: false, error: 'Valid fraksi is required' },
        { status: 400 }
      );
    }
    
    console.log(`Deleting schedule ${scheduleId} from ${fraksi} with all related records`);
    
    // Execute transaction to delete schedule and related records
    const result = await deleteScheduleWithRelatedRecords(scheduleId, fraksi);
    
    if (result.success) {
      console.log('Successfully deleted schedule and related records');
      return NextResponse.json({ 
        ok: true, 
        message: result.message 
      }, { status: 200 });
    } else {
      console.error('Failed to delete schedule and related records:', result.error);
      return NextResponse.json(
        { ok: false, error: result.error || 'Failed to delete schedule and related records' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error in /api/sheets/delete-with-related:', error);
    
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