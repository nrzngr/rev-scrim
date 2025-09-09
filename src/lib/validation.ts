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

export type ScrimFormData = z.infer<typeof scrimFormSchema>;