"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ClockIcon, MapIcon, UsersIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

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

  const fetchScheduleData = async () => {
    try {
      const [fraksi1Response, fraksi2Response] = await Promise.all([
        fetch('/api/sheets/fetch?fraksi=Fraksi 1'),
        fetch('/api/sheets/fetch?fraksi=Fraksi 2')
      ]);

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
      console.error('Error fetching schedule:', error);
      toast.error('Gagal memuat jadwal scrim. Silakan coba lagi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchScheduleData();
  };

  useEffect(() => {
    fetchScheduleData();
  }, []);

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

  const renderScheduleCards = (schedules: ScheduleItem[]) => {
    if (schedules.length === 0) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-gray-600">
            Belum ada jadwal scrim tersimpan
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {schedules.map((schedule) => (
          <Card key={schedule.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="font-medium truncate">
                      {formatDate(schedule.tanggalScrim)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ClockIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="truncate">{formatTime(schedule.startMatch)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <UsersIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="font-medium truncate">{schedule.lawan || 'Lawan tidak tersedia'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="truncate">{schedule.map || 'Map tidak tersedia'}</span>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Jadwal Scrim</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center">
            <RefreshCwIcon className="h-6 w-6 animate-spin mr-2" />
            Memuat jadwal...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Jadwal Scrim</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCwIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="fraksi1" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="fraksi1">
              Fraksi 1 ({scheduleData.fraksi1.length})
            </TabsTrigger>
            <TabsTrigger value="fraksi2">
              Fraksi 2 ({scheduleData.fraksi2.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="fraksi1" className="space-y-4">
            {renderScheduleCards(scheduleData.fraksi1)}
          </TabsContent>
          
          <TabsContent value="fraksi2" className="space-y-4">
            {renderScheduleCards(scheduleData.fraksi2)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}