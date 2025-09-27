import { NextRequest, NextResponse } from 'next/server';
import { validateDataIntegrity } from '@/lib/supabase';

// Helper function to cleanup orphaned records
async function cleanupOrphanedRecords(): Promise<{ success: boolean; attendanceRemoved: number; matchResultsRemoved: number; error?: string }> {
  try {
    console.log('Starting cleanup of orphaned records');

    // Get all data
    const schedulesResult = await validateDataIntegrity();
    if (!schedulesResult.success) {
      return { success: false, attendanceRemoved: 0, matchResultsRemoved: 0, error: 'Failed to fetch data for cleanup' };
    }

    // Get individual records to check for orphans
    const { getSchedules, getAttendance, getMatchResults, deleteAttendance, deleteMatchResult } = await import('@/lib/supabase');
    const schedules = await getSchedules();
    const attendance = await getAttendance();
    const matchResults = await getMatchResults();

    if (!schedules.success || !attendance.success || !matchResults.success) {
      return { success: false, attendanceRemoved: 0, matchResultsRemoved: 0, error: 'Failed to fetch data for cleanup' };
    }

    const scheduleIds = new Set(schedules.data.map(s => s.id));

    let attendanceRemoved = 0;
    let matchResultsRemoved = 0;

    // Clean up orphaned attendance records
    for (const record of attendance.data) {
      if (!scheduleIds.has(record.scheduleId)) {
        const deleteResult = await deleteAttendance(record.id);
        if (deleteResult.success) {
          attendanceRemoved++;
        }
      }
    }

    // Clean up orphaned match results
    for (const record of matchResults.data) {
      if (!scheduleIds.has(record.scheduleId)) {
        const deleteResult = await deleteMatchResult(record.id);
        if (deleteResult.success) {
          matchResultsRemoved++;
        }
      }
    }

    console.log(`Cleanup completed: removed ${attendanceRemoved} attendance records and ${matchResultsRemoved} match result records`);

    return {
      success: true,
      attendanceRemoved,
      matchResultsRemoved
    };
  } catch (error) {
    console.error('Error during cleanup:', error);
    return {
      success: false,
      attendanceRemoved: 0,
      matchResultsRemoved: 0,
      error: error instanceof Error ? error.message : 'Unknown cleanup error'
    };
  }
}

// GET - Validate data integrity
export async function GET(request: NextRequest) {
  try {
    console.log('Processing data integrity validation request');
    
    const { searchParams } = new URL(request.url);
    const cleanup = searchParams.get('cleanup') === 'true';
    
    // Validate data integrity
    const validation = await validateDataIntegrity();
    
    let cleanupResult = null;
    if (cleanup && validation.hasIssues) {
      console.log('Performing cleanup of orphaned records');
      cleanupResult = await cleanupOrphanedRecords();
    }
    
    return NextResponse.json({ 
      ok: true, 
      validation,
      cleanup: cleanupResult,
      message: cleanup 
        ? `Data integrity validation completed. ${cleanupResult ? 'Cleanup performed.' : 'No cleanup needed.'}`
        : 'Data integrity validation completed.'
    }, { 
      status: 200 
    });
    
  } catch (error) {
    console.error('Error in /api/admin/data-integrity GET:', error);
    
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

// POST - Trigger cleanup of orphaned records
export async function POST() {
  try {
    console.log('Processing cleanup request for orphaned records');
    
    const cleanupResult = await cleanupOrphanedRecords();
    
    return NextResponse.json({ 
      ok: true, 
      cleanupResult,
      message: `Cleanup completed. Removed ${cleanupResult.attendanceRemoved} attendance records and ${cleanupResult.matchResultsRemoved} match result records.`
    }, { 
      status: 200 
    });
    
  } catch (error) {
    console.error('Error in /api/admin/data-integrity POST:', error);
    
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