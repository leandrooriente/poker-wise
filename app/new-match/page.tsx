"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import MoneyDisplay from "@/components/MoneyDisplay";
import MoneyInput from "@/components/MoneyInput";
import PlayerSelectionGrid from "@/components/PlayerSelectionGrid";
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
      status: "live" as const,
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
        <div className="rounded-retro border-retro-red bg-retro-red/10 mb-4 border p-4">
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
            <PlayerSelectionGrid
              players={players}
              selectedPlayerIds={selectedPlayerIds}
              onTogglePlayer={togglePlayer}
            />
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
