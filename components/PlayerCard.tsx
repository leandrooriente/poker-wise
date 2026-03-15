"use client";

import { useState } from "react";

import { Player } from "@/types/player";

interface PlayerCardProps {
  player: Player;
  onUpdate: (_player: Player) => void;
  onDelete: (_id: string) => void;
}

export default function PlayerCard({
  player,
  onUpdate,
  onDelete,
}: PlayerCardProps) {
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
    <div
      className="nes-container is-bordered is-dark p-4"
      data-testid="player-card"
    >
      {editing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="nes-input w-full"
            placeholder="Player name"
            autoFocus
          />

          <div className="flex gap-2">
            <button onClick={handleSave} className="nes-btn is-success flex-1">
              Save
            </button>
            <button onClick={handleCancel} className="nes-btn is-error flex-1">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-pixel nes-text is-success text-xl">
                {player.name}
              </h4>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="nes-btn px-2 py-1 text-xs"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(player.id)}
                className="nes-btn is-error px-2 py-1 text-xs"
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
