"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { PlusIcon, CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker, TimePicker, FraksiSelect, MapMultiSelect } from "@/components/form-fields";
import { ScheduleView } from "@/components/schedule-view";
import { scrimFormSchema, type ScrimFormData } from "@/lib/validation";

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ScrimFormData>({
    resolver: zodResolver(scrimFormSchema),
    defaultValues: {
      tanggalScrim: "",
      lawan: "",
      map: [],
      startMatch: "",
      fraksi: undefined,
    },
  });

  const onSubmit = async (data: ScrimFormData) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/sheets/append", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.ok) {
        toast.success("Scrim berhasil dijadwalkan!");
        form.reset();
      } else {
        toast.error(result.error || "Gagal menjadwalkan scrim");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const ScrimForm = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          Input Scrim Baru
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6">
              <div>
                <label className="text-base font-medium block mb-2">Tanggal Scrim</label>
                <DatePicker
                  value={form.watch("tanggalScrim") ? new Date(form.watch("tanggalScrim")) : undefined}
                  onChange={(date) => {
                    form.setValue("tanggalScrim", date ? format(date, "yyyy-MM-dd") : "");
                  }}
                  placeholder="Pilih tanggal"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="text-base font-medium block mb-2">Tim Lawan</label>
                <Input 
                  {...form.register("lawan")}
                  placeholder="Masukkan nama tim lawan" 
                  className="h-11"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="text-base font-medium block mb-2">Map</label>
                <MapMultiSelect
                  value={form.watch("map") || []}
                  onChange={(value) => form.setValue("map", value)}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="text-base font-medium block mb-2">Waktu Mulai</label>
                <TimePicker
                  value={form.watch("startMatch")}
                  onChange={(value) => form.setValue("startMatch", value)}
                  placeholder="HH:mm"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="text-base font-medium block mb-2">Fraksi Tim</label>
                <FraksiSelect
                  value={form.watch("fraksi") || ""}
                  onChange={(value) => form.setValue("fraksi", value as "Fraksi 1" | "Fraksi 2")}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Jadwal Scrim"}
            </Button>
          </form>
        </Form>

        {process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID && (
          <div className="mt-6 pt-4 border-t text-center">
            <a
              href={`https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Buka Google Spreadsheet
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo_REV.jpg" 
              alt="REV Logo" 
              className="h-24 w-auto"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="input" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 h-11 sm:h-12">
              <TabsTrigger value="input" className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                <PlusIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Input</span> Scrim
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Lihat</span> Jadwal
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="input" className="space-y-6">
              <ScrimForm />
            </TabsContent>
            
            <TabsContent value="schedule" className="space-y-6">
              <ScheduleView />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}