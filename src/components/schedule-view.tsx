"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { CalendarIcon, ClockIcon, MapIcon, UsersIcon, RefreshCwIcon, MoreVerticalIcon, EditIcon, TrashIcon, CheckIcon, XIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
// import { useDebounce } from "@/hooks/useDebounce"; // Currently unused
import { DatePicker, TimePicker, MapMultiSelect } from "@/components/form-fields";
import { AttendanceManager } from "@/components/attendance-manager";
import { MatchResultsManager } from "@/components/match-results-manager";
import { AddToCalendarButton } from "@/components/add-to-calendar-button";

interface ScheduleItem {
  id: number;
  tanggalScrim: string;
  lawan: string;
  map: string;
  startMatch: string;
}

interface ScheduleData {
  fraksi1: ScheduleItem[];
  fraksi2: ScheduleItem[];
}

interface MatchResult {
  scheduleId: number;
  fraksi: string;
  status: "win" | "loss" | "draw";
  revScore: number;
  opponentScore: number;
}

interface AttendanceRecord {
  id: number;
  scheduleId: number;
  fraksi: string;
  playerName: string;
  status: string;
  reason: string;
  timestamp: string;
}

export function ScheduleView() {
  const [scheduleData, setScheduleData] = useState<ScheduleData>({
    fraksi1: [],
    fraksi2: []
  });
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingFraksi, setEditingFraksi] = useState<"fraksi1" | "fraksi2" | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{
    tanggalScrim: string;
    lawan: string;
    map: string[];
    startMatch: string;
  }>({
    tanggalScrim: "",
    lawan: "",
    map: [],
    startMatch: ""
  });

  const fetchScheduleData = async (abortSignal?: AbortSignal) => {
    try {
      // Add request timeout and abort signal support
      const fetchWithTimeout = (url: string, timeout = 10000) => {
        return Promise.race([
          fetch(url, { signal: abortSignal }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]) as Promise<Response>;
      };

      const [fraksi1Response, fraksi2Response] = await Promise.all([
        fetchWithTimeout('/api/sheets/fetch?fraksi=Fraksi 1'),
        fetchWithTimeout('/api/sheets/fetch?fraksi=Fraksi 2') // Fixed: Changed from "2" to "Fraksi 2"
      ]);

      // Check if request was aborted
      if (abortSignal?.aborted) {
        return;
      }

      const fraksi1Data = await fraksi1Response.json();
      const fraksi2Data = await fraksi2Response.json();

      if (fraksi1Data.ok && fraksi2Data.ok) {
        setScheduleData({
          fraksi1: fraksi1Data.data || [],
          fraksi2: fraksi2Data.data || []
        });
      } else {
        throw new Error('Failed to fetch schedule data');
      }
    } catch (error) {
      // Don't show error if request was aborted (component unmounted)
      if (abortSignal?.aborted) {
        return;
      }
      
      console.error('Error fetching schedule:', error);
      toast.error('Gagal memuat jadwal scrim. Silakan coba lagi.');
    } finally {
      if (!abortSignal?.aborted) {
        // Don't set loading to false here - let the main useEffect handle it
        // to avoid race conditions
        setRefreshing(false);
      }
    }
  };

  // Fetch match results
  const fetchMatchResults = async (abortSignal?: AbortSignal) => {
    try {
      const response = await fetch('/api/match-results', { signal: abortSignal });
      
      if (!response.ok) {
        console.error('Match results fetch failed:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      
      if (data.ok && !abortSignal?.aborted) {
        setMatchResults(data.data || []);
      }
    } catch (error) {
      if (!abortSignal?.aborted) {
        console.error('Error fetching match results:', error);
      }
    }
  };

  // Fetch attendance data
  const fetchAttendanceData = async (abortSignal?: AbortSignal) => {
    try {
      const response = await fetch('/api/attendance', { signal: abortSignal });
      
      if (!response.ok) {
        console.error('Attendance fetch failed:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      
      if (data.ok && !abortSignal?.aborted) {
        setAttendanceRecords(data.data || []);
      }
    } catch (error) {
      if (!abortSignal?.aborted) {
        console.error('Error fetching attendance:', error);
      }
    }
  };

  // Debounced refresh to prevent multiple rapid calls (currently unused but kept for potential future use)
  // const debouncedFetchData = useDebounce(fetchScheduleData, 500);
  
  const handleRefresh = useCallback(async () => {
    if (refreshing) return; // Prevent multiple simultaneous refreshes
    setRefreshing(true);
    try {
      // Multiple aggressive cache busting strategies
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      
      const [fraksi1Response, fraksi2Response] = await Promise.all([
        fetch(`/api/sheets/fetch?fraksi=Fraksi 1&refresh=true&t=${timestamp}&r=${randomSuffix}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
          cache: 'no-store'
        }),
        fetch(`/api/sheets/fetch?fraksi=Fraksi 2&refresh=true&t=${timestamp}&r=${randomSuffix}`, { // Fixed: Changed from "2" to "Fraksi 2"
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
          cache: 'no-store'
        })
      ]);

      const fraksi1Data = await fraksi1Response.json();
      const fraksi2Data = await fraksi2Response.json();

      if (fraksi1Data.ok && fraksi2Data.ok) {
        setScheduleData({
          fraksi1: fraksi1Data.data || [],
          fraksi2: fraksi2Data.data || []
        });
        
        // Also refresh match results and attendance
        await Promise.all([
          fetchMatchResults(),
          fetchAttendanceData()
        ]);
        
        toast.success('Jadwal berhasil diperbarui dari server!');
      } else {
        throw new Error('Failed to fetch schedule data');
      }
    } catch (error) {
      console.error('Error refreshing schedule:', error);
      toast.error('Gagal memperbarui jadwal. Silakan coba lagi.');
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  const refreshAfterOperation = useCallback(async () => {
    // Refresh data after CRUD operations - force fresh data with delay
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second for Google Sheets to propagate
    
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    
    try {
      const [fraksi1Response, fraksi2Response] = await Promise.all([
        fetch(`/api/sheets/fetch?fraksi=Fraksi 1&refresh=true&t=${timestamp}&r=${randomSuffix}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }),
        fetch(`/api/sheets/fetch?fraksi=Fraksi 2&refresh=true&t=${timestamp}&r=${randomSuffix}`, { // Fixed: Changed from "2" to "Fraksi 2"
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        })
      ]);

      if (fraksi1Response.ok && fraksi2Response.ok) {
        const fraksi1Data = await fraksi1Response.json();
        const fraksi2Data = await fraksi2Response.json();

        if (fraksi1Data.ok && fraksi2Data.ok) {
          setScheduleData({
            fraksi1: fraksi1Data.data || [],
            fraksi2: fraksi2Data.data || []
          });
          
          // Also refresh match results and attendance after operations
          await Promise.all([
            fetchMatchResults(),
            fetchAttendanceData()
          ]);
        }
      }
    } catch (error) {
      console.error('Error refreshing after operation:', error);
    }
  }, []);

  const handleEdit = useCallback((schedule: ScheduleItem, fraksi: "fraksi1" | "fraksi2") => {
    setEditingId(schedule.id);
    setEditingFraksi(fraksi);
    setEditData({
      tanggalScrim: schedule.tanggalScrim,
      lawan: schedule.lawan,
      map: schedule.map.split(', ').filter(Boolean),
      startMatch: schedule.startMatch
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingId || !editingFraksi) return;
    
    setSavingId(editingId);
    
    try {
      const fraksiName = editingFraksi === "fraksi1" ? "Fraksi 1" : "Fraksi 2";
      
      // Optimistic update - update UI immediately
      const updatedSchedule: ScheduleItem = {
        id: editingId,
        tanggalScrim: editData.tanggalScrim,
        lawan: editData.lawan,
        map: editData.map.join(', '),
        startMatch: editData.startMatch
      };
      
      setScheduleData(prev => {
        const newData = { ...prev };
        const targetArray = editingFraksi === "fraksi1" ? "fraksi1" : "fraksi2";
        newData[targetArray] = newData[targetArray].map(item => 
          item.id === editingId ? updatedSchedule : item
        );
        return newData;
      });
      
      // Exit edit mode immediately for better UX
      setEditingId(null);
      setEditingFraksi(null);
      
      const response = await fetch('/api/sheets/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingId,
          fraksi: fraksiName,
          ...editData
        })
      });

      if (response.ok) {
        toast.success('Scrim berhasil diperbarui!');
        // Don't refresh - trust optimistic update for better UX
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Gagal memperbarui scrim');
        // Revert optimistic update on error
        await refreshAfterOperation();
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Terjadi kesalahan saat memperbarui scrim');
      // Revert optimistic update on error
      await refreshAfterOperation();
    } finally {
      setSavingId(null);
    }
  }, [editingId, editingFraksi, editData, refreshAfterOperation]);

  const handleDelete = useCallback(async (schedule: ScheduleItem, fraksi: "fraksi1" | "fraksi2") => {
    if (!confirm('Apakah Anda yakin ingin menghapus scrim ini?')) return;
    
    setDeletingId(schedule.id);
    
    // Store original data for potential revert
    const originalData = { ...scheduleData };
    
    try {
      const fraksiName = fraksi === "fraksi1" ? "Fraksi 1" : "Fraksi 2";
      
      // Optimistic update - remove item from UI immediately
      setScheduleData(prev => {
        const newData = { ...prev };
        const targetArray = fraksi === "fraksi1" ? "fraksi1" : "fraksi2";
        newData[targetArray] = newData[targetArray].filter(item => item.id !== schedule.id);
        return newData;
      });
      
      const response = await fetch('/api/sheets/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: schedule.id,
          fraksi: fraksiName
        })
      });

      if (response.ok) {
        toast.success('Scrim berhasil dihapus!');
        // Don't refresh immediately - trust optimistic update
        // Only refresh when user manually refreshes or returns to tab
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Gagal menghapus scrim');
        // Revert optimistic update on error
        setScheduleData(originalData);
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Terjadi kesalahan saat menghapus scrim');
      // Revert optimistic update on error
      setScheduleData(originalData);
    } finally {
      setDeletingId(null);
    }
  }, [scheduleData]); // refreshAfterOperation removed as it's not called in this function

  const handleCancel = useCallback(() => {
    setEditingId(null);
    setEditingFraksi(null);
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    
    // Load all data sequentially to avoid race conditions
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load schedule data first
        await fetchScheduleData(abortController.signal);
        
        // Then load match results and attendance in parallel
        await Promise.all([
          fetchMatchResults(abortController.signal),
          fetchAttendanceData(abortController.signal)
        ]);
        
        // Only set loading to false after ALL data is loaded
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Error loading data:', error);
          setLoading(false);
        }
      }
    };
    
    loadData();

    // Cleanup function to abort request if component unmounts
    return () => {
      abortController.abort();
    };
  }, []);

  // Use refs to avoid dependency issues
  const loadingRef = useRef(loading);
  const refreshAfterOperationRef = useRef(refreshAfterOperation);
  
  // Update refs when values change
  loadingRef.current = loading;
  refreshAfterOperationRef.current = refreshAfterOperation;

  // Separate useEffect for auto-refresh listeners with stable dependencies
  useEffect(() => {
    // Auto-refresh when page becomes visible (user returns from another tab)
    const handleVisibilityChange = () => {
      if (!document.hidden && !loadingRef.current) {
        refreshAfterOperationRef.current();
      }
    };

    // Auto-refresh when window regains focus
    const handleFocus = () => {
      if (!loadingRef.current) {
        refreshAfterOperationRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []); // Empty dependency array - stable

  // Check if match is completed
  const isMatchCompleted = useCallback((schedule: ScheduleItem) => {
    if (!schedule.tanggalScrim || !schedule.startMatch) return false;
    
    try {
      const now = new Date();
      const scrimDate = parseISO(schedule.tanggalScrim);
      const [hours, minutes] = schedule.startMatch.split(':').map(Number);
      const scrimDateTime = new Date(scrimDate);
      scrimDateTime.setHours(hours, minutes, 0, 0);
      
      // Add 2 hours buffer for match completion
      const matchEndTime = new Date(scrimDateTime.getTime() + 2 * 60 * 60 * 1000);
      
      return now > matchEndTime;
    } catch {
      return false;
    }
  }, []);

  // Get attendance count for a specific schedule
  const getAttendanceCount = useCallback((scheduleId: number, fraksi: "fraksi1" | "fraksi2") => {
    const fraksiName = fraksi === "fraksi1" ? "Fraksi 1" : "Fraksi 2";
    return attendanceRecords.filter(record => 
      record.scheduleId === scheduleId && record.fraksi === fraksiName
    ).length;
  }, [attendanceRecords]);

  // Memoized filter and sort schedules by date/time (show both upcoming and recent completed)
  const filterAndSortSchedules = useCallback((schedules: ScheduleItem[], fraksiName: string) => {
    const now = new Date();
    
    return schedules
      .filter(schedule => {
        if (!schedule.tanggalScrim || !schedule.startMatch) return false;
        
        try {
          const scrimDate = parseISO(schedule.tanggalScrim);
          const [hours, minutes] = schedule.startMatch.split(':').map(Number);
          const scrimDateTime = new Date(scrimDate);
          scrimDateTime.setHours(hours, minutes, 0, 0);
          
          // Show matches from 7 days ago to future
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          
          if (scrimDateTime < sevenDaysAgo) return false;
          
          // HIDE matches that already have results recorded
          const hasResult = matchResults.some(result => 
            result.scheduleId === schedule.id && result.fraksi === fraksiName
          );
          
          return !hasResult; // Only show matches WITHOUT results
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          const dateA = parseISO(a.tanggalScrim);
          const dateB = parseISO(b.tanggalScrim);
          
          // Sort by date first (newest first)
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
          }
          
          // If same date, sort by time
          const [hoursA, minutesA] = a.startMatch.split(':').map(Number);
          const [hoursB, minutesB] = b.startMatch.split(':').map(Number);
          
          const timeA = hoursA * 60 + minutesA;
          const timeB = hoursB * 60 + minutesB;
          
          return timeA - timeB;
        } catch {
          return 0;
        }
      });
  }, [matchResults]);

  // Memoized filtered schedules - only filter when all data is loaded
  const filteredFraksi1Schedules = useMemo(
    () => loading ? [] : filterAndSortSchedules(scheduleData.fraksi1, "Fraksi 1"),
    [scheduleData.fraksi1, filterAndSortSchedules, loading]
  );

  const filteredFraksi2Schedules = useMemo(
    () => loading ? [] : filterAndSortSchedules(scheduleData.fraksi2, "Fraksi 2"),
    [scheduleData.fraksi2, filterAndSortSchedules, loading]
  );

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Tanggal tidak tersedia';
      const date = parseISO(dateString);
      return format(date, 'dd MMM yyyy');
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'Waktu tidak tersedia';
    return timeString;
  };

  const renderScheduleCards = (filteredSchedules: ScheduleItem[], fraksi: "fraksi1" | "fraksi2") => {
    
    if (filteredSchedules.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="mb-4">
              <CalendarIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Tidak Ada Scrim Mendatang</h3>
            <p className="text-gray-400 mb-6">
              Semua pertandingan terjadwal telah selesai atau melewati waktu yang ditentukan.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
              Siap untuk pertandingan baru
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2 sm:space-y-3">
        {filteredSchedules.map((schedule) => {
          const isEditing = editingId === schedule.id && editingFraksi === fraksi;

          return (
            <Card key={schedule.id} className="group hover:shadow-2xl hover:shadow-blue-500/15 transition-all duration-300 border-gray-600/30 bg-gray-800/90 hover:bg-gray-800/95 backdrop-blur-md shadow-lg shadow-black/20 hover:border-gray-500/40 hover:scale-[1.01]">
              <CardContent className="p-2.5 sm:p-3.5 md:p-4">
                {isEditing ? (
                  // Edit Mode
                  <div className="space-y-4">
                    {/* Edit Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <EditIcon className="h-5 w-5 text-blue-400" />
                        Edit Scrim
                      </h3>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancel}
                          className="h-8 px-3 text-gray-400 border-gray-600 hover:bg-gray-700"
                        >
                          <XIcon className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={savingId === schedule.id}
                          className="h-8 px-3 bg-green-500 hover:bg-green-600 disabled:opacity-50"
                        >
                          {savingId === schedule.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <CheckIcon className="h-4 w-4 mr-1" />
                              Save
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Edit Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Tanggal</label>
                        <DatePicker
                          value={editData.tanggalScrim ? new Date(editData.tanggalScrim) : undefined}
                          onChange={(date) => setEditData(prev => ({
                            ...prev,
                            tanggalScrim: date ? format(date, "yyyy-MM-dd") : ""
                          }))}
                          placeholder="Pilih tanggal"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Waktu</label>
                        <TimePicker
                          value={editData.startMatch}
                          onChange={(value) => setEditData(prev => ({
                            ...prev,
                            startMatch: value
                          }))}
                          placeholder="HH:mm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Tim Lawan</label>
                      <Input
                        value={editData.lawan}
                        onChange={(e) => setEditData(prev => ({
                          ...prev,
                          lawan: e.target.value
                        }))}
                        placeholder="Nama tim lawan"
                        className="bg-gray-700/50 border-gray-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Map</label>
                      <MapMultiSelect
                        value={editData.map}
                        onChange={(value) => setEditData(prev => ({
                          ...prev,
                          map: value
                        }))}
                      />
                    </div>
                  </div>
                ) : (
                  // View Mode - Mobile-first responsive design
                  <>
                    {/* Improved Header - Better proportions and mobile layout */}
                    <div className="flex flex-col gap-3 mb-3 sm:mb-4">
                      {/* Date & Time - Optimized for mobile */}
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl border border-blue-500/20">
                          <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm sm:text-base font-bold text-white leading-tight tracking-tight">
                            {formatDate(schedule.tanggalScrim)}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                            <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4 text-teal-400" />
                            <span className="text-xs sm:text-sm text-teal-400 font-medium">{formatTime(schedule.startMatch)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons - Better mobile layout */}
                      <div className="flex flex-col gap-2 w-full">
                        <AddToCalendarButton
                          schedule={schedule}
                          fraksi={fraksi}
                          className="w-full h-8 sm:h-9"
                        />

                        <div className="flex gap-2 w-full">
                          <div className="flex-1">
                            <AttendanceManager
                              scheduleId={schedule.id}
                              fraksi={fraksi}
                              onAttendanceChange={refreshAfterOperationRef.current}
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <MatchResultsManager
                              scheduleId={schedule.id}
                              fraksi={fraksi}
                              opponent={schedule.lawan}
                              isCompleted={isMatchCompleted(schedule)}
                              onResultChange={refreshAfterOperationRef.current}
                            />

                            <div className="flex items-center gap-1 bg-gray-700/30 rounded-lg p-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(schedule, fraksi)}
                                className="p-1.5 h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-md flex items-center justify-center transition-all duration-200 hover:scale-105"
                                title="Edit Scrim"
                              >
                                <EditIcon className="h-3 w-3" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(schedule, fraksi)}
                                disabled={deletingId === schedule.id}
                                className="p-1.5 h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/15 disabled:opacity-50 rounded-md flex items-center justify-center transition-all duration-200 hover:scale-105"
                                title="Delete Scrim"
                              >
                                {deletingId === schedule.id ? (
                                  <div className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                ) : (
                                  <TrashIcon className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Badges - Responsive mobile layout */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      {isMatchCompleted(schedule) && (
                        <div className="flex-1">
                          <span className="inline-flex items-center justify-center w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Completed
                          </span>
                        </div>
                      )}

                      {/* Attendance indicator */}
                      {(() => {
                        const attendanceCount = getAttendanceCount(schedule.id, fraksi);
                        return attendanceCount > 0 && (
                          <div className="flex-1">
                            <span className="inline-flex items-center justify-center w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                              {attendanceCount} unavailable
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}

                {!isEditing && (
                  <>
                    {/* Improved VS Section - Mobile optimized */}
                    <div className="bg-gradient-to-br from-gray-700/40 to-gray-800/40 rounded-xl p-2.5 sm:p-3 mb-2.5 sm:mb-3 border border-gray-600/30 shadow-lg shadow-black/10">
                      <div className="flex items-center justify-between">
                        {/* Our Team */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="w-7 h-7 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <span className="text-white text-xs sm:text-sm font-bold tracking-tight">REV</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-semibold text-xs sm:text-sm leading-tight tracking-tight">REV Team</p>
                            <p className="text-blue-400 text-xs text-xs sm:text-xs">Tim Tuan Rumah</p>
                          </div>
                        </div>

                        {/* VS Indicator - Mobile optimized */}
                        <div className="mx-1.5 sm:mx-3">
                          <div className="inline-flex items-center justify-center w-8 h-7 sm:w-12 sm:h-9 bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 rounded-lg shadow-lg shadow-purple-500/20">
                            <span className="text-white font-bold text-xs sm:text-sm tracking-tight">VS</span>
                          </div>
                        </div>

                        {/* Opponent Team */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 justify-end">
                          <div className="min-w-0 flex-1 text-right">
                            <p className="text-white font-semibold text-xs sm:text-sm leading-tight truncate tracking-tight">{schedule.lawan || 'Akan Diumumkan'}</p>
                            <p className="text-orange-400 text-xs">Tim Tamu</p>
                          </div>
                          <div className="w-7 h-7 sm:w-9 sm:h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <UsersIcon className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Improved Map Info - Mobile optimized */}
                    <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-xl p-2.5 sm:p-3 border border-gray-600/20 shadow-lg shadow-black/5">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-lg border border-emerald-500/20">
                          <MapIcon className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-400 text-xs mb-0.5 sm:mb-1">Map Bermain</p>
                          <p className="text-white font-semibold text-xs sm:text-sm truncate tracking-tight">{schedule.map || 'Akan diumumkan'}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Enhanced Loading Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Jadwal Scrim Mendatang</h2>
           
          </div>
          <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <RefreshCwIcon className="h-6 w-6 text-blue-400 animate-spin" />
          </div>
        </div>

        {/* Enhanced Loading State with Skeletons */}
        <div className="space-y-4">
          {/* Skeleton Tabs */}
          <div className="grid w-full grid-cols-2 mb-8 h-14 bg-gray-800 border border-gray-700 rounded-lg p-1">
            <Skeleton className="h-12 rounded-md" />
            <Skeleton className="h-12 rounded-md" />
          </div>
          
          {/* Skeleton Cards */}
          {[1, 2, 3].map((index) => (
            <Card key={index} className="border-gray-700 bg-gradient-to-r from-gray-800 to-gray-850">
              <CardContent className="p-6">
                {/* Header skeleton */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                
                {/* VS Section skeleton */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="w-8 h-8 rounded-full" />
                  </div>
                </div>
                
                {/* Footer skeleton */}
                <div className="pt-4 border-t border-gray-700">
                  <Skeleton className="h-4 w-48" />
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Loading indicator */}
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <RefreshCwIcon className="h-4 w-4 animate-spin" />
              <span>Memuat jadwal scrim...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* Enhanced Mobile Header - Responsive */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-white">Jadwal Scrim</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Mendatang</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-blue-500/40 bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 hover:text-blue-300 transition-all duration-200 h-9 sm:h-10 px-2.5 sm:px-3.5 min-w-[36px] sm:min-w-[44px] flex items-center justify-center"
        >
          <RefreshCwIcon className={`h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="ml-1 sm:ml-2 hidden sm:inline font-medium text-xs sm:text-sm">Refresh</span>
        </Button>
      </div>

      {/* Mobile-optimized Tabs - Responsive */}
      <Tabs defaultValue="fraksi1" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-3 sm:mb-5 h-9 sm:h-11 bg-gray-800/50 border border-gray-700/50 rounded-lg p-1">
          <TabsTrigger
            value="fraksi1"
            className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-300 font-medium text-xs sm:text-sm h-7 sm:h-9 transition-all duration-200 rounded-md"
          >
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-500 rounded-full"></div>
              <span>Fraksi 1</span>
              <span className="bg-blue-500/20 text-blue-400 px-1 sm:px-1.5 py-0.5 rounded-full text-xs min-w-[16px] sm:min-w-[18px] text-center">
                {filteredFraksi1Schedules.length}
              </span>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="fraksi2"
            className="data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-300 font-medium text-xs sm:text-sm h-7 sm:h-9 transition-all duration-200 rounded-md"
          >
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-green-500 rounded-full"></div>
              <span>Fraksi 2</span>
              <span className="bg-green-500/20 text-green-400 px-1 sm:px-1.5 py-0.5 rounded-full text-xs min-w-[16px] sm:min-w-[18px] text-center">
                {filteredFraksi2Schedules.length}
              </span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fraksi1" className="space-y-3 sm:space-y-4 mt-0">
          {renderScheduleCards(filteredFraksi1Schedules, "fraksi1")}
        </TabsContent>

        <TabsContent value="fraksi2" className="space-y-3 sm:space-y-4 mt-0">
          {renderScheduleCards(filteredFraksi2Schedules, "fraksi2")}
        </TabsContent>
      </Tabs>
    </div>
  );
}