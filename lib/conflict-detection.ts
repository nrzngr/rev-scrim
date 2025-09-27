import { getSchedules } from './supabase';

export interface ScheduleConflict {
  id: number;
  fraksi: string;
  tanggalScrim: string;
  startMatch: string;
  lawan: string;
  conflictType: 'time_overlap' | 'same_opponent_same_day';
  conflictingWith: Array<{
    id: number;
    fraksi: string;
    tanggalScrim: string;
    startMatch: string;
    lawan: string;
  }>;
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: ScheduleConflict[];
  totalSchedules: number;
}

// Convert time string (HH:mm) to minutes since midnight
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Check if two time ranges overlap
function doTimeRangesOverlap(
  start1: string, 
  end1: string, 
  start2: string, 
  end2: string,
  bufferMinutes: number = 30 // Default 30-minute buffer between matches
): boolean {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1) + bufferMinutes;
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2) + bufferMinutes;

  return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
}

// Estimate match duration based on typical scrim times
function getEstimatedMatchDuration(startTime: string): string {
  const startMinutes = timeToMinutes(startTime);
  
  // Typical scrim durations based on start time
  if (startMinutes < 18 * 60) { // Before 6 PM
    const endMinutes = startMinutes + 90; // 1.5 hours
    return `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
  } else {
    const endMinutes = startMinutes + 120; // 2 hours for evening matches
    return `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
  }
}

export async function detectScheduleConflicts(): Promise<ConflictDetectionResult> {
  try {
    console.log('Starting schedule conflict detection');
    
    // Get all schedules from Supabase
    const schedulesResult = await getSchedules();
    
    if (!schedulesResult.success) {
      throw new Error('Failed to fetch schedules for conflict detection');
    }
    
    const allSchedules = schedulesResult.data;

    const conflicts: ScheduleConflict[] = [];

    // Check for conflicts
    for (let i = 0; i < allSchedules.length; i++) {
      const schedule1 = allSchedules[i];
      const conflictingSchedules: ScheduleConflict['conflictingWith'] = [];

      for (let j = i + 1; j < allSchedules.length; j++) {
        const schedule2 = allSchedules[j];

        // Skip if same schedule (shouldn't happen but just in case)
        if (schedule1.id === schedule2.id) continue;

        // Skip conflict check if schedules are from different fraksi
        if (schedule1.fraksi !== schedule2.fraksi) {
          continue;
        }

        // Check for same opponent on the same day
        if (schedule1.tanggalScrim === schedule2.tanggalScrim && 
            schedule1.lawan.toLowerCase() === schedule2.lawan.toLowerCase()) {
          conflictingSchedules.push({
            id: schedule2.id,
            fraksi: schedule2.fraksi,
            tanggalScrim: schedule2.tanggalScrim,
            startMatch: schedule2.startMatch,
            lawan: schedule2.lawan
          });
        }

        // Check for time overlap
        const estimatedEnd1 = getEstimatedMatchDuration(schedule1.startMatch);
        const estimatedEnd2 = getEstimatedMatchDuration(schedule2.startMatch);

        if (schedule1.tanggalScrim === schedule2.tanggalScrim &&
            doTimeRangesOverlap(schedule1.startMatch, estimatedEnd1, schedule2.startMatch, estimatedEnd2)) {
          conflictingSchedules.push({
            id: schedule2.id,
            fraksi: schedule2.fraksi,
            tanggalScrim: schedule2.tanggalScrim,
            startMatch: schedule2.startMatch,
            lawan: schedule2.lawan
          });
        }
      }

      // Add conflict if any were found
      if (conflictingSchedules.length > 0) {
        conflicts.push({
          id: schedule1.id,
          fraksi: schedule1.fraksi,
          tanggalScrim: schedule1.tanggalScrim,
          startMatch: schedule1.startMatch,
          lawan: schedule1.lawan,
          conflictType: conflictingSchedules.some(c => c.lawan.toLowerCase() === schedule1.lawan.toLowerCase()) 
            ? 'same_opponent_same_day' 
            : 'time_overlap',
          conflictingWith: conflictingSchedules
        });
      }
    }

    console.log(`Conflict detection completed. Found ${conflicts.length} conflicts`);

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      totalSchedules: allSchedules.length
    };
  } catch (error) {
    console.error('Error during conflict detection:', error);
    throw error;
  }
}

// Check for conflicts when adding a new schedule
export async function checkNewScheduleConflict(
  tanggalScrim: string,
  startMatch: string,
  lawan: string,
  fraksi: string,
  excludeScheduleId?: number // Optional: exclude a specific schedule (for updates)
): Promise<{
  hasConflict: boolean;
  conflicts: Array<{
    id: number;
    fraksi: string;
    tanggalScrim: string;
    startMatch: string;
    lawan: string;
    conflictType: 'time_overlap' | 'same_opponent_same_day';
  }>;
}> {
  try {
    // Get existing schedules from Supabase
    const schedulesResult = await getSchedules();
    
    if (!schedulesResult.success) {
      throw new Error('Failed to fetch schedules for conflict checking');
    }
    
    const allSchedules = schedulesResult.data.filter(
      schedule => !excludeScheduleId || schedule.id !== excludeScheduleId
    );

    const conflicts: Array<{
      id: number;
      fraksi: string;
      tanggalScrim: string;
      startMatch: string;
      lawan: string;
      conflictType: 'time_overlap' | 'same_opponent_same_day';
    }> = [];

    const estimatedEnd = getEstimatedMatchDuration(startMatch);

    for (const existingSchedule of allSchedules) {
      // Skip conflict check if schedules are from different fraksi
      if (existingSchedule.fraksi !== fraksi) {
        continue;
      }

      // Check for same opponent on the same day
      if (existingSchedule.tanggalScrim === tanggalScrim && 
          existingSchedule.lawan.toLowerCase() === lawan.toLowerCase()) {
        conflicts.push({
          id: existingSchedule.id,
          fraksi: existingSchedule.fraksi,
          tanggalScrim: existingSchedule.tanggalScrim,
          startMatch: existingSchedule.startMatch,
          lawan: existingSchedule.lawan,
          conflictType: 'same_opponent_same_day'
        });
      }

      // Check for time overlap
      const existingEstimatedEnd = getEstimatedMatchDuration(existingSchedule.startMatch);
      
      if (existingSchedule.tanggalScrim === tanggalScrim &&
          doTimeRangesOverlap(startMatch, estimatedEnd, existingSchedule.startMatch, existingEstimatedEnd)) {
        conflicts.push({
          id: existingSchedule.id,
          fraksi: existingSchedule.fraksi,
          tanggalScrim: existingSchedule.tanggalScrim,
          startMatch: existingSchedule.startMatch,
          lawan: existingSchedule.lawan,
          conflictType: 'time_overlap'
        });
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts
    };
  } catch (error) {
    console.error('Error checking new schedule conflict:', error);
    throw error;
  }
}
