import { NextRequest, NextResponse } from 'next/server';
import { appendAttendanceRow, getAttendanceData, deleteAttendanceRow } from '@/lib/google-sheets';

// GET - Fetch attendance data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('scheduleId');
    const fraksi = searchParams.get('fraksi');

    const result = await getAttendanceData();
    
    if (!result.success) {
      throw new Error('Failed to fetch attendance data');
    }

    let filteredData = result.data;
    
    // Filter by schedule ID if provided
    if (scheduleId) {
      filteredData = filteredData.filter(record => record.scheduleId === parseInt(scheduleId));
    }
    
    // Filter by fraksi if provided
    if (fraksi) {
      filteredData = filteredData.filter(record => record.fraksi === fraksi);
    }
    
    return NextResponse.json({ 
      ok: true, 
      data: filteredData 
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      }
    });
    
  } catch (error) {
    console.error('Error in /api/attendance GET:', error);
    
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

// POST - Mark attendance (unavailable)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { scheduleId, fraksi, playerName, reason } = body;
    
    // Validate required fields
    if (!scheduleId || typeof scheduleId !== 'number') {
      return NextResponse.json(
        { ok: false, error: 'Valid scheduleId is required' },
        { status: 400 }
      );
    }
    
    if (!fraksi || (fraksi !== "Fraksi 1" && fraksi !== "Fraksi 2")) {
      return NextResponse.json(
        { ok: false, error: 'Valid fraksi is required' },
        { status: 400 }
      );
    }
    
    if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Player name is required' },
        { status: 400 }
      );
    }
    
    const timestamp = new Date().toISOString();
    
    // Check if player already marked as unavailable for this schedule
    const existingData = await getAttendanceData();
    const existingRecord = existingData.data.find(record => 
      record.scheduleId === scheduleId && 
      record.fraksi === fraksi && 
      record.playerName.toLowerCase() === playerName.toLowerCase().trim()
    );
    
    if (existingRecord) {
      return NextResponse.json(
        { ok: false, error: 'Player already marked as unavailable for this match' },
        { status: 400 }
      );
    }
    
    // Append attendance row to Google Sheets
    await appendAttendanceRow([
      scheduleId.toString(),
      fraksi,
      playerName.trim(),
      'unavailable',
      reason || '',
      timestamp
    ]);
    
    return NextResponse.json({ ok: true }, { status: 200 });
    
  } catch (error) {
    console.error('Error in /api/attendance POST:', error);
    
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

// DELETE - Remove attendance record (player available again)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { scheduleId, fraksi, playerName } = body;
    
    // Validate required fields
    if (!scheduleId || typeof scheduleId !== 'number') {
      return NextResponse.json(
        { ok: false, error: 'Valid scheduleId is required' },
        { status: 400 }
      );
    }
    
    if (!fraksi || (fraksi !== "Fraksi 1" && fraksi !== "Fraksi 2")) {
      return NextResponse.json(
        { ok: false, error: 'Valid fraksi is required' },
        { status: 400 }
      );
    }
    
    if (!playerName || typeof playerName !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Player name is required' },
        { status: 400 }
      );
    }
    
    // Find the record to delete
    const existingData = await getAttendanceData();
    const recordIndex = existingData.data.findIndex(record => 
      record.scheduleId === scheduleId && 
      record.fraksi === fraksi && 
      record.playerName.toLowerCase() === playerName.toLowerCase().trim()
    );
    
    if (recordIndex === -1) {
      return NextResponse.json(
        { ok: false, error: 'Attendance record not found' },
        { status: 404 }
      );
    }
    
    // Delete the row (add 1 for header row)
    await deleteAttendanceRow(recordIndex + 1);
    
    return NextResponse.json({ ok: true }, { status: 200 });
    
  } catch (error) {
    console.error('Error in /api/attendance DELETE:', error);
    
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