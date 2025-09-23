import { NextRequest, NextResponse } from 'next/server';
import { scrimFormSchema } from '@/lib/validation';
import { appendRow, getSheetData } from '@/lib/google-sheets';
import { invalidateCache } from '@/app/api/sheets/fetch/route';

export async function POST(request: NextRequest) {
  try {
    console.log('Processing POST request to append scrim schedule');
    const body = await request.json();
    
    // Validate the request body
    const validatedData = scrimFormSchema.parse(body);
    
    const { tanggalScrim, lawan, map, startMatch, fraksi } = validatedData;
    
    // Map fraksi to the correct tab
    const targetTab = fraksi as "Fraksi 1" | "Fraksi 2";
    
    // Check for duplicate entries
    const existingData = await getSheetData(targetTab);
    if (existingData.success) {
      const isDuplicate = existingData.data.some((schedule: { tanggalScrim: string; lawan: string; startMatch: string }) =>
        schedule.tanggalScrim === tanggalScrim &&
        schedule.lawan === lawan &&
        schedule.startMatch === startMatch
      );
      
      if (isDuplicate) {
        console.log('Duplicate schedule detected:', { tanggalScrim, lawan, startMatch });
        return NextResponse.json(
          { ok: false, error: 'Schedule with the same date, opponent, and time already exists' },
          { status: 400 }
        );
      }
    }
    
    // Append row to Google Sheets
    await appendRow(targetTab, [tanggalScrim, lawan, map.join(', '), startMatch]);
    
    // Invalidate cache for the affected fraksi
    invalidateCache(targetTab);
    
    console.log('Successfully appended new schedule');
    return NextResponse.json({ ok: true }, { status: 200 });
    
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