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
  const { activeGroupId, setActiveGroupId, error, clearError } =
    useActiveGroup();
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
    if (activeGroupId) loadGroupDetails(activeGroupId);
    else setSelectedGroupDetails(null);
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

  if (loading) {
    return (
      <div className="nes-container is-dark nes-v-center nes-min-h-content">
        <span className="nes-text">Loading groups...</span>
      </div>
    );
  }

  return (
    <div className="nes-container with-title is-dark">
      <p className="title">GROUP MANAGEMENT</p>

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

      {/* Create group form */}
      <form onSubmit={handleCreateGroup} className="nes-mb-4">
        <div className="nes-field">
          <label htmlFor="group-id">Group *</label>
          <input
            id="group-id"
            type="text"
            value={newGroupId}
            onChange={(e) => setNewGroupId(e.target.value)}
            className="nes-input"
            placeholder="friday-night-poker"
            required
          />
          <p className="nes-text is-disabled nes-text-sm">
            Unique identifier (slug). Only letters and dashes allowed.
          </p>
        </div>
        <button type="submit" className="nes-btn is-primary">
          CREATE GROUP
        </button>
      </form>

      {/* Two column layout */}
      <div className="nes-grid nes-grid-responsive nes-grid-responsive-3">
        {/* Left column: group list */}
        <div className="nes-grid-responsive-3">
          <h2>YOUR GROUPS ({groups.length})</h2>

          {groups.length === 0 ? (
            <div className="nes-container is-rounded nes-text-center">
              <p className="nes-text is-disabled">
                No groups yet. Create your first!
              </p>
            </div>
          ) : (
            <div className="nes-grid nes-grid-responsive">
              {groups.map((group) => {
                const isActive = activeGroupId === group.id;
                return (
                  <div
                    key={group.id}
                    className={`nes-container ${isActive ? "is-success" : ""}`}
                  >
                    <h3>{group.id}</h3>
                    <div className="nes-flex nes-gap-1 nes-mt-2">
                      <button
                        onClick={() => handleSelectGroup(group.id)}
                        className={`nes-btn ${isActive ? "is-warning" : ""}`}
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
        <div>
          <h2>ACTIVE GROUP DETAILS</h2>

          {!activeGroupId ? (
            <div className="nes-container is-rounded nes-text-center">
              <p className="nes-text is-disabled">No group selected.</p>
              <p className="nes-text is-disabled nes-text-sm">
                Select a group from the list or header dropdown.
              </p>
            </div>
          ) : detailsLoading ? (
            <div className="nes-container is-rounded nes-text-center">
              <i className="nes-loader"></i>
            </div>
          ) : selectedGroupDetails ? (
            <div className="nes-container is-dark">
              <h3 className="nes-text is-success">{activeGroupId}</h3>
              <p className="nes-text is-warning">
                Matches: {selectedGroupDetails.matchCount}
              </p>

              <h4 className="nes-mt-3">Players in this group</h4>
              <form
                onSubmit={handleAddPlayerToGroup}
                className="nes-flex nes-gap-1 nes-mb-2"
              >
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="nes-input"
                  placeholder="Player name"
                  required
                />
                <button type="submit" className="nes-btn is-success">
                  ADD
                </button>
              </form>

              {selectedGroupDetails.players.length === 0 ? (
                <p className="nes-text is-disabled">No players yet.</p>
              ) : (
                <ul className="nes-list is-disc">
                  {selectedGroupDetails.players.map((player) => (
                    <li
                      key={player.id}
                      className="nes-flex nes-justify-between nes-items-center"
                    >
                      <span>{player.name}</span>
                      <button
                        onClick={() => handleRemovePlayerFromGroup(player.id)}
                        className="nes-btn is-error"
                      >
                        REMOVE
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
