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
    error,
    clearError,
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

  useEffect(() => {
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
    setActiveGroupId,
  ]);

  const navItems = [
    { label: "Groups", href: "/" },
    { label: "New Match", href: "/new-match" },
    { label: "History", href: "/history" },
    { label: "Score", href: "/score" },
    { label: "Login", href: "/login" },
  ];

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setActiveGroupId(value || null).catch((err) => {
      console.error("Failed to update active group:", err);
      // TODO: show error to user
    });
  };

  return (
    <header className="nes-container is-dark">
      {error && (
        <div
          className="nes-container is-bordered mb-4"
          style={{ background: "#fee", border: "4px solid #e74c3c" }}
        >
          <div className="flex items-center justify-between">
            <span className="font-pixel text-sm" style={{ color: "#e74c3c" }}>
              {error}
            </span>
            <button
              onClick={clearError}
              className="nes-btn is-error"
              style={{ padding: "4px 8px", fontSize: "10px" }}
            >
              DISMISS
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{
                background: "linear-gradient(135deg, #209cee 0%, #00d1b2 100%)",
              }}
            >
              <span className="font-pixel text-lg" style={{ color: "#fff" }}>
                P
              </span>
            </div>
            <h1
              className="font-pixel text-xl sm:text-2xl"
              style={{ color: "#209cee" }}
            >
              POKER<span style={{ color: "#ffdd57" }}>WISE</span>
            </h1>
          </div>

          {/* Group selector */}
          <div className="ml-0 w-full max-w-xs sm:ml-4 sm:w-auto">
            <label htmlFor="group-select" className="sr-only">
              Select group
            </label>
            <div className="nes-select">
              <select
                id="group-select"
                value={activeGroupId || ""}
                onChange={handleGroupChange}
                disabled={activeGroupLoading || groupsLoading}
              >
                <option value="" disabled>
                  Select group
                </option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nes-btn"
              style={{ fontSize: "12px", padding: "8px 16px" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
