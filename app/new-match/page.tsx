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
  const { activeGroupId } = useActiveGroup();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [buyInAmount, setBuyInAmount] = useState<number>(1000); // cents
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");

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
      alert("At least 2 players are required to start a match.");
      return;
    }
    const matchPlayers = selectedPlayerIds.map((userId) => ({
      userId,
      buyIns: 1, // each player starts with one buy-in
      finalValue: 0, // will be set at cashout
    }));
    const match = {
      groupId: activeGroupId,
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
      <div className="flex h-64 items-center justify-center">
        <div className="font-pixel text-retro-green">Loading...</div>
      </div>
    );
  }

  if (!activeGroupId) {
    return (
      <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
        <h2 className="mb-4 font-pixel text-xl text-retro-green sm:text-2xl">
          NEW MATCH SETUP
        </h2>
        <div className="py-8 text-center">
          <p className="text-retro-gray">No group selected.</p>
          <p className="mt-2 text-sm text-retro-gray">
            Please select a group from the header dropdown or create one on the
            Groups page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
      <h2 className="mb-4 font-pixel text-xl text-retro-green sm:text-2xl">
        NEW MATCH SETUP
      </h2>
      <p className="mb-6 text-retro-light">
        Select players and set buy‑in amount.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Player selection */}
        <div className="lg:col-span-2">
          <h3 className="mb-4 font-pixel text-lg text-retro-yellow sm:text-xl">
            SELECT PLAYERS
          </h3>
          {players.length === 0 ? (
            <div className="rounded-retro border border-retro-gray p-8 text-center">
              <p className="text-retro-gray">No players found.</p>
              <p className="mt-2 text-sm">
                Go to the <strong>Groups</strong> page and manage players for
                your active group.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {players.map((player) => {
                const isSelected = selectedPlayerIds.includes(player.id);
                return (
                  <div
                    key={player.id}
                    className={`rounded-retro border p-4 transition-all ${
                      isSelected
                        ? "border-retro-green bg-retro-green/10"
                        : "border-retro-gray bg-retro-dark hover:border-retro-blue"
                    }`}
                  >
                    <label className="flex cursor-pointer items-center justify-between">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePlayer(player.id)}
                        className="h-5 w-5 cursor-pointer accent-retro-green"
                      />
                      <span className="font-pixel text-lg">{player.name}</span>
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
            <label className="mb-2 block font-pixel text-sm text-retro-light">
              BUY‑IN AMOUNT (EUR)
            </label>
            <MoneyInput
              value={buyInAmount}
              onChange={setBuyInAmount}
              className="w-full"
              data-testid="buy-in-amount-input"
            />
          </div>

          <div className="border-t border-retro-gray pt-6">
            <button
              onClick={handleStartMatch}
              disabled={selectedPlayerIds.length < 2}
              className="w-full rounded-retro bg-white px-6 py-4 font-pixel text-black transition-all hover:bg-gray-200 hover:shadow-retro-outset disabled:cursor-not-allowed disabled:opacity-50"
            >
              START MATCH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
