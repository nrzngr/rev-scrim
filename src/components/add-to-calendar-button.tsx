"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import { generateGoogleCalendarUrl } from "@/lib/calendar-utils";

interface ScheduleItem {
  id: number;
  tanggalScrim: string;
  lawan: string;
  map: string;
  startMatch: string;
}

interface AddToCalendarButtonProps {
  schedule: ScheduleItem;
  fraksi: "fraksi1" | "fraksi2";
  className?: string;
}

export function AddToCalendarButton({
  schedule,
  fraksi,
  className = ""
}: AddToCalendarButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleAddToCalendar = async () => {
    try {
      setIsGenerating(true);
      
      // Get the proper fraksi name for display
      const fraksiName = fraksi === "fraksi1" ? "Fraksi 1" : "Fraksi 2";
      
      // Generate the Google Calendar URL
      const calendarUrl = generateGoogleCalendarUrl(schedule, fraksiName);
      
      // Open Google Calendar in a new tab
      window.open(calendarUrl, '_blank');
      
      // Show success toast
      toast.success("Kalender Google dibuka di tab baru");
    } catch (error) {
      console.error("Error adding to Google Calendar:", error);
      toast.error("Gagal menambahkan ke Kalender Google. Silakan coba lagi.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAddToCalendar}
      disabled={isGenerating}
      className={`h-9 px-3 text-xs sm:text-sm flex items-center gap-1.5 border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-all duration-200 ${className}`}
      aria-label="Tambahkan ke kalender"
      title="Tambahkan ke kalender"
    >
      {isGenerating ? (
        <div className="w-3.5 h-3.5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      ) : (
        <>
          <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Tambahkan ke kalender</span>
          <span className="sm:hidden">Tambah ke Kalender</span>
        </>
      )}
    </Button>
  );
}