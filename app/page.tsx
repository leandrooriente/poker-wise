"use client";

import { useState, useEffect } from "react";

import { getGroups, addGroup, deleteGroup } from "@/db/groups";
import { getMatchesByGroup } from "@/db/matches";
import { getGroupMembersForGroup, addGroupMember, removeGroupMember, getGroupMembersForUser } from "@/db/members";
import { getUsers, addUser, deleteUser } from "@/db/users";
import { useActiveGroup } from "@/lib/active-group";
import { generateId } from "@/lib/uuid";
import { Group } from "@/types/group";
import { User } from "@/types/user";

export default function GroupsPage() {
  const { activeGroupId, setActiveGroupId } = useActiveGroup();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<{
    members: User[];
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
      const members = await getGroupMembersForGroup(groupId);
      const allUsers = await getUsers();
      const memberUsers = allUsers.filter(user =>
        members.some(m => m.userId === user.id)
      );
      const matches = await getMatchesByGroup(groupId);
      setSelectedGroupDetails({
        members: memberUsers,
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
      // Create a new global user
      const newUser = await addUser({ name: newPlayerName.trim() });
      // Add user to active group
      await addGroupMember({ groupId: activeGroupId, userId: newUser.id });
      setNewPlayerName("");
      // Refresh group details
      await loadGroupDetails(activeGroupId);
    } catch {
      // Failed to add player to group
    }
  };

  const handleRemovePlayerFromGroup = async (userId: string) => {
    if (!activeGroupId) return;
    if (!confirm("Remove this player from the group? (They will stay in the system.)")) return;
    try {
      await removeGroupMember(activeGroupId, userId);
      // Check if user is member of any other group; if not, delete user (optional)
      const members = await getGroupMembersForUser(userId);
      if (members.length === 0) {
        // User is not a member of any group, delete global user
        await deleteUser(userId);
      }
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
    if (!confirm("Delete this group? All matches and player associations will be removed.")) return;
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
      <div className="flex justify-center items-center h-64">
        <div className="text-retro-green font-pixel">Loading groups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border border-retro-gray rounded-retro p-6 bg-retro-dark shadow-retro-outset">
        <h2 className="text-2xl font-pixel text-retro-green mb-4">
          GROUP MANAGEMENT
        </h2>

        {/* Create group form */}
        <form onSubmit={handleCreateGroup} className="mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="group-name" className="block text-retro-yellow font-pixel text-sm mb-2">
                Group Name *
              </label>
              <input
                id="group-name"
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-retro-gray rounded-retro bg-retro-dark text-retro-light font-pixel"
                placeholder="e.g. Friday Night Poker"
                required
              />
            </div>
            <div>
              <label htmlFor="group-id" className="block text-retro-yellow font-pixel text-sm mb-2">
                Group ID (optional)
              </label>
              <input
                id="group-id"
                type="text"
                value={newGroupId}
                onChange={(e) => setNewGroupId(e.target.value)}
                className="w-full px-3 py-2 border border-retro-gray rounded-retro bg-retro-dark text-retro-light font-pixel"
                placeholder="leave empty for auto-generated"
              />
              <p className="text-xs text-retro-gray mt-1">Unique identifier (slug).</p>
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 border border-retro-green rounded-retro bg-retro-green text-retro-dark font-pixel hover:bg-retro-dark hover:text-retro-green transition-colors"
          >
            CREATE GROUP
          </button>
        </form>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: group list */}
          <div className="lg:col-span-2">
            <h3 className="text-xl font-pixel text-retro-yellow mb-4">
              YOUR GROUPS ({groups.length})
            </h3>
            {groups.length === 0 ? (
              <div className="text-center py-8 border border-retro-gray rounded-retro">
                <p className="text-retro-gray">No groups yet. Create your first!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map((group) => {
                  const isActive = activeGroupId === group.id;
                  return (
                    <div
                      key={group.id}
                      className={`border rounded-retro p-4 ${
                        isActive
                          ? "border-retro-green bg-retro-dark"
                          : "border-retro-gray bg-retro-dark"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-pixel text-retro-green text-lg">{group.name}</h4>
                          <p className="text-sm text-retro-gray">ID: {group.id}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSelectGroup(group.id)}
                            className={`px-3 py-1 border rounded-retro font-pixel text-sm ${
                              isActive
                                ? "border-retro-yellow text-retro-yellow"
                                : "border-retro-gray text-retro-light hover:border-retro-green"
                            }`}
                          >
                            {isActive ? "ACTIVE" : "SELECT"}
                          </button>
                          <button
                            onClick={() => handleDeleteGroup(group.id)}
                            className="px-3 py-1 border border-retro-red rounded-retro text-retro-red font-pixel text-sm hover:bg-retro-red hover:text-retro-dark"
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
            <h3 className="text-xl font-pixel text-retro-yellow mb-4">
              ACTIVE GROUP DETAILS
            </h3>
            {!activeGroupId ? (
              <div className="text-center py-8 border border-retro-gray rounded-retro">
                <p className="text-retro-gray">No group selected.</p>
                <p className="text-sm text-retro-gray mt-2">Select a group from the list or header dropdown.</p>
              </div>
            ) : detailsLoading ? (
              <div className="text-center py-8">
                <p className="text-retro-green font-pixel">Loading details...</p>
              </div>
            ) : selectedGroupDetails ? (
              <div className="border border-retro-gray rounded-retro p-4 bg-retro-dark">
                <h4 className="font-pixel text-retro-green text-lg mb-2">
                  {groups.find(g => g.id === activeGroupId)?.name}
                </h4>
                <p className="text-sm text-retro-gray">ID: {activeGroupId}</p>
                <div className="mt-4">
                  <p className="text-retro-yellow font-pixel">Matches: {selectedGroupDetails.matchCount}</p>
                </div>
                <div className="mt-6">
                  <h5 className="font-pixel text-retro-yellow mb-2">Players in this group</h5>
                  <form onSubmit={handleAddPlayerToGroup} className="mb-4 flex gap-2">
                    <input
                      type="text"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-retro-gray rounded-retro bg-retro-dark text-retro-light font-pixel"
                      placeholder="Player name"
                      required
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 border border-retro-green rounded-retro bg-retro-green text-retro-dark font-pixel hover:bg-retro-dark hover:text-retro-green transition-colors"
                    >
                      ADD
                    </button>
                  </form>
                  {selectedGroupDetails.members.length === 0 ? (
                    <p className="text-retro-gray text-sm">No players yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedGroupDetails.members.map(user => (
                        <li key={user.id} className="flex justify-between items-center">
                          <span className="text-retro-light">{user.name}</span>
                          <button
                            onClick={() => handleRemovePlayerFromGroup(user.id)}
                            className="px-2 py-1 border border-retro-red rounded-retro text-retro-red font-pixel text-xs hover:bg-retro-red hover:text-retro-dark"
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
