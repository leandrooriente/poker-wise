"use client";

import { useState } from "react";

import { Player } from "@/types/player";

interface AddPlayerFormProps {
  onAdd: (_player: Omit<Player, "id" | "createdAt">) => void;  
}

export default function AddPlayerForm({ onAdd }: AddPlayerFormProps) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [preferredBuyIn, setPreferredBuyIn] = useState<number | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() === "") return;
    onAdd({
      name: name.trim(),
      notes: notes.trim() || undefined,
      preferredBuyIn,
    });
    setName("");
    setNotes("");
    setPreferredBuyIn(undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-retro-light text-sm mb-2 font-pixel">
            PLAYER NAME *
          </label>
           <input
             type="text"
             value={name}
             onChange={(e) => setName(e.target.value)}
             className="w-full px-4 py-3 border border-retro-gray bg-retro-dark text-retro-light rounded-retro font-retro-sans focus:border-retro-green focus:outline-none"
             placeholder="e.g., Max"
             required
             data-testid="player-name-input"
           />
        </div>
        <div>
          <label className="block text-retro-light text-sm mb-2 font-pixel">
            PREFERRED BUY-IN (EUR)
          </label>
           <input
             type="number"
             step="0.01"
             min="0"
             value={preferredBuyIn !== undefined ? preferredBuyIn / 100 : ""}
             onChange={(e) =>
               setPreferredBuyIn(
                 e.target.value === "" ? undefined : Math.round(parseFloat(e.target.value) * 100)
               )
             }
             className="w-full px-4 py-3 border border-retro-gray bg-retro-dark text-retro-light rounded-retro font-retro-sans focus:border-retro-green focus:outline-none"
             placeholder="10.00 (default)"
             data-testid="player-preferred-buyin-input"
           />
        </div>
        <div>
          <label className="block text-retro-light text-sm mb-2 font-pixel">
            NOTES
          </label>
           <input
             type="text"
             value={notes}
             onChange={(e) => setNotes(e.target.value)}
             className="w-full px-4 py-3 border border-retro-gray bg-retro-dark text-retro-light rounded-retro font-retro-sans focus:border-retro-green focus:outline-none"
             placeholder="Optional"
             data-testid="player-notes-input"
           />
        </div>
      </div>
      <div className="flex justify-between items-center">
        <p className="text-retro-gray text-sm">
          Player will be saved locally in your browser.
        </p>
        <button
          type="submit"
          className="px-6 py-3 bg-retro-green text-retro-dark font-pixel rounded-retro hover:bg-retro-teal hover:shadow-retro-outset transition-all"
        >
          ADD PLAYER
        </button>
      </div>
    </form>
  );
}