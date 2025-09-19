"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TrophyIcon, XIcon, EditIcon, CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { MatchResultRecord } from "@/lib/validation";

interface MatchResultsManagerProps {
  scheduleId: number;
  fraksi: "fraksi1" | "fraksi2";
  opponent: string;
  isCompleted: boolean;
  onResultChange?: () => void;
}

export function MatchResultsManager({ 
  scheduleId, 
  fraksi, 
  opponent, 
  isCompleted,
  onResultChange 
}: MatchResultsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [revScore, setRevScore] = useState("");
  const [opponentScore, setOpponentScore] = useState("");
  const [notes, setNotes] = useState("");
  const [recordedBy, setRecordedBy] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingResult, setExistingResult] = useState<MatchResultRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fraksiName = fraksi === "fraksi1" ? "Fraksi 1" : "Fraksi 2";

  const fetchMatchResult = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/match-results?scheduleId=${scheduleId}&fraksi=${encodeURIComponent(fraksiName)}`);
      
      if (!response.ok) {
        console.error('Match result fetch failed:', response.status, response.statusText);
        setExistingResult(null);
        return;
      }
      
      const data = await response.json();
      
      if (data.ok && data.data.length > 0) {
        const result = data.data[0];
        setExistingResult(result);
        setRevScore(result.revScore.toString());
        setOpponentScore(result.opponentScore.toString());
        setNotes(result.notes || "");
        setRecordedBy(result.recordedBy || "");
      } else {
        setExistingResult(null);
      }
    } catch (error) {
      console.error('Error fetching match result:', error);
      setExistingResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [scheduleId, fraksiName]);

  useEffect(() => {
    if (isOpen) {
      fetchMatchResult();
    }
  }, [isOpen, fetchMatchResult]);

  const handleSubmitResult = async () => {
    if (!revScore || !opponentScore || !recordedBy.trim()) {
      toast.error('Score dan nama pelapor harus diisi');
      return;
    }

    const revScoreNum = parseInt(revScore);
    const opponentScoreNum = parseInt(opponentScore);

    if (isNaN(revScoreNum) || isNaN(opponentScoreNum) || revScoreNum < 0 || opponentScoreNum < 0) {
      toast.error('Score harus berupa angka valid');
      return;
    }

    setIsSubmitting(true);
    try {
      const method = existingResult ? 'PUT' : 'POST';
      const body = existingResult 
        ? {
            id: existingResult.id,
            scheduleId,
            fraksi: fraksiName,
            revScore: revScoreNum,
            opponentScore: opponentScoreNum,
            notes: notes.trim(),
            recordedBy: recordedBy.trim()
          }
        : {
            scheduleId,
            fraksi: fraksiName,
            revScore: revScoreNum,
            opponentScore: opponentScoreNum,
            notes: notes.trim(),
            recordedBy: recordedBy.trim()
          };

      const response = await fetch('/api/match-results', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Match result submit failed:', response.status, response.statusText, errorText);
        toast.error(`Gagal menyimpan hasil match: ${response.status}`);
        return;
      }

      const data = await response.json();

      if (data.ok) {
        toast.success(existingResult ? 'Hasil match berhasil diupdate!' : 'Hasil match berhasil dicatat!');
        setIsEditing(false);
        await fetchMatchResult();
        onResultChange?.();
      } else {
        toast.error(data.error || 'Gagal menyimpan hasil match');
      }
    } catch (error) {
      console.error('Error submitting match result:', error);
      toast.error('Terjadi kesalahan saat menyimpan hasil');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getResultDisplay = () => {
    if (!existingResult) return null;

    const { revScore: rScore, opponentScore: oScore, status } = existingResult;
    const statusColors = {
      win: "text-green-400 bg-green-500/10 border-green-500/20",
      loss: "text-red-400 bg-red-500/10 border-red-500/20",
      draw: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
    };

    const statusText = {
      win: "MENANG",
      loss: "KALAH", 
      draw: "SERI"
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-white">Hasil Match</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
          >
            <EditIcon className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-lg font-bold">
            <span className="text-blue-400">REV Team</span>
            <span className="text-white">{rScore} - {oScore}</span>
            <span className="text-orange-400">{opponent}</span>
          </div>
          
          <div className="flex justify-center">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[status as keyof typeof statusColors]}`}>
              {statusText[status as keyof typeof statusText]}
            </span>
          </div>
          
          {existingResult.notes && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Catatan:</p>
              <p className="text-sm text-gray-300">{existingResult.notes}</p>
            </div>
          )}
          
          <div className="text-xs text-gray-500 border-t border-gray-600 pt-2">
            Dicatat oleh: {existingResult.recordedBy} • {new Date(existingResult.timestamp).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>
    );
  };

  // Don't show button if match is not completed yet
  if (!isCompleted) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 relative transition-all duration-200 ${
            existingResult
              ? existingResult.status === 'win'
                ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
                : existingResult.status === 'loss'
                ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                : 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <TrophyIcon className="h-3.5 w-3.5" />
          {existingResult && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              ✓
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-gray-800 border border-gray-600" align="end">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Match Result - {fraksiName}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <div className="bg-gray-700 rounded-lg p-4 animate-pulse">
                <div className="h-6 bg-gray-600 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-600 rounded w-1/2"></div>
              </div>
            </div>
          ) : existingResult && !isEditing ? (
            getResultDisplay()
          ) : (
            <Card className="bg-gray-750 border-gray-600">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-medium text-gray-300">
                  {existingResult ? 'Edit Hasil Match' : 'Input Hasil Match'}
                </h4>
                
                <div className="space-y-3">
                  {/* Score Input */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Score</label>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div className="text-center">
                        <p className="text-xs text-blue-400 mb-1">REV</p>
                        <Input
                          type="number"
                          min="0"
                          max="99"
                          placeholder="0"
                          value={revScore}
                          onChange={(e) => setRevScore(e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white text-center h-10"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="text-center text-gray-400 text-sm font-bold">
                        VS
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-orange-400 mb-1 truncate">{opponent}</p>
                        <Input
                          type="number"
                          min="0"
                          max="99"
                          placeholder="0"
                          value={opponentScore}
                          onChange={(e) => setOpponentScore(e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white text-center h-10"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Notes */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Catatan (Opsional)</label>
                    <Input
                      placeholder="Catatan tambahan..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 h-9"
                      disabled={isSubmitting}
                      maxLength={500}
                    />
                  </div>
                  
                  {/* Recorded By */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Dicatat Oleh</label>
                    <Input
                      placeholder="Nama pelapor"
                      value={recordedBy}
                      onChange={(e) => setRecordedBy(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 h-9"
                      disabled={isSubmitting}
                      maxLength={50}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    {existingResult && (
                      <Button
                        variant="ghost"
                        onClick={() => setIsEditing(false)}
                        size="sm"
                        className="flex-1 h-9"
                        disabled={isSubmitting}
                      >
                        <XIcon className="h-4 w-4 mr-1" />
                        Batal
                      </Button>
                    )}
                    <Button
                      onClick={handleSubmitResult}
                      disabled={isSubmitting || !revScore || !opponentScore || !recordedBy.trim()}
                      size="sm"
                      className={`${existingResult ? 'flex-1' : 'w-full'} bg-blue-500 hover:bg-blue-600 text-white h-9`}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-4 w-4 mr-1" />
                          {existingResult ? 'Update' : 'Simpan'} Hasil
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}