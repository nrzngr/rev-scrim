import { NextRequest, NextResponse } from 'next/server';
import { deleteRow } from '@/lib/google-sheets';

export async function DELETE(request: NextRequest) {
  try {
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
    
    // Convert unique ID back to row index
    // Fraksi 1 IDs: 1001, 1002, etc. -> row index 1, 2, etc.
    // Fraksi 2 IDs: 2001, 2002, etc. -> row index 1, 2, etc.
    const fraksiOffset = fraksi === "Fraksi 1" ? 1000 : 2000;
    const rowIndex = id - fraksiOffset;
    
    // Delete row from Google Sheets
    await deleteRow(fraksi, rowIndex);
    
    return NextResponse.json({ ok: true }, { status: 200 });
    
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