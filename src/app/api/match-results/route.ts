import { NextRequest, NextResponse } from 'next/server';
import { matchResultSchema } from '@/lib/validation';
import { appendMatchResultRow, getMatchResultsData, updateMatchResultRow, getSheetData } from '@/lib/google-sheets';

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
    
    // Get the opponent name from schedule data
    const fraksi1Data = await getSheetData("Fraksi 1");
    const fraksi2Data = await getSheetData("Fraksi 2");
    const allSchedules = [
      ...(fraksi1Data.success ? fraksi1Data.data : []),
      ...(fraksi2Data.success ? fraksi2Data.data : [])
    ];

    const schedule = allSchedules.find(s => s.id === scheduleId);
    const opponent = schedule?.lawan || "Unknown";

    // Append match result row to Google Sheets
    await appendMatchResultRow([
      scheduleId.toString(),
      fraksi,
      opponent,
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
        opponent,
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
    
    // Get the opponent name from schedule data
    const fraksi1Data = await getSheetData("Fraksi 1");
    const fraksi2Data = await getSheetData("Fraksi 2");
    const allSchedules = [
      ...(fraksi1Data.success ? fraksi1Data.data : []),
      ...(fraksi2Data.success ? fraksi2Data.data : [])
    ];

    const schedule = allSchedules.find(s => s.id === scheduleId);
    const opponent = schedule?.lawan || "Unknown";

    // Update match result row in Google Sheets
    await updateMatchResultRow(id, [
      scheduleId.toString(),
      fraksi,
      opponent,
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

// DELETE - Delete match result
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { ok: false, error: 'Valid ID is required' },
        { status: 400 }
      );
    }

    // Get current match results to find the row index
    const currentResults = await getMatchResultsData();
    if (!currentResults.success) {
      throw new Error('Failed to fetch current match results');
    }

    const resultIndex = currentResults.data.findIndex(result => result.id === parseInt(id));
    if (resultIndex === -1) {
      return NextResponse.json(
        { ok: false, error: 'Match result not found' },
        { status: 404 }
      );
    }

    // Delete the row (add 1 to account for header row, add 1 more because findIndex is 0-based but sheets are 1-based)
    const rowIndexToDelete = resultIndex + 2;

    // Get the sheet ID first
    const { google } = require('googleapis');
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    });

    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === 'MatchResults');
    if (!sheet?.properties?.sheetId) {
      throw new Error('MatchResults sheet not found');
    }

    // Delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndexToDelete - 1, // Convert to 0-based index
              endIndex: rowIndexToDelete
            }
          }
        }]
      }
    });

    return NextResponse.json({ ok: true }, { status: 200 });

  } catch (error) {
    console.error('Error in /api/match-results DELETE:', error);

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