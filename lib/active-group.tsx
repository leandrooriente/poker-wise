"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";

interface ActiveGroupContextValue {
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const ActiveGroupContext = createContext<ActiveGroupContextValue | undefined>(
  undefined
);

export function ActiveGroupProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/share" ||
    pathname?.startsWith("/share/");
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const fetchActiveGroup = useCallback(async () => {
    if (isPublicRoute) {
      setError(null);
      return null;
    }

    try {
      const response = await fetch("/api/admin/active-group");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data.activeGroupSlug ?? null;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to fetch active group:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    }
  }, [isPublicRoute]);

  const updateActiveGroup = useCallback(
    async (slug: string | null) => {
      if (isPublicRoute) {
        return null;
      }

      try {
        const response = await fetch("/api/admin/active-group", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return data.activeGroupSlug ?? null;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to update active group:", err);
        throw err;
      }
    },
    [isPublicRoute]
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const slug = await fetchActiveGroup();
      if (mounted) {
        setActiveGroupIdState(slug);
        setIsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [fetchActiveGroup]);

  const setActiveGroupId = useCallback(
    async (id: string | null) => {
      // Optimistic update
      setActiveGroupIdState(id);
      try {
        const updatedSlug = await updateActiveGroup(id);
        // If the server returns a different slug (should not happen), sync back
        if (updatedSlug !== id) {
          setActiveGroupIdState(updatedSlug);
        }
        setError(null);
      } catch (err) {
        // Revert optimistic update on error
        const previous = await fetchActiveGroup();
        setActiveGroupIdState(previous);
        setError(
          err instanceof Error ? err.message : "Failed to update active group"
        );
      }
    },
    [updateActiveGroup, fetchActiveGroup]
  );

  return (
    <ActiveGroupContext.Provider
      value={{ activeGroupId, setActiveGroupId, isLoading, error, clearError }}
    >
      {children}
    </ActiveGroupContext.Provider>
  );
}

export function useActiveGroup() {
  const context = useContext(ActiveGroupContext);
  if (context === undefined) {
    throw new Error(
      "useActiveGroup must be used within an ActiveGroupProvider"
    );
  }
  return context;
}
