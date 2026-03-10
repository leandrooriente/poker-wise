"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useActiveGroup } from "@/lib/active-group";
import { getGroups } from "@/db/groups";
import { Group } from "@/types/group";

export default function Header() {
  const { activeGroupId, setActiveGroupId, isLoading: activeGroupLoading } = useActiveGroup();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  useEffect(() => {
    async function loadGroups() {
      try {
        const loaded = await getGroups();
        setGroups(loaded);
      } catch (error) {
        console.error("Failed to load groups:", error);
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
  ];

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setActiveGroupId(value || null);
  };

  return (
    <header className="border-retro border-retro-width p-4 rounded-retro bg-retro-dark shadow-retro-outset">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-retro-green to-retro-blue flex items-center justify-center">
            <span className="text-retro-dark font-pixel text-lg">P</span>
          </div>
          <h1 className="text-2xl font-pixel text-retro-green">
            POKER<span className="text-retro-yellow">WISE</span>
          </h1>

          {/* Group selector */}
          <div className="ml-4">
            <label htmlFor="group-select" className="sr-only">Select group</label>
            <select
              id="group-select"
              value={activeGroupId || ""}
              onChange={handleGroupChange}
              disabled={activeGroupLoading || groupsLoading}
              className="px-3 py-2 border border-retro-gray rounded-retro bg-retro-dark text-retro-light hover:bg-retro-green hover:text-retro-dark hover:border-retro-green transition-all duration-200 font-pixel text-sm"
            >
              <option value="">-- Select group --</option>
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
              className="px-3 py-2 border border-retro-gray rounded-retro bg-retro-dark text-retro-light hover:bg-retro-green hover:text-retro-dark hover:border-retro-green transition-all duration-200 font-pixel text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}