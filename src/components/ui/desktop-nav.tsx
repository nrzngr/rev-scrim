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
    const tabColor = tabs.find(t => t.id === tabId)?.color;

    if (isActive) {
      // Remove blue background for Create button (input tab)
      if (tabColor === "blue") {
        return {
          container: "bg-gray-800/50 hover:bg-gray-700/50 text-white border border-gray-700/50 shadow-lg",
          icon: "bg-white/20",
          label: "font-semibold",
          description: "text-white/80"
        };
      }

      // Use hardcoded gradient classes for each color
      const gradientClasses = {
        green: "from-green-500 to-green-600",
        amber: "from-amber-500 to-amber-600",
        rose: "from-rose-500 to-rose-600",
        indigo: "from-indigo-500 to-indigo-600",
        cyan: "from-cyan-500 to-cyan-600"
      };

      return {
        container: `bg-gradient-to-r ${gradientClasses[tabColor as keyof typeof gradientClasses] || 'from-blue-500 to-blue-600'} text-white shadow-lg`,
        icon: "bg-white/20",
        label: "font-semibold",
        description: "text-white/80"
      };
    }

    // Use hardcoded icon bg classes for each color
    const iconBgClasses = {
      blue: "bg-blue-500/20",
      green: "bg-green-500/20",
      amber: "bg-amber-500/20",
      rose: "bg-rose-500/20",
      indigo: "bg-indigo-500/20",
      cyan: "bg-cyan-500/20"
    };

    return {
      container: "bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white border border-gray-700/50",
      icon: iconBgClasses[tabColor as keyof typeof iconBgClasses] || "bg-blue-500/20",
      label: "font-medium",
      description: "text-gray-500"
    };
  };

  return (
    <div className="lg:block">
      {/* Enhanced Header */}
      <div className="mb-6 pt-6 pl-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Image
                src="/logo_REV.jpg"
                alt="REV Logo"
                width={48}
                height={48}
                className="h-12 w-auto rounded-xl shadow-lg ring-2 ring-blue-500/30 hover:ring-blue-500/50 transition-all duration-300"
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-gray-900 animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent truncate">
                REV Scrim Scheduler
              </h1>
              <p className="text-gray-400 text-xs">Professional Esports Team Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationSystem />
          </div>
        </div>

        {/* Enhanced Desktop Navigation */}
        <nav className="bg-gradient-to-r from-gray-800/80 via-gray-800/60 to-gray-800/80 backdrop-blur-md border border-gray-700/50 rounded-2xl p-4 shadow-2xl">
          <div className="flex flex-col gap-3">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const classes = getActiveClasses(tab.id, isActive);
              
              return (
                <div key={tab.id} className="relative group">
                  {/* Active State Background */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30"></div>
                  )}

                  {/* Hover Background */}
                  <div className="absolute inset-0 bg-gray-700/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  <button
                    onClick={() => onTabChange(tab.id)}
                    className={`
                      relative z-10 w-full h-14 rounded-lg
                      transition-all duration-300 ease-out
                      hover:scale-[1.01] active:scale-[0.99]
                      ${classes.container}
                      border border-gray-600/30 hover:border-gray-500/50
                      overflow-hidden
                      focus:outline-none focus:ring-2 focus:ring-blue-500/50
                    `}
                  >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMC41IiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjEiLz4KPC9zdmc+')]"></div>
                    </div>
                    
                    <div className="relative z-10 flex items-center h-full px-4 gap-3">
                      {/* Icon Container */}
                      <div className={`
                        relative flex-shrink-0
                        transition-all duration-300 transform
                        group-hover:scale-110
                        ${classes.icon}
                      `}>
                        <tab.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-400'} transition-colors duration-300`} />

                        {/* Active Indicator */}
                        {isActive && (
                          <div className="absolute -top-1 -right-1">
                            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                            <div className="absolute inset-0 w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>

                      {/* Label Container */}
                      <div className="flex-1 text-left">
                        <div className={`text-sm font-medium ${classes.label}`}>
                          {tab.label}
                        </div>
                        <div className={`text-xs ${classes.description} line-clamp-1`}>
                          {tab.description}
                        </div>
                      </div>

                      {/* Right Active Indicator */}
                      {isActive && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
