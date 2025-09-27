import { NextRequest, NextResponse } from 'next/server';
import {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getAttendance,
  createAttendance,
  deleteAttendance,
  createMatchResult,
  updateMatchResult,
  deleteMatchResult
} from '@/lib/supabase';
import { invalidateCache } from '@/app/api/sheets/fetch/route';
import { scrimFormSchema, attendanceSchema, matchResultSchema } from '@/lib/validation';

interface BatchOperation {
  type: 'create' | 'update' | 'delete';
  entity: 'schedule' | 'attendance' | 'matchResult';
  data: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Processing batch operations request');
    const body = await request.json();
    
    const { operations }: { operations: BatchOperation[] } = body;
    
    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Operations must be a non-empty array' },
        { status: 400 }
      );
    }
    
    if (operations.length > 10) {
      return NextResponse.json(
        { ok: false, error: 'Maximum 10 operations per batch request' },
        { status: 400 }
      );
    }
    
    const results: Record<string, unknown>[] = [];
    const errors: string[] = [];
    const cacheInvalidated = new Set<string>();
    
    // Process operations in sequence to maintain data integrity
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      
      try {
        console.log(`Processing operation ${i + 1}/${operations.length}:`, operation.type, operation.entity);
        
        let result;
        
        switch (operation.entity) {
          case 'schedule':
            result = await processScheduleOperation(operation);
            if (operation.data.fraksi && typeof operation.data.fraksi === 'string') {
              cacheInvalidated.add(operation.data.fraksi);
            }
            break;
            
          case 'attendance':
            result = await processAttendanceOperation(operation);
            break;
            
          case 'matchResult':
            result = await processMatchResultOperation(operation);
            break;
            
          default:
            throw new Error(`Unknown entity type: ${operation.entity}`);
        }
        
        results.push({
          operationIndex: i,
          success: true,
          result
        });
        
      } catch (error) {
        console.error(`Error processing operation ${i + 1}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Operation ${i + 1}: ${errorMessage}`);
        
        results.push({
          operationIndex: i,
          success: false,
          error: errorMessage
        });
      }
    }
    
    // Invalidate cache for all affected fraksi
    cacheInvalidated.forEach(fraksi => {
      invalidateCache(fraksi as "Fraksi 1" | "Fraksi 2");
    });
    
    const hasErrors = errors.length > 0;
    
    return NextResponse.json({ 
      ok: !hasErrors, 
      results,
      errors: hasErrors ? errors : undefined,
      message: hasErrors 
        ? `Batch processing completed with ${errors.length} errors`
        : `Batch processing completed successfully`
    }, { 
      status: hasErrors ? 207 : 200 // 207 Multi-Status for partial success
    });
    
  } catch (error) {
    console.error('Error in /api/sheets/batch:', error);
    
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

async function processScheduleOperation(operation: BatchOperation) {
  const { type, data } = operation;

  switch (type) {
    case 'create':
      // Validate schedule data
      const validatedCreateData = scrimFormSchema.parse(data);

      // Create schedule (Supabase handles duplicate checking)
      const createResult = await createSchedule({
        tanggalScrim: validatedCreateData.tanggalScrim,
        lawan: validatedCreateData.lawan,
        map: validatedCreateData.map.join(', '),
        startMatch: validatedCreateData.startMatch,
        fraksi: validatedCreateData.fraksi
      });

      if (!createResult.success) {
        throw new Error(createResult.error || 'Failed to create schedule');
      }

      return { message: 'Schedule created successfully', data: createResult.data };

    case 'update':
      // Validate ID and fraksi
      const { id, fraksi, ...updateData } = data;

      if (!id || typeof id !== 'number') {
        throw new Error('Valid ID is required');
      }

      if (!fraksi || (fraksi !== "Fraksi 1" && fraksi !== "Fraksi 2")) {
        throw new Error('Valid fraksi is required');
      }

      // Validate schedule data
      const validatedUpdateData = scrimFormSchema.parse({
        ...updateData,
        fraksi
      });

      // Update schedule
      const updateResult = await updateSchedule(id, {
        tanggalScrim: validatedUpdateData.tanggalScrim,
        lawan: validatedUpdateData.lawan,
        map: validatedUpdateData.map.join(', '),
        startMatch: validatedUpdateData.startMatch,
        fraksi: validatedUpdateData.fraksi
      });

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update schedule');
      }

      return { message: 'Schedule updated successfully', data: updateResult.data };

    case 'delete':
      // Validate ID and fraksi
      const { id: deleteId, fraksi: deleteFraksi } = data;

      if (!deleteId || typeof deleteId !== 'number') {
        throw new Error('Valid ID is required');
      }

      if (!deleteFraksi || (deleteFraksi !== "Fraksi 1" && deleteFraksi !== "Fraksi 2")) {
        throw new Error('Valid fraksi is required');
      }

      // Delete schedule
      const deleteResult = await deleteSchedule(deleteId);

      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Failed to delete schedule');
      }

      return { message: 'Schedule deleted successfully' };

    default:
      throw new Error(`Unknown operation type: ${type}`);
  }
}

async function processAttendanceOperation(operation: BatchOperation) {
  const { type, data } = operation;

  switch (type) {
    case 'create':
      // Validate attendance data
      const validatedCreateData = attendanceSchema.parse(data);

      // Create attendance record (Supabase handles duplicate checking)
      const createResult = await createAttendance({
        scheduleId: validatedCreateData.scheduleId,
        fraksi: validatedCreateData.fraksi,
        playerName: validatedCreateData.playerName,
        status: 'unavailable',
        reason: validatedCreateData.reason || '',
        timestamp: new Date().toISOString()
      });

      if (!createResult.success) {
        throw new Error(createResult.error || 'Failed to create attendance record');
      }

      return { message: 'Attendance record created successfully', data: createResult.data };

    case 'delete':
      // Validate required fields
      const { scheduleId, fraksi, playerName } = data;

      if (!scheduleId || typeof scheduleId !== 'number') {
        throw new Error('Valid scheduleId is required');
      }

      if (!fraksi || (fraksi !== "Fraksi 1" && fraksi !== "Fraksi 2")) {
        throw new Error('Valid fraksi is required');
      }

      if (!playerName || typeof playerName !== 'string') {
        throw new Error('Player name is required');
      }

      // Find the record to delete
      const existingData = await getAttendance(scheduleId, fraksi);
      if (!existingData.success) {
        throw new Error('Failed to fetch attendance records');
      }

      const record = existingData.data.find(record =>
        record.playerName.toLowerCase() === playerName.toLowerCase()
      );

      if (!record) {
        throw new Error('Attendance record not found');
      }

      // Delete attendance record
      const deleteResult = await deleteAttendance(record.id);

      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Failed to delete attendance record');
      }

      return { message: 'Attendance record deleted successfully' };

    default:
      throw new Error(`Unknown operation type: ${type} for attendance`);
  }
}

async function processMatchResultOperation(operation: BatchOperation) {
  const { type, data } = operation;

  switch (type) {
    case 'create':
      // Validate match result data
      const validatedCreateData = matchResultSchema.parse(data);

      // Get opponent name from schedule
      const schedulesResult = await getSchedules();
      if (!schedulesResult.success) {
        throw new Error('Failed to fetch schedules');
      }

      const schedule = schedulesResult.data.find(s => s.id === validatedCreateData.scheduleId);
      const opponent = schedule?.lawan || "Unknown";

      // Determine match status
      let status: "win" | "loss" | "draw";
      if (validatedCreateData.revScore > validatedCreateData.opponentScore) {
        status = "win";
      } else if (validatedCreateData.revScore < validatedCreateData.opponentScore) {
        status = "loss";
      } else {
        status = "draw";
      }

      // Create match result (Supabase handles duplicate checking)
      const createResult = await createMatchResult({
        scheduleId: validatedCreateData.scheduleId,
        fraksi: validatedCreateData.fraksi,
        opponent,
        revScore: validatedCreateData.revScore,
        opponentScore: validatedCreateData.opponentScore,
        status,
        notes: validatedCreateData.notes || '',
        recordedBy: validatedCreateData.recordedBy,
        timestamp: new Date().toISOString()
      });

      if (!createResult.success) {
        throw new Error(createResult.error || 'Failed to create match result');
      }

      return {
        message: 'Match result created successfully',
        result: {
          scheduleId: validatedCreateData.scheduleId,
          fraksi: validatedCreateData.fraksi,
          opponent,
          revScore: validatedCreateData.revScore,
          opponentScore: validatedCreateData.opponentScore,
          status
        },
        data: createResult.data
      };

    case 'update':
      // Validate ID
      const { id, ...updateData } = data;

      if (!id || typeof id !== 'number') {
        throw new Error('Valid ID is required');
      }

      // Validate match result data
      const validatedUpdateData = matchResultSchema.parse(updateData);

      // Get opponent name from schedule
      const schedulesUpdateResult = await getSchedules();
      if (!schedulesUpdateResult.success) {
        throw new Error('Failed to fetch schedules');
      }

      const updateSchedule = schedulesUpdateResult.data.find(s => s.id === validatedUpdateData.scheduleId);
      const updateOpponent = updateSchedule?.lawan || "Unknown";

      // Determine match status
      let updateStatus: "win" | "loss" | "draw";
      if (validatedUpdateData.revScore > validatedUpdateData.opponentScore) {
        updateStatus = "win";
      } else if (validatedUpdateData.revScore < validatedUpdateData.opponentScore) {
        updateStatus = "loss";
      } else {
        updateStatus = "draw";
      }

      // Update match result
      const updateResult = await updateMatchResult(id, {
        scheduleId: validatedUpdateData.scheduleId,
        fraksi: validatedUpdateData.fraksi,
        opponent: updateOpponent,
        revScore: validatedUpdateData.revScore,
        opponentScore: validatedUpdateData.opponentScore,
        status: updateStatus,
        notes: validatedUpdateData.notes || '',
        recordedBy: validatedUpdateData.recordedBy,
        timestamp: new Date().toISOString()
      });

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update match result');
      }

      return { message: 'Match result updated successfully', data: updateResult.data };

    case 'delete':
      // Validate ID
      const { id: deleteId } = data;

      if (!deleteId || typeof deleteId !== 'number') {
        throw new Error('Valid ID is required');
      }

      // Delete match result
      const deleteResult = await deleteMatchResult(deleteId);

      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Failed to delete match result');
      }

      return { message: 'Match result deleted successfully' };

    default:
      throw new Error(`Unknown operation type: ${type} for match result`);
  }
}