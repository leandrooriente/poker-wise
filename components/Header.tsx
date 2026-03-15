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
    if (activeGroupLoading || groupsLoading || groups.length === 0) return;
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
    setActiveGroupId(e.target.value || null);
  };

  return (
    <header className="nes-container is-dark">
      {error && (
        <div className="nes-container is-rounded is-error nes-mb-2">
          <div className="nes-flex nes-justify-between nes-items-center">
            <span className="nes-text is-error">{error}</span>
            <button onClick={clearError} className="nes-btn is-error">
              DISMISS
            </button>
          </div>
        </div>
      )}

      <div className="nes-flex nes-flex-wrap nes-gap-2 nes-justify-between nes-items-center">
        <div className="nes-flex nes-gap-2 nes-items-center">
          <i className="nes-icon trophy is-small"></i>
          <h1>
            <span className="nes-text is-primary">POKER</span>
            <span className="nes-text is-warning">WISE</span>
          </h1>
        </div>

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

      <nav className="nes-flex nes-flex-wrap nes-gap-1 nes-mt-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="nes-btn">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
