"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  TrophyIcon, 
  UsersIcon, 
  BarChart3Icon
} from "lucide-react";
import { format, parseISO, isAfter, isBefore, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { id as localeId } from 'date-fns/locale';

// --- INTERFACES ---

interface MatchResult {
  id: number;
  scheduleId: number;
  fraksi: string;
  opponent: string;
  revScore: number;
  opponentScore: number;
  status: "win" | "loss" | "draw";
  notes: string;
  recordedBy: string;
  timestamp: string;
  // Esports specific (placeholders for now)
  map?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
}

interface TeamStats {
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalScored: number;
  totalConceded: number;
  averageScored: number;
  averageConceded: number;
  cleanSheets: number;
  // Esports specific
  kdRatio: number; // Kill/Death Ratio
  currentStreak: number; // Positive for win streak, negative for loss streak
  highestWin: { score: number; opponent: string; map?: string };
  highestLoss: { score: number; opponent: string; map?: string };
}

interface MapStats {
  mapName: string;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  averageScored: number;
  averageConceded: number;
}

interface FormStats {
  period: string; // e.g., "Last 5", "Last 10"
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  kdRatio: number;
}

interface OpponentStats {
  opponent: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  averageScored: number;
  averageConceded: number;
  lastMatch: string;
  lastMatchResult: "win" | "loss" | "draw";
}

// --- COMPONENT ---

export function StatisticsDashboard() {
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [teamStats, setTeamStats] = useState<{ fraksi1: TeamStats; fraksi2: TeamStats } | null>(null);
  const [mapStats, setMapStats] = useState<MapStats[]>([]);
  const [formStats, setFormStats] = useState<FormStats[]>([]);
  const [opponentStats, setOpponentStats] = useState<OpponentStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFraksi, setSelectedFraksi] = useState<"all" | "Fraksi 1" | "Fraksi 2">("all");

  const fetchMatchResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/match-results');
      const data = await response.json();
      
      if (data.ok) {
        // Simulating esports data for demonstration
        const simulatedData = (data.data || []).map((match: MatchResult, index: number) => ({
          ...match,
          map: ["Haven", "Bind", "Split", "Ascent", "Icebox"][index % 5],
          kills: Math.floor(Math.random() * 30) + 10,
          deaths: Math.floor(Math.random() * 20) + 5,
          assists: Math.floor(Math.random() * 15) + 2,
        }));
        setMatchResults(simulatedData);
      }
    } catch (error) {
      console.error('Error fetching match results:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatchResults();
  }, [fetchMatchResults]);

  useEffect(() => {
    if (matchResults.length === 0) return;

    const fraksi1Results = matchResults.filter(r => r.fraksi === "Fraksi 1");
    const fraksi2Results = matchResults.filter(r => r.fraksi === "Fraksi 2");

    const calculateTeamStats = (results: MatchResult[]): TeamStats => {
      const wins = results.filter(r => r.status === 'win').length;
      const losses = results.filter(r => r.status === 'loss').length;
      const draws = results.filter(r => r.status === 'draw').length;
      const total = results.length;
      
      const totalKills = results.reduce((sum, r) => sum + (r.kills || 0), 0);
      const totalDeaths = results.reduce((sum, r) => sum + (r.deaths || 0), 0);
      const kdRatio = totalDeaths > 0 ? Math.round((totalKills / totalDeaths) * 100) / 100 : 0;

      // Calculate current streak
      let currentStreak = 0;
      let streakType: 'win' | 'loss' | null = null;
      const sortedResults = [...results].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      for (const match of sortedResults) {
        if (streakType === null) {
          // Streak starts with a win or loss, a draw is ignored for starting a streak
          if (match.status !== 'draw') {
            streakType = match.status;
            currentStreak = 1;
          }
        } else if (match.status === streakType) {
          currentStreak++;
        } else {
          // A different result or a draw breaks the streak
          break;
        }
      }
      currentStreak = streakType === 'loss' ? -currentStreak : currentStreak;
      
      const totalScored = results.reduce((sum, r) => sum + r.revScore, 0);
      const totalConceded = results.reduce((sum, r) => sum + r.opponentScore, 0);
      
      const cleanSheets = results.filter(r => r.opponentScore === 0 && r.status === 'win').length;
      
      const highestWin = results
        .filter(r => r.status === 'win')
        .reduce((best, current) => {
          const scoreDiff = current.revScore - current.opponentScore;
          const bestDiff = best.revScore - best.opponentScore;
          return scoreDiff > bestDiff ? current : best;
        }, results[0] || { revScore: 0, opponentScore: 0, opponent: '', map: '' });
      
      const highestLoss = results
        .filter(r => r.status === 'loss')
        .reduce((worst, current) => {
          const scoreDiff = current.opponentScore - current.revScore;
          const worstDiff = worst.opponentScore - worst.revScore;
          return scoreDiff > worstDiff ? current : worst;
        }, results[0] || { revScore: 0, opponentScore: 0, opponent: '', map: '' });

      return {
        totalMatches: total,
        wins,
        losses,
        draws,
        winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
        totalScored,
        totalConceded,
        averageScored: total > 0 ? Math.round((totalScored / total) * 10) / 10 : 0,
        averageConceded: total > 0 ? Math.round((totalConceded / total) * 10) / 10 : 0,
        cleanSheets,
        kdRatio,
        currentStreak,
        highestWin: { score: highestWin.revScore, opponent: highestWin.opponent, map: highestWin.map },
        highestLoss: { score: highestWin.opponentScore, opponent: highestWin.opponent, map: highestWin.map }
      };
    };

    setTeamStats({
      fraksi1: calculateTeamStats(fraksi1Results),
      fraksi2: calculateTeamStats(fraksi2Results)
    });

    // Calculate Map Statistics
    const mapData: Record<string, MapStats> = {};
    const allResults = selectedFraksi === "all" ? matchResults : matchResults.filter(r => r.fraksi === selectedFraksi);
    allResults.forEach(result => {
      if (!result.map) return;
      if (!mapData[result.map]) {
        mapData[result.map] = {
          mapName: result.map,
          matches: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          averageScored: 0,
          averageConceded: 0
        };
      }
      const map = mapData[result.map];
      map.matches++;
      // Calculate running totals for average calculation
      const currentTotalScored = (map.averageScored * (map.matches - 1)) + result.revScore;
      const currentTotalConceded = (map.averageConceded * (map.matches - 1)) + result.opponentScore;
      map.averageScored = Math.round((currentTotalScored / map.matches) * 10) / 10;
      map.averageConceded = Math.round((currentTotalConceded / map.matches) * 10) / 10;
      if (result.status === 'win') map.wins++;
      else if (result.status === 'loss') map.losses++;
      map.winRate = Math.round((map.wins / map.matches) * 100);
    });
    setMapStats(Object.values(mapData).sort((a, b) => b.matches - a.matches));

    // Calculate Form Statistics
    const formPeriods = [5, 10, 15];
    const newFormStats: FormStats[] = formPeriods.map(period => {
      const recentMatches = allResults.slice(0, period);
      const wins = recentMatches.filter(r => r.status === 'win').length;
      const losses = recentMatches.filter(r => r.status === 'loss').length;
      const totalKills = recentMatches.reduce((sum, r) => sum + (r.kills || 0), 0);
      const totalDeaths = recentMatches.reduce((sum, r) => sum + (r.deaths || 0), 0);
      const kdRatio = totalDeaths > 0 ? Math.round((totalKills / totalDeaths) * 100) / 100 : 0;

      return {
        period: `Last ${period}`,
        matches: recentMatches.length,
        wins,
        losses,
        winRate: recentMatches.length > 0 ? Math.round((wins / recentMatches.length) * 100) : 0,
        kdRatio
      };
    });
    setFormStats(newFormStats);

    // Calculate Opponent Statistics
    const opponentData: Record<string, OpponentStats> = {};
    allResults.forEach(result => {
      if (!opponentData[result.opponent]) {
        opponentData[result.opponent] = {
          opponent: result.opponent,
          matches: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          winRate: 0,
          averageScored: 0,
          averageConceded: 0,
          lastMatch: result.timestamp,
          lastMatchResult: result.status
        };
      }
      
      const opp = opponentData[result.opponent];
      opp.matches++;
      opp.averageScored = (opp.averageScored * (opp.matches - 1) + result.revScore) / opp.matches;
      opp.averageConceded = (opp.averageConceded * (opp.matches - 1) + result.opponentScore) / opp.matches;
      opp.lastMatch = result.timestamp;
      opp.lastMatchResult = result.status;
      
      if (result.status === 'win') opp.wins++;
      else if (result.status === 'loss') opp.losses++;
      else opp.draws++;
      
      opp.winRate = Math.round((opp.wins / opp.matches) * 100);
      opp.averageScored = Math.round(opp.averageScored * 10) / 10;
      opp.averageConceded = Math.round(opp.averageConceded * 10) / 10;
    });

    setOpponentStats(Object.values(opponentData).sort((a, b) => 
      b.matches - a.matches || b.winRate - a.winRate
    ));

  }, [matchResults, selectedFraksi]);

  const getFilteredResults = () => {
    if (selectedFraksi === "all") return matchResults;
    return matchResults.filter(r => r.fraksi === selectedFraksi);
  };

  const getFilteredStats = () => {
    if (!teamStats) return null;
    
    if (selectedFraksi === "all") {
      const total = teamStats.fraksi1.totalMatches + teamStats.fraksi2.totalMatches;
      const wins = teamStats.fraksi1.wins + teamStats.fraksi2.wins;
      const losses = teamStats.fraksi1.losses + teamStats.fraksi2.losses;
      const draws = teamStats.fraksi1.draws + teamStats.fraksi2.draws;
      const totalScored = teamStats.fraksi1.totalScored + teamStats.fraksi2.totalScored;
      const totalConceded = teamStats.fraksi1.totalConceded + teamStats.fraksi2.totalConceded;
      const totalKills = (teamStats.fraksi1.kdRatio * teamStats.fraksi1.totalMatches) + (teamStats.fraksi2.kdRatio * teamStats.fraksi2.totalMatches);
      const totalDeaths = teamStats.fraksi1.totalMatches + teamStats.fraksi2.totalMatches; // Placeholder for actual deaths
      const kdRatio = totalDeaths > 0 ? Math.round((totalKills / totalDeaths) * 100) / 100 : 0;
      
      // Determine overall streak (simplified logic)
      const fraksi1Streak = teamStats.fraksi1.currentStreak;
      const fraksi2Streak = teamStats.fraksi2.currentStreak;
      const currentStreak = Math.abs(fraksi1Streak) > Math.abs(fraksi2Streak) ? fraksi1Streak : fraksi2Streak;

      return {
        totalMatches: total,
        wins,
        losses,
        draws,
        winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
        totalScored,
        totalConceded,
        averageScored: total > 0 ? Math.round((totalScored / total) * 10) / 10 : 0,
        averageConceded: total > 0 ? Math.round((totalConceded / total) * 10) / 10 : 0,
        cleanSheets: teamStats.fraksi1.cleanSheets + teamStats.fraksi2.cleanSheets,
        kdRatio,
        currentStreak,
        highestWin: teamStats.fraksi1.highestWin.score > teamStats.fraksi2.highestWin.score 
          ? teamStats.fraksi1.highestWin 
          : teamStats.fraksi2.highestWin,
        highestLoss: teamStats.fraksi1.highestLoss.score > teamStats.fraksi2.highestLoss.score 
          ? teamStats.fraksi1.highestLoss 
          : teamStats.fraksi2.highestLoss
      };
    }
    
    return teamStats[selectedFraksi === "Fraksi 1" ? "fraksi1" : "fraksi2"];
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

  const stats = getFilteredStats();
  const recentMatches = getFilteredResults().slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header with Fraksi Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2 truncate">Delta Force Performance Hub</h2>
          <p className="text-sm sm:text-base text-gray-400 line-clamp-2">Esports team analytics and performance trends</p>
        </div>
        <div className="flex flex-wrap gap-2 min-w-0">
          {(['all', 'Fraksi 1', 'Fraksi 2'] as const).map((fraksi) => (
            <Button
              key={fraksi}
              variant={selectedFraksi === fraksi ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFraksi(fraksi)}
              className={selectedFraksi === fraksi 
                ? "bg-blue-500 hover:bg-blue-600 text-xs sm:text-sm px-2 sm:px-3" 
                : "border-gray-600 text-gray-400 hover:text-white text-xs sm:text-sm px-2 sm:px-3"
              }
            >
              {fraksi === "all" ? "All Squads" : fraksi}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Statistics Cards - Redesigned for Esports */}
      {stats && (
        <div className="flex justify-center">
          <Card className="bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-900/80 border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10 w-full max-w-md">
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <div className="flex items-center justify-between gap-3 lg:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm lg:text-base text-gray-400 mb-1 lg:mb-2 truncate">Win Rate</p>
                  <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">{stats.winRate}%</p>
                    {stats.winRate >= 60 ? (
                      <TrendingUpIcon className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-green-400 flex-shrink-0" />
                    ) : (
                      <TrendingDownIcon className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-red-400 flex-shrink-0" />
                    )}
                  </div>
                </div>
                <div className="p-2 sm:p-3 lg:p-4 bg-green-500/20 rounded-full flex-shrink-0 ring-2 ring-green-500/20">
                  <TrophyIcon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Statistics Tabs - Redesigned */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-2 h-10 sm:h-12 lg:h-14 bg-gradient-to-r from-gray-800/50 via-gray-800/30 to-gray-800/50 border border-gray-700 rounded-xl p-1 shadow-lg">
          <TabsTrigger value="summary" className="text-xs sm:text-sm lg:text-base font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-blue-600/20 data-[state=active]:text-blue-400 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/20">
            <BarChart3Icon className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Summary</span>
            <span className="sm:hidden">Sum</span>
          </TabsTrigger>
          <TabsTrigger value="headtohead" className="text-xs sm:text-sm lg:text-base font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/20 data-[state=active]:to-orange-600/20 data-[state=active]:text-orange-400 data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20">
            <UsersIcon className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">H2H</span>
            <span className="sm:hidden">H2H</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
              {/* Match Results Breakdown */}
              <Card className="bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-900/80 border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
                <CardHeader className="pb-3 lg:pb-4">
                  <CardTitle className="text-white text-base sm:text-lg lg:text-xl flex items-center gap-2">
                    <div className="w-2 h-2 lg:w-3 lg:h-3 bg-green-400 rounded-full"></div>
                    Match Record
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 sm:space-y-4 lg:space-y-5">
                    <div className="flex items-center justify-between p-2 lg:p-3 rounded-lg bg-green-500/5 hover:bg-green-500/10 transition-colors">
                      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0 flex-1">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 bg-green-500 rounded-full flex-shrink-0 ring-2 ring-green-500/30"></div>
                        <span className="text-gray-300 text-sm sm:text-base lg:text-lg truncate">Wins</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
                        <span className="text-white font-semibold text-sm sm:text-base lg:text-lg">{stats.wins}</span>
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30 text-xs sm:text-sm">
                          {Math.round((stats.wins / stats.totalMatches) * 100)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 lg:p-3 rounded-lg bg-red-500/5 hover:bg-red-500/10 transition-colors">
                      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0 flex-1">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 bg-red-500 rounded-full flex-shrink-0 ring-2 ring-red-500/30"></div>
                        <span className="text-gray-300 text-sm sm:text-base lg:text-lg truncate">Losses</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
                        <span className="text-white font-semibold text-sm sm:text-base lg:text-lg">{stats.losses}</span>
                        <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30 text-xs sm:text-sm">
                          {Math.round((stats.losses / stats.totalMatches) * 100)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 lg:p-3 rounded-lg bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors">
                      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0 flex-1">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 bg-yellow-500 rounded-full flex-shrink-0 ring-2 ring-yellow-500/30"></div>
                        <span className="text-gray-300 text-sm sm:text-base lg:text-lg truncate">Draws</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
                        <span className="text-white font-semibold text-sm sm:text-base lg:text-lg">{stats.draws}</span>
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs sm:text-sm">
                          {Math.round((stats.draws / stats.totalMatches) * 100)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Match History */}
              <Card className="bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-900/80 border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                <CardHeader className="pb-3 lg:pb-4">
                  <CardTitle className="text-white text-base sm:text-lg lg:text-xl flex items-center gap-2">
                    <div className="w-2 h-2 lg:w-3 lg:h-3 bg-blue-400 rounded-full"></div>
                    Recent Match History
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 sm:space-y-4 lg:space-y-5">
                    {recentMatches.length === 0 ? (
                       <p className="text-gray-500 text-center py-4">No recent matches</p>
                    ) : (
                      recentMatches.map((match) => (
                        <div key={match.id} className="flex items-center justify-between p-2 lg:p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-white text-sm sm:text-base truncate">vs {match.opponent}</p>
                            <p className="text-xs sm:text-sm text-gray-400">{match.map} • {format(parseISO(match.timestamp), 'MMM d, yyyy')}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-sm font-semibold ${match.status === 'win' ? 'text-green-400' : match.status === 'loss' ? 'text-red-400' : 'text-yellow-400'}`}>
                              {match.revScore} - {match.opponentScore}
                            </span>
                            <Badge variant={match.status === 'win' ? "default" : "destructive"} className={match.status === 'win' ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs" : "bg-red-500/20 text-red-400 border-red-500/30 text-xs"}>
                              {match.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="headtohead" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base sm:text-lg">Head-to-Head Record</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {opponentStats.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-400">
                  <UsersIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                  <p className="text-sm sm:text-base">No opponent data available</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {opponentStats.map((opponent) => (
                    <div key={opponent.opponent} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-gray-700/50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                           <p className="font-medium text-white text-sm sm:text-base truncate">{opponent.opponent}</p>
                           <Badge variant={opponent.lastMatchResult === 'win' ? "default" : "destructive"} className={opponent.lastMatchResult === 'win' ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs" : "bg-red-500/20 text-red-400 border-red-500/30 text-xs"}>
                              {opponent.lastMatchResult.toUpperCase()}
                           </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400">{opponent.matches} matches</p>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        <div className="text-right min-w-0">
                          <p className="text-xs text-gray-400">Win Rate</p>
                          <p className={`font-semibold text-sm ${opponent.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                            {opponent.winRate}%
                          </p>
                        </div>
                        <div className="text-right min-w-0">
                          <p className="text-xs text-gray-400">Avg Score</p>
                          <p className="font-semibold text-white text-sm">{opponent.averageScored} - {opponent.averageConceded}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
