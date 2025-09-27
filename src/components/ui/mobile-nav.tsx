"use client";

import { useState } from "react";
import { 
  MenuIcon, 
  XIcon, 
  PlusIcon, 
  CalendarIcon, 
  TrophyIcon, 
  BarChart3Icon, 
  UsersIcon,
  BellIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationSystem } from "@/components/notification-system";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  notificationCount?: number;
}

export function MobileNav({ activeTab, onTabChange, notificationCount = 0 }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const tabs = [
    { id: "input", label: "Create", icon: PlusIcon, color: "blue" },
    { id: "schedule", label: "Schedule", icon: CalendarIcon, color: "green" },
    { id: "calendar", label: "Calendar", icon: CalendarIcon, color: "amber" },
    { id: "history", label: "History", icon: TrophyIcon, color: "rose" },
    { id: "statistics", label: "Statistics", icon: BarChart3Icon, color: "indigo" },
    { id: "attendance", label: "Attendance", icon: UsersIcon, color: "cyan" },
  ];

  const getColorClasses = (color: string, isActive: boolean) => {
    if (isActive) {
      // Remove blue background for Create button (input tab)
      if (color === "blue") {
        return {
          bg: "bg-gray-800/50",
          text: "text-white",
          icon: `bg-${color}-500/20`
        };
      }
      return {
        bg: `bg-gradient-to-r from-${color}-500 to-${color}-600`,
        text: "text-white",
        icon: `bg-${color}-500/20`
      };
    }
    return {
      bg: "bg-gray-800/50",
      text: "text-gray-400",
      icon: `bg-${color}-500/20`
    };
  };

  return (
    <>
      {/* Mobile Header - Hidden when sidebar is open */}
      {!isOpen && (
        <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-800/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-400 hover:text-white p-2"
              >
                <MenuIcon className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Image 
                  src="/logo_REV.jpg" 
                  alt="REV Logo" 
                  width={32}
                  height={32}
                  className="h-8 w-auto rounded-lg"
                />
                <span className="text-lg font-bold text-white">REV</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <NotificationSystem />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/85 backdrop-blur-lg">
          <div className="fixed inset-y-0 left-0 w-80 bg-gradient-to-b from-gray-900 to-gray-800 shadow-2xl border-r border-gray-700">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Image 
                      src="/logo_REV.jpg" 
                      alt="REV Logo" 
                      width={48}
                      height={48}
                      className="h-12 w-auto rounded-xl shadow-lg ring-2 ring-blue-500/20"
                    />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-gray-900"></div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      REV Scrim
                    </h2>
                    <p className="text-sm text-gray-400 font-medium">Scheduler</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white hover:bg-gray-800/50 p-2.5 rounded-xl transition-all duration-200"
                >
                  <XIcon className="h-5 w-5" />
                </Button>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 overflow-y-auto py-6 px-4">
                <div className="space-y-3">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const colors = getColorClasses(tab.color, isActive);
                    
                    return (
                      <div key={tab.id} className="relative group">
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-l-lg"></div>
                        )}
                        <Button
                          variant="ghost"
                          className={`
                            w-full justify-start h-16 px-5 rounded-2xl transition-all duration-300 
                            hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl
                            ${colors.bg} hover:${colors.bg.replace('bg-', 'hover:bg-')} ${colors.text}
                            border border-gray-700/50 hover:border-gray-600/50
                            relative overflow-hidden
                          `}
                          onClick={() => {
                            onTabChange(tab.id);
                            setIsOpen(false);
                          }}
                        >
                          {/* Background Pattern */}
                          <div className="absolute inset-0 opacity-10">
                            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4xIi8+Cjwvc3ZnPg==')]"></div>
                          </div>
                          
                          <div className="flex items-center gap-4 relative z-10">
                            <div className={`
                              p-3 rounded-2xl ${colors.icon} transition-all duration-300 
                              group-hover:scale-110 group-hover:rotate-3
                              shadow-md group-hover:shadow-lg
                            `}>
                              <tab.icon className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="font-semibold text-lg">{tab.label}</span>
                              <span className="text-xs opacity-70 font-normal">
                                {tab.id === "input" && "Create new scrim"}
                                {tab.id === "schedule" && "View matches"}
                                {tab.id === "calendar" && "Calendar view"}
                                {tab.id === "history" && "Match history"}
                                {tab.id === "statistics" && "Analytics"}
                                {tab.id === "attendance" && "Player status"}
                              </span>
                            </div>
                          </div>
                          
                          {/* Active Indicator */}
                          {isActive && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </nav>

              {/* Footer */}
              <div className="p-5 border-t border-gray-700/50 bg-gray-900/80 backdrop-blur-sm">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-xs text-gray-400 font-medium">REV Scrim Scheduler v2.0</p>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                      Online
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                      Synced
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
