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
  const {
    activeGroupId,
    setActiveGroupId,
    isLoading: activeGroupLoading,
    error,
    clearError,
  } = useActiveGroup();
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
      if (!activeGroupId && loaded.length > 0) {
        setActiveGroupId(loaded[0].id);
      }
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
      await setActiveGroupId(slug);
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
        await setActiveGroupId(null);
      }
      await loadGroups();
    } catch {
      // Failed to delete group
    }
  };

  const handleSelectGroup = async (id: string) => {
    try {
      await setActiveGroupId(id);
    } catch (err) {
      console.error("Failed to select group:", err);
      // TODO: show error to user
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="font-pixel">Loading groups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="nes-container with-title is-dark">
        <p className="title">GROUP MANAGEMENT</p>

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

        {/* Create group form */}
        <form onSubmit={handleCreateGroup} className="mb-8 space-y-4">
          <div>
            <label
              htmlFor="group-id"
              className="font-pixel mb-2 block text-sm"
              style={{ color: "#ffdd57" }}
            >
              Group *
            </label>
            <input
              id="group-id"
              type="text"
              value={newGroupId}
              onChange={(e) => setNewGroupId(e.target.value)}
              className="nes-input"
              placeholder="friday-night-poker"
              required
            />
            <p className="mt-1 text-sm" style={{ color: "#999" }}>
              Unique identifier (slug). Only letters and dashes allowed.
            </p>
          </div>
          <button type="submit" className="nes-btn is-primary">
            CREATE GROUP
          </button>
        </form>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left column: group list */}
          <div className="lg:col-span-2">
            <h3
              className="font-pixel mb-4 text-xl"
              style={{ color: "#ffdd57" }}
            >
              YOUR GROUPS ({groups.length})
            </h3>
            {groups.length === 0 ? (
              <div className="nes-container is-bordered py-8 text-center">
                <p style={{ color: "#999" }}>
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
                      className="nes-container is-bordered"
                      style={{
                        borderColor: isActive ? "#48c774" : "#ccc",
                        background: "#212529",
                      }}
                    >
                      <h4
                        className="font-pixel text-lg"
                        style={{ color: "#48c774" }}
                      >
                        {group.id}
                      </h4>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleSelectGroup(group.id)}
                          className="nes-btn"
                          style={{
                            borderColor: isActive ? "#ffdd57" : "#ccc",
                            color: isActive ? "#ffdd57" : "#fff",
                          }}
                        >
                          {isActive ? "ACTIVE" : "SELECT"}
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="nes-btn is-error"
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
            <h3
              className="font-pixel mb-4 text-xl"
              style={{ color: "#ffdd57" }}
            >
              ACTIVE GROUP DETAILS
            </h3>
            {!activeGroupId ? (
              <div className="nes-container is-bordered py-8 text-center">
                <p style={{ color: "#999" }}>No group selected.</p>
                <p className="mt-2 text-sm" style={{ color: "#999" }}>
                  Select a group from the list or header dropdown.
                </p>
              </div>
            ) : detailsLoading ? (
              <div className="py-8 text-center">
                <p className="font-pixel">Loading details...</p>
              </div>
            ) : selectedGroupDetails ? (
              <div className="nes-container is-bordered">
                <h4
                  className="font-pixel mb-2 text-lg"
                  style={{ color: "#48c774" }}
                >
                  {groups.find((g) => g.id === activeGroupId)?.name}
                </h4>
                <p className="text-sm" style={{ color: "#999" }}>
                  ID: {activeGroupId}
                </p>
                <div className="mt-4">
                  <p className="font-pixel" style={{ color: "#ffdd57" }}>
                    Matches: {selectedGroupDetails.matchCount}
                  </p>
                </div>
                <div className="mt-6">
                  <h5 className="font-pixel mb-2" style={{ color: "#ffdd57" }}>
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
                      className="nes-input flex-1"
                      placeholder="Player name"
                      required
                    />
                    <button type="submit" className="nes-btn is-success">
                      ADD
                    </button>
                  </form>
                  {selectedGroupDetails.players.length === 0 ? (
                    <p className="text-sm" style={{ color: "#999" }}>
                      No players yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedGroupDetails.players.map((player) => (
                        <li
                          key={player.id}
                          className="flex items-center justify-between"
                          data-testid="player-item"
                        >
                          <span style={{ color: "#fff" }}>{player.name}</span>
                          <button
                            onClick={() =>
                              handleRemovePlayerFromGroup(player.id)
                            }
                            className="nes-btn is-error"
                            style={{ padding: "4px 8px", fontSize: "10px" }}
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
