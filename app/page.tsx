"use client";

import { useState, useEffect } from "react";

import AddPlayerForm from "@/components/AddPlayerForm";
import PlayerCard from "@/components/PlayerCard";
import { getPlayers, savePlayers } from "@/db/players";
import { generateId } from "@/lib/uuid";
import { Player } from "@/types/player";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      const stored = await getPlayers();
      setPlayers(stored);
    } catch (error) {
      console.error("Failed to load players:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = (player: Omit<Player, "id" | "createdAt">) => {
    const newPlayer: Player = {
      ...player,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...players, newPlayer];
    setPlayers(updated);
    savePlayers(updated);
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    const updated = players.map((p) =>
      p.id === updatedPlayer.id ? updatedPlayer : p
    );
    setPlayers(updated);
    savePlayers(updated);
  };

  const handleDeletePlayer = (id: string) => {
    const updated = players.filter((p) => p.id !== id);
    setPlayers(updated);
    savePlayers(updated);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-retro-green font-pixel">Loading players...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border border-retro-gray rounded-retro p-6 bg-retro-dark shadow-retro-outset">
        <h2 className="text-2xl font-pixel text-retro-green mb-4">
          PLAYER MANAGEMENT
        </h2>
        <p className="text-retro-light mb-6">
          Add regular poker players. These will appear when starting a new match.
        </p>

        <AddPlayerForm onAdd={handleAddPlayer} />

        <div className="mt-8">
          <h3 className="text-xl font-pixel text-retro-yellow mb-4">
            REGULAR PLAYERS ({players.length})
          </h3>
          {players.length === 0 ? (
            <div className="text-center py-8 border border-retro-gray rounded-retro">
              <p className="text-retro-gray">No players yet. Add your first!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
  );
}
