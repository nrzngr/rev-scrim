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
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: `${targetTab}!A:D`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error appending to Google Sheets:', error);
    throw error;
  }
}

export async function getSheetData(targetTab: "Fraksi 1" | "Fraksi 2") {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: `${targetTab}!A:D`
    });
    
    const rows = response.data.values || [];
    
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
    // Get the sheet ID first
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    });
    
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === targetTab);
    if (!sheet?.properties?.sheetId) {
      throw new Error(`Sheet "${targetTab}" not found`);
    }
    
    // Row index is 0-based for batchUpdate, and we need to account for header row
    const actualRowIndex = rowIndex; // rowIndex already accounts for header row being skipped
    
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
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Attendance!A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error appending to Attendance sheet:', error);
    throw error;
  }
}

export async function getAttendanceData() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Attendance!A:F'
    });
    
    const rows = response.data.values || [];
    
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
    
    return { success: true, data: attendanceRecords };
  } catch (error) {
    console.error('Error fetching from Attendance sheet:', error);
    throw error;
  }
}

export async function deleteAttendanceRow(rowIndex: number) {
  try {
    // Get the sheet ID first
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    });
    
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === 'Attendance');
    if (!sheet?.properties?.sheetId) {
      throw new Error('Attendance sheet not found');
    }
    
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }]
      }
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error deleting attendance row:', error);
    throw error;
  }
}

export async function appendMatchResultRow(
  row: [string, string, string, string, string, string, string, string] // scheduleId, fraksi, revScore, opponentScore, status, notes, recordedBy, timestamp
) {
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'MatchResults!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error appending to MatchResults sheet:', error);
    throw error;
  }
}

export async function getMatchResultsData() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'MatchResults!A:H'
    });
    
    const rows = response.data.values || [];
    
    // Skip the header row (first row)
    const dataRows = rows.slice(1);
    
    // Transform rows into structured objects
    const matchResults = dataRows.map((row, index) => ({
      id: index + 1,
      scheduleId: parseInt(row[0]) || 0,
      fraksi: row[1] || '',
      revScore: parseInt(row[2]) || 0,
      opponentScore: parseInt(row[3]) || 0,
      status: row[4] || '',
      notes: row[5] || '',
      recordedBy: row[6] || '',
      timestamp: row[7] || ''
    }));
    
    return { success: true, data: matchResults };
  } catch (error) {
    console.error('Error fetching from MatchResults sheet:', error);
    throw error;
  }
}

export async function updateMatchResultRow(
  rowIndex: number,
  row: [string, string, string, string, string, string, string, string]
) {
  try {
    // Row index is 1-based in Google Sheets API, and we need to account for header row
    const actualRowIndex = rowIndex + 1; // +1 for header row
    
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: `MatchResults!A${actualRowIndex}:H${actualRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error updating MatchResults row:', error);
    throw error;
  }
}