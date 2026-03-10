"use client";

import { useState } from "react";

import { Player } from "@/types/player";
import MoneyInput from "./MoneyInput";

interface AddPlayerFormProps {
  onAdd: (_player: Omit<Player, "id" | "createdAt">) => void;  
}

export default function AddPlayerForm({ onAdd }: AddPlayerFormProps) {
  const [name, setName] = useState("");
  const [preferredBuyIn, setPreferredBuyIn] = useState<number | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() === "") return;
    onAdd({
      name: name.trim(),
      preferredBuyIn,
    });
    setName("");
    setPreferredBuyIn(undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <MoneyInput
            value={preferredBuyIn ?? 0}
            onChange={(cents) => setPreferredBuyIn(cents === 0 ? undefined : cents)}
            className="w-full"
            placeholder="10.00 (default)"
            data-testid="player-preferred-buyin-input"
          />
        </div>
      </div>
      <div className="flex justify-between items-center">
        <p className="text-retro-gray text-sm">
          Player will be saved locally in your browser.
        </p>
         <button
           type="submit"
           className="px-6 py-3 bg-white text-black font-pixel rounded-retro hover:bg-gray-200 hover:shadow-retro-outset transition-all"
         >
          ADD PLAYER
        </button>
      </div>
    </form>
  );
}