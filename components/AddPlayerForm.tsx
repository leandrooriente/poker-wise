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

      </div>
       <div className="flex justify-end">
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