"use client";

import { PlusIcon, CalendarIcon, TrophyIcon, BarChart3Icon, UsersIcon } from "lucide-react";
import { NotificationSystem } from "@/components/notification-system";
import Image from "next/image";

interface DesktopNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function DesktopNav({ activeTab, onTabChange }: DesktopNavProps) {
  const tabs = [
    { 
      id: "input", 
      label: "Create", 
      icon: PlusIcon, 
      color: "blue",
      description: "Schedule new scrim"
    },
    { 
      id: "schedule", 
      label: "Schedule", 
      icon: CalendarIcon, 
      color: "green",
      description: "View upcoming matches"
    },
    { 
      id: "calendar", 
      label: "Calendar", 
      icon: CalendarIcon, 
      color: "amber",
      description: "Monthly calendar view"
    },
    { 
      id: "history", 
      label: "History", 
      icon: TrophyIcon, 
      color: "rose",
      description: "Match results history"
    },
    { 
      id: "statistics", 
      label: "Statistics", 
      icon: BarChart3Icon, 
      color: "indigo",
      description: "Team performance analytics"
    },
    { 
      id: "attendance", 
      label: "Attendance", 
      icon: UsersIcon, 
      color: "cyan",
      description: "Player availability tracking"
    },
  ];

  const getActiveClasses = (tabId: string, isActive: boolean) => {
    if (isActive) {
      // Remove blue background for Create button (input tab)
      const tabColor = tabs.find(t => t.id === tabId)?.color;
      if (tabColor === "blue") {
        return {
          container: "bg-gray-800/50 hover:bg-gray-700/50 text-white border border-gray-700/50 shadow-lg",
          icon: `bg-white/20`,
          label: "font-semibold",
          description: "text-white/80"
        };
      }
      return {
        container: `bg-gradient-to-r from-${tabColor}-500 to-${tabColor}-600 text-white shadow-lg`,
        icon: `bg-white/20`,
        label: "font-semibold",
        description: "text-white/80"
      };
    }
    return {
      container: "bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white border border-gray-700/50",
      icon: `bg-${tabs.find(t => t.id === tabId)?.color}-500/20`,
      label: "font-medium",
      description: "text-gray-500"
    };
  };

  return (
    <div className="hidden lg:block">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Image 
                src="/logo_REV.jpg" 
                alt="REV Logo" 
                width={56}
                height={56}
                className="h-14 w-auto rounded-2xl shadow-xl ring-2 ring-blue-500/30 hover:ring-blue-500/50 transition-all duration-300"
              />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-gray-900 animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
                REV Scrim Scheduler
              </h1>
              <p className="text-gray-400 text-sm font-medium">Professional Esports Team Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-full border border-gray-700/50">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-400 font-medium">System Online</span>
            </div>
            <NotificationSystem />
          </div>
        </div>

        {/* Enhanced Desktop Navigation */}
        <nav className="bg-gradient-to-r from-gray-800/80 via-gray-800/60 to-gray-800/80 backdrop-blur-md border border-gray-700/50 rounded-2xl p-2 shadow-2xl">
          <div className="grid grid-cols-6 gap-2">
            {tabs.map((tab, index) => {
              const isActive = activeTab === tab.id;
              const classes = getActiveClasses(tab.id, isActive);
              
              return (
                <div key={tab.id} className="relative group">
                  {/* Active State Background */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30"></div>
                  )}
                  
                  {/* Hover Background */}
                  <div className="absolute inset-0 bg-gray-700/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <button
                    onClick={() => onTabChange(tab.id)}
                    className={`
                      relative z-10 w-full h-20 rounded-xl
                      transition-all duration-300 ease-out
                      hover:scale-[1.03] active:scale-[0.97]
                      hover:shadow-xl active:shadow-md
                      ${classes.container}
                      border border-gray-600/30 hover:border-gray-500/50
                      overflow-hidden
                    `}
                  >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMC41IiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjEiLz4KPC9zdmc+')]"></div>
                    </div>
                    
                    <div className="relative z-10 flex flex-col items-center justify-center h-full p-3">
                      {/* Icon Container */}
                      <div className={`
                        relative mb-2
                        transition-all duration-300 transform
                        group-hover:scale-110 group-hover:-translate-y-1
                        ${classes.icon}
                      `}>
                        <tab.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                        
                        {/* Active Indicator */}
                        {isActive && (
                          <div className="absolute -top-1 -right-1">
                            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                            <div className="absolute inset-0 w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                      
                      {/* Label */}
                      <div className={`text-center ${classes.label}`}>
                        <span className="text-xs font-bold leading-tight block">
                          {tab.label}
                        </span>
                        <span className={`text-[10px] font-normal mt-0.5 block ${classes.description}`}>
                          {tab.description}
                        </span>
                      </div>
                      
                      {/* Bottom Active Indicator */}
                      {isActive && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                          <div className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {/* Side Active Bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-gradient-to-b from-blue-500 to-purple-500 rounded-l-lg"></div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>
        
        {/* Quick Stats Bar */}
        <div className="mt-4 flex items-center justify-between px-4 py-2 bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/30">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-400">Active Sessions</span>
              <span className="text-xs font-bold text-white">12</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-400">Today's Matches</span>
              <span className="text-xs font-bold text-white">8</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Last sync: Just now
          </div>
        </div>
      </div>
    </div>
  );
}
