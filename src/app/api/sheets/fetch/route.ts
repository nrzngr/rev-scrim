import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fraksi = searchParams.get('fraksi') as "Fraksi 1" | "Fraksi 2" | null;
    
    if (!fraksi || (fraksi !== "Fraksi 1" && fraksi !== "Fraksi 2")) {
      return NextResponse.json(
        { ok: false, error: 'Invalid or missing fraksi parameter' },
        { status: 400 }
      );
    }
    
    const result = await getSheetData(fraksi);
    
    return NextResponse.json({ 
      ok: true, 
      data: result.data,
      fraksi: fraksi 
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error in /api/sheets/fetch:', error);
    
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