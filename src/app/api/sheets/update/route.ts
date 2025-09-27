import { NextRequest, NextResponse } from 'next/server';
import { scrimFormSchema } from '@/lib/validation';
import { updateSchedule, getSchedules } from '@/lib/supabase';
import { invalidateCache } from '@/app/api/sheets/fetch/route';
import { createNotification } from '@/app/api/notifications/route';

export async function PUT(request: NextRequest) {
  try {
    console.log('Processing PUT request to update scrim schedule');
    const body = await request.json();
    
    // Extract and validate ID and fraksi first
    const { id, fraksi, tanggalScrim, lawan, map, startMatch } = body;
    
    if (!id || typeof id !== 'number') {
      console.error('Invalid ID provided:', id);
      return NextResponse.json(
        { ok: false, error: 'Valid ID is required' },
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
    
    // Validate the schedule data
    const validatedData = scrimFormSchema.parse({
      tanggalScrim,
      lawan,
      map,
      startMatch,
      fraksi
    });
    
    // Check for duplicate entries (excluding the current record being updated)
    const existingData = await getSchedules(fraksi as "Fraksi 1" | "Fraksi 2");
    if (existingData.success) {
      const isDuplicate = existingData.data.some((schedule: { id: number; tanggalScrim: string; lawan: string; startMatch: string }) =>
        schedule.id !== id && // Exclude the current record
        schedule.tanggalScrim === validatedData.tanggalScrim &&
        schedule.lawan === validatedData.lawan &&
        schedule.startMatch === validatedData.startMatch
      );
      
      if (isDuplicate) {
        console.log('Duplicate schedule detected during update:', { tanggalScrim, lawan, startMatch });
        return NextResponse.json(
          { ok: false, error: 'Schedule with the same date, opponent, and time already exists' },
          { status: 400 }
        );
      }
    }
    
    console.log(`Updating schedule with ID ${id}`);
    
    // Update schedule in Supabase
    const updateResult = await updateSchedule(id, {
      tanggalScrim: validatedData.tanggalScrim,
      lawan: validatedData.lawan,
      map: validatedData.map.join(', '),
      startMatch: validatedData.startMatch,
      fraksi: validatedData.fraksi
    });
    
    if (!updateResult.success) {
      throw new Error(updateResult.error || 'Failed to update schedule');
    }
    
    // Invalidate cache for the affected fraksi
    invalidateCache(fraksi);
    
    // Create notification for updated scrim
    try {
      createNotification(
        'scrim_updated',
        `Scrim Schedule Updated - ${fraksi}`,
        `Schedule ID ${id} has been updated with new details`,
        {
          scheduleId: id,
          fraksi,
          updatedAt: new Date().toISOString(),
          updatedData: validatedData
        }
      );
    } catch (notificationError) {
      console.error('Failed to create update notification:', notificationError);
      // Don't fail the operation if notification fails
    }
    
    console.log('Successfully updated schedule');
    return NextResponse.json({ ok: true }, { status: 200 });
    
  } catch (error) {
    console.error('Error in /api/sheets/update:', error);
    
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
