"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

import { getMatchesByGroup } from "@/db/matches";
import { getGroups } from "@/db/serverGroups";
import { useActiveGroup } from "@/lib/active-group";
import { Group } from "@/types/group";
import type { Match } from "@/types/match";

interface HeaderProps {
  isAuthenticated?: boolean;
}

export default function Header({ isAuthenticated = false }: HeaderProps) {
  const {
    activeGroupId,
    setActiveGroupId,
    isLoading: activeGroupLoading,
    error,
    clearError,
  } = useActiveGroup();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [openMatch, setOpenMatch] = useState<Match | null>(null);
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isLiveMatchPage = pathname?.startsWith("/live-match") ?? false;

  useEffect(() => {
    if (isLoginPage) {
      setGroups([]);
      setGroupsLoading(false);
      return;
    }

    async function loadGroups() {
      try {
        const loaded = await getGroups();
        setGroups(loaded);
      } catch {
        // Failed to load groups
      } finally {
        setGroupsLoading(false);
      }
    }
    loadGroups();
  }, [isLoginPage]);

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    if (activeGroupLoading || groupsLoading || groups.length === 0) {
      return;
    }

    if (!activeGroupId) {
      setActiveGroupId(groups[0].id);
    }
  }, [
    activeGroupId,
    activeGroupLoading,
    groups,
    groupsLoading,
    isLoginPage,
    setActiveGroupId,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadOpenMatch() {
      if (isLoginPage || !activeGroupId || isLiveMatchPage) {
        setOpenMatch(null);
        return;
      }

      try {
        const matches = await getMatchesByGroup(activeGroupId);
        const latestOpenMatch =
          matches.find((match) => match.status === "live") ?? null;

        if (!cancelled) {
          setOpenMatch(latestOpenMatch);
        }
      } catch {
        if (!cancelled) {
          setOpenMatch(null);
        }
      }
    }

    loadOpenMatch();

    return () => {
      cancelled = true;
    };
  }, [activeGroupId, isLiveMatchPage, isLoginPage]);

  const navItems = [
    { label: "Groups", href: "/" },
    { label: "New Match", href: "/new-match" },
    { label: "History", href: "/history" },
    { label: "Score", href: "/score" },
  ];

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setActiveGroupId(value || null).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Failed to update active group:", err);
      // TODO: show error to user
    });
  };

  return (
    <header className="border-retro-width rounded-retro border-retro bg-retro-dark p-4 shadow-retro-outset">
      {!isLoginPage && error && (
        <div className="mb-4 rounded-retro border border-retro-red bg-retro-red/10 p-3">
          <div className="flex items-center justify-between">
            <span className="font-pixel text-sm text-retro-red">{error}</span>
            <button
              onClick={clearError}
              className="font-pixel text-xs text-retro-red hover:text-retro-red/80"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-retro-green to-retro-blue">
              <span className="font-pixel text-lg text-retro-dark">P</span>
            </div>
            <h1 className="font-pixel text-xl text-retro-green sm:text-2xl">
              POKER<span className="text-retro-yellow">WISE</span>
            </h1>
          </div>

          {!isLoginPage && (
            <div className="ml-0 w-full max-w-xs sm:ml-4 sm:w-auto">
              <label htmlFor="group-select" className="sr-only">
                Select group
              </label>
              <select
                id="group-select"
                value={activeGroupId || ""}
                onChange={handleGroupChange}
                disabled={activeGroupLoading || groupsLoading}
                className="w-full rounded-retro border border-retro-gray bg-retro-dark px-3 py-2 font-pixel text-sm text-retro-light transition-all duration-200 hover:border-retro-green hover:bg-retro-green hover:text-retro-dark"
              >
                <option value="">Select group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!isLoginPage && (
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-retro border border-retro-gray bg-retro-dark px-3 py-2 font-pixel text-sm text-retro-light transition-all duration-200 hover:border-retro-green hover:bg-retro-green hover:text-retro-dark"
              >
                {item.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="rounded-retro border border-retro-red bg-retro-dark px-3 py-2 font-pixel text-sm text-retro-red transition-all duration-200 hover:bg-retro-red hover:text-retro-dark"
                >
                  Logout
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="rounded-retro border border-retro-gray bg-retro-dark px-3 py-2 font-pixel text-sm text-retro-light transition-all duration-200 hover:border-retro-green hover:bg-retro-green hover:text-retro-dark"
              >
                Login
              </Link>
            )}
          </nav>
        )}
      </div>

      {openMatch && !isLiveMatchPage && !isLoginPage && (
        <Link
          href={`/live-match?match=${openMatch.id}`}
          data-testid="open-match-banner"
          className="mt-4 block rounded-retro border border-retro-light bg-white p-3 text-black transition-all hover:border-retro-green hover:bg-retro-green"
        >
          <p className="font-pixel text-sm text-black">OPEN MATCH</p>
          <p className="mt-1 text-sm text-black">
            Return to your live table
            {openMatch.title ? `: ${openMatch.title}` : ""}
          </p>
        </Link>
      )}
    </header>
  );
}
