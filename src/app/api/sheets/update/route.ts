import { NextRequest, NextResponse } from 'next/server';
import { scrimFormSchema } from '@/lib/validation';
import { updateRow, getSheetData } from '@/lib/google-sheets';
import { invalidateCache } from '@/app/api/sheets/fetch/route';

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
    const existingData = await getSheetData(fraksi);
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
    
    // Convert unique ID back to row index
    // Fraksi 1 IDs: 1001, 1002, etc. -> row index 1, 2, etc.
    // Fraksi 2 IDs: 2001, 2002, etc. -> row index 1, 2, etc.
    const fraksiOffset = fraksi === "Fraksi 1" ? 1000 : 2000;
    const rowIndex = id - fraksiOffset;
    
    console.log(`Updating schedule with ID ${id} at row index ${rowIndex}`);
    
    // Update row in Google Sheets
    await updateRow(fraksi, rowIndex, [
      validatedData.tanggalScrim,
      validatedData.lawan,
      validatedData.map.join(', '),
      validatedData.startMatch
    ]);
    
    // Invalidate cache for the affected fraksi
    invalidateCache(fraksi);
    
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