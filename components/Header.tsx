"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

import { getGroups } from "@/db/serverGroups";
import { useActiveGroup } from "@/lib/active-group";
import { Group } from "@/types/group";

export default function Header() {
  const {
    activeGroupId,
    setActiveGroupId,
    isLoading: activeGroupLoading,
  } = useActiveGroup();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const navItems = [
    { label: "Groups", href: "/" },
    { label: "New Match", href: "/new-match" },
    { label: "History", href: "/history" },
    { label: "Login", href: "/login" },
  ];

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setActiveGroupId(value || null);
  };

  return (
    <header className="border-retro-width rounded-retro border-retro bg-retro-dark p-4 shadow-retro-outset">
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

          {/* Group selector */}
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
        </div>

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
        </nav>
      </div>
    </header>
  );
}
