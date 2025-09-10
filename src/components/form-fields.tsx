"use client";

import { useState } from "react";
import { CalendarIcon, ChevronDownIcon, Cross2Icon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, placeholder = "Pilih tanggal main", disabled = false }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-11",
            !value && "text-gray-400",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "dd/MM/yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50 bg-gray-700 border border-gray-600 shadow-lg rounded-lg" align="start" side="bottom">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
          initialFocus
          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
        />
      </PopoverContent>
    </Popover>
  );
}

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TimePicker({ value, onChange, placeholder = "HH:mm", disabled = false }: TimePickerProps) {
  return (
    <Input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full h-11"
      step="60"
    />
  );
}

interface FraksiSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

interface MapMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

const MAP_OPTIONS = [
  "Ascension",
  "Threshold", 
  "Cracked",
  "Knife Edge",
  "Trench Lines",
  "Cyclone",
  "Shafted",
  "Trainwreck"
];

export function MapMultiSelect({ value, onChange, disabled = false }: MapMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (map: string) => {
    if (value.includes(map)) {
      onChange(value.filter(m => m !== map));
    } else {
      onChange([...value, map]);
    }
  };

  const handleRemove = (map: string) => {
    onChange(value.filter(m => m !== map));
  };

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            role="combobox"
            aria-expanded={open}
            aria-controls="map-options"
            className="w-full h-auto min-h-12 border border-gray-600 bg-gray-700/50 text-white rounded-lg px-4 py-3 cursor-pointer hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 focus:border-purple-400 transition-all duration-200"
            onClick={() => setOpen(!open)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(!open);
              }
            }}
            tabIndex={disabled ? -1 : 0}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1 flex-1">
                {value.length === 0 && (
                  <span className="text-gray-400">Pilih Map</span>
                )}
                {value.map((map) => (
                  <div
                    key={map}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 font-medium shadow-lg"
                  >
                    {map}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(map);
                      }}
                      className="hover:bg-white/20 rounded-full p-1 cursor-pointer transition-colors"
                    >
                      <Cross2Icon className="h-3 w-3" />
                    </span>
                  </div>
                ))}
              </div>
              <ChevronDownIcon className="h-4 w-4 opacity-50 ml-2" />
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-full p-3 bg-gray-800/95 backdrop-blur-sm border border-gray-600 shadow-xl rounded-xl">
          <div id="map-options" className="space-y-1">
            {MAP_OPTIONS.map((map) => (
              <div
                key={map}
                onClick={() => handleSelect(map)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg text-sm transition-all cursor-pointer text-white font-medium",
                  value.includes(map)
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md"
                    : "hover:bg-gray-700 hover:scale-[1.02]"
                )}
              >
                {map}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function FraksiSelect({ value, onChange, disabled = false }: FraksiSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full h-11">
        <SelectValue placeholder="Pilih Fraksi" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Fraksi 1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            Fraksi 1
          </div>
        </SelectItem>
        <SelectItem value="Fraksi 2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            Fraksi 2
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}