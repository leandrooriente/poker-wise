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
  const [newGroupName, setNewGroupName] = useState("");
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
    if (!newGroupName.trim()) return;
    const id = newGroupId.trim() || generateId();
    try {
      await addGroup({ id, name: newGroupName.trim() });
      setNewGroupName("");
      setNewGroupId("");
      await loadGroups();
      // Optionally set as active group
      setActiveGroupId(id);
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
      <div className="rounded-retro border-retro-gray bg-retro-dark shadow-retro-outset border p-6">
        <h2 className="font-pixel text-retro-green mb-4 text-2xl">
          GROUP MANAGEMENT
        </h2>

        {/* Create group form */}
        <form onSubmit={handleCreateGroup} className="mb-8 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="group-name"
                className="font-pixel text-retro-yellow mb-2 block text-sm"
              >
                Group Name *
              </label>
              <input
                id="group-name"
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="rounded-retro border-retro-gray bg-retro-dark font-pixel text-retro-light w-full border px-3 py-2"
                placeholder="e.g. Friday Night Poker"
                required
              />
            </div>
            <div>
              <label
                htmlFor="group-id"
                className="font-pixel text-retro-yellow mb-2 block text-sm"
              >
                Group ID (optional)
              </label>
              <input
                id="group-id"
                type="text"
                value={newGroupId}
                onChange={(e) => setNewGroupId(e.target.value)}
                className="rounded-retro border-retro-gray bg-retro-dark font-pixel text-retro-light w-full border px-3 py-2"
                placeholder="leave empty for auto-generated"
              />
              <p className="text-retro-gray mt-1 text-xs">
                Unique identifier (slug).
              </p>
            </div>
          </div>
          <button
            type="submit"
            className="rounded-retro border-retro-green bg-retro-green font-pixel text-retro-dark hover:bg-retro-dark hover:text-retro-green border px-4 py-2 transition-colors"
          >
            CREATE GROUP
          </button>
        </form>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left column: group list */}
          <div className="lg:col-span-2">
            <h3 className="font-pixel text-retro-yellow mb-4 text-xl">
              YOUR GROUPS ({groups.length})
            </h3>
            {groups.length === 0 ? (
              <div className="rounded-retro border-retro-gray border py-8 text-center">
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
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-pixel text-retro-green text-lg">
                            {group.name}
                          </h4>
                          <p className="text-retro-gray text-sm">
                            ID: {group.id}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSelectGroup(group.id)}
                            className={`rounded-retro font-pixel border px-3 py-1 text-sm ${
                              isActive
                                ? "border-retro-yellow text-retro-yellow"
                                : "border-retro-gray text-retro-light hover:border-retro-green"
                            }`}
                          >
                            {isActive ? "ACTIVE" : "SELECT"}
                          </button>
                          <button
                            onClick={() => handleDeleteGroup(group.id)}
                            className="rounded-retro border-retro-red font-pixel text-retro-red hover:bg-retro-red hover:text-retro-dark border px-3 py-1 text-sm"
                          >
                            DELETE
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column: active group details */}
          <div className="lg:col-span-1">
            <h3 className="font-pixel text-retro-yellow mb-4 text-xl">
              ACTIVE GROUP DETAILS
            </h3>
            {!activeGroupId ? (
              <div className="rounded-retro border-retro-gray border py-8 text-center">
                <p className="text-retro-gray">No group selected.</p>
                <p className="text-retro-gray mt-2 text-sm">
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
              <div className="rounded-retro border-retro-gray bg-retro-dark border p-4">
                <h4 className="font-pixel text-retro-green mb-2 text-lg">
                  {groups.find((g) => g.id === activeGroupId)?.name}
                </h4>
                <p className="text-retro-gray text-sm">ID: {activeGroupId}</p>
                <div className="mt-4">
                  <p className="font-pixel text-retro-yellow">
                    Matches: {selectedGroupDetails.matchCount}
                  </p>
                </div>
                <div className="mt-6">
                  <h5 className="font-pixel text-retro-yellow mb-2">
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
                      className="rounded-retro border-retro-gray bg-retro-dark font-pixel text-retro-light w-full border px-3 py-2 sm:flex-1"
                      placeholder="Player name"
                      required
                    />
                    <button
                      type="submit"
                      className="rounded-retro border-retro-green bg-retro-green font-pixel text-retro-dark hover:bg-retro-dark hover:text-retro-green w-full border px-3 py-2 transition-colors sm:w-auto"
                    >
                      ADD
                    </button>
                  </form>
                  {selectedGroupDetails.players.length === 0 ? (
                    <p className="text-retro-gray text-sm">No players yet.</p>
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
                            className="rounded-retro border-retro-red font-pixel text-retro-red hover:bg-retro-red hover:text-retro-dark border px-2 py-1 text-xs"
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
