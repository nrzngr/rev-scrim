"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, BarChart3Icon, UsersIcon } from "lucide-react";

import { ResponsiveLayout } from "@/components/ui/responsive-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker, TimePicker, FraksiSelect, MapMultiSelect } from "@/components/form-fields";
import { ScheduleView } from "@/components/schedule-view";
import { CalendarView } from "@/components/calendar-view";
import { MatchHistoryView } from "@/components/match-history-view";
import { StatisticsDashboard } from "@/components/statistics-dashboard";
import { AttendanceHistoryDashboard } from "@/components/attendance-history-dashboard";
import { ErrorBoundary } from "@/components/error-boundary";
import { scrimFormSchema, type ScrimFormData } from "@/lib/validation";

interface ScrimFormProps {
  isSubmitting: boolean;
  tanggalScrim: string;
  lawan: string;
  map: string[];
  startMatch: string;
  fraksi: "Fraksi 1" | "Fraksi 2" | undefined;
  setTanggalScrim: (date: string) => void;
  setLawan: (value: string) => void;
  setMap: (value: string[]) => void;
  setStartMatch: (value: string) => void;
  setFraksi: (value: "Fraksi 1" | "Fraksi 2" | undefined) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for controlled components (complex inputs)
  const [tanggalScrim, setTanggalScrim] = useState<string>("");
  const [map, setMap] = useState<string[]>([]);
  const [startMatch, setStartMatch] = useState<string>("");
  const [fraksi, setFraksi] = useState<"Fraksi 1" | "Fraksi 2" | undefined>(undefined);

  // State for the "Tim Lawan" input
  const [lawan, setLawan] = useState<string>("");

  // Refs to always get current state values
  const stateRef = useRef({
    tanggalScrim,
    lawan,
    map,
    startMatch,
    fraksi
  });

  // Update refs when state changes
  useEffect(() => {
    stateRef.current = {
      tanggalScrim,
      lawan,
      map,
      startMatch,
      fraksi
    };
  }, [tanggalScrim, lawan, map, startMatch, fraksi]);

  // Manual submission handler
  const onSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    // Get current state values from refs
    const currentState = stateRef.current;

    // Construct the payload, reading the "lawan" value from the state
    const payload: ScrimFormData = {
      tanggalScrim: currentState.tanggalScrim,
      lawan: currentState.lawan, // Read from state
      map: currentState.map,
      startMatch: currentState.startMatch,
      fraksi: currentState.fraksi || "Fraksi 1", // Default to "Fraksi 1" if undefined
    };

    const validationResult = scrimFormSchema.safeParse(payload);
    if (!validationResult.success) {
      console.log("Current form values:", currentState);
      console.log("Payload being validated:", payload);
      console.log("Validation errors:", validationResult.error.issues);
      toast.error("Form tidak valid. Silakan periksa kembali input Anda.");
      return;
    }

    setIsSubmitting(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch("/api/sheets/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validationResult.data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      if (result.ok) {
        toast.success("Scrim berhasil dijadwalkan!");
        // The form will now retain its values as requested.
      } else {
        console.error("API Error Response:", result);
        toast.error(result.error || "Gagal menjadwalkan scrim");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          toast.error("Permintaan terlalu lama. Silakan coba lagi.");
        } else {
          toast.error("Terjadi kesalahan jaringan. Silakan coba lagi.");
        }
      } else {
        toast.error("Terjadi kesalahan tidak dikenal. Silakan coba lagi.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting]);

  return (
    <ResponsiveLayout>
      {({ activeTab, setActiveTab }) => (
        <>
          {/* Main Content */}
          <div className="space-y-6 lg:space-y-8">
            {/* Tab Content */}
            <div className="bg-gray-900/30 backdrop-blur-sm rounded-2xl border border-gray-800/50 p-4 lg:p-6">
              {activeTab === "input" && (
                <ErrorBoundary>
                  <ScrimForm
                    isSubmitting={isSubmitting}
                    tanggalScrim={tanggalScrim}
                    lawan={lawan}
                    map={map}
                    startMatch={startMatch}
                    fraksi={fraksi}
                    setTanggalScrim={setTanggalScrim}
                    setLawan={setLawan}
                    setMap={setMap}
                    setStartMatch={setStartMatch}
                    setFraksi={setFraksi}
                    onSubmit={onSubmit}
                  />
                </ErrorBoundary>
              )}

              {activeTab === "schedule" && (
                <ErrorBoundary>
                  <ScheduleView />
                </ErrorBoundary>
              )}

              {activeTab === "calendar" && (
                <ErrorBoundary>
                  <CalendarView />
                </ErrorBoundary>
              )}

              {activeTab === "history" && (
                <ErrorBoundary>
                  <MatchHistoryView />
                </ErrorBoundary>
              )}

              {activeTab === "statistics" && (
                <ErrorBoundary>
                  <StatisticsDashboard />
                </ErrorBoundary>
              )}

              {activeTab === "attendance" && (
                <ErrorBoundary>
                  <AttendanceHistoryDashboard />
                </ErrorBoundary>
              )}
            </div>

            {/* Quick Actions - Mobile Optimized */}
            <div className="lg:hidden">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("statistics")}
                  className="h-12 text-xs"
                >
                  <BarChart3Icon className="h-4 w-4 mr-2" />
                  Stats
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("attendance")}
                  className="h-12 text-xs"
                >
                  <UsersIcon className="h-4 w-4 mr-2" />
                  Attendance
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </ResponsiveLayout>
  );
}

function ScrimForm({
  isSubmitting,
  tanggalScrim,
  lawan,
  map,
  startMatch,
  fraksi,
  setTanggalScrim,
  setLawan,
  setMap,
  setStartMatch,
  setFraksi,
  onSubmit
}: ScrimFormProps) {
  return (
    <div className="space-y-6">
      {/* Mobile-Optimized Form Header */}
      <div className="text-center lg:text-left">
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Jadwalkan Scrim Baru
        </h2>
        <p className="text-gray-400 text-sm lg:text-base">
          Isi detail match untuk menjadwalkan scrim dengan tim lawan
        </p>
      </div>

      {/* Enhanced Form Card */}
      <Card className="border-gray-800 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-gray-800">
          <CardTitle className="flex items-center gap-3 text-lg lg:text-xl">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 lg:h-6 lg:w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Detail Match</h3>
              <p className="text-xs lg:text-sm text-gray-400">Informasi penting untuk jadwal scrim</p>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4 lg:p-6">
          <form onSubmit={onSubmit} className="space-y-6">
            
            {/* Date and Time - Enhanced Mobile Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <div className="space-y-3">
                <label className="text-sm lg:text-base font-semibold text-white flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  Tanggal Match
                </label>
                <DatePicker
                  value={tanggalScrim ? new Date(tanggalScrim) : undefined}
                  onChange={(date) => setTanggalScrim(date ? format(date, "yyyy-MM-dd") : "")}
                  placeholder="Pilih tanggal"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm lg:text-base font-semibold text-white flex items-center gap-2">
                  <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                  Waktu Mulai
                </label>
                <TimePicker
                  value={startMatch}
                  onChange={(value) => setStartMatch(value)}
                  placeholder="HH:mm"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Opponent Section */}
            <div className="space-y-3">
              <label className="text-sm lg:text-base font-semibold text-white flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                Tim Lawan
              </label>
              <div className="relative">
                <Input
                  value={lawan}
                  onChange={(e) => {
                    console.log("Lawan input changed:", e.target.value);
                    setLawan(e.target.value);
                  }}
                  placeholder="Masukkan nama tim lawan"
                  className="h-12 lg:h-14 text-base bg-gray-800/50 border-gray-700 focus:border-orange-400 focus:ring-orange-400/20 rounded-xl pr-12"
                  disabled={isSubmitting}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                    <span className="text-orange-400 text-sm lg:text-base">👥</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Selection */}
            <div className="space-y-3">
              <label className="text-sm lg:text-base font-semibold text-white flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                Map
              </label>
              <MapMultiSelect
                value={map}
                onChange={(value) => setMap(value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Team Section */}
            <div className="space-y-4 pt-4 border-t border-gray-800">
              <div className="space-y-3">
                <label className="text-sm lg:text-base font-semibold text-white flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Fraksi REV
                </label>
                <FraksiSelect
                  value={fraksi || ""}
                  onChange={(value) => setFraksi(value as "Fraksi 1" | "Fraksi 2" | undefined)}
                  disabled={isSubmitting}
                />
                <p className="text-xs lg:text-sm text-gray-400">
                  Pilih fraksi yang akan bertanding dalam scrim ini
                </p>
              </div>
            </div>

            {/* Submit Button - Enhanced */}
            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-14 lg:h-16 text-base lg:text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Menjadwalkan Scrim...
                  </div>
                ) : (
                  "Jadwalkan Scrim"
                )}
              </Button>
            </div>
          </form>

          {/* Google Sheets Link - Enhanced */}
          {process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID && (
            <div className="mt-6 pt-4 border-t border-gray-800">
              <div className="text-center">
                <a
                  href={`https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition-colors group"
                >
                  <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
                  Lihat di Google Sheets
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
