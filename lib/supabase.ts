import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser/frontend use
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side use with elevated privileges
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Type definitions
export interface Schedule {
  id: number;
  tanggalScrim: string;
  lawan: string;
  map: string;
  startMatch: string;
  fraksi: "Fraksi 1" | "Fraksi 2";
  created_at?: string;
  updated_at?: string;
}

export interface Attendance {
  id: number;
  scheduleId: number;
  fraksi: "Fraksi 1" | "Fraksi 2";
  playerName: string;
  status: "available" | "unavailable";
  reason?: string;
  timestamp: string;
  created_at?: string;
  updated_at?: string;
}

export interface MatchResult {
  id: number;
  scheduleId: number;
  fraksi: "Fraksi 1" | "Fraksi 2";
  opponent: string;
  revScore: number;
  opponentScore: number;
  status: "win" | "loss" | "draw";
  notes?: string;
  recordedBy: string;
  timestamp: string;
  created_at?: string;
  updated_at?: string;
}

// Schedule functions
export async function getSchedules(fraksi?: "Fraksi 1" | "Fraksi 2"): Promise<{ success: boolean; data: Schedule[]; error?: string }> {
  try {
    let query = supabaseAdmin
      .from('schedules')
      .select('*')
      .order('id', { ascending: true });

    if (fraksi) {
      query = query.eq('fraksi', fraksi);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching schedules:', error);
      return { success: false, data: [], error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getSchedules:', error);
    return { success: false, data: [], error: 'Internal server error' };
  }
}

export async function createSchedule(
  schedule: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: Schedule; error?: string }> {
  try {
    // Check for duplicate entries
    const { data: existingSchedules } = await supabaseAdmin
      .from('schedules')
      .select('*')
      .eq('tanggalScrim', schedule.tanggalScrim)
      .eq('lawan', schedule.lawan)
      .eq('startMatch', schedule.startMatch)
      .eq('fraksi', schedule.fraksi);

    if (existingSchedules && existingSchedules.length > 0) {
      return { success: false, error: 'Schedule with the same date, opponent, and time already exists' };
    }

    // Generate unique ID based on fraksi
    const { data: maxIdResult } = await supabaseAdmin
      .from('schedules')
      .select('id')
      .eq('fraksi', schedule.fraksi)
      .order('id', { ascending: false })
      .limit(1);

    const fraksiOffset = schedule.fraksi === "Fraksi 1" ? 1000 : 2000;
    const maxId = maxIdResult && maxIdResult.length > 0 ? maxIdResult[0].id : fraksiOffset;
    const newId = Math.max(maxId + 1, fraksiOffset + 1);

    const { data, error } = await supabaseAdmin
      .from('schedules')
      .insert([{ ...schedule, id: newId }])
      .select()
      .single();

    if (error) {
      console.error('Error creating schedule:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in createSchedule:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function updateSchedule(
  id: number,
  updates: Partial<Omit<Schedule, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; data?: Schedule; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating schedule:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in updateSchedule:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function deleteSchedule(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting schedule:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteSchedule:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Attendance functions
export async function getAttendance(
  scheduleId?: number,
  fraksi?: "Fraksi 1" | "Fraksi 2"
): Promise<{ success: boolean; data: Attendance[]; error?: string }> {
  try {
    let query = supabaseAdmin
      .from('attendance')
      .select('*')
      .order('id', { ascending: true });

    if (scheduleId) {
      query = query.eq('scheduleId', scheduleId);
    }

    if (fraksi) {
      query = query.eq('fraksi', fraksi);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching attendance:', error);
      return { success: false, data: [], error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getAttendance:', error);
    return { success: false, data: [], error: 'Internal server error' };
  }
}

export async function createAttendance(
  attendance: Omit<Attendance, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: Attendance; error?: string }> {
  try {
    // Check if player already marked for this schedule
    const { data: existingAttendance } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('scheduleId', attendance.scheduleId)
      .eq('fraksi', attendance.fraksi)
      .eq('playerName', attendance.playerName)
      .eq('status', attendance.status);

    if (existingAttendance && existingAttendance.length > 0) {
      return { success: false, error: 'Player already marked with this status for this match' };
    }

    const { data, error } = await supabaseAdmin
      .from('attendance')
      .insert([attendance])
      .select()
      .single();

    if (error) {
      console.error('Error creating attendance:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in createAttendance:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function deleteAttendance(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('attendance')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting attendance:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteAttendance:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Match result functions
export async function getMatchResults(
  scheduleId?: number,
  fraksi?: "Fraksi 1" | "Fraksi 2"
): Promise<{ success: boolean; data: MatchResult[]; error?: string }> {
  try {
    let query = supabaseAdmin
      .from('match_results')
      .select('*')
      .order('id', { ascending: true });

    if (scheduleId) {
      query = query.eq('scheduleId', scheduleId);
    }

    if (fraksi) {
      query = query.eq('fraksi', fraksi);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching match results:', error);
      return { success: false, data: [], error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getMatchResults:', error);
    return { success: false, data: [], error: 'Internal server error' };
  }
}

export async function createMatchResult(
  matchResult: Omit<MatchResult, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: MatchResult; error?: string }> {
  try {
    // Check if result already exists for this schedule
    const { data: existingResults } = await supabaseAdmin
      .from('match_results')
      .select('*')
      .eq('scheduleId', matchResult.scheduleId)
      .eq('fraksi', matchResult.fraksi);

    if (existingResults && existingResults.length > 0) {
      return { success: false, error: 'Match result already exists for this schedule' };
    }

    const { data, error } = await supabaseAdmin
      .from('match_results')
      .insert([matchResult])
      .select()
      .single();

    if (error) {
      console.error('Error creating match result:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in createMatchResult:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function updateMatchResult(
  id: number,
  updates: Partial<Omit<MatchResult, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; data?: MatchResult; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('match_results')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating match result:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in updateMatchResult:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function deleteMatchResult(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('match_results')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting match result:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteMatchResult:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Data integrity functions
export async function validateDataIntegrity(): Promise<{
  success: boolean;
  hasIssues: boolean;
  issues: string[];
  summary: {
    totalSchedules: number;
    totalAttendance: number;
    totalMatchResults: number;
    issuesFound: number;
  };
}> {
  try {
    console.log('Starting data integrity validation');

    // Get all data
    const schedulesResult = await getSchedules();
    const attendanceResult = await getAttendance();
    const matchResultsResult = await getMatchResults();

    const allSchedules = schedulesResult.success ? schedulesResult.data : [];
    const allAttendance = attendanceResult.success ? attendanceResult.data : [];
    const allMatchResults = matchResultsResult.success ? matchResultsResult.data : [];

    const integrityIssues: string[] = [];

    // Check for attendance records with non-existent schedules
    const invalidAttendanceRecords = allAttendance.filter(record =>
      !allSchedules.some(schedule => schedule.id === record.scheduleId)
    );

    if (invalidAttendanceRecords.length > 0) {
      integrityIssues.push(
        `Found ${invalidAttendanceRecords.length} attendance records with non-existent schedules`
      );
      console.warn('Invalid attendance records:', invalidAttendanceRecords);
    }

    // Check for match results with non-existent schedules
    const invalidMatchResults = allMatchResults.filter(record =>
      !allSchedules.some(schedule => schedule.id === record.scheduleId)
    );

    if (invalidMatchResults.length > 0) {
      integrityIssues.push(
        `Found ${invalidMatchResults.length} match results with non-existent schedules`
      );
      console.warn('Invalid match results:', invalidMatchResults);
    }

    // Check for duplicate match results
    const duplicateMatchResults: Record<string, number[]> = {};
    allMatchResults.forEach(record => {
      const key = `${record.scheduleId}-${record.fraksi}`;
      if (!duplicateMatchResults[key]) {
        duplicateMatchResults[key] = [];
      }
      duplicateMatchResults[key].push(record.id);
    });

    const duplicateCount = Object.entries(duplicateMatchResults)
      .filter(([_, ids]) => ids.length > 1).length;

    if (duplicateCount > 0) {
      integrityIssues.push(
        `Found ${duplicateCount} schedules with duplicate match results`
      );
      console.warn('Duplicate match results:', duplicateMatchResults);
    }

    console.log('Data integrity validation completed');
    return {
      success: true,
      hasIssues: integrityIssues.length > 0,
      issues: integrityIssues,
      summary: {
        totalSchedules: allSchedules.length,
        totalAttendance: allAttendance.length,
        totalMatchResults: allMatchResults.length,
        issuesFound: integrityIssues.length
      }
    };
  } catch (error) {
    console.error('Error during data integrity validation:', error);
    return {
      success: false,
      hasIssues: true,
      issues: ['Error during validation'],
      summary: {
        totalSchedules: 0,
        totalAttendance: 0,
        totalMatchResults: 0,
        issuesFound: 1
      }
    };
  }
}

// Transaction handling for related operations
export async function executeTransaction<T>(operations: Array<() => Promise<{ success: boolean; error?: string }>>): Promise<{ success: boolean; result?: T; error?: string }> {
  try {
    console.log(`Starting transaction with ${operations.length} operations`);

    // Execute operations in sequence
    for (let i = 0; i < operations.length; i++) {
      console.log(`Executing transaction operation ${i + 1}/${operations.length}`);
      const result = await operations[i]();
      
      if (!result.success) {
        throw new Error(result.error || 'Transaction operation failed');
      }
    }

    console.log('Transaction completed successfully');
    return {
      success: true,
      result: undefined as T
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
export async function deleteScheduleWithRelatedRecords(scheduleId: number, fraksi: "Fraksi 1" | "Fraksi 2"): Promise<{ success: boolean; message?: string; error?: string }> {
  console.log(`Deleting schedule ${scheduleId} from ${fraksi} and all related records`);

  // Define transaction operations
  const operations = [
    // Delete related attendance records
    async () => {
      const attendanceResult = await getAttendance(scheduleId, fraksi);
      if (attendanceResult.success) {
        for (const record of attendanceResult.data) {
          const deleteResult = await deleteAttendance(record.id);
          if (!deleteResult.success) {
            throw new Error(`Failed to delete attendance record ${record.id}: ${deleteResult.error}`);
          }
        }
        console.log(`Deleted ${attendanceResult.data.length} related attendance records`);
      }
      return { success: true };
    },

    // Delete related match results
    async () => {
      const matchResultsResult = await getMatchResults(scheduleId, fraksi);
      if (matchResultsResult.success) {
        for (const record of matchResultsResult.data) {
          const deleteResult = await deleteMatchResult(record.id);
          if (!deleteResult.success) {
            throw new Error(`Failed to delete match result ${record.id}: ${deleteResult.error}`);
          }
        }
        console.log(`Deleted ${matchResultsResult.data.length} related match result records`);
      }
      return { success: true };
    },

    // Delete the schedule itself
    async () => {
      const deleteResult = await deleteSchedule(scheduleId);
      if (!deleteResult.success) {
        throw new Error(`Failed to delete schedule: ${deleteResult.error}`);
      }
      console.log(`Deleted schedule ${scheduleId} from ${fraksi}`);
      return { success: true };
    }
  ];

  // Execute transaction
  const result = await executeTransaction(operations);

  if (result.success) {
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

// Cleanup orphaned records
export async function cleanupOrphanedRecords(): Promise<{ success: boolean; attendanceRemoved: number; matchResultsRemoved: number; error?: string }> {
  try {
    console.log('Starting cleanup of orphaned records');

    // Get all schedule data
    const schedulesResult = await getSchedules();
    const allSchedules = schedulesResult.success ? schedulesResult.data : [];

    // Get attendance and match results data
    const attendanceResult = await getAttendance();
    const matchResultsResult = await getMatchResults();

    const allAttendance = attendanceResult.success ? attendanceResult.data : [];
    const allMatchResults = matchResultsResult.success ? matchResultsResult.data : [];

    const cleanupResults = {
      attendanceRemoved: 0,
      matchResultsRemoved: 0
    };

    // Remove orphaned attendance records
    const orphanedAttendance = allAttendance.filter(record =>
      !allSchedules.some(schedule => schedule.id === record.scheduleId)
    );

    for (const record of orphanedAttendance) {
      try {
        await deleteAttendance(record.id);
        cleanupResults.attendanceRemoved++;
      } catch (error) {
        console.error(`Failed to delete orphaned attendance record ${record.id}:`, error);
      }
    }

    // Remove orphaned match results
    const orphanedMatchResults = allMatchResults.filter(record =>
      !allSchedules.some(schedule => schedule.id === record.scheduleId)
    );

    for (const record of orphanedMatchResults) {
      try {
        await deleteMatchResult(record.id);
        cleanupResults.matchResultsRemoved++;
      } catch (error) {
        console.error(`Failed to delete orphaned match result ${record.id}:`, error);
      }
    }

    console.log('Cleanup completed:', cleanupResults);
    return {
      success: true,
      ...cleanupResults
    };
  } catch (error) {
    console.error('Error during cleanup:', error);
    return {
      success: false,
      attendanceRemoved: 0,
      matchResultsRemoved: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
