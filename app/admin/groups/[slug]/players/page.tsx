"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import AddPlayerForm from "@/components/AddPlayerForm";
import PlayerCard from "@/components/PlayerCard";
import { Player } from "@/types/player";

export default function GroupPlayersPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/groups/${slug}/players`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError(
            "You do not have permission to manage players in this group."
          );
        } else {
          setError(`Failed to load players: ${res.status}`);
        }
        setPlayers([]);
        return;
      }
      const data = await res.json();
      // Map API response to Player type
      const mapped = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        notes: p.notes ?? undefined,
        createdAt: p.createdAt,
      }));
      setPlayers(mapped);
    } catch (err) {
      console.error("Failed to fetch players:", err);
      setError("Network error while loading players.");
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchPlayers();
    }
  }, [slug]);

  const handleAddPlayer = async (
    playerData: Omit<Player, "id" | "createdAt">
  ) => {
    try {
      const res = await fetch(`/api/admin/groups/${slug}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: playerData.name,
          notes: playerData.notes,
        }),
      });
      if (!res.ok) {
        throw new Error(`Failed to add player: ${res.status}`);
      }
      // Refresh list
      await fetchPlayers();
    } catch (err) {
      console.error("Add player error:", err);
      alert("Failed to add player. Please try again.");
    }
  };

  const handleUpdatePlayer = async (updatedPlayer: Player) => {
    try {
      const res = await fetch(`/api/admin/groups/${slug}/players`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: updatedPlayer.id,
          name: updatedPlayer.name,
          notes: updatedPlayer.notes,
        }),
      });
      if (!res.ok) {
        throw new Error(`Failed to update player: ${res.status}`);
      }
      // Refresh list
      await fetchPlayers();
    } catch (err) {
      console.error("Update player error:", err);
      alert("Failed to update player. Please try again.");
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm("Are you sure you want to delete this player?")) {
      return;
    }
    try {
      const res = await fetch(
        `/api/admin/groups/${slug}/players?id=${encodeURIComponent(playerId)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!res.ok) {
        throw new Error(`Failed to delete player: ${res.status}`);
      }
      // Refresh list
      await fetchPlayers();
    } catch (err) {
      console.error("Delete player error:", err);
      alert("Failed to delete player. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <h1 className="font-pixel text-retro-green mb-6 text-3xl">Players</h1>
        <div className="border-retro-gray rounded-retro border p-8 text-center">
          <p className="text-retro-green font-pixel">Loading players...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <h1 className="font-pixel text-retro-green mb-6 text-3xl">Players</h1>
        <div className="border-retro-gray rounded-retro border p-8 text-center">
          <p className="text-retro-red font-pixel">{error}</p>
          <button
            onClick={() => fetchPlayers()}
            className="font-pixel rounded-retro mt-4 bg-white px-4 py-2 text-black hover:bg-gray-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="font-pixel text-retro-green mb-2 text-3xl">
        Players in Group
      </h1>
      <p className="text-retro-light mb-6">
        Manage players for group{" "}
        <span className="text-retro-yellow">{slug}</span>.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Add Player Form */}
        <div className="lg:col-span-1">
          <div className="border-retro-gray rounded-retro bg-retro-dark border p-6">
            <h2 className="font-pixel text-retro-blue mb-4 text-xl">
              ADD NEW PLAYER
            </h2>
            <AddPlayerForm onAdd={handleAddPlayer} />
          </div>
        </div>

        {/* Player List */}
        <div className="lg:col-span-2">
          <div className="border-retro-gray rounded-retro bg-retro-dark border p-6">
            <h2 className="font-pixel text-retro-blue mb-4 text-xl">
              EXISTING PLAYERS ({players.length})
            </h2>
            {players.length === 0 ? (
              <div className="border-retro-gray rounded-retro border p-8 text-center">
                <p className="text-retro-gray">No players yet.</p>
                <p className="mt-2 text-sm">
                  Add a player using the form on the left.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {players.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    onUpdate={handleUpdatePlayer}
                    onDelete={handleDeletePlayer}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
