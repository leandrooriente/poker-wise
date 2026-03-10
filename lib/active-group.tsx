"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const STORAGE_KEY = "poker-wise-active-group";

interface ActiveGroupContextValue {
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
  isLoading: boolean;
}

const ActiveGroupContext = createContext<ActiveGroupContextValue | undefined>(undefined);

export function ActiveGroupProvider({ children }: { children: ReactNode }) {
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage on mount
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      setActiveGroupIdState(stored);
      setIsLoading(false);

      // Listen for storage events (changes in other tabs)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY) {
          setActiveGroupIdState(e.newValue);
        }
      };
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    } else {
      setIsLoading(false);
    }
  }, []);

  const setActiveGroupId = (id: string | null) => {
    if (typeof window !== "undefined") {
      if (id === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, id);
      }
      setActiveGroupIdState(id);
      // Dispatch a storage event so other tabs update (same origin)
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: id }));
    }
  };

  return (
    <ActiveGroupContext.Provider value={{ activeGroupId, setActiveGroupId, isLoading }}>
      {children}
    </ActiveGroupContext.Provider>
  );
}

export function useActiveGroup() {
  const context = useContext(ActiveGroupContext);
  if (context === undefined) {
    throw new Error("useActiveGroup must be used within an ActiveGroupProvider");
  }
  return context;
}