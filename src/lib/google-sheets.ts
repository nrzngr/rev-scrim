import { google } from 'googleapis';

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

export async function appendRow(
  targetTab: "Fraksi 1" | "Fraksi 2",
  row: [string, string, string, string]
) {
  try {
    console.log(`Appending row to ${targetTab}:`, row);
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: `${targetTab}!A:D`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    });
    
    console.log(`Successfully appended row to ${targetTab}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error appending to Google Sheets:', error);
    throw error;
  }
}

export async function getSheetData(targetTab: "Fraksi 1" | "Fraksi 2") {
  try {
    console.log(`Fetching data from ${targetTab}`);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: `${targetTab}!A:D`
    });
    
    const rows = response.data.values || [];
    console.log(`Found ${rows.length} rows in ${targetTab}`);
    
    // Skip the header row (first row)
    const dataRows = rows.slice(1);
    
    // Transform rows into structured objects with unique IDs
    // Use a unique ID system: Fraksi 1 gets IDs 1000+index, Fraksi 2 gets IDs 2000+index
    const fraksiOffset = targetTab === "Fraksi 1" ? 1000 : 2000;
    const schedules = dataRows.map((row, index) => ({
      id: fraksiOffset + index + 1,
      tanggalScrim: row[0] || '',
      lawan: row[1] || '',
      map: row[2] || '',
      startMatch: row[3] || ''
    }));
    
    console.log(`Processed ${schedules.length} schedule records from ${targetTab}`);
    return { success: true, data: schedules };
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    throw error;
  }
}

export async function updateRow(
  targetTab: "Fraksi 1" | "Fraksi 2",
  rowIndex: number,
  row: [string, string, string, string]
) {
  try {
    console.log(`Updating row ${rowIndex} in ${targetTab}:`, row);
    
    // Row index is 1-based in Google Sheets API, and we need to account for header row
    const actualRowIndex = rowIndex + 1; // +1 for header row
    
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: `${targetTab}!A${actualRowIndex}:D${actualRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    });
    
    console.log(`Successfully updated row ${actualRowIndex} in ${targetTab}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error updating Google Sheets row:', error);
    throw error;
  }
}

export async function deleteRow(
  targetTab: "Fraksi 1" | "Fraksi 2",
  rowIndex: number
) {
  try {
    console.log(`Deleting row ${rowIndex} from ${targetTab}`);
    
    // Get the sheet ID first
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    });
    
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === targetTab);
    if (!sheet?.properties?.sheetId) {
      throw new Error(`Sheet "${targetTab}" not found`);
    }
    
    // Row index calculation:
    // 1. rowIndex is 0-based from the data (excluding header)
    // 2. Add 1 to account for header row
    // 3. batchUpdate uses 0-based indexing, so no further conversion needed
    const actualRowIndex = rowIndex + 1;
    
    console.log(`Converting data row index ${rowIndex} to sheet row index ${actualRowIndex}`);
    
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: actualRowIndex,
              endIndex: actualRowIndex + 1
            }
          }
        }]
      }
    });
    
    console.log(`Successfully deleted row ${actualRowIndex} from ${targetTab}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error deleting Google Sheets row:', error);
    throw error;
  }
}

export async function appendAttendanceRow(
  row: [string, string, string, string, string, string] // scheduleId, fraksi, playerName, status, reason, timestamp
) {
  try {
    console.log('Appending attendance row:', row);
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Attendance!A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    });
    
    console.log('Successfully appended attendance row');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error appending to Attendance sheet:', error);
    throw error;
  }
}

export async function getAttendanceData() {
  try {
    console.log('Fetching attendance data from Google Sheets');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Attendance!A:F'
    });
    
    const rows = response.data.values || [];
    console.log(`Found ${rows.length} rows in Attendance sheet`);
    
    // Skip the header row (first row)
    const dataRows = rows.slice(1);
    
    // Transform rows into structured objects
    const attendanceRecords = dataRows.map((row, index) => {
      const originalScheduleId = parseInt(row[0]) || 0;
      const fraksi = row[1] || '';
      
      // Convert old schedule ID to new unique ID system
      // Fraksi 1 IDs: originalId + 1000, Fraksi 2 IDs: originalId + 2000
      const fraksiOffset = fraksi === "Fraksi 1" ? 1000 : 2000;
      const uniqueScheduleId = originalScheduleId + fraksiOffset;
      
      return {
        id: index + 1,
        scheduleId: uniqueScheduleId,
        fraksi,
        playerName: row[2] || '',
        status: row[3] || '',
        reason: row[4] || '',
        timestamp: row[5] || ''
      };
    });
    
    console.log(`Processed ${attendanceRecords.length} attendance records`);
    return { success: true, data: attendanceRecords };
  } catch (error) {
    console.error('Error fetching from Attendance sheet:', error);
    throw error;
  }
}

export async function deleteAttendanceRow(rowIndex: number) {
  try {
    console.log(`Deleting attendance row ${rowIndex}`);
    
    // Get the sheet ID first
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    });
    
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === 'Attendance');
    if (!sheet?.properties?.sheetId) {
      throw new Error('Attendance sheet not found');
    }
    
    // Row index calculation:
    // 1. rowIndex is 0-based from the data (excluding header)
    // 2. Add 1 to account for header row
    // 3. batchUpdate uses 0-based indexing, so no further conversion needed
    const actualRowIndex = rowIndex + 1;
    
    console.log(`Converting data row index ${rowIndex} to sheet row index ${actualRowIndex}`);
    
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: actualRowIndex,
              endIndex: actualRowIndex + 1
            }
          }
        }]
      }
    });
    
    console.log(`Successfully deleted attendance row ${actualRowIndex}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error deleting attendance row:', error);
    throw error;
  }
}

export async function appendMatchResultRow(
  row: [string, string, string, string, string, string, string, string, string] // scheduleId, fraksi, opponent, revScore, opponentScore, status, notes, recordedBy, timestamp
) {
  try {
    console.log('Appending match result row:', row);
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'MatchResults!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    });

    console.log('Successfully appended match result row');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error appending to MatchResults sheet:', error);
    throw error;
  }
}

export async function getMatchResultsData() {
  try {
    console.log('Fetching match results data from Google Sheets');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'MatchResults!A:I'
    });

    const rows = response.data.values || [];
    console.log(`Found ${rows.length} rows in MatchResults sheet`);

    // Skip the header row (first row)
    const dataRows = rows.slice(1);

    // Transform rows into structured objects
    const matchResults = dataRows.map((row, index) => {
      const scheduleId = parseInt(row[0]) || 0;
      const fraksi = row[1] || '';
      
      // Ensure scheduleId is properly converted to unique ID format
      // If it's not already in the unique ID format, convert it
      let finalScheduleId = scheduleId;
      if (scheduleId < 1000 && fraksi) {
        const fraksiOffset = fraksi === "Fraksi 1" ? 1000 : 2000;
        finalScheduleId = scheduleId + fraksiOffset;
      }
      
      return {
        id: index + 1,
        scheduleId: finalScheduleId,
        fraksi,
        opponent: row[2] || '',
        revScore: parseInt(row[3]) || 0,
        opponentScore: parseInt(row[4]) || 0,
        status: row[5] || '',
        notes: row[6] || '',
        recordedBy: row[7] || '',
        timestamp: row[8] || ''
      };
    });

    console.log(`Processed ${matchResults.length} match result records`);
    return { success: true, data: matchResults };
  } catch (error) {
    console.error('Error fetching from MatchResults sheet:', error);
    throw error;
  }
}

export async function updateMatchResultRow(
  rowIndex: number,
  row: [string, string, string, string, string, string, string, string, string]
) {
  try {
    console.log(`Updating match result row ${rowIndex}:`, row);
    
    // Row index is 1-based in Google Sheets API, and we need to account for header row
    const actualRowIndex = rowIndex + 1; // +1 for header row

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: `MatchResults!A${actualRowIndex}:I${actualRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    });

    console.log(`Successfully updated match result row ${actualRowIndex}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error updating MatchResults row:', error);
    throw error;
  }
}

export async function deleteMatchResultRow(rowIndex: number) {
  try {
    console.log(`Deleting match result row ${rowIndex}`);
    
    // Get the sheet ID first
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    });
    
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === 'MatchResults');
    if (!sheet?.properties?.sheetId) {
      throw new Error('MatchResults sheet not found');
    }
    
    // Row index calculation:
    // 1. rowIndex is 0-based from the data (excluding header)
    // 2. Add 1 to account for header row
    // 3. batchUpdate uses 0-based indexing, so no further conversion needed
    const actualRowIndex = rowIndex + 1;
    
    console.log(`Converting data row index ${rowIndex} to sheet row index ${actualRowIndex}`);
    
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: actualRowIndex,
              endIndex: actualRowIndex + 1
            }
          }
        }]
      }
    });
    
    console.log(`Successfully deleted match result row ${actualRowIndex}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error deleting match result row:', error);
    throw error;
  }
}

// Data integrity functions
export async function validateDataIntegrity() {
  try {
    console.log('Starting data integrity validation');
    
    // Get all schedule data
    const fraksi1Data = await getSheetData("Fraksi 1");
    const fraksi2Data = await getSheetData("Fraksi 2");
    const allSchedules = [
      ...(fraksi1Data.success ? fraksi1Data.data : []),
      ...(fraksi2Data.success ? fraksi2Data.data : [])
    ];
    
    // Get attendance and match results data
    const attendanceData = await getAttendanceData();
    const matchResultsData = await getMatchResultsData();
    
    const integrityIssues: string[] = [];
    
    // Check for attendance records with non-existent schedules
    if (attendanceData.success) {
      const invalidAttendanceRecords = attendanceData.data.filter(record => 
        !allSchedules.some(schedule => schedule.id === record.scheduleId)
      );
      
      if (invalidAttendanceRecords.length > 0) {
        integrityIssues.push(
          `Found ${invalidAttendanceRecords.length} attendance records with non-existent schedules`
        );
        console.warn('Invalid attendance records:', invalidAttendanceRecords);
      }
    }
    
    // Check for match results with non-existent schedules
    if (matchResultsData.success) {
      const invalidMatchResults = matchResultsData.data.filter(record => 
        !allSchedules.some(schedule => schedule.id === record.scheduleId)
      );
      
      if (invalidMatchResults.length > 0) {
        integrityIssues.push(
          `Found ${invalidMatchResults.length} match results with non-existent schedules`
        );
        console.warn('Invalid match results:', invalidMatchResults);
      }
    }
    
    // Check for duplicate match results
    if (matchResultsData.success) {
      const duplicateMatchResults: Record<string, number[]> = {};
      
      matchResultsData.data.forEach(record => {
        const key = `${record.scheduleId}-${record.fraksi}`;
        if (!duplicateMatchResults[key]) {
          duplicateMatchResults[key] = [];
        }
        duplicateMatchResults[key].push(record.id);
      });
      
      const actualDuplicates = Object.entries(duplicateMatchResults)
        .filter(([_, ids]) => ids.length > 1);
      
      if (actualDuplicates.length > 0) {
        integrityIssues.push(
          `Found ${actualDuplicates.length} schedules with duplicate match results`
        );
        console.warn('Duplicate match results:', actualDuplicates);
      }
    }
    
    console.log('Data integrity validation completed');
    return {
      success: true,
      hasIssues: integrityIssues.length > 0,
      issues: integrityIssues,
      summary: {
        totalSchedules: allSchedules.length,
        totalAttendance: attendanceData.success ? attendanceData.data.length : 0,
        totalMatchResults: matchResultsData.success ? matchResultsData.data.length : 0,
        issuesFound: integrityIssues.length
      }
    };
  } catch (error) {
    console.error('Error during data integrity validation:', error);
    throw error;
  }
}

// Transaction handling for related operations
export async function executeTransaction<T>(operations: Array<() => Promise<unknown>>): Promise<{ success: boolean; result?: T; error?: string }> {
  try {
    console.log(`Starting transaction with ${operations.length} operations`);
    
    // Execute operations in sequence
    const results: unknown[] = [];
    for (let i = 0; i < operations.length; i++) {
      console.log(`Executing transaction operation ${i + 1}/${operations.length}`);
      const result = await operations[i]();
      results.push(result);
    }
    
    console.log('Transaction completed successfully');
    return {
      success: true,
      result: (results.length === 1 ? results[0] : results) as T
    };
  } catch (error) {
    console.error('Transaction failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown transaction error'
    };
  }
}

// Helper function to delete a schedule and all related records
export async function deleteScheduleWithRelatedRecords(scheduleId: number, fraksi: "Fraksi 1" | "Fraksi 2") {
  console.log(`Deleting schedule ${scheduleId} from ${fraksi} and all related records`);
  
  // Convert unique ID back to row index
  const fraksiOffset = fraksi === "Fraksi 1" ? 1000 : 2000;
  const rowIndex = scheduleId - fraksiOffset;
  
  // Define transaction operations
  const operations = [
    // Delete related attendance records
    async () => {
      const attendanceData = await getAttendanceData();
      if (attendanceData.success) {
        const relatedAttendance = attendanceData.data.filter(record =>
          record.scheduleId === scheduleId && record.fraksi === fraksi
        );
        
        // Delete in reverse order to maintain indices
        for (let i = relatedAttendance.length - 1; i >= 0; i--) {
          const record = relatedAttendance[i];
          await deleteAttendanceRow(record.id - 1); // Convert to 0-based index
        }
        
        console.log(`Deleted ${relatedAttendance.length} related attendance records`);
      }
    },
    
    // Delete related match results
    async () => {
      const matchResultsData = await getMatchResultsData();
      if (matchResultsData.success) {
        const relatedMatchResults = matchResultsData.data.filter(record =>
          record.scheduleId === scheduleId && record.fraksi === fraksi
        );
        
        // Delete in reverse order to maintain indices
        for (let i = relatedMatchResults.length - 1; i >= 0; i--) {
          const record = relatedMatchResults[i];
          await deleteMatchResultRow(record.id - 1); // Convert to 0-based index
        }
        
        console.log(`Deleted ${relatedMatchResults.length} related match result records`);
      }
    },
    
    // Delete the schedule itself
    async () => {
      await deleteRow(fraksi, rowIndex);
      console.log(`Deleted schedule ${scheduleId} from ${fraksi}`);
    }
  ];
  
  // Execute transaction
  const result = await executeTransaction(operations);
  
  if (result.success) {
    // Invalidate cache for the affected fraksi
    const { invalidateCache } = await import('@/app/api/sheets/fetch/route');
    invalidateCache(fraksi);
    
    return {
      success: true,
      message: `Schedule and all related records deleted successfully`
    };
  } else {
    return {
      success: false,
      error: result.error || 'Failed to delete schedule and related records'
    };
  }
}

export async function cleanupOrphanedRecords() {
  try {
    console.log('Starting cleanup of orphaned records');
    
    // Get all schedule data
    const fraksi1Data = await getSheetData("Fraksi 1");
    const fraksi2Data = await getSheetData("Fraksi 2");
    const allSchedules = [
      ...(fraksi1Data.success ? fraksi1Data.data : []),
      ...(fraksi2Data.success ? fraksi2Data.data : [])
    ];
    
    // Get attendance and match results data
    const attendanceData = await getAttendanceData();
    const matchResultsData = await getMatchResultsData();
    
    const cleanupResults = {
      attendanceRemoved: 0,
      matchResultsRemoved: 0
    };
    
    // Remove orphaned attendance records
    if (attendanceData.success) {
      const orphanedAttendance = attendanceData.data.filter(record => 
        !allSchedules.some(schedule => schedule.id === record.scheduleId)
      );
      
      // Delete orphaned attendance records (in reverse order to maintain indices)
      for (let i = orphanedAttendance.length - 1; i >= 0; i--) {
        const record = orphanedAttendance[i];
        try {
          await deleteAttendanceRow(record.id - 1); // Convert to 0-based index
          cleanupResults.attendanceRemoved++;
        } catch (error) {
          console.error(`Failed to delete orphaned attendance record ${record.id}:`, error);
        }
      }
    }
    
    // Remove orphaned match results
    if (matchResultsData.success) {
      const orphanedMatchResults = matchResultsData.data.filter(record => 
        !allSchedules.some(schedule => schedule.id === record.scheduleId)
      );
      
      // Delete orphaned match results (in reverse order to maintain indices)
      for (let i = orphanedMatchResults.length - 1; i >= 0; i--) {
        const record = orphanedMatchResults[i];
        try {
          await deleteMatchResultRow(record.id - 1); // Convert to 0-based index
          cleanupResults.matchResultsRemoved++;
        } catch (error) {
          console.error(`Failed to delete orphaned match result ${record.id}:`, error);
        }
      }
    }
    
    console.log('Cleanup completed:', cleanupResults);
    return {
      success: true,
      ...cleanupResults
    };
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}