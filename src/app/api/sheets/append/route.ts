import { NextRequest, NextResponse } from 'next/server';
import { scrimFormSchema } from '@/lib/validation';
import { appendRow } from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedData = scrimFormSchema.parse(body);
    
    const { tanggalScrim, lawan, map, startMatch, fraksi } = validatedData;
    
    // Map fraksi to the correct tab
    const targetTab = fraksi as "Fraksi 1" | "Fraksi 2";
    
    // Append row to Google Sheets
    await appendRow(targetTab, [tanggalScrim, lawan, map.join(', '), startMatch]);
    
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