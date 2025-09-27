import { NextRequest, NextResponse } from 'next/server';
import { matchResultSchema } from '@/lib/validation';
import { getMatchResults, createMatchResult, updateMatchResult, deleteMatchResult, getSchedules } from '@/lib/supabase';
import { createNotification } from '@/app/api/notifications/route';

// Simple in-memory cache
const matchResultsCache = {
  data: null as any,
  timestamp: 0,
  ttl: 30000 // 30 seconds cache
};

// GET - Fetch match results
export async function GET(request: NextRequest) {
  const now = Date.now();
  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get('scheduleId');
  const fraksi = searchParams.get('fraksi');

  // Check cache first
  if (matchResultsCache.data && (now - matchResultsCache.timestamp < matchResultsCache.ttl)) {
    console.log('Serving match results data from cache');
    let filteredData = matchResultsCache.data;
    
    // Filter by schedule ID if provided
    if (scheduleId) {
      filteredData = filteredData.filter((record: any) => record.scheduleId === parseInt(scheduleId));
    }
    
    // Filter by fraksi if provided
    if (fraksi) {
      filteredData = filteredData.filter((record: any) => record.fraksi === fraksi);
    }

    return NextResponse.json({ 
      ok: true, 
      data: filteredData,
      cached: true 
    }, { status: 200 });
  }

  try {
    console.log('Fetching fresh match results data from Supabase');
    const result = await getMatchResults(
      scheduleId ? parseInt(scheduleId) : undefined,
      fraksi as "Fraksi 1" | "Fraksi 2" | undefined
    );
    
    if (!result.success) {
      // If fetching fresh data fails, try to serve stale cache if available
      if (matchResultsCache.data) {
        console.warn('Failed to fetch fresh match results data, serving stale cache');
        let filteredData = matchResultsCache.data;
        
        if (scheduleId) {
          filteredData = filteredData.filter((record: any) => record.scheduleId === parseInt(scheduleId));
        }
        
        if (fraksi) {
          filteredData = filteredData.filter((record: any) => record.fraksi === fraksi);
        }

        return NextResponse.json({ 
          ok: true, 
          data: filteredData,
          cached: true,
          stale: true,
          warning: 'Serving stale data due to backend error'
        }, { status: 200 });
      }
      throw new Error('Failed to fetch match results data and no cache available');
    }

    // Update cache
    matchResultsCache.data = result.data;
    matchResultsCache.timestamp = now;
    console.log('Updated match results cache');

    let filteredData = result.data;
    
    // Filter by schedule ID if provided (in case it wasn't filtered in the query)
    if (scheduleId && !fraksi) {
      filteredData = filteredData.filter((record: any) => record.scheduleId === parseInt(scheduleId));
    }
    
    // Filter by fraksi if provided (in case it wasn't filtered in the query)
    if (fraksi && !scheduleId) {
      filteredData = filteredData.filter((record: any) => record.fraksi === fraksi);
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
    
    // If cache exists, serve it as a fallback
    if (matchResultsCache.data) {
      console.warn('Error fetching match results data, serving from cache as fallback');
      let filteredData = matchResultsCache.data;
      
      if (scheduleId) {
        filteredData = filteredData.filter((record: any) => record.scheduleId === parseInt(scheduleId));
      }
      
      if (fraksi) {
        filteredData = filteredData.filter((record: any) => record.fraksi === fraksi);
      }

      return NextResponse.json({ 
        ok: true, 
        data: filteredData,
        cached: true,
        stale: true,
        warning: 'Serving cached data due to error'
      }, { status: 200 });
    }
    
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
    
    // Get the opponent name from schedule data
    const schedulesResult = await getSchedules();
    const allSchedules = schedulesResult.success ? schedulesResult.data : [];

    const schedule = allSchedules.find(s => s.id === scheduleId);
    const opponent = schedule?.lawan || "Unknown";

    // Create match result in Supabase
    const result = await createMatchResult({
      scheduleId,
      fraksi: fraksi as "Fraksi 1" | "Fraksi 2",
      opponent,
      revScore,
      opponentScore,
      status,
      notes: notes || '',
      recordedBy,
      timestamp
    });
    
    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Failed to create match result' },
        { status: 500 }
      );
    }
    
    // Create notification for match result
    createNotification(
      'match_result',
      `Match Result Recorded - ${fraksi}`,
      `${status.toUpperCase()}: ${revScore}-${opponentScore} vs ${opponent}`,
      {
        scheduleId,
        fraksi,
        opponent,
        result: `${revScore}-${opponentScore}`,
        status
      }
    );
    
    return NextResponse.json({
      ok: true,
      data: result.data
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
    const schedulesResult = await getSchedules();
    const allSchedules = schedulesResult.success ? schedulesResult.data : [];

    const schedule = allSchedules.find(s => s.id === scheduleId);
    const opponent = schedule?.lawan || "Unknown";

    // Update match result in Supabase
    const result = await updateMatchResult(id, {
      scheduleId,
      fraksi: fraksi as "Fraksi 1" | "Fraksi 2",
      opponent,
      revScore,
      opponentScore,
      status,
      notes: notes || '',
      recordedBy,
      timestamp
    });
    
    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Failed to update match result' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      ok: true, 
      data: result.data 
    }, { status: 200 });
    
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
    console.log('Processing DELETE request for match result');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      console.error('Invalid ID provided:', id);
      return NextResponse.json(
        { ok: false, error: 'Valid ID is required' },
        { status: 400 }
      );
    }

    // Delete the match result
    const result = await deleteMatchResult(parseInt(id));
    if (!result.success) {
      console.error('Failed to delete match result:', result.error);
      return NextResponse.json(
        { ok: false, error: result.error || 'Failed to delete match result' },
        { status: 500 }
      );
    }

    console.log('Successfully deleted match result');
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
