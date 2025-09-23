import { NextRequest, NextResponse } from 'next/server';
import { validateDataIntegrity, cleanupOrphanedRecords } from '@/lib/google-sheets';

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