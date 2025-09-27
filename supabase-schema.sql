-- Supabase Database Schema for REV Scrim Management System

-- Enable UUID extension if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY,
    "tanggalScrim" TEXT NOT NULL,
    "lawan" TEXT NOT NULL,
    "map" TEXT NOT NULL,
    "startMatch" TEXT NOT NULL,
    "fraksi" TEXT NOT NULL CHECK ("fraksi" IN ('Fraksi 1', 'Fraksi 2')),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY,
    "scheduleId" INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    "fraksi" TEXT NOT NULL CHECK ("fraksi" IN ('Fraksi 1', 'Fraksi 2')),
    "playerName" TEXT NOT NULL,
    "status" TEXT NOT NULL CHECK ("status" IN ('available', 'unavailable')),
    "reason" TEXT,
    "timestamp" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create match_results table
CREATE TABLE IF NOT EXISTS match_results (
    id INTEGER PRIMARY KEY,
    "scheduleId" INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    "fraksi" TEXT NOT NULL CHECK ("fraksi" IN ('Fraksi 1', 'Fraksi 2')),
    "opponent" TEXT NOT NULL,
    "revScore" INTEGER NOT NULL DEFAULT 0,
    "opponentScore" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL CHECK ("status" IN ('win', 'loss', 'draw')),
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schedules_fraksi ON schedules("fraksi");
CREATE INDEX IF NOT EXISTS idx_schedules_tanggal ON schedules("tanggalScrim");
CREATE INDEX IF NOT EXISTS idx_attendance_scheduleid ON attendance("scheduleId");
CREATE INDEX IF NOT EXISTS idx_attendance_fraksi ON attendance("fraksi");
CREATE INDEX IF NOT EXISTS idx_match_results_scheduleid ON match_results("scheduleId");
CREATE INDEX IF NOT EXISTS idx_match_results_fraksi ON match_results("fraksi");

-- Create unique constraints to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_schedule ON schedules("tanggalScrim", "lawan", "map", "startMatch", "fraksi");
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_attendance ON attendance("scheduleId", "fraksi", "playerName", "status");
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_match_result ON match_results("scheduleId", "fraksi");

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating updated_at
DROP TRIGGER IF EXISTS update_schedules_updated_at ON schedules;
CREATE TRIGGER update_schedules_updated_at
    BEFORE UPDATE ON schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance;
CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_match_results_updated_at ON match_results;
CREATE TRIGGER update_match_results_updated_at
    BEFORE UPDATE ON match_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create Row Level Security (RLS) policies
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

-- Policies for schedules table
CREATE POLICY "Enable read access for all users" ON schedules
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON schedules
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON schedules
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON schedules
    FOR DELETE USING (true);

-- Policies for attendance table
CREATE POLICY "Enable read access for all users" ON attendance
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON attendance
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON attendance
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON attendance
    FOR DELETE USING (true);

-- Policies for match_results table
CREATE POLICY "Enable read access for all users" ON match_results
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON match_results
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON match_results
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON match_results
    FOR DELETE USING (true);

-- Create a view for easy data integrity checks
CREATE OR REPLACE VIEW data_integrity_view AS
SELECT 
    (SELECT COUNT(*) FROM schedules) as total_schedules,
    (SELECT COUNT(*) FROM attendance) as total_attendance,
    (SELECT COUNT(*) FROM match_results) as total_match_results,
    (SELECT COUNT(*) FROM attendance a 
     LEFT JOIN schedules s ON a."scheduleId" = s.id 
     WHERE s.id IS NULL) as orphaned_attendance,
    (SELECT COUNT(*) FROM match_results mr 
     LEFT JOIN schedules s ON mr."scheduleId" = s.id 
     WHERE s.id IS NULL) as orphaned_match_results,
    (SELECT COUNT(*) FROM (
        SELECT "scheduleId", "fraksi", COUNT(*) 
        FROM match_results 
        GROUP BY "scheduleId", "fraksi" 
        HAVING COUNT(*) > 1
    ) as duplicates) as duplicate_match_results;

-- Grant necessary permissions
GRANT ALL ON schedules TO authenticated;
GRANT ALL ON attendance TO authenticated;
GRANT ALL ON match_results TO authenticated;
GRANT SELECT ON data_integrity_view TO authenticated;
