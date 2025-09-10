import { z } from "zod";

export const scrimFormSchema = z.object({
  tanggalScrim: z.string().min(1, "Tanggal Scrim is required"),
  lawan: z.string().min(2, "Lawan must be at least 2 characters"),
  map: z.array(z.string()).min(1, "Pilih minimal satu map"),
  startMatch: z.string().regex(/^\d{2}:\d{2}$/, "Start Match must be in HH:mm format"),
  fraksi: z.enum(["Fraksi 1", "Fraksi 2"], {
    message: "Please select a fraksi",
  }),
});

export const attendanceSchema = z.object({
  scheduleId: z.number().min(1, "Schedule ID is required"),
  fraksi: z.enum(["Fraksi 1", "Fraksi 2"], {
    message: "Please select a fraksi",
  }),
  playerName: z.string().min(2, "Player name must be at least 2 characters").max(50, "Player name must be less than 50 characters"),
  reason: z.string().max(200, "Reason must be less than 200 characters").optional(),
});

export type ScrimFormData = z.infer<typeof scrimFormSchema>;
export type AttendanceData = z.infer<typeof attendanceSchema>;

export interface AttendanceRecord {
  id: number;
  scheduleId: number;
  fraksi: string;
  playerName: string;
  status: string;
  reason: string;
  timestamp: string;
}

export const matchResultSchema = z.object({
  scheduleId: z.number().min(1, "Schedule ID is required"),
  fraksi: z.enum(["Fraksi 1", "Fraksi 2"], {
    message: "Please select a fraksi",
  }),
  revScore: z.number().min(0).max(99, "Score must be between 0-99"),
  opponentScore: z.number().min(0).max(99, "Score must be between 0-99"),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
  recordedBy: z.string().min(2, "Recorder name must be at least 2 characters").max(50, "Recorder name must be less than 50 characters"),
});

export type MatchResultData = z.infer<typeof matchResultSchema>;

export interface MatchResultRecord {
  id: number;
  scheduleId: number;
  fraksi: string;
  revScore: number;
  opponentScore: number;
  status: "win" | "loss" | "draw";
  notes: string;
  recordedBy: string;
  timestamp: string;
}