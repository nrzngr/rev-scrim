"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  UsersIcon, 
  SearchIcon,
  FilterIcon
} from "lucide-react";
import { parseISO, isAfter, subMonths, startOfWeek, endOfWeek, isThisWeek, isThisMonth } from "date-fns";

interface AttendanceRecord {
  id: number;
  scheduleId: number;
  fraksi: string;
  playerName: string;
  status: "available" | "unavailable";
  reason: string;
  timestamp: string;
}

interface PlayerAttendanceStats {
  playerName: string;
  totalMatches: number;
  available: number;
  unavailable: number;
  availabilityRate: number;
  mostCommonReason: string;
  lastStatus: "available" | "unavailable";
  lastMatchDate: string;
  consecutiveUnavailable: number;
}

interface FraksiAttendanceStats {
  fraksi: string;
  totalMatches: number;
  totalPlayers: number;
  averageAvailability: number;
  mostUnavailablePlayer: string;
  leastUnavailablePlayer: string;
  commonReasons: Array<{ reason: string; count: number }>;
}

interface TimePeriodStats {
  period: string;
  totalMatches: number;
  totalUnavailable: number;
  averageUnavailable: number;
  mostUnavailablePlayer: string;
  trend: "up" | "down" | "stable";
}

export function AttendanceHistoryDashboard() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerAttendanceStats[]>([]);
  const [fraksiStats, setFraksiStats] = useState<FraksiAttendanceStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFraksi, setSelectedFraksi] = useState<"all" | "Fraksi 1" | "Fraksi 2">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<"all" | "week" | "month" | "3months">("all");
  const [activeView, setActiveView] = useState<"roster" | "teams">("roster");

  const fetchAttendanceData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/attendance');
      const data = await response.json();
      
      if (data.ok) {
        setAttendanceRecords(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  useEffect(() => {
    if (attendanceRecords.length === 0) return;

    // Filter records based on selected period
    const filteredRecords = attendanceRecords.filter(record => {
      const recordDate = parseISO(record.timestamp);
      
      switch (selectedPeriod) {
        case "week":
          return isThisWeek(recordDate, { weekStartsOn: 1 });
        case "month":
          return isThisMonth(recordDate);
        case "3months":
          return isAfter(recordDate, subMonths(new Date(), 3));
        default:
          return true;
      }
    });

    // Calculate player statistics
    const playerData: Record<string, PlayerAttendanceStats> = {};
    
    // Group records by player
    const playerRecords: Record<string, AttendanceRecord[]> = {};
    filteredRecords.forEach(record => {
      if (!playerRecords[record.playerName]) {
        playerRecords[record.playerName] = [];
      }
      playerRecords[record.playerName].push(record);
    });

    // Calculate stats for each player
    Object.entries(playerRecords).forEach(([playerName, records]) => {
      const sortedRecords = records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const totalMatches = records.length;
      const available = records.filter(r => r.status === "available").length;
      const unavailable = records.filter(r => r.status === "unavailable").length;
      const availabilityRate = totalMatches > 0 ? Math.round((available / totalMatches) * 100) : 100;

      // Find most common reason for unavailability
      const reasonCounts: Record<string, number> = {};
      records.filter(r => r.status === "unavailable").forEach(r => {
        const reason = r.reason || "No reason provided";
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });
      const mostCommonReason = Object.entries(reasonCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || "";

      // Calculate consecutive unavailable streaks
      let consecutiveUnavailable = 0;
      let maxConsecutive = 0;
      sortedRecords.forEach(record => {
        if (record.status === "unavailable") {
          consecutiveUnavailable++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveUnavailable);
        } else {
          consecutiveUnavailable = 0;
        }
      });

      playerData[playerName] = {
        playerName,
        totalMatches,
        available,
        unavailable,
        availabilityRate,
        mostCommonReason,
        lastStatus: sortedRecords[0]?.status || "available",
        lastMatchDate: sortedRecords[0]?.timestamp || "",
        consecutiveUnavailable: maxConsecutive
      };
    });

    setPlayerStats(Object.values(playerData).sort((a, b) => 
      a.availabilityRate - b.availabilityRate || a.playerName.localeCompare(b.playerName)
    ));

    // Calculate fraksi statistics
    const fraksiData: Record<string, FraksiAttendanceStats> = {};
    
    // Group records by fraksi
    const fraksiRecords: Record<string, AttendanceRecord[]> = {
      "Fraksi 1": filteredRecords.filter(r => r.fraksi === "Fraksi 1"),
      "Fraksi 2": filteredRecords.filter(r => r.fraksi === "Fraksi 2")
    };

    Object.entries(fraksiRecords).forEach(([fraksi, records]) => {
      // There are a fixed 30 players for each fraksi
      const totalPlayers = 30;
      const totalMatches = Math.max(...records.map(r => r.scheduleId));
      const totalUnavailable = records.filter(r => r.status === "unavailable").length;
      // The total possible attendance records is totalPlayers * totalMatches
      const totalPossibleRecords = totalPlayers * totalMatches;
      const averageAvailability = totalPossibleRecords > 0 
        ? Math.round(((totalPossibleRecords - totalUnavailable) / totalPossibleRecords) * 100) 
        : 100;

      // Find most and least unavailable players
      const playerUnavailability: Record<string, number> = {};
      records.filter(r => r.status === "unavailable").forEach(r => {
        playerUnavailability[r.playerName] = (playerUnavailability[r.playerName] || 0) + 1;
      });

      const sortedByUnavailability = Object.entries(playerUnavailability)
        .sort(([,a], [,b]) => b - a);

      // Find common reasons
      const reasonCounts: Record<string, number> = {};
      records.filter(r => r.status === "unavailable").forEach(r => {
        const reason = r.reason || "No reason provided";
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });

      const commonReasons = Object.entries(reasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      fraksiData[fraksi] = {
        fraksi,
        totalMatches,
        totalPlayers: totalPlayers,
        averageAvailability,
        mostUnavailablePlayer: sortedByUnavailability[0]?.[0] || "",
        leastUnavailablePlayer: sortedByUnavailability[sortedByUnavailability.length - 1]?.[0] || "",
        commonReasons
      };
    });

    setFraksiStats(Object.values(fraksiData));

    // Calculate time period statistics
    const periodData: TimePeriodStats[] = [];
    const now = new Date();
    
    // Generate last 12 weeks of data
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subMonths(now, 0), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subMonths(now, 0), { weekStartsOn: 1 });
      
      const weekRecords = filteredRecords.filter(record => {
        const recordDate = parseISO(record.timestamp);
        return recordDate >= weekStart && recordDate <= weekEnd;
      });

      const totalMatches = new Set(weekRecords.map(r => r.scheduleId)).size;
      const totalUnavailable = weekRecords.filter(r => r.status === "unavailable").length;
      const averageUnavailable = totalMatches > 0 ? Math.round((totalUnavailable / totalMatches) * 10) / 10 : 0;

      // Find most unavailable player for this period
      const playerUnavailability: Record<string, number> = {};
      weekRecords.filter(r => r.status === "unavailable").forEach(r => {
        playerUnavailability[r.playerName] = (playerUnavailability[r.playerName] || 0) + 1;
      });

      const mostUnavailablePlayer = Object.entries(playerUnavailability)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || "";

      periodData.push({
        period: `Week ${12 - i}`,
        totalMatches,
        totalUnavailable,
        averageUnavailable,
        mostUnavailablePlayer,
        trend: "stable" // Will be calculated below
      });
    }

    // Calculate trends
    for (let i = 1; i < periodData.length; i++) {
      const current = periodData[i].averageUnavailable;
      const previous = periodData[i - 1].averageUnavailable;
      
      if (current > previous + 0.5) {
        periodData[i].trend = "up";
      } else if (current < previous - 0.5) {
        periodData[i].trend = "down";
      } else {
        periodData[i].trend = "stable";
      }
    }

    // timePeriodStats is not used in the component

  }, [attendanceRecords, selectedPeriod]);

  const getFilteredPlayerStats = () => {
    let filtered = playerStats;
    
    if (selectedFraksi !== "all") {
      // This would need to be implemented with additional data about which players belong to which fraksi
      // For now, we'll filter based on the attendance records
      const fraksiRecords = attendanceRecords.filter(r => r.fraksi === selectedFraksi);
      const fraksiPlayers = new Set(fraksiRecords.map(r => r.playerName));
      filtered = filtered.filter(stat => fraksiPlayers.has(stat.playerName));
    }
    
    if (searchTerm) {
      filtered = filtered.filter(stat => 
        stat.playerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getOverallStats = () => {
    const filtered = getFilteredPlayerStats();
    const totalPlayers = filtered.length;
    const totalMatches = filtered.reduce((sum, stat) => sum + stat.totalMatches, 0);
    const totalUnavailable = filtered.reduce((sum, stat) => sum + stat.unavailable, 0);
    const averageAvailability = totalMatches > 0 ? Math.round(((totalMatches - totalUnavailable) / totalMatches) * 100) : 100;
    
    return {
      totalPlayers,
      totalMatches,
      totalUnavailable,
      averageAvailability
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-700 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const overallStats = getOverallStats();
  const filteredPlayerStats = getFilteredPlayerStats();

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl lg:text-2xl font-bold text-white mb-1 lg:mb-2 truncate">Attendance History Dashboard</h2>
          <p className="text-sm lg:text-base text-gray-400 line-clamp-2">Track player availability and attendance patterns</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 w-full text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "Fraksi 1", "Fraksi 2"] as const).map((fraksi) => (
              <Button
                key={fraksi}
                variant={selectedFraksi === fraksi ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFraksi(fraksi)}
                className={selectedFraksi === fraksi 
                  ? "bg-blue-500 hover:bg-blue-600 text-xs px-2 sm:px-3" 
                  : "border-gray-600 text-gray-400 hover:text-white text-xs px-2 sm:px-3"
                }
              >
                {fraksi === "all" ? "All" : fraksi}
              </Button>
            ))}
          </div>
        </div>
      </div>


      {/* Period Filter */}
      <div className="flex flex-wrap gap-2">
        {(["all", "week", "month", "3months"] as const).map((period) => (
          <Button
            key={period}
            variant={selectedPeriod === period ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPeriod(period)}
            className={selectedPeriod === period 
              ? "bg-blue-500 hover:bg-blue-600 text-xs px-2 sm:px-3" 
              : "border-gray-600 text-gray-400 hover:text-white text-xs px-2 sm:px-3"
            }
          >
            {period === "all" ? "All Time" : 
             period === "week" ? "This Week" : 
             period === "month" ? "This Month" : "Last 3 Months"}
          </Button>
        ))}
      </div>

      {/* Redesigned Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
        <Button
          variant={activeView === "roster" ? "default" : "outline"}
          onClick={() => setActiveView("roster")}
          className={`h-auto p-4 sm:p-6 flex flex-col items-center justify-center gap-2 sm:gap-3 rounded-xl transition-all duration-300 ${
            activeView === "roster"
              ? "bg-gradient-to-br from-blue-600 to-blue-800 text-white border-blue-500 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
              : "bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700/50 hover:text-white hover:border-gray-600"
          }`}
        >
          <UsersIcon className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10" />
          <span className="text-base sm:text-lg lg:text-xl font-semibold">Roster</span>
          <span className="text-xs sm:text-sm text-center opacity-80">Player Statistics</span>
        </Button>

        <Button
          variant={activeView === "teams" ? "default" : "outline"}
          onClick={() => setActiveView("teams")}
          className={`h-auto p-4 sm:p-6 flex flex-col items-center justify-center gap-2 sm:gap-3 rounded-xl transition-all duration-300 ${
            activeView === "teams"
              ? "bg-gradient-to-br from-green-600 to-green-800 text-white border-green-500 shadow-lg shadow-green-500/30 hover:shadow-green-500/40"
              : "bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700/50 hover:text-white hover:border-gray-600"
          }`}
        >
          <FilterIcon className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10" />
          <span className="text-base sm:text-lg lg:text-xl font-semibold">Teams</span>
          <span className="text-xs sm:text-sm text-center opacity-80">Fraksi Statistics</span>
        </Button>
      </div>

      {/* Content based on activeView */}
      {activeView === "roster" && (
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-900/80 border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
            <CardHeader className="pb-3 lg:pb-4">
                <CardTitle className="text-white text-base sm:text-lg lg:text-xl flex items-center gap-2">
                  <div className="w-2 h-2 lg:w-3 lg:h-3 bg-blue-400 rounded-full"></div>
                  Player Attendance Statistics
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {filteredPlayerStats.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-400">
                  <UsersIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                  <p className="text-sm sm:text-base">No player data available</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4 lg:space-y-5">
                  {filteredPlayerStats.map((player) => (
                    <div key={player.playerName} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 lg:p-5 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 mb-2">
                          <h3 className="font-medium text-white text-sm sm:text-base lg:text-lg truncate">{player.playerName}</h3>
                          <Badge variant={player.lastStatus === "available" ? "default" : "destructive"}
                                  className={player.lastStatus === "available" 
                                    ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs sm:text-sm" 
                                    : "bg-red-500/20 text-red-400 border-red-500/30 text-xs sm:text-sm"
                                  }>
                            {player.lastStatus === "available" ? "Available" : "Unavailable"}
                          </Badge>
                          {player.consecutiveUnavailable > 2 && (
                            <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30 text-xs sm:text-sm">
                              {player.consecutiveUnavailable} streak
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 text-xs sm:text-sm lg:text-base">
                          <span className="text-gray-400">
                            {player.totalMatches} matches • {player.available} available • {player.unavailable} unavailable
                          </span>
                          {player.mostCommonReason && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <span className="text-gray-400 whitespace-nowrap">Most common:</span>
                              <span className="text-gray-300 break-words">{player.mostCommonReason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 flex-shrink-0">
                        <div className="text-right min-w-0">
                          <p className="text-xs text-gray-400">Availability Rate</p>
                          <p className={`text-base sm:text-lg lg:text-xl font-semibold ${player.availabilityRate >= 90 ? 'text-green-400' : player.availabilityRate >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {player.availabilityRate}%
                          </p>
                        </div>
                        <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 relative">
                          <svg className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 transform -rotate-90" viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845
                                a 15.9155 15.9155 0 0 1 0 31.831
                                a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeDasharray={`${player.availabilityRate}, 100`}
                              className={player.availabilityRate >= 90 ? 'text-green-400' : player.availabilityRate >= 80 ? 'text-yellow-400' : 'text-red-400'}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs sm:text-sm font-medium text-white">{player.availabilityRate}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}


      {activeView === "teams" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {fraksiStats.map((fraksi) => (
              <Card key={fraksi.fraksi} className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base sm:text-lg">{fraksi.fraksi} Statistics</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-400">Total Players</p>
                        <p className="text-lg sm:text-xl font-bold text-white">{fraksi.totalPlayers}</p>
                      </div>
                      <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-400">Avg Availability</p>
                        <p className={`text-lg sm:text-xl font-bold ${fraksi.averageAvailability >= 85 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {fraksi.averageAvailability}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm sm:text-base">Most Unavailable Player</span>
                        <span className="text-white font-medium text-sm sm:text-base truncate">{fraksi.mostUnavailablePlayer || "N/A"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm sm:text-base">Least Unavailable Player</span>
                        <span className="text-white font-medium text-sm sm:text-base truncate">{fraksi.leastUnavailablePlayer || "N/A"}</span>
                      </div>
                    </div>
                    
                    {fraksi.commonReasons.length > 0 && (
                      <div>
                        <p className="text-xs sm:text-sm text-gray-400 mb-2">Common Reasons for Unavailability</p>
                        <div className="space-y-2">
                          {fraksi.commonReasons.slice(0, 3).map((reason, index) => (
                            <div key={index} className="flex items-center justify-between text-xs sm:text-sm">
                              <span className="text-gray-300 truncate">{reason.reason}</span>
                              <Badge variant="secondary" className="bg-gray-600 text-gray-300 text-xs">
                                {reason.count}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
