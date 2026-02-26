"use client";

import { createContext, ReactNode, useContext, useState } from "react";

interface DashboardLayoutContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
}

const DashboardLayoutContext = createContext<
  DashboardLayoutContextType | undefined
>(undefined);

export function DashboardLayoutProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <DashboardLayoutContext.Provider
      value={{ isSidebarOpen, toggleSidebar, isCollapsed, toggleCollapsed }}
    >
      {children}
    </DashboardLayoutContext.Provider>
  );
}

export function useDashboardLayout() {
  const context = useContext(DashboardLayoutContext);
  if (context === undefined) {
    throw new Error(
      "useDashboardLayout must be used within a DashboardLayoutProvider"
    );
  }
  return context;
}
