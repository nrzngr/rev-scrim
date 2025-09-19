"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { id as localeId } from 'date-fns/locale';
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
  status: "win" | "loss" | "draw";
  revScore: number;
  opponentScore: number;
}

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [scheduleData, setScheduleData] = useState<ScheduleData>({
    fraksi1: [],
    fraksi2: []
  });
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch schedule data
  const fetchScheduleData = useCallback(async () => {
    try {
      const [fraksi1Response, fraksi2Response] = await Promise.all([
        fetch('/api/sheets/fetch?fraksi=Fraksi 1'),
        fetch('/api/sheets/fetch?fraksi=Fraksi 2')
      ]);

      // Check if responses are ok before parsing JSON
      if (!fraksi1Response.ok) {
        console.error('Fraksi 1 fetch failed:', fraksi1Response.status, fraksi1Response.statusText);
        return;
      }
      
      if (!fraksi2Response.ok) {
        console.error('Fraksi 2 fetch failed:', fraksi2Response.status, fraksi2Response.statusText);
        return;
      }

      const fraksi1Data = await fraksi1Response.json();
      const fraksi2Data = await fraksi2Response.json();

      if (fraksi1Data.ok && fraksi2Data.ok) {
        setScheduleData({
          fraksi1: fraksi1Data.data || [],
          fraksi2: fraksi2Data.data || []
        });
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    }
  }, []);

  // Fetch match results
  const fetchMatchResults = useCallback(async () => {
    try {
      const response = await fetch('/api/match-results');
      
      if (!response.ok) {
        console.error('Match results fetch failed:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      
      if (data.ok) {
        setMatchResults(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching match results:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchScheduleData(),
        fetchMatchResults()
      ]);
      setLoading(false);
    };
    
    loadData();
  }, [fetchScheduleData, fetchMatchResults]);

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

  // Get calendar days with proper week alignment
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(start, { weekStartsOn: 0 }); // Start on Sunday
    const calendarEnd = endOfWeek(end, { weekStartsOn: 0 }); // End on Saturday
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Get matches for a specific date
  const getMatchesForDate = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const allMatches = [
      ...scheduleData.fraksi1.map(match => ({ ...match, fraksi: 'Fraksi 1' as const })),
      ...scheduleData.fraksi2.map(match => ({ ...match, fraksi: 'Fraksi 2' as const }))
    ];
    
    return allMatches.filter(match => match.tanggalScrim === dateStr);
  }, [scheduleData]);

  // Get match result for a schedule
  const getMatchResult = useCallback((scheduleId: number) => {
    return matchResults.find(result => result.scheduleId === scheduleId);
  }, [matchResults]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(direction === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };


  if (loading) {
    return (
      <div className="space-y-4 px-2 sm:px-0">
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
            Calendar View
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="h-14 sm:h-10 bg-gray-700 rounded-xl animate-pulse"></div>
            <div className="w-full sm:w-20 h-12 sm:h-10 bg-gray-700 rounded-xl sm:rounded-md animate-pulse"></div>
          </div>
        </div>
        <div className="h-4 bg-gray-700 rounded-xl animate-pulse"></div>
        <div className="bg-gray-800/50 rounded-xl p-2 sm:p-4">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-6 bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-[100px] bg-gray-700 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-700 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-2 sm:px-0 sm:py-0">
      {/* Mobile-First Header */}
      <div className="space-y-6">
        <h2 className="text-2xl sm:text-2xl font-bold text-white flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 sm:h-6 sm:w-6 text-blue-400" />
          Calendar View
        </h2>
        
        {/* Mobile-optimized navigation */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center justify-center bg-gray-800/50 rounded-xl p-1 order-2 sm:order-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-14 sm:h-10 px-5 sm:px-3 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg"
            >
              <ChevronLeftIcon className="h-6 w-6 sm:h-4 sm:w-4" />
            </Button>
            <span className="px-8 sm:px-4 py-4 sm:py-2 text-white font-semibold text-xl sm:text-base min-w-[180px] sm:min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: localeId })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-14 sm:h-10 px-5 sm:px-3 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg"
            >
              <ChevronRightIcon className="h-6 w-6 sm:h-4 sm:w-4" />
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 h-14 sm:h-10 text-lg sm:text-sm rounded-xl sm:rounded-md"
            >
              Today
            </Button>
            
            <AddToCalendarButton
              schedule={{
                id: 0,
                tanggalScrim: new Date().toISOString().split('T')[0],
                lawan: 'All Matches',
                map: 'Various',
                startMatch: '19:00'
              }}
              fraksi="fraksi1"
              className="h-14 sm:h-10 text-lg sm:text-sm rounded-xl sm:rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Mobile-optimized Legend */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-4 text-base bg-gray-800/30 rounded-xl p-4 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 sm:w-3 sm:h-3 bg-blue-500 rounded"></div>
          <span className="text-gray-300 font-medium">Fraksi 1</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 sm:w-3 sm:h-3 bg-green-500 rounded"></div>
          <span className="text-gray-300 font-medium">Fraksi 2</span>
        </div>
      </div>

      {/* Mobile-First Calendar Grid */}
      <Card className="bg-gray-900/60 border-gray-700/80 rounded-xl sm:rounded-lg overflow-hidden backdrop-blur-sm">
        <CardContent className="p-4 sm:p-4">
          {/* Week headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4 sm:mb-4">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
              <div key={day} className="p-3 sm:p-2 text-center text-sm sm:text-sm font-semibold text-gray-300">
                {day}
              </div>
            ))}
          </div>

          {/* Simplified mobile calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const matches = getMatchesForDate(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const hasMatches = matches.length > 0;
              
              return (
                <div
                  key={day.toString()}
                  className={`min-h-[120px] p-3 rounded-xl border overflow-hidden ${
                    isCurrentMonth
                      ? isToday
                        ? 'bg-blue-500/20 border-blue-400/60'
                        : hasMatches
                          ? 'bg-gray-700/40 border-gray-600'
                          : 'bg-gray-800/20 border-gray-700/40'
                      : 'bg-gray-900/20 border-gray-800/40'
                  }`}
                >
                  {/* Simplified date number */}
                  <div className={`text-base font-bold mb-2 text-center ${
                    isCurrentMonth
                      ? isToday ? 'text-blue-300' : 'text-white'
                      : 'text-gray-500'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  
                  {/* Clean minimal indicators */}
                  {hasMatches && (
                    <div className="flex flex-col items-center space-y-2">
                      {/* Simple colored bar indicators */}
                      <div className="flex gap-1.5 w-full justify-center">
                        {matches.slice(0, 3).map(match => {
                          const result = getMatchResult(match.id);
                          return (
                            <div
                              key={`${match.id}-${match.fraksi}`}
                              className={`h-3 flex-1 rounded-full ${
                                match.fraksi === 'Fraksi 1'
                                  ? result
                                    ? result.status === 'win'
                                      ? 'bg-blue-400'
                                      : result.status === 'loss'
                                        ? 'bg-blue-600'
                                        : 'bg-blue-500'
                                    : 'bg-blue-300'
                                  : result
                                    ? result.status === 'win'
                                      ? 'bg-green-400'
                                      : result.status === 'loss'
                                        ? 'bg-green-600'
                                        : 'bg-green-500'
                                    : 'bg-green-300'
                              }`}
                            />
                          );
                        })}
                      </div>
                      
                      {/* Simple count for multiple matches */}
                      {matches.length > 3 && (
                        <div className="text-xs text-gray-400 font-medium">
                          +{matches.length - 3}
                        </div>
                      )}
                      
                      {/* Show time for single match */}
                      {matches.length === 1 && (
                        <div className="text-xs text-gray-300 font-medium">
                          {matches[0].startMatch}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Mobile-First Summary Stats - Simple and Clean */}
      <div className="grid grid-cols-2 gap-4 sm:gap-4">
        <Card className="bg-gray-800/40 border-gray-700/60 rounded-xl">
          <CardContent className="p-5 sm:p-5">
            <div className="flex items-center gap-3 mb-4">
              <CalendarIcon className="h-6 w-6 sm:h-4 sm:w-4 text-blue-400" />
              <span className="text-base font-medium text-gray-300">Total</span>
            </div>
            <div className="text-3xl sm:text-3xl font-bold text-white mb-2">
              {calendarDays.reduce((count, day) => count + getMatchesForDate(day).length, 0)}
            </div>
            <div className="text-sm text-gray-400">Matches</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/40 border-gray-700/60 rounded-xl">
          <CardContent className="p-5 sm:p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 sm:w-4 sm:h-4 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
              <span className="text-base font-medium text-gray-300">Done</span>
            </div>
            <div className="text-3xl sm:text-3xl font-bold text-white mb-2">
              {calendarDays.reduce((count, day) => {
                const dayMatches = getMatchesForDate(day);
                return count + dayMatches.filter(match => isMatchCompleted(match)).length;
              }, 0)}
            </div>
            <div className="text-sm text-gray-400">Played</div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Matches Section */}
      <Card className="bg-gray-800/40 border-gray-700/60 rounded-xl">
        <CardContent className="p-5 sm:p-5">
          <div className="flex items-center gap-3 mb-6">
            <CalendarIcon className="h-6 w-6 text-blue-400" />
            <h3 className="text-xl font-semibold text-white">Upcoming Matches</h3>
          </div>
          
          <div className="space-y-4">
            {(() => {
              // Get upcoming matches (not completed)
              const upcomingMatches = [];
              const today = new Date();
              
              // Look at the next 14 days
              for (let i = 0; i < 14; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                const dayMatches = getMatchesForDate(date);
                
                for (const match of dayMatches) {
                  if (!isMatchCompleted(match)) {
                    upcomingMatches.push({
                      ...match,
                      dateObj: date,
                      dateString: format(date, 'yyyy-MM-dd')
                    });
                  }
                }
              }
              
              // Sort by date and time
              upcomingMatches.sort((a, b) => {
                if (a.dateString !== b.dateString) {
                  return a.dateString.localeCompare(b.dateString);
                }
                return a.startMatch.localeCompare(b.startMatch);
              });
              
              // Show up to 3 upcoming matches
              const matchesToShow = upcomingMatches.slice(0, 3);
              
              if (matchesToShow.length === 0) {
                return (
                  <div className="text-center py-6 text-gray-400 text-base">
                    No upcoming matches in the next 14 days
                  </div>
                );
              }
              
              return matchesToShow.map(match => (
                <div key={`${match.id}-${match.fraksi}`} className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/30">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-sm font-medium px-3 py-1.5 rounded-lg ${
                          match.fraksi === 'Fraksi 1' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                        }`}>
                          {match.fraksi}
                        </span>
                        <span className="text-sm text-gray-400">
                          {format(match.dateObj, 'dd MMM')}
                        </span>
                        <span className="text-sm text-gray-400">
                          {match.startMatch}
                        </span>
                      </div>
                      <div className="text-lg font-medium text-white mb-1">
                        vs {match.lawan}
                      </div>
                      <div className="text-sm text-gray-400">
                        {match.map}
                      </div>
                    </div>
                    <div className="flex justify-center sm:justify-start">
                      <AddToCalendarButton
                        schedule={match}
                        fraksi={match.fraksi as "fraksi1" | "fraksi2"}
                      />
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}