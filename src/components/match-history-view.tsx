"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TrophyIcon, SearchIcon, FilterIcon, UsersIcon, ChevronDownIcon, ChevronUpIcon, EditIcon, TrashIcon, XIcon, CheckIcon } from "lucide-react";
import { MatchResultRecord } from "@/lib/validation";
import { format, isValid, parseISO } from "date-fns";
import { toast } from "sonner";

export function MatchHistoryView() {
  const [matchResults, setMatchResults] = useState<MatchResultRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [factionFilter, setFactionFilter] = useState<"all" | "Fraksi 1" | "Fraksi 2">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "win" | "loss" | "draw">("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingResult, setEditingResult] = useState<MatchResultRecord | null>(null);
  const [editForm, setEditForm] = useState({
    revScore: "",
    opponentScore: "",
    notes: "",
    recordedBy: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch match results only (opponent data is now included in match results)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/match-results");
        const data = await response.json();

        if (data.ok) {
          setMatchResults(data.data);
        }

      } catch (error) {
        console.error("Error fetching match history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter results
  const filteredResults = useMemo(() => {
    return matchResults.filter(result => {
      const matchesSearch = searchTerm === "" ||
        result.opponent.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.fraksi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.recordedBy.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFaction = factionFilter === "all" || result.fraksi === factionFilter;
      const matchesStatus = statusFilter === "all" || result.status === statusFilter;

      return matchesSearch && matchesFaction && matchesStatus;
    });
  }, [matchResults, searchTerm, factionFilter, statusFilter]);

  // Sort by timestamp (newest first)
  const sortedResults = useMemo(() => {
    return [...filteredResults].sort((a, b) => {
      const dateA = parseISO(a.timestamp) || new Date(a.timestamp);
      const dateB = parseISO(b.timestamp) || new Date(b.timestamp);

      // If both dates are invalid, maintain original order
      if (!isValid(dateA) && !isValid(dateB)) return 0;
      if (!isValid(dateA)) return 1; // Put invalid dates at the end
      if (!isValid(dateB)) return -1; // Put invalid dates at the end

      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredResults]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "win": return "bg-green-500/10 text-green-400 border-green-500/20";
      case "loss": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "draw": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "win": return "MENANG";
      case "loss": return "KALAH";
      case "draw": return "SERI";
      default: return status.toUpperCase();
    }
  };

  const getFactionColor = (fraksi: string) => {
    return fraksi === "Fraksi 1" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400";
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return "Unknown date";

    // Try parsing as ISO string first
    let date = parseISO(timestamp);

    // If that fails, try creating a Date directly
    if (!isValid(date)) {
      date = new Date(timestamp);
    }

    // If still invalid, try parsing the Google Sheets format
    if (!isValid(date)) {
      // Handle format like "2025-09-10T09:37:16.301Z"
      const cleanTimestamp = timestamp.replace(/T(\d{2}:\d{2}:\d{2})\.?\d*Z?/, 'T$1Z');
      date = new Date(cleanTimestamp);
    }

    if (!isValid(date)) {
      return timestamp; // Return original if we can't parse it
    }

    return format(date, "dd MMM yyyy, HH:mm");
  };

  const handleDelete = async (resultId: number) => {
    if (!confirm("Are you sure you want to delete this match result? This action cannot be undone.")) {
      return;
    }

    setDeletingId(resultId);
    try {
      const response = await fetch(`/api/match-results?id=${resultId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete match result');
      }

      // Refresh the data
      const refreshResponse = await fetch("/api/match-results");
      const refreshData = await refreshResponse.json();

      if (refreshData.ok) {
        setMatchResults(refreshData.data);
      }

      toast.success("Match result deleted successfully!");

    } catch (error) {
      console.error("Error deleting match result:", error);
      toast.error("Failed to delete match result. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (result: MatchResultRecord) => {
    setEditingResult(result);
    setEditForm({
      revScore: result.revScore.toString(),
      opponentScore: result.opponentScore.toString(),
      notes: result.notes || "",
      recordedBy: result.recordedBy || ""
    });
  };

  const handleCancelEdit = () => {
    setEditingResult(null);
    setEditForm({
      revScore: "",
      opponentScore: "",
      notes: "",
      recordedBy: ""
    });
  };

  const handleSubmitEdit = async () => {
    if (!editingResult) return;

    const revScore = parseInt(editForm.revScore);
    const opponentScore = parseInt(editForm.opponentScore);

    if (isNaN(revScore) || isNaN(opponentScore) || revScore < 0 || opponentScore < 0 || revScore > 99 || opponentScore > 99) {
      toast.error('Scores must be valid numbers between 0-99');
      return;
    }

    if (!editForm.recordedBy.trim()) {
      toast.error('Recorded by field is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/match-results', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingResult.id,
          scheduleId: editingResult.scheduleId,
          fraksi: editingResult.fraksi,
          revScore,
          opponentScore,
          notes: editForm.notes.trim(),
          recordedBy: editForm.recordedBy.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update match result');
      }

      const data = await response.json();
      if (data.ok) {
        // Refresh the data
        const refreshResponse = await fetch("/api/match-results");
        const refreshData = await refreshResponse.json();

        if (refreshData.ok) {
          setMatchResults(refreshData.data);
        }

        toast.success("Match result updated successfully!");
        handleCancelEdit();
      } else {
        toast.error(data.error || 'Failed to update match result');
      }
    } catch (error) {
      console.error("Error updating match result:", error);
      toast.error("Failed to update match result. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="border-gray-700 bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-400">Loading match history...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-xl">
            <TrophyIcon className="h-6 w-6 text-amber-400" />
          </div>
          Match History
        </h1>
        <p className="text-gray-400 mt-2 text-sm sm:text-base">
          View all completed matches with scores and results
        </p>
      </div>

      {/* Filters */}
      <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6">
          {/* Mobile-first layout */}
          <div className="space-y-4">
            {/* Search - Always visible */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search opponent, faction, or recorder..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 bg-gray-700/80 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400/20"
              />
            </div>

            {/* Mobile filter toggle button */}
            <div className="sm:hidden">
              <Button
                variant="ghost"
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className="w-full h-12 bg-gray-700/50 border border-gray-600 text-white hover:bg-gray-700 transition-colors"
              >
                <FilterIcon className="h-4 w-4 mr-2" />
                Filters & Options
                {isFiltersOpen ? (
                  <ChevronUpIcon className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 ml-2" />
                )}
              </Button>
            </div>

            {/* Filters row - Collapsible on mobile */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${!isFiltersOpen ? 'hidden sm:grid' : ''}`}>
              {/* Faction Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Faction
                </label>
                <select
                  value={factionFilter}
                  onChange={(e) => setFactionFilter(e.target.value as "all" | "Fraksi 1" | "Fraksi 2")}
                  className="w-full h-12 px-4 bg-gray-700/80 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 transition-all"
                >
                  <option value="all">All Factions</option>
                  <option value="Fraksi 1">Fraksi 1</option>
                  <option value="Fraksi 2">Fraksi 2</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Result
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "win" | "loss" | "draw")}
                  className="w-full h-12 px-4 bg-gray-700/80 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 transition-all"
                >
                  <option value="all">All Results</option>
                  <option value="win">Wins Only</option>
                  <option value="loss">Losses Only</option>
                  <option value="draw">Draws Only</option>
                </select>
              </div>

              {/* Results Count */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Found
                </label>
                <div className="h-12 flex items-center justify-center px-4 bg-gray-700/50 rounded-lg border border-gray-600">
                  <span className="text-white font-semibold">
                    {sortedResults.length} match{sortedResults.length !== 1 ? 'es' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {sortedResults.length === 0 ? (
        <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="max-w-md mx-auto">
              <TrophyIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No Match Results Found</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {searchTerm || factionFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "Match results will appear here once matches are completed and recorded."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedResults.map((result) => (
            <Card key={result.id} className="border-gray-700 bg-gray-800/70 backdrop-blur-sm hover:bg-gray-800 transition-all duration-200 hover:shadow-lg hover:scale-[1.01]">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  {/* Header with badges, date, and actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`${getFactionColor(result.fraksi)} px-3 py-1 font-medium`}>
                        {result.fraksi}
                      </Badge>
                      <Badge className={`${getStatusColor(result.status)} font-bold px-3 py-1 text-sm`}>
                        {getStatusText(result.status)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(result)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(result.id)}
                          disabled={deletingId === result.id}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                          {deletingId === result.id ? (
                            <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                          ) : (
                            <TrashIcon className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Score display - Mobile optimized */}
                  <div className="bg-gray-700/50 rounded-xl p-4 sm:p-6">
                    <div className="flex items-center justify-center">
                      <div className="flex items-center gap-6 sm:gap-8">
                        {/* REV Team */}
                        <div className="text-center">
                          <div className="text-xs sm:text-sm text-blue-400 font-medium mb-1">REV Team</div>
                          <div className="text-3xl sm:text-4xl font-bold text-white">{result.revScore}</div>
                        </div>

                        {/* VS separator */}
                        <div className="flex flex-col items-center">
                          <div className="text-gray-400 text-sm font-medium mb-1">VS</div>
                          <div className="w-8 h-0.5 bg-gray-600"></div>
                        </div>

                        {/* Opponent */}
                        <div className="text-center">
                          <div className="text-xs sm:text-sm text-orange-400 font-medium mb-1 max-w-20 sm:max-w-none truncate">
                            {result.opponent}
                          </div>
                          <div className="text-3xl sm:text-4xl font-bold text-white">{result.opponentScore}</div>
                        </div>
                      </div>
                    </div>

                    {/* Match details */}
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <UsersIcon className="h-4 w-4" />
                          <span>vs {result.opponent}</span>
                        </div>

                        <div className="text-gray-500 text-xs sm:text-sm">
                          <div>by {result.recordedBy}</div>
                          <div>{formatTimestamp(result.timestamp)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes if available */}
                  {result.notes && (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                      <div className="text-xs text-blue-400 font-medium mb-1">Notes</div>
                      <p className="text-sm text-gray-300">{result.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-gray-700 bg-gray-800">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-white">
                  Edit Match Result
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Match Info Display */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Badge className={getFactionColor(editingResult.fraksi)}>
                    {editingResult.fraksi}
                  </Badge>
                  <span className="text-sm text-gray-400">vs {editingResult.opponent}</span>
                </div>
                <div className="text-xs text-gray-500">
                  Schedule ID: {editingResult.scheduleId}
                </div>
              </div>

              {/* Score Inputs */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="text-center">
                    <label className="text-xs text-blue-400 font-medium mb-2 block">REV Team</label>
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      placeholder="0"
                      value={editForm.revScore}
                      onChange={(e) => setEditForm(prev => ({ ...prev, revScore: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white text-center h-12 text-lg font-bold"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="text-center text-gray-400 text-sm font-bold">
                    VS
                  </div>
                  <div className="text-center">
                    <label className="text-xs text-orange-400 font-medium mb-2 block truncate">
                      {editingResult.opponent}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      placeholder="0"
                      value={editForm.opponentScore}
                      onChange={(e) => setEditForm(prev => ({ ...prev, opponentScore: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white text-center h-12 text-lg font-bold"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-2 block">Notes (Optional)</label>
                  <Input
                    placeholder="Match notes..."
                    value={editForm.notes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    disabled={isSubmitting}
                    maxLength={500}
                  />
                </div>

                {/* Recorded By */}
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-2 block">Recorded By *</label>
                  <Input
                    placeholder="Your name"
                    value={editForm.recordedBy}
                    onChange={(e) => setEditForm(prev => ({ ...prev, recordedBy: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    disabled={isSubmitting}
                    maxLength={50}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                    className="flex-1 border border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitEdit}
                    disabled={isSubmitting || !editForm.revScore || !editForm.opponentScore || !editForm.recordedBy.trim()}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Update Result
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}