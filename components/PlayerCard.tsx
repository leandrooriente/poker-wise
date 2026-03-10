"use client";

import { useState } from "react";

import { Player } from "@/types/player";


interface PlayerCardProps {
  player: Player;
  onUpdate: (_player: Player) => void;  
  onDelete: (_id: string) => void;  
}

export default function PlayerCard({ player, onUpdate, onDelete }: PlayerCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player.name);

  const handleSave = () => {
    if (name.trim() === "") return;
    onUpdate({
      ...player,
      name: name.trim(),
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setName(player.name);
    setEditing(false);
  };

  return (
    <div className="border border-retro-gray rounded-retro p-4 bg-retro-dark hover:border-retro-green transition-colors" data-testid="player-card">
      {editing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-retro-gray bg-retro-dark text-retro-light rounded-retro font-retro-sans"
            placeholder="Player name"
            autoFocus
          />

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-2 bg-white text-black font-pixel rounded-retro hover:bg-gray-200 transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 px-3 py-2 bg-white text-black font-pixel rounded-retro hover:bg-retro-red transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xl font-pixel text-retro-green">{player.name}</h4>

            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                 className="px-3 py-1 bg-white text-black border border-retro-gray rounded-retro hover:border-retro-yellow transition-colors text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(player.id)}
                 className="px-3 py-1 bg-white text-black border border-retro-gray rounded-retro hover:border-retro-red transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          </div>

        </>
      )}
    </div>
  );
}