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
    
    // Transform rows into structured objects
    const schedules = dataRows.map((row, index) => ({
      id: index + 1,
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