"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import MoneyDisplay from "@/components/MoneyDisplay";
import { getPlayersForMatch, updatePlayerBuyIns } from "@/db/matches";
import { useActiveGroup } from "@/lib/active-group";
import { MatchPlayer } from "@/types/match";

export default function LiveMatchPage({
  searchParams,
}: {
  searchParams: { match?: string };
}) {
  const router = useRouter();
  const { activeGroupId } = useActiveGroup();
  const [players, setPlayers] = useState<MatchPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const matchId = searchParams.match;

  useEffect(() => {
    async function loadData() {
      try {
        if (!matchId) {
          setError("No match ID provided");
          setLoading(false);
          return;
        }
        const loadedPlayers = await getPlayersForMatch(matchId);
        setPlayers(loadedPlayers);
      } catch {
        setError("Failed to load match");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [matchId]);

  const handleRebuy = async (userId: string) => {
    try {
      await updatePlayerBuyIns(matchId!, userId, 1);
      // Reload players to get updated data
      const updatedPlayers = await getPlayersForMatch(matchId!);
      setPlayers(updatedPlayers);
    } catch {
      alert("Failed to record rebuy. Please try again.");
    }
  };

  const handleProceedToCashout = () => {
    router.push(`/cashout?match=${matchId}`);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="font-pixel text-retro-green">Loading...</div>
      </div>
    );
  }

  if (error || !activeGroupId) {
    return (
      <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
        <h2 className="mb-4 font-pixel text-xl text-retro-red sm:text-2xl">
          ERROR
        </h2>
        <p className="text-retro-light">
          {error || "No match found or no active group"}
        </p>
        <button
          onClick={() => router.push("/new-match")}
          className="mt-4 rounded-retro bg-white px-4 py-2 font-pixel text-black hover:bg-gray-200"
        >
          Start New Match
        </button>
      </div>
    );
  }

  const match = players[0]?.match;

  if (!match) {
    return (
      <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
        <p className="text-retro-light">Match data not available</p>
      </div>
    );
  }

  const totalBuyIns = players.reduce((sum, p) => sum + p.buyIns, 0);
  const totalPot = totalBuyIns * match.buyInAmount;

  return (
    <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
      <h2 className="mb-4 font-pixel text-xl text-retro-green sm:text-2xl">
        LIVE MATCH
      </h2>
      <p className="mb-6 text-retro-light">
        Track rebuys during the game. Tap "Rebuy" when a player adds another
        buy‑in.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Player list */}
        <div className="lg:col-span-2">
          <h3 className="mb-4 font-pixel text-xl text-retro-yellow">PLAYERS</h3>
          <div className="space-y-4">
            {players.map(({ user, buyIns }) => (
              <div
                key={user.id}
                className="flex flex-col rounded-retro border border-retro-gray bg-retro-dark p-4 transition-colors hover:border-retro-green"
                data-testid="player-row"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-pixel text-xl text-retro-green">
                    {user.name}
                  </h4>
                  <span className="font-pixel text-2xl text-retro-yellow">
                    {buyIns}
                  </span>
                </div>
                <p className="text-retro-light">
                  Buy‑ins: <span className="font-pixel">{buyIns}</span>
                </p>
                <p className="text-sm text-retro-gray">
                  Total paid:{" "}
                  <MoneyDisplay cents={buyIns * match.buyInAmount} />
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => handleRebuy(user.id)}
                    className="w-full rounded-retro bg-white px-6 py-3 font-pixel text-black transition-colors hover:bg-gray-200 sm:w-auto"
                  >
                    REBUY
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Match info & actions */}
        <div className="space-y-6">
          <div>
            <h3 className="mb-4 font-pixel text-xl text-retro-blue">
              MATCH INFO
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-retro-light">Buy‑in each</span>
                <MoneyDisplay cents={match.buyInAmount} />
              </div>
              <div className="flex justify-between">
                <span className="text-retro-light">Total buy‑ins</span>
                <span className="font-pixel">{totalBuyIns}</span>
              </div>
              <div className="flex justify-between border-t border-retro-gray pt-3">
                <span className="text-retro-light">Total pot</span>
                <MoneyDisplay
                  cents={totalPot}
                  className="font-pixel text-retro-green"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-retro-gray pt-6">
            <h3 className="mb-4 font-pixel text-xl text-retro-purple">
              ACTIONS
            </h3>
            <div className="space-y-4">
              <button
                onClick={handleProceedToCashout}
                className="w-full rounded-retro bg-white px-6 py-4 font-pixel text-black transition-all hover:bg-gray-200 hover:shadow-retro-outset"
              >
                PROCEED TO CASHOUT
              </button>
              <p className="text-sm text-retro-gray">
                Once all rebuys are recorded, proceed to enter final chip
                values.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
