"use client";

import { useState } from "react";
import { MobileNav } from "@/components/ui/mobile-nav";
import { DesktopNav } from "@/components/ui/desktop-nav";
import { cn } from "@/lib/utils";

interface ResponsiveLayoutProps {
  children: (props: { activeTab: string; setActiveTab: (tab: string) => void }) => React.ReactNode;
  className?: string;
}

export function ResponsiveLayout({ children, className }: ResponsiveLayoutProps) {
  const [activeTab, setActiveTab] = useState("input");

  return (
    <div className={cn("min-h-screen bg-black text-white", className)}>
      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <MobileNav 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
        />
        
        {/* Mobile Content Area */}
        <div className="pt-4 pb-20">
          <div className="px-4">
            {children({ activeTab, setActiveTab })}
          </div>
        </div>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden lg:flex">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800">
          <DesktopNav 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
          />
        </div>
        
        {/* Desktop Content Area */}
        <div className="flex-1 min-w-0">
          <div className="max-w-7xl mx-auto px-8 pb-12 pt-16">
            {children({ activeTab, setActiveTab })}
          </div>
        </div>
      </div>
    </div>
  );
}
