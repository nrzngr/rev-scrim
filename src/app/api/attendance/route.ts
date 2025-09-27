import { NextRequest, NextResponse } from 'next/server';
import { getAttendance, createAttendance, deleteAttendance, type Attendance } from '@/lib/supabase';
import { createNotification } from '@/app/api/notifications/route';

// Simple in-memory cache
const attendanceCache = {
  data: null as Attendance[] | null,
  timestamp: 0,
  ttl: 30000 // 30 seconds cache
};

// GET - Fetch attendance data
export async function GET(request: NextRequest) {
  const now = Date.now();
  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get('scheduleId');
  const fraksi = searchParams.get('fraksi');

  // Check cache first
  if (attendanceCache.data && (now - attendanceCache.timestamp < attendanceCache.ttl)) {
    console.log('Serving attendance data from cache');
    let filteredData = attendanceCache.data;
    
    // Filter by schedule ID if provided
    if (scheduleId) {
      filteredData = filteredData.filter((record: Attendance) => record.scheduleId === parseInt(scheduleId));
    }
    
    // Filter by fraksi if provided
    if (fraksi) {
      filteredData = filteredData.filter((record: Attendance) => record.fraksi === fraksi);
    }

    return NextResponse.json({ 
      ok: true, 
      data: filteredData,
      cached: true 
    }, { status: 200 });
  }

  try {
    console.log('Fetching fresh attendance data from Supabase');
    const result = await getAttendance(
      scheduleId ? parseInt(scheduleId) : undefined,
      fraksi as "Fraksi 1" | "Fraksi 2" | undefined
    );
    
    if (!result.success) {
      // If fetching fresh data fails, try to serve stale cache if available
      if (attendanceCache.data) {
        console.warn('Failed to fetch fresh attendance data, serving stale cache');
        let filteredData = attendanceCache.data;
        
        if (scheduleId) {
          filteredData = filteredData.filter((record: Attendance) => record.scheduleId === parseInt(scheduleId));
        }
        
        if (fraksi) {
          filteredData = filteredData.filter((record: Attendance) => record.fraksi === fraksi);
        }

        return NextResponse.json({ 
          ok: true, 
          data: filteredData,
          cached: true,
          stale: true,
          warning: 'Serving stale data due to backend error'
        }, { status: 200 });
      }
      throw new Error('Failed to fetch attendance data and no cache available');
    }

    // Update cache
    attendanceCache.data = result.data;
    attendanceCache.timestamp = now;
    console.log('Updated attendance cache');

    let filteredData = result.data;
    
    // Filter by schedule ID if provided (in case it wasn't filtered in the query)
    if (scheduleId && !fraksi) {
      filteredData = filteredData.filter((record: Attendance) => record.scheduleId === parseInt(scheduleId));
    }
    
    // Filter by fraksi if provided (in case it wasn't filtered in the query)
    if (fraksi && !scheduleId) {
      filteredData = filteredData.filter((record: Attendance) => record.fraksi === fraksi);
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
    
    // If cache exists, serve it as a fallback
    if (attendanceCache.data) {
      console.warn('Error fetching attendance data, serving from cache as fallback');
      let filteredData = attendanceCache.data;
      
      if (scheduleId) {
        filteredData = filteredData.filter((record: Attendance) => record.scheduleId === parseInt(scheduleId));
      }
      
      if (fraksi) {
        filteredData = filteredData.filter((record: Attendance) => record.fraksi === fraksi);
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
    
    // Create attendance record in Supabase
    const result = await createAttendance({
      scheduleId,
      fraksi: fraksi as "Fraksi 1" | "Fraksi 2",
      playerName: playerName.trim(),
      status: 'unavailable',
      reason: reason || '',
      timestamp
    });
    
    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Failed to mark attendance' },
        { status: 500 }
      );
    }
    
    // Create notification for attendance update
    createNotification(
      'attendance_update',
      `Player Unavailable - ${fraksi}`,
      `${playerName} marked as unavailable${reason ? ': ' + reason : ''}`,
      {
        scheduleId,
        fraksi,
        playerName: playerName.trim(),
        reason: reason || '',
        status: 'unavailable'
      }
    );
    
    return NextResponse.json({ 
      ok: true, 
      data: result.data 
    }, { status: 200 });
    
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
    const existingData = await getAttendance(scheduleId, fraksi as "Fraksi 1" | "Fraksi 2");
    if (!existingData.success) {
      return NextResponse.json(
        { ok: false, error: 'Failed to fetch attendance records' },
        { status: 500 }
      );
    }
    
    const recordToDelete = existingData.data.find(record => 
      record.scheduleId === scheduleId && 
      record.fraksi === fraksi && 
      record.playerName.toLowerCase() === playerName.toLowerCase().trim()
    );
    
    if (!recordToDelete) {
      return NextResponse.json(
        { ok: false, error: 'Attendance record not found' },
        { status: 404 }
      );
    }
    
    // Delete the record
    const deleteResult = await deleteAttendance(recordToDelete.id);
    if (!deleteResult.success) {
      return NextResponse.json(
        { ok: false, error: deleteResult.error || 'Failed to delete attendance record' },
        { status: 500 }
      );
    }
    
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
