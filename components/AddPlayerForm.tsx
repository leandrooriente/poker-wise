"use client";

import { useState } from "react";

import { Player } from "@/types/player";

interface AddPlayerFormProps {
  onAdd: (_player: Omit<Player, "id" | "createdAt">) => void;
}

export default function AddPlayerForm({ onAdd }: AddPlayerFormProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() === "") return;
    onAdd({
      name: name.trim(),
    });
    setName("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label
            className="font-pixel mb-2 block text-sm"
            style={{ color: "#999" }}
          >
            PLAYER NAME *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="nes-input w-full"
            placeholder="e.g., Max"
            required
            data-testid="player-name-input"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="nes-btn is-primary"
          style={{ padding: "12px 24px" }}
        >
          ADD PLAYER
        </button>
      </div>
    </form>
  );
}
