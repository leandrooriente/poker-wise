"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { addMatch } from "@/db/matches";
import { getPlayers } from "@/db/players";
import { getSettings } from "@/db/settings";
import { Player } from "@/types/player";
import MoneyInput from "@/components/MoneyInput";
import MoneyDisplay from "@/components/MoneyDisplay";

export default function NewMatchPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [buyInAmount, setBuyInAmount] = useState<number>(1000); // cents
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [playerList, settings] = await Promise.all([
        getPlayers(),
        getSettings(),
      ]);
      setPlayers(playerList);
      setBuyInAmount(settings.defaultBuyIn);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleStartMatch = async () => {
    if (selectedPlayerIds.length === 0) {
      alert("Select at least one player.");
      return;
    }
    const matchPlayers = selectedPlayerIds.map((playerId) => ({
      playerId,
      buyIns: 1, // each player starts with one buy-in
      finalValue: 0, // will be set at cashout
    }));
    const match = {
      title: title.trim() || undefined,
      buyInAmount,
      players: matchPlayers,
      startedAt: new Date().toISOString(),
    };
    const created = await addMatch(match);
    router.push(`/live-match?match=${created.id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-retro-green font-pixel">Loading...</div>
      </div>
    );
  }

  return (
    <div className="border border-retro-gray rounded-retro p-6 bg-retro-dark shadow-retro-outset">
      <h2 className="text-2xl font-pixel text-retro-green mb-4">NEW MATCH SETUP</h2>
      <p className="text-retro-light mb-6">
        Select players and configure buy‑in amount for a new Texas Hold’em match.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Player selection */}
        <div className="lg:col-span-2">
          <h3 className="text-xl font-pixel text-retro-yellow mb-4">SELECT PLAYERS</h3>
          {players.length === 0 ? (
            <div className="border border-retro-gray rounded-retro p-8 text-center">
              <p className="text-retro-gray">No players found.</p>
              <p className="text-sm mt-2">
                Go to <strong>Players</strong> tab to add players first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {players.map((player) => {
                const isSelected = selectedPlayerIds.includes(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => togglePlayer(player.id)}
                    className={`p-4 border rounded-retro text-left transition-all ${
                      isSelected
                        ? "border-retro-green bg-retro-green/10 text-retro-green"
                        : "border-retro-gray bg-retro-dark hover:border-retro-blue"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-lg">{player.name}</span>
                      {isSelected && (
                        <span className="text-retro-green font-pixel">✓</span>
                      )}
                    </div>
                    {player.preferredBuyIn && (
                      <p className="text-sm text-retro-gray mt-1">
                          Prefers <MoneyDisplay cents={player.preferredBuyIn} />
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-retro-light text-sm mt-4">
            Selected: {selectedPlayerIds.length} player(s)
          </p>
        </div>

        {/* Configuration */}
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-pixel text-retro-blue mb-4">CONFIGURATION</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-retro-light text-sm mb-2 font-pixel">
                  MATCH TITLE (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-retro-gray bg-retro-dark text-retro-light rounded-retro font-retro-sans"
                  placeholder="e.g., Friday Night Poker"
                  data-testid="match-title-input"
                />
              </div>
              <div>
                <label className="block text-retro-light text-sm mb-2 font-pixel">
                  BUY‑IN AMOUNT (EUR)
                </label>
                <MoneyInput
                  value={buyInAmount}
                  onChange={setBuyInAmount}
                  className="w-full"
                  data-testid="buy-in-amount-input"
                />
                <p className="text-retro-gray text-sm mt-2">
                  Each player starts with one buy‑in. Rebuys can be added during the match.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-retro-gray pt-6">
            <h3 className="text-xl font-pixel text-retro-purple mb-4">READY TO START</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-retro-light">Players</span>
                <span className="font-pixel">{selectedPlayerIds.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-retro-light">Buy-in each</span>
                 <MoneyDisplay cents={buyInAmount} />
              </div>
              <div className="flex justify-between border-t border-retro-gray pt-3">
                <span className="text-retro-light">Total pot</span>
                 <MoneyDisplay cents={selectedPlayerIds.length * buyInAmount} className="font-pixel text-retro-green" />
              </div>
            </div>
            <button
              onClick={handleStartMatch}
              disabled={selectedPlayerIds.length === 0}
              className="w-full mt-6 px-6 py-4 bg-retro-green text-retro-dark font-pixel rounded-retro hover:bg-retro-teal hover:shadow-retro-outset disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              START MATCH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}