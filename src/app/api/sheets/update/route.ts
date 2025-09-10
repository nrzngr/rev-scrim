import { NextRequest, NextResponse } from 'next/server';
import { scrimFormSchema } from '@/lib/validation';
import { updateRow } from '@/lib/google-sheets';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract and validate ID and fraksi first
    const { id, fraksi, tanggalScrim, lawan, map, startMatch } = body;
    
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
    
    // Validate the schedule data
    const validatedData = scrimFormSchema.parse({
      tanggalScrim,
      lawan,
      map,
      startMatch,
      fraksi
    });
    
    // Update row in Google Sheets
    await updateRow(fraksi, id, [
      validatedData.tanggalScrim, 
      validatedData.lawan, 
      validatedData.map.join(', '), 
      validatedData.startMatch
    ]);
    
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