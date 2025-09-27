/**
 * Migration Script: Google Sheets to Supabase
 * 
 * This script helps migrate data from Google Sheets to Supabase.
 * Run this with: node migrate-to-supabase.js
 */

const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');

// Load environment variables
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase configuration in environment variables');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!GOOGLE_SHEETS_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_KEY) {
  console.error('❌ Missing Google Sheets configuration in environment variables');
  console.log('Please set GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_SERVICE_ACCOUNT_KEY');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const auth = new google.auth.JWT({
  email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: GOOGLE_SERVICE_ACCOUNT_KEY,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

// Helper functions
async function getSheetData(range) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS_ID,
      range: range
    });
    
    return response.data.values || [];
  } catch (error) {
    console.error(`Error fetching sheet data for range ${range}:`, error);
    return [];
  }
}

async function insertSchedules(data) {
  try {
    const { data: insertedData, error } = await supabase
      .from('schedules')
      .insert(data)
      .select();

    if (error) {
      console.error('Error inserting schedules:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: insertedData };
  } catch (error) {
    console.error('Error in insertSchedules:', error);
    return { success: false, error: error.message };
  }
}

async function insertAttendance(data) {
  try {
    const { data: insertedData, error } = await supabase
      .from('attendance')
      .insert(data)
      .select();

    if (error) {
      console.error('Error inserting attendance:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: insertedData };
  } catch (error) {
    console.error('Error in insertAttendance:', error);
    return { success: false, error: error.message };
  }
}

async function insertMatchResults(data) {
  try {
    const { data: insertedData, error } = await supabase
      .from('match_results')
      .insert(data)
      .select();

    if (error) {
      console.error('Error inserting match results:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: insertedData };
  } catch (error) {
    console.error('Error in insertMatchResults:', error);
    return { success: false, error: error.message };
  }
}

// Main migration function
async function migrate() {
  console.log('🚀 Starting migration from Google Sheets to Supabase...');
  
  try {
    // Step 1: Migrate Schedules
    console.log('\n📋 Migrating schedules...');
    
    const fraksi1Data = await getSheetData('Fraksi 1!A:D');
    const fraksi2Data = await getSheetData('Fraksi 2!A:D');
    
    const schedulesToInsert = [];
    
    // Process Fraksi 1 data
    fraksi1Data.slice(1).forEach((row, index) => { // Skip header row
      if (row.length >= 4) {
        schedulesToInsert.push({
          id: 1000 + index + 1,
          tanggalScrim: row[0] || '',
          lawan: row[1] || '',
          map: row[2] || '',
          startMatch: row[3] || '',
          fraksi: 'Fraksi 1'
        });
      }
    });
    
    // Process Fraksi 2 data
    fraksi2Data.slice(1).forEach((row, index) => { // Skip header row
      if (row.length >= 4) {
        schedulesToInsert.push({
          id: 2000 + index + 1,
          tanggalScrim: row[0] || '',
          lawan: row[1] || '',
          map: row[2] || '',
          startMatch: row[3] || '',
          fraksi: 'Fraksi 2'
        });
      }
    });
    
    console.log(`Found ${schedulesToInsert.length} schedules to migrate`);
    
    if (schedulesToInsert.length > 0) {
      const scheduleResult = await insertSchedules(schedulesToInsert);
      if (scheduleResult.success) {
        console.log(`✅ Successfully migrated ${scheduleResult.data.length} schedules`);
      } else {
        console.error(`❌ Failed to migrate schedules: ${scheduleResult.error}`);
      }
    }
    
    // Step 2: Migrate Attendance
    console.log('\n👥 Migrating attendance records...');
    
    const attendanceData = await getSheetData('Attendance!A:F');
    const attendanceToInsert = [];
    
    attendanceData.slice(1).forEach((row, index) => { // Skip header row
      if (row.length >= 6) {
        const originalScheduleId = parseInt(row[0]) || 0;
        const fraksi = row[1] || '';
        
        // Convert old schedule ID to new unique ID system
        const fraksiOffset = fraksi === "Fraksi 1" ? 1000 : 2000;
        const uniqueScheduleId = originalScheduleId + fraksiOffset;
        
        attendanceToInsert.push({
          id: index + 1,
          scheduleId: uniqueScheduleId,
          fraksi: fraksi,
          playerName: row[2] || '',
          status: row[3] || 'available',
          reason: row[4] || '',
          timestamp: row[5] || new Date().toISOString()
        });
      }
    });
    
    console.log(`Found ${attendanceToInsert.length} attendance records to migrate`);
    
    if (attendanceToInsert.length > 0) {
      const attendanceResult = await insertAttendance(attendanceToInsert);
      if (attendanceResult.success) {
        console.log(`✅ Successfully migrated ${attendanceResult.data.length} attendance records`);
      } else {
        console.error(`❌ Failed to migrate attendance records: ${attendanceResult.error}`);
      }
    }
    
    // Step 3: Migrate Match Results
    console.log('\n🏆 Migrating match results...');
    
    const matchResultsData = await getSheetData('MatchResults!A:I');
    const matchResultsToInsert = [];
    
    matchResultsData.slice(1).forEach((row, index) => { // Skip header row
      if (row.length >= 9) {
        const scheduleId = parseInt(row[0]) || 0;
        const fraksi = row[1] || '';
        
        // Convert schedule ID to unique ID format if needed
        let finalScheduleId = scheduleId;
        if (scheduleId < 1000 && fraksi) {
          const fraksiOffset = fraksi === "Fraksi 1" ? 1000 : 2000;
          finalScheduleId = scheduleId + fraksiOffset;
        }
        
        matchResultsToInsert.push({
          id: index + 1,
          scheduleId: finalScheduleId,
          fraksi: fraksi,
          opponent: row[2] || '',
          revScore: parseInt(row[3]) || 0,
          opponentScore: parseInt(row[4]) || 0,
          status: row[5] || 'draw',
          notes: row[6] || '',
          recordedBy: row[7] || '',
          timestamp: row[8] || new Date().toISOString()
        });
      }
    });
    
    console.log(`Found ${matchResultsToInsert.length} match results to migrate`);
    
    if (matchResultsToInsert.length > 0) {
      const matchResult = await insertMatchResults(matchResultsToInsert);
      if (matchResult.success) {
        console.log(`✅ Successfully migrated ${matchResult.data.length} match results`);
      } else {
        console.error(`❌ Failed to migrate match results: ${matchResult.error}`);
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log('\n📊 Summary:');
    console.log(`   Schedules: ${schedulesToInsert.length}`);
    console.log(`   Attendance: ${attendanceToInsert.length}`);
    console.log(`   Match Results: ${matchResultsToInsert.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
