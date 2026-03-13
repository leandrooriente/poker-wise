"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import MoneyDisplay from "@/components/MoneyDisplay";
import MoneyInput from "@/components/MoneyInput";
import { addMatch } from "@/db/matches";
import { getPlayersForGroup } from "@/db/players";
import { getSettings } from "@/db/settings";
import { useActiveGroup } from "@/lib/active-group";
import { Player } from "@/types/player";

export default function NewMatchPage() {
  const router = useRouter();
  const { activeGroupId, error, clearError } = useActiveGroup();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [buyInAmount, setBuyInAmount] = useState<number>(1000); // cents
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!activeGroupId) {
          setPlayers([]);
          setLoading(false);
          return;
        }
        const [playerList, settings] = await Promise.all([
          getPlayersForGroup(activeGroupId),
          getSettings(),
        ]);
        setPlayers(playerList);
        setBuyInAmount(settings.defaultBuyIn);
      } catch {
        // Failed to load data
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeGroupId]);

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleStartMatch = async () => {
    if (!activeGroupId) {
      alert("Please select a group first.");
      return;
    }
    if (selectedPlayerIds.length < 2) {
      alert("Select at least two players.");
      return;
    }
    const matchPlayers = selectedPlayerIds.map((userId) => ({
      userId,
      buyIns: 1, // each player starts with one buy-in
      finalValue: 0, // will be set at cashout
    }));
    const match = {
      groupId: activeGroupId,
      buyInAmount,
      players: matchPlayers,
      startedAt: new Date().toISOString(),
    };
    const created = await addMatch(match);
    router.push(`/live-match?match=${created.id}`);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-retro-green font-pixel">Loading...</div>
      </div>
    );
  }

  if (!activeGroupId) {
    return (
      <div className="border-retro-gray rounded-retro bg-retro-dark shadow-retro-outset border p-6">
        <h2 className="font-pixel text-retro-green mb-4 text-2xl">NEW MATCH</h2>
        <div className="py-8 text-center">
          <p className="text-retro-gray">No group selected.</p>
          <p className="text-retro-gray mt-2 text-sm">
            Please select a group from the header dropdown or create one on the
            Groups page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-retro-gray rounded-retro bg-retro-dark shadow-retro-outset border p-6">

      {error && (
        <div className="mb-4 rounded-retro border-retro-red bg-retro-red/10 border p-4">
          <div className="flex items-center justify-between">
            <span className="font-pixel text-retro-red text-sm">{error}</span>
            <button
              onClick={clearError}
              className="text-retro-red hover:text-retro-red/80 font-pixel text-xs"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}
      <h2 className="font-pixel text-retro-green mb-4 text-2xl">
        NEW MATCH SETUP
      </h2>
      <p className="text-retro-light mb-6">
        Select players and configure buy‑in amount for a new Texas Hold’em
        match.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Player selection */}
        <div className="lg:col-span-2">
          <h3 className="font-pixel text-retro-yellow mb-4 text-xl">
            SELECT PLAYERS
          </h3>
          {players.length === 0 ? (
            <div className="border-retro-gray rounded-retro border p-8 text-center">
              <p className="text-retro-gray">No players found.</p>
              <p className="mt-2 text-sm">
                Go to <strong>Players</strong> tab to add players first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {players.map((player) => {
                const isSelected = selectedPlayerIds.includes(player.id);
                return (
                  <div key={player.id} className="relative">
                    <input
                      type="checkbox"
                      id={`player-${player.id}`}
                      checked={isSelected}
                      onChange={() => togglePlayer(player.id)}
                      className="absolute h-0 w-0 opacity-0"
                    />
                    <label
                      htmlFor={`player-${player.id}`}
                      className={`rounded-retro block cursor-pointer border p-4 text-left transition-all ${
                        isSelected
                          ? "border-retro-green bg-retro-green/10 text-retro-green"
                          : "border-retro-gray bg-retro-dark hover:border-retro-blue"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          data-testid={`player-checkbox-indicator-${player.id}`}
                          data-state={isSelected ? "checked" : "unchecked"}
                          aria-hidden="true"
                          className={`shadow-retro-outset relative inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 transition-all ${
                            isSelected
                              ? "border-retro-green bg-retro-green/20"
                              : "border-retro-gray bg-retro-dark"
                          }`}
                        >
                          <span
                            className={`h-3.5 w-2 rotate-45 border-r-[3px] border-b-[3px] transition-opacity ${
                              isSelected
                                ? "border-retro-green opacity-100"
                                : "border-transparent opacity-0"
                            }`}
                          />
                        </span>
                        <span className="font-pixel text-lg">
                          {player.name}
                        </span>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Configuration */}
        <div className="space-y-6">
          <div>
            <h3 className="font-pixel text-retro-blue mb-4 text-xl">
              BUY‑IN AMOUNT (EUR)
            </h3>
            <div className="space-y-4">
              <div>
                <MoneyInput
                  value={buyInAmount}
                  onChange={setBuyInAmount}
                  className="w-full"
                  data-testid="buy-in-amount-input"
                />
              </div>
            </div>
          </div>

          <div className="border-retro-gray border-t pt-6">
            <div className="mb-6 flex justify-between">
              <span className="text-retro-light">Total pot</span>
              <MoneyDisplay
                cents={selectedPlayerIds.length * buyInAmount}
                className="font-pixel text-retro-green"
              />
            </div>
            <button
              onClick={handleStartMatch}
              disabled={selectedPlayerIds.length < 2}
              className="font-pixel rounded-retro hover:shadow-retro-outset mt-6 w-full bg-white px-6 py-4 text-black transition-all hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              START MATCH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
