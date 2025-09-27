import { NextRequest, NextResponse } from 'next/server';
import { type ScrimFormData } from '@/lib/validation';
import { createSchedule } from '@/lib/supabase';
import { invalidateCache } from '@/app/api/sheets/fetch/route';
import { createNotification } from '@/app/api/notifications/route';
import { checkNewScheduleConflict } from '@/lib/conflict-detection';

export async function POST(request: NextRequest) {
  try {
    console.log('Processing POST request to create scrim schedule');
    const body = await request.json();
    
    // Destructure data directly from the body, bypassing validation
    const { tanggalScrim = "", lawan = "", map = [], startMatch = "", fraksi = "Fraksi 1" } = body as ScrimFormData;
    
    // Check for schedule conflicts
    const conflictCheck = await checkNewScheduleConflict(tanggalScrim, startMatch, lawan, fraksi);
    if (conflictCheck.hasConflict) {
      console.log('Schedule conflict detected:', conflictCheck.conflicts);
      
      // Create conflict details for the response
      const conflictDetails = conflictCheck.conflicts.map(conflict => ({
        type: conflict.conflictType,
        message: conflict.conflictType === 'same_opponent_same_day' 
          ? `Same opponent (${conflict.lawan}) already scheduled on ${conflict.tanggalScrim} with ${conflict.fraksi}`
          : `Time overlap with ${conflict.fraksi} vs ${conflict.lawan} at ${conflict.startMatch} on ${conflict.tanggalScrim}`,
        existingSchedule: conflict
      }));
      
      return NextResponse.json({
        ok: false,
        error: 'Schedule conflict detected',
        conflictType: 'schedule_conflict',
        conflicts: conflictDetails
      }, { status: 409 }); // 409 Conflict
    }
    
    // Create schedule in Supabase
    const result = await createSchedule({
      tanggalScrim,
      lawan,
      map: map.join(', '),
      startMatch,
      fraksi: fraksi as "Fraksi 1" | "Fraksi 2"
    });
    
    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Failed to create schedule' },
        { status: 500 }
      );
    }
    
    // Invalidate cache for the affected fraksi
    invalidateCache(fraksi as "Fraksi 1" | "Fraksi 2");
    
    // Create notification for new scrim
    createNotification(
      'scrim_created',
      `New Scrim Scheduled - ${fraksi}`,
      `${lawan} on ${tanggalScrim} at ${startMatch}`,
      {
        scheduleId: result.data?.id || Date.now(),
        fraksi,
        opponent: lawan,
        scrimDate: tanggalScrim,
        scrimTime: startMatch
      }
    );
    
    console.log('Successfully created new schedule');
    return NextResponse.json({ 
      ok: true, 
      data: result.data 
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error in /api/sheets/append:', error);
    
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
