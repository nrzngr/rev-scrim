import { NextRequest, NextResponse } from 'next/server';
import { 
  appendRow, 
  getSheetData, 
  updateRow, 
  deleteRow, 
  appendAttendanceRow, 
  getAttendanceData, 
  deleteAttendanceRow,
  appendMatchResultRow,
  getMatchResultsData,
  updateMatchResultRow,
  deleteMatchResultRow
} from '@/lib/google-sheets';
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
      
      // Check for duplicates
      const existingData = await getSheetData(validatedCreateData.fraksi);
      if (existingData.success) {
        const isDuplicate = existingData.data.some((schedule: { tanggalScrim: string; lawan: string; startMatch: string }) => 
          schedule.tanggalScrim === validatedCreateData.tanggalScrim && 
          schedule.lawan === validatedCreateData.lawan && 
          schedule.startMatch === validatedCreateData.startMatch
        );
        
        if (isDuplicate) {
          throw new Error('Schedule with the same date, opponent, and time already exists');
        }
      }
      
      // Create schedule
      await appendRow(validatedCreateData.fraksi, [
        validatedCreateData.tanggalScrim, 
        validatedCreateData.lawan, 
        validatedCreateData.map.join(', '), 
        validatedCreateData.startMatch
      ]);
      
      return { message: 'Schedule created successfully' };
      
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
      
      // Check for duplicates (excluding current record)
      const existingUpdateData = await getSheetData(fraksi);
      if (existingUpdateData.success) {
        const isDuplicate = existingUpdateData.data.some((schedule: { id: number; tanggalScrim: string; lawan: string; startMatch: string }) => 
          schedule.id !== id &&
          schedule.tanggalScrim === validatedUpdateData.tanggalScrim && 
          schedule.lawan === validatedUpdateData.lawan && 
          schedule.startMatch === validatedUpdateData.startMatch
        );
        
        if (isDuplicate) {
          throw new Error('Schedule with the same date, opponent, and time already exists');
        }
      }
      
      // Convert unique ID back to row index
      const fraksiOffset = fraksi === "Fraksi 1" ? 1000 : 2000;
      const rowIndex = id - fraksiOffset;
      
      // Update schedule
      await updateRow(fraksi, rowIndex, [
        validatedUpdateData.tanggalScrim, 
        validatedUpdateData.lawan, 
        validatedUpdateData.map.join(', '), 
        validatedUpdateData.startMatch
      ]);
      
      return { message: 'Schedule updated successfully' };
      
    case 'delete':
      // Validate ID and fraksi
      const { id: deleteId, fraksi: deleteFraksi } = data;
      
      if (!deleteId || typeof deleteId !== 'number') {
        throw new Error('Valid ID is required');
      }
      
      if (!deleteFraksi || (deleteFraksi !== "Fraksi 1" && deleteFraksi !== "Fraksi 2")) {
        throw new Error('Valid fraksi is required');
      }
      
      // Convert unique ID back to row index
      const deleteFraksiOffset = deleteFraksi === "Fraksi 1" ? 1000 : 2000;
      const deleteRowIndex = deleteId - deleteFraksiOffset;
      
      // Delete schedule
      await deleteRow(deleteFraksi, deleteRowIndex);
      
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
      
      // Check for duplicates
      const existingAttendance = await getAttendanceData();
      if (existingAttendance.success) {
        const isDuplicate = existingAttendance.data.some(record => 
          record.scheduleId === validatedCreateData.scheduleId && 
          record.fraksi === validatedCreateData.fraksi && 
          record.playerName.toLowerCase() === validatedCreateData.playerName.toLowerCase()
        );
        
        if (isDuplicate) {
          throw new Error('Attendance record for this player already exists');
        }
      }
      
      // Convert unique schedule ID back to original ID for storage
      const fraksiOffset = validatedCreateData.fraksi === "Fraksi 1" ? 1000 : 2000;
      const originalScheduleId = validatedCreateData.scheduleId - fraksiOffset;
      
      // Create attendance record
      await appendAttendanceRow([
        originalScheduleId.toString(),
        validatedCreateData.fraksi,
        validatedCreateData.playerName,
        'unavailable',
        validatedCreateData.reason || '',
        new Date().toISOString()
      ]);
      
      return { message: 'Attendance record created successfully' };
      
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
      const existingDeleteData = await getAttendanceData();
      const recordIndex = existingDeleteData.data.findIndex(record => 
        record.scheduleId === scheduleId && 
        record.fraksi === fraksi && 
        record.playerName.toLowerCase() === playerName.toLowerCase()
      );
      
      if (recordIndex === -1) {
        throw new Error('Attendance record not found');
      }
      
      // Delete attendance record
      await deleteAttendanceRow(recordIndex);
      
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
      
      // Check for duplicates
      const existingMatchResults = await getMatchResultsData();
      if (existingMatchResults.success) {
        const isDuplicate = existingMatchResults.data.some(record => 
          record.scheduleId === validatedCreateData.scheduleId && 
          record.fraksi === validatedCreateData.fraksi
        );
        
        if (isDuplicate) {
          throw new Error('Match result for this schedule already exists');
        }
      }
      
      // Get opponent name
      const fraksi1Data = await getSheetData("Fraksi 1");
      const fraksi2Data = await getSheetData("Fraksi 2");
      const allSchedules = [
        ...(fraksi1Data.success ? fraksi1Data.data : []),
        ...(fraksi2Data.success ? fraksi2Data.data : [])
      ];

      const schedule = allSchedules.find(s => s.id === validatedCreateData.scheduleId);
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
      
      // Create match result
      await appendMatchResultRow([
        validatedCreateData.scheduleId.toString(),
        validatedCreateData.fraksi,
        opponent,
        validatedCreateData.revScore.toString(),
        validatedCreateData.opponentScore.toString(),
        status,
        validatedCreateData.notes || '',
        validatedCreateData.recordedBy,
        new Date().toISOString()
      ]);
      
      return { 
        message: 'Match result created successfully',
        result: {
          scheduleId: validatedCreateData.scheduleId,
          fraksi: validatedCreateData.fraksi,
          opponent,
          revScore: validatedCreateData.revScore,
          opponentScore: validatedCreateData.opponentScore,
          status
        }
      };
      
    case 'update':
      // Validate ID
      const { id, ...updateData } = data;
      
      if (!id || typeof id !== 'number') {
        throw new Error('Valid ID is required');
      }
      
      // Validate match result data
      const validatedUpdateData = matchResultSchema.parse(updateData);
      
      // Get opponent name
      const fraksi1UpdateData = await getSheetData("Fraksi 1");
      const fraksi2UpdateData = await getSheetData("Fraksi 2");
      const allUpdateSchedules = [
        ...(fraksi1UpdateData.success ? fraksi1UpdateData.data : []),
        ...(fraksi2UpdateData.success ? fraksi2UpdateData.data : [])
      ];

      const updateSchedule = allUpdateSchedules.find(s => s.id === validatedUpdateData.scheduleId);
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
      await updateMatchResultRow(id, [
        validatedUpdateData.scheduleId.toString(),
        validatedUpdateData.fraksi,
        updateOpponent,
        validatedUpdateData.revScore.toString(),
        validatedUpdateData.opponentScore.toString(),
        updateStatus,
        validatedUpdateData.notes || '',
        validatedUpdateData.recordedBy,
        new Date().toISOString()
      ]);
      
      return { message: 'Match result updated successfully' };
      
    case 'delete':
      // Validate ID
      const { id: deleteId } = data;
      
      if (!deleteId || typeof deleteId !== 'number') {
        throw new Error('Valid ID is required');
      }
      
      // Get current match results to find the row index
      const currentResults = await getMatchResultsData();
      if (!currentResults.success) {
        throw new Error('Failed to fetch current match results');
      }
      
      const resultIndex = currentResults.data.findIndex(result => result.id === deleteId);
      if (resultIndex === -1) {
        throw new Error('Match result not found');
      }
      
      // Delete match result
      await deleteMatchResultRow(resultIndex);
      
      return { message: 'Match result deleted successfully' };
      
    default:
      throw new Error(`Unknown operation type: ${type} for match result`);
  }
}