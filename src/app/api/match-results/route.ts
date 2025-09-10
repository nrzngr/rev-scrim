import { NextRequest, NextResponse } from 'next/server';
import { matchResultSchema } from '@/lib/validation';
import { appendMatchResultRow, getMatchResultsData, updateMatchResultRow } from '@/lib/google-sheets';

// GET - Fetch match results
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('scheduleId');
    const fraksi = searchParams.get('fraksi');

    const result = await getMatchResultsData();
    
    if (!result.success) {
      throw new Error('Failed to fetch match results data');
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
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      }
    });
    
  } catch (error) {
    console.error('Error in /api/match-results GET:', error);
    
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

// POST - Add match result
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedData = matchResultSchema.parse(body);
    
    const { scheduleId, fraksi, revScore, opponentScore, notes, recordedBy } = validatedData;
    
    // Determine match status
    let status: "win" | "loss" | "draw";
    if (revScore > opponentScore) {
      status = "win";
    } else if (revScore < opponentScore) {
      status = "loss";
    } else {
      status = "draw";
    }
    
    const timestamp = new Date().toISOString();
    
    // Check if result already exists for this schedule
    const existingData = await getMatchResultsData();
    const existingResult = existingData.data.find(record => 
      record.scheduleId === scheduleId && record.fraksi === fraksi
    );
    
    if (existingResult) {
      return NextResponse.json(
        { ok: false, error: 'Match result already exists for this schedule' },
        { status: 400 }
      );
    }
    
    // Append match result row to Google Sheets
    await appendMatchResultRow([
      scheduleId.toString(),
      fraksi,
      revScore.toString(),
      opponentScore.toString(),
      status,
      notes || '',
      recordedBy,
      timestamp
    ]);
    
    return NextResponse.json({ 
      ok: true,
      result: {
        scheduleId,
        fraksi,
        revScore,
        opponentScore,
        status,
        notes,
        recordedBy,
        timestamp
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error in /api/match-results POST:', error);
    
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

// PUT - Update match result
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { id, ...data } = body;
    const validatedData = matchResultSchema.parse(data);
    
    if (!id || typeof id !== 'number') {
      return NextResponse.json(
        { ok: false, error: 'Valid ID is required' },
        { status: 400 }
      );
    }
    
    const { scheduleId, fraksi, revScore, opponentScore, notes, recordedBy } = validatedData;
    
    // Determine match status
    let status: "win" | "loss" | "draw";
    if (revScore > opponentScore) {
      status = "win";
    } else if (revScore < opponentScore) {
      status = "loss";
    } else {
      status = "draw";
    }
    
    const timestamp = new Date().toISOString();
    
    // Update match result row in Google Sheets
    await updateMatchResultRow(id, [
      scheduleId.toString(),
      fraksi,
      revScore.toString(),
      opponentScore.toString(),
      status,
      notes || '',
      recordedBy,
      timestamp
    ]);
    
    return NextResponse.json({ ok: true }, { status: 200 });
    
  } catch (error) {
    console.error('Error in /api/match-results PUT:', error);
    
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