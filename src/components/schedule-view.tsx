"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, ClockIcon, MapIcon, UsersIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, isAfter, isSameDay, parse } from "date-fns";
import { useDebounce } from "@/hooks/useDebounce";

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

export function ScheduleView() {
  const [scheduleData, setScheduleData] = useState<ScheduleData>({
    fraksi1: [],
    fraksi2: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        fetchWithTimeout('/api/sheets/fetch?fraksi=Fraksi 2')
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
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // Debounced refresh to prevent multiple rapid calls
  const debouncedFetchData = useDebounce(fetchScheduleData, 500);
  
  const handleRefresh = useCallback(async () => {
    if (refreshing) return; // Prevent multiple simultaneous refreshes
    setRefreshing(true);
    await debouncedFetchData();
  }, [refreshing, debouncedFetchData]);

  useEffect(() => {
    const abortController = new AbortController();
    fetchScheduleData(abortController.signal);

    // Cleanup function to abort request if component unmounts
    return () => {
      abortController.abort();
    };
  }, []);

  // Memoized filter and sort schedules by date/time
  const filterAndSortSchedules = useCallback((schedules: ScheduleItem[]) => {
    const now = new Date();
    
    return schedules
      .filter(schedule => {
        if (!schedule.tanggalScrim || !schedule.startMatch) return false;
        
        try {
          const scrimDate = parseISO(schedule.tanggalScrim);
          
          // If same day, check if time has passed
          if (isSameDay(scrimDate, now)) {
            const [hours, minutes] = schedule.startMatch.split(':').map(Number);
            const scrimDateTime = new Date(scrimDate);
            scrimDateTime.setHours(hours, minutes, 0, 0);
            
            return isAfter(scrimDateTime, now);
          }
          
          // For future dates, always show
          return isAfter(scrimDate, now);
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          const dateA = parseISO(a.tanggalScrim);
          const dateB = parseISO(b.tanggalScrim);
          
          // Sort by date first
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
  }, []);

  // Memoized filtered schedules
  const filteredFraksi1Schedules = useMemo(
    () => filterAndSortSchedules(scheduleData.fraksi1),
    [scheduleData.fraksi1, filterAndSortSchedules]
  );

  const filteredFraksi2Schedules = useMemo(
    () => filterAndSortSchedules(scheduleData.fraksi2),
    [scheduleData.fraksi2, filterAndSortSchedules]
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

  const renderScheduleCards = (filteredSchedules: ScheduleItem[]) => {
    
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
      <div className="space-y-4">
        {filteredSchedules.map((schedule, index) => (
          <Card key={schedule.id} className="group hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 border-gray-700 bg-gradient-to-r from-gray-800 to-gray-850 hover:from-gray-750 hover:to-gray-800">
            <CardContent className="p-6">
              {/* Header with Date & Time */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <CalendarIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {formatDate(schedule.tanggalScrim)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <ClockIcon className="h-4 w-4 text-teal-400" />
                      <span className="text-teal-400 font-medium">{formatTime(schedule.startMatch)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                    Upcoming
                  </span>
                </div>
              </div>

              {/* VS Section */}
              <div className="flex items-center justify-between sm:grid sm:grid-cols-3 sm:gap-4 sm:items-center">
                {/* Our Team - Mobile: Compact, Desktop: Horizontal */}
                <div className="flex items-center gap-2 sm:gap-3 sm:justify-start">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm font-bold">REV</span>
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm sm:text-base sm:font-semibold">REV Team</p>
                    <p className="text-blue-400 text-xs sm:text-sm hidden sm:block">Tim Tuan Rumah</p>
                  </div>
                </div>

                {/* VS Indicator */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                    <span className="text-white font-bold text-xs sm:text-sm">VS</span>
                  </div>
                </div>

                {/* Opponent Team - Mobile: Compact, Desktop: Horizontal */}
                <div className="flex items-center gap-2 flex-row-reverse sm:flex-row sm:gap-3 sm:justify-end">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-500 rounded-full flex items-center justify-center sm:order-2">
                    <UsersIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                  </div>
                  <div className="sm:order-1">
                    <p className="text-white font-medium text-sm sm:text-base sm:font-semibold text-right">{schedule.lawan || 'TBA'}</p>
                    <p className="text-orange-400 text-xs sm:text-sm hidden sm:block text-right">Tim Tamu</p>
                  </div>
                </div>
              </div>

              {/* Map Info */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-300 text-sm">Map:</span>
                    <span className="text-white font-medium">{schedule.map || 'TBA'}</span>
                  </div>
                  
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Jadwal Scrim Mendatang</h2>
         
        </div>
        <Button
          variant="outline"
          size="lg"
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-all duration-200"
        >
          <RefreshCwIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Enhanced Tabs */}
      <Tabs defaultValue="fraksi1" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 h-14 bg-gray-800 border border-gray-700">
          <TabsTrigger 
            value="fraksi1"
            className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-gray-300 font-medium text-base h-12 transition-all duration-200"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              Fraksi 1 
              <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-sm">
                {filteredFraksi1Schedules.length}
              </span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="fraksi2"
            className="data-[state=active]:bg-green-500 data-[state=active]:text-white text-gray-300 font-medium text-base h-12 transition-all duration-200"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              Fraksi 2 
              <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-sm">
                {filteredFraksi2Schedules.length}
              </span>
            </div>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="fraksi1" className="space-y-6 mt-0">
          {renderScheduleCards(filteredFraksi1Schedules)}
        </TabsContent>
        
        <TabsContent value="fraksi2" className="space-y-6 mt-0">
          {renderScheduleCards(filteredFraksi2Schedules)}
        </TabsContent>
      </Tabs>
    </div>
  );
}