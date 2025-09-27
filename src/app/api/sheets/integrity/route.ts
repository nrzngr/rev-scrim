import { NextRequest, NextResponse } from 'next/server';
import { validateDataIntegrity, cleanupOrphanedRecords } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('Starting data integrity validation');
    
    // Perform data integrity validation
    const integrityResult = await validateDataIntegrity();
    
    if (!integrityResult.success) {
      console.error('Data integrity validation failed:', integrityResult);
      return NextResponse.json(
        { ok: false, error: 'Failed to validate data integrity' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      ok: true,
      data: integrityResult
    });
    
  } catch (error) {
    console.error('Error in /api/sheets/integrity:', error);
    
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

export async function POST(request: NextRequest) {
  try {
    console.log('Starting cleanup of orphaned records');
    
    const body = await request.json();
    const { dryRun = false } = body;
    
    if (dryRun) {
      console.log('Dry run mode - no actual deletion will occur');
      
      // Just run integrity check without cleanup
      const integrityResult = await validateDataIntegrity();
      
      if (!integrityResult.success) {
        return NextResponse.json(
          { ok: false, error: 'Failed to validate data integrity' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        ok: true,
        mode: 'dry_run',
        data: integrityResult,
        message: 'Dry run completed. No records were deleted.'
      });
    }
    
    // Perform actual cleanup
    const cleanupResult = await cleanupOrphanedRecords();
    
    if (!cleanupResult.success) {
      console.error('Cleanup operation failed:', cleanupResult);
      return NextResponse.json(
        { ok: false, error: 'Failed to cleanup orphaned records' },
        { status: 500 }
      );
    }
    
    // Run integrity check after cleanup
    const postCleanupIntegrity = await validateDataIntegrity();
    
    return NextResponse.json({
      ok: true,
      mode: 'cleanup',
      cleanupResults: cleanupResult,
      postCleanupIntegrity: postCleanupIntegrity,
      message: `Cleanup completed. Removed ${cleanupResult.attendanceRemoved} attendance records and ${cleanupResult.matchResultsRemoved} match result records.`
    });
    
  } catch (error) {
    console.error('Error in /api/sheets/integrity POST:', error);
    
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
