"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserMinusIcon, UserPlusIcon, UsersIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { AttendanceRecord } from "@/lib/validation";

interface AttendanceManagerProps {
  scheduleId: number;
  fraksi: "fraksi1" | "fraksi2";
  onAttendanceChange?: () => void;
}

export function AttendanceManager({ scheduleId, fraksi, onAttendanceChange }: AttendanceManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fraksiName = fraksi === "fraksi1" ? "Fraksi 1" : "Fraksi 2";

  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/attendance?scheduleId=${scheduleId}&fraksi=${encodeURIComponent(fraksiName)}`);
      const data = await response.json();
      
      if (data.ok) {
        setAttendanceRecords(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setIsLoading(false);
    }
  }, [scheduleId, fraksiName]);

  useEffect(() => {
    if (isOpen) {
      fetchAttendance();
    }
  }, [isOpen, fetchAttendance]);

  const handleMarkUnavailable = async () => {
    if (!playerName.trim()) {
      toast.error('Nama pemain harus diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleId,
          fraksi: fraksiName,
          playerName: playerName.trim(),
          reason: reason.trim() || undefined
        })
      });

      const data = await response.json();

      if (data.ok) {
        toast.success('Berhasil menandai sebagai tidak bisa hadir');
        setPlayerName("");
        setReason("");
        await fetchAttendance();
        onAttendanceChange?.();
      } else {
        toast.error(data.error || 'Gagal menandai kehadiran');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Terjadi kesalahan saat menandai kehadiran');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAvailable = async (playerNameToRemove: string) => {
    try {
      const response = await fetch('/api/attendance', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleId,
          fraksi: fraksiName,
          playerName: playerNameToRemove
        })
      });

      const data = await response.json();

      if (data.ok) {
        toast.success('Berhasil menandai sebagai bisa hadir kembali');
        await fetchAttendance();
        onAttendanceChange?.();
      } else {
        toast.error(data.error || 'Gagal mengupdate kehadiran');
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Terjadi kesalahan saat mengupdate kehadiran');
    }
  };

  const unavailableCount = attendanceRecords.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 relative"
        >
          <UsersIcon className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Attendance</span>
          {unavailableCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unavailableCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-gray-800 border border-gray-600" align="end">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Attendance - {fraksiName}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Mark Unavailable Form */}
          <Card className="bg-gray-750 border-gray-600">
            <CardContent className="p-3 space-y-3">
              <h4 className="text-sm font-medium text-gray-300">Tandai Tidak Bisa Hadir</h4>
              
              <div className="space-y-2">
                <Input
                  placeholder="Nama pemain"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 h-9"
                  disabled={isSubmitting}
                />
                
                <Input
                  placeholder="Alasan (opsional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 h-9"
                  disabled={isSubmitting}
                />
                
                <Button
                  onClick={handleMarkUnavailable}
                  disabled={isSubmitting || !playerName.trim()}
                  size="sm"
                  className="w-full bg-red-500 hover:bg-red-600 text-white h-9"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <UserMinusIcon className="h-4 w-4 mr-2" />
                      Tandai Tidak Hadir
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Unavailable Players List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">
              Tidak Bisa Hadir ({unavailableCount})
            </h4>
            
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="bg-gray-700 rounded-lg p-2 animate-pulse">
                    <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : attendanceRecords.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Semua pemain bisa hadir! 🎉
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {attendanceRecords.map((record) => (
                  <div key={record.id} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {record.playerName}
                        </p>
                        {record.reason && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            {record.reason}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAvailable(record.playerName)}
                        className="ml-2 h-6 w-6 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                        title="Tandai bisa hadir kembali"
                      >
                        <UserPlusIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(record.timestamp).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}