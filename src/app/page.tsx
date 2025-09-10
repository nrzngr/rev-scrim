"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { PlusIcon, CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker, TimePicker, FraksiSelect, MapMultiSelect } from "@/components/form-fields";
import { ScheduleView } from "@/components/schedule-view";
import { ErrorBoundary } from "@/components/error-boundary";
import { scrimFormSchema, type ScrimFormData } from "@/lib/validation";
import Image from "next/image";

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

  const onSubmit = useCallback(async (data: ScrimFormData) => {
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const response = await fetch("/api/sheets/append", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.ok) {
        toast.success("Scrim berhasil dijadwalkan!");
        form.reset();
      } else {
        toast.error(result.error || "Gagal menjadwalkan scrim");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          toast.error("Permintaan terlalu lama. Silakan coba lagi.");
        } else {
          toast.error("Terjadi kesalahan jaringan. Silakan coba lagi.");
        }
      } else {
        toast.error("Terjadi kesalahan tidak dikenal. Silakan coba lagi.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, form]);

  const ScrimForm = () => (
    <div className="space-y-8">

      {/* Enhanced Form Card */}
      <Card className="border-gray-700 bg-gradient-to-br from-gray-800 via-gray-800 to-gray-850 shadow-2xl">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Match Details Section */}
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-blue-400" />
                    Detail Match
                  </h3>
                </div>

                {/* Date and Time Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-base font-semibold text-white flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      Tanggal Match
                    </label>
                    <div className="relative group">
                      <DatePicker
                        value={form.watch("tanggalScrim") ? new Date(form.watch("tanggalScrim")) : undefined}
                        onChange={(date) => {
                          form.setValue("tanggalScrim", date ? format(date, "yyyy-MM-dd") : "");
                        }}
                        placeholder="Pilih tanggal"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-base font-semibold text-white flex items-center gap-2">
                      <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                      Waktu Mulai
                    </label>
                    <div className="relative group">
                      <TimePicker
                        value={form.watch("startMatch")}
                        onChange={(value) => form.setValue("startMatch", value)}
                        placeholder="HH:mm"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                {/* Opponent Section */}
                <div className="space-y-3">
                  <label className="text-base font-semibold text-white flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    Tim Lawan
                  </label>
                  <div className="relative group">
                    <Input 
                      {...form.register("lawan")}
                      placeholder="Masukkan nama tim lawan" 
                      className="h-12 text-base bg-gray-700/50 border-gray-600 focus:border-orange-400 focus:ring-orange-400/20"
                      disabled={isSubmitting}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                        <span className="text-orange-400 text-sm">👥</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map Selection */}
                <div className="space-y-3">
                  <label className="text-base font-semibold text-white flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    Map
                  </label>
                  <MapMultiSelect
                    value={form.watch("map") || []}
                    onChange={(value) => form.setValue("map", value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Team Section */}
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">REV</span>
                    </div>
                    Penugasan Fraksi
                  </h3>
                  <p className="text-gray-400 text-sm">Fraksi REV mana yang akan bermain dalam scrim ini?</p>
                </div>

                <div className="space-y-3">
                  <label className="text-base font-semibold text-white flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Fraksi REV
                  </label>
                  <FraksiSelect
                    value={form.watch("fraksi") || ""}
                    onChange={(value) => form.setValue("fraksi", value as "Fraksi 1" | "Fraksi 2")}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 shadow-lg hover:shadow-xl transition-all duration-200 group"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Menjadwalkan Scrim...
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <PlusIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                      Jadwalkan Scrim
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Form>

          {/* Enhanced Footer Link */}
          {process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID && (
            <div className="mt-8 pt-6 border-t border-gray-700">
              <div className="text-center">
                <a
                  href={`https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition-colors group"
                >
                  <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
                  Lihat di Google Sheets
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Image 
              src="/logo_REV.jpg" 
              alt="REV Logo" 
              width={96}
              height={96}
              className="h-24 w-auto"
              priority
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto">
          <Tabs defaultValue="input" className="w-full">
            {/* Enhanced Navigation */}
            <div className="mb-8">
              <TabsList className="grid w-full grid-cols-2 h-16 bg-gray-800/50 border border-gray-700 p-1">
                <TabsTrigger 
                  value="input" 
                  className="flex items-center gap-3 text-base font-medium h-14 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-gray-400 transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                      <PlusIcon className="h-4 w-4" />
                    </div>
                    <span>Create Scrim</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="schedule" 
                  className="flex items-center gap-3 text-base font-medium h-14 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-600 data-[state=active]:text-white text-gray-400 transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-500/20 rounded-lg">
                      <CalendarIcon className="h-4 w-4" />
                    </div>
                    <span>View Schedule</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="input" className="space-y-6 mt-0">
              <ErrorBoundary>
                <ScrimForm />
              </ErrorBoundary>
            </TabsContent>
            
            <TabsContent value="schedule" className="space-y-6 mt-0">
              <ErrorBoundary>
                <ScheduleView />
              </ErrorBoundary>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}