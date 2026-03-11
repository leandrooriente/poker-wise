"use client";

import { useState, useEffect } from "react";

import { getGroups, addGroup, deleteGroup } from "@/db/serverGroups";
import { getMatchesByGroup } from "@/db/matches";
import {
  getPlayersForGroup,
  addPlayerToGroup,
  deletePlayerFromGroup,
} from "@/db/serverPlayers";
import { useActiveGroup } from "@/lib/active-group";
import { generateId } from "@/lib/uuid";
import { Group } from "@/types/group";
import { Player } from "@/types/player";

export default function GroupsPage() {
  const { activeGroupId, setActiveGroupId } = useActiveGroup();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupId, setNewGroupId] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<{
    players: Player[];
    matchCount: number;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (activeGroupId) {
      loadGroupDetails(activeGroupId);
    } else {
      setSelectedGroupDetails(null);
    }
  }, [activeGroupId]);

  const loadGroups = async () => {
    try {
      const loaded = await getGroups();
      setGroups(loaded);
    } catch {
      // Failed to load groups
    } finally {
      setLoading(false);
    }
  };

  const loadGroupDetails = async (groupId: string) => {
    setDetailsLoading(true);
    try {
      const [players, matches] = await Promise.all([
        getPlayersForGroup(groupId),
        getMatchesByGroup(groupId),
      ]);
      setSelectedGroupDetails({
        players,
        matchCount: matches.length,
      });
    } catch {
      // Failed to load group details
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleAddPlayerToGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim() || !activeGroupId) return;
    try {
      await addPlayerToGroup(activeGroupId, { name: newPlayerName.trim() });
      setNewPlayerName("");
      // Refresh group details
      await loadGroupDetails(activeGroupId);
    } catch {
      // Failed to add player to group
    }
  };

  const handleRemovePlayerFromGroup = async (playerId: string) => {
    if (!activeGroupId) return;
    if (!confirm("Remove this player from the group?")) return;
    try {
      await deletePlayerFromGroup(activeGroupId, playerId);
      await loadGroupDetails(activeGroupId);
    } catch {
      // Failed to remove player from group
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = newGroupId.trim();
    // Validate slug: only letters and dashes, no spaces
    const slugValidation = /^[a-zA-Z-]+$/;
    if (!slug || !slugValidation.test(slug)) {
      alert("Group slug must only contain letters and dashes (no spaces).");
      return;
    }
    try {
      await addGroup({ id: slug, name: slug });
      setNewGroupId("");
      await loadGroups();
      // Optionally set as active group
      setActiveGroupId(slug);
    } catch {
      // Failed to create group
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (
      !confirm(
        "Delete this group? All matches and player associations will be removed."
      )
    )
      return;
    try {
      await deleteGroup(id);
      if (activeGroupId === id) {
        setActiveGroupId(null);
      }
      await loadGroups();
    } catch {
      // Failed to delete group
    }
  };

  const handleSelectGroup = (id: string) => {
    setActiveGroupId(id);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="font-pixel text-retro-green">Loading groups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
        <h2 className="mb-4 font-pixel text-2xl text-retro-green">
          GROUP MANAGEMENT
        </h2>

        {/* Create group form */}
        <form onSubmit={handleCreateGroup} className="mb-8 space-y-4">
          <div>
            <label
              htmlFor="group-id"
              className="mb-2 block font-pixel text-sm text-retro-yellow"
            >
              Group *
            </label>
            <input
              id="group-id"
              type="text"
              value={newGroupId}
              onChange={(e) => setNewGroupId(e.target.value)}
              className="w-full rounded-retro border border-retro-gray bg-retro-dark px-3 py-2 font-pixel text-retro-light"
              placeholder="friday-night-poker"
              required
            />
            <p className="mt-1 text-xs text-retro-gray">
              Unique identifier (slug). Only letters and dashes allowed.
            </p>
          </div>
          <button
            type="submit"
            className="rounded-retro border border-retro-green bg-retro-green px-4 py-2 font-pixel text-retro-dark transition-colors hover:bg-retro-dark hover:text-retro-green"
          >
            CREATE GROUP
          </button>
        </form>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left column: group list */}
          <div className="lg:col-span-2">
            <h3 className="mb-4 font-pixel text-xl text-retro-yellow">
              YOUR GROUPS ({groups.length})
            </h3>
            {groups.length === 0 ? (
              <div className="rounded-retro border border-retro-gray py-8 text-center">
                <p className="text-retro-gray">
                  No groups yet. Create your first!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {groups.map((group) => {
                  const isActive = activeGroupId === group.id;
                  return (
                    <div
                      key={group.id}
                      className={`rounded-retro border p-4 ${
                        isActive
                          ? "border-retro-green bg-retro-dark"
                          : "border-retro-gray bg-retro-dark"
                      }`}
                    >
                      <div>
                        <h4 className="font-pixel text-lg text-retro-green">
                          {group.name}
                        </h4>
                        <p className="text-sm text-retro-gray">
                          ID: {group.id}
                        </p>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleSelectGroup(group.id)}
                          className={`rounded-retro border px-3 py-1 font-pixel text-sm ${
                            isActive
                              ? "border-retro-yellow text-retro-yellow"
                              : "border-retro-gray text-retro-light hover:border-retro-green"
                          }`}
                        >
                          {isActive ? "ACTIVE" : "SELECT"}
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="rounded-retro border border-retro-red px-3 py-1 font-pixel text-sm text-retro-red hover:bg-retro-red hover:text-retro-dark"
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column: active group details */}
          <div className="lg:col-span-1">
            <h3 className="mb-4 font-pixel text-xl text-retro-yellow">
              ACTIVE GROUP DETAILS
            </h3>
            {!activeGroupId ? (
              <div className="rounded-retro border border-retro-gray py-8 text-center">
                <p className="text-retro-gray">No group selected.</p>
                <p className="mt-2 text-sm text-retro-gray">
                  Select a group from the list or header dropdown.
                </p>
              </div>
            ) : detailsLoading ? (
              <div className="py-8 text-center">
                <p className="font-pixel text-retro-green">
                  Loading details...
                </p>
              </div>
            ) : selectedGroupDetails ? (
              <div className="rounded-retro border border-retro-gray bg-retro-dark p-4">
                <h4 className="mb-2 font-pixel text-lg text-retro-green">
                  {groups.find((g) => g.id === activeGroupId)?.name}
                </h4>
                <p className="text-sm text-retro-gray">ID: {activeGroupId}</p>
                <div className="mt-4">
                  <p className="font-pixel text-retro-yellow">
                    Matches: {selectedGroupDetails.matchCount}
                  </p>
                </div>
                <div className="mt-6">
                  <h5 className="mb-2 font-pixel text-retro-yellow">
                    Players in this group
                  </h5>
                  <form
                    onSubmit={handleAddPlayerToGroup}
                    className="mb-4 flex flex-col gap-2 sm:flex-row"
                  >
                    <input
                      type="text"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      className="w-full rounded-retro border border-retro-gray bg-retro-dark px-3 py-2 font-pixel text-retro-light sm:flex-1"
                      placeholder="Player name"
                      required
                    />
                    <button
                      type="submit"
                      className="w-full rounded-retro border border-retro-green bg-retro-green px-3 py-2 font-pixel text-retro-dark transition-colors hover:bg-retro-dark hover:text-retro-green sm:w-auto"
                    >
                      ADD
                    </button>
                  </form>
                  {selectedGroupDetails.players.length === 0 ? (
                    <p className="text-sm text-retro-gray">No players yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedGroupDetails.players.map((player) => (
                        <li
                          key={player.id}
                          className="flex items-center justify-between"
                          data-testid="player-item"
                        >
                          <span className="text-retro-light">
                            {player.name}
                          </span>
                          <button
                            onClick={() =>
                              handleRemovePlayerFromGroup(player.id)
                            }
                            className="rounded-retro border border-retro-red px-2 py-1 font-pixel text-xs text-retro-red hover:bg-retro-red hover:text-retro-dark"
                          >
                            REMOVE
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
