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
      className="nes-container is-bordered p-4"
      data-testid="player-card"
      style={{ background: "#212529" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#48c774")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#ccc")}
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
              <h4 className="font-pixel text-xl" style={{ color: "#48c774" }}>
                {player.name}
              </h4>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="nes-btn"
                style={{ fontSize: "12px", padding: "4px 8px" }}
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(player.id)}
                className="nes-btn is-error"
                style={{ fontSize: "12px", padding: "4px 8px" }}
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
