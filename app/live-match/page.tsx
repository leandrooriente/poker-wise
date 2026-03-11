"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import MoneyDisplay from "@/components/MoneyDisplay";
import { getMatchWithUsers, updateMatch } from "@/db/matches";
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
      <div className="rounded-retro border-retro-gray bg-retro-dark shadow-retro-outset border p-6">
        <h2 className="font-pixel text-retro-red mb-4 text-xl sm:text-2xl">
          ERROR
        </h2>
        <p className="text-retro-light">
          {error || "No match found or no active group"}
        </p>
        <button
          onClick={() => router.push("/new-match")}
          className="rounded-retro font-pixel mt-4 bg-white px-4 py-2 text-black hover:bg-gray-200"
        >
          Start New Match
        </button>
      </div>
    );
  }

  const match = players[0]?.match;

  if (!match) {
    return (
      <div className="rounded-retro border-retro-gray bg-retro-dark shadow-retro-outset border p-6">
        <p className="text-retro-light">Match data not available</p>
      </div>
    );
  }

  const totalBuyIns = players.reduce((sum, p) => sum + p.buyIns, 0);
  const totalPot = totalBuyIns * match.buyInAmount;

  return (
    <div className="rounded-retro border-retro-gray bg-retro-dark shadow-retro-outset border p-6">
      <h2 className="font-pixel text-retro-green mb-4 text-xl sm:text-2xl">
        LIVE MATCH
      </h2>
      <p className="text-retro-light mb-6">
        Track rebuys during the game. Tap "Rebuy" when a player adds another
        buy‑in.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Player list */}
        <div className="lg:col-span-2">
          <h3 className="font-pixel text-retro-yellow mb-4 text-xl">PLAYERS</h3>
          <div className="space-y-4">
            {players.map(({ user, buyIns }) => (
              <div
                key={user.id}
                className="rounded-retro border-retro-gray bg-retro-dark hover:border-retro-green flex flex-col border p-4 transition-colors"
                data-testid="player-row"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-pixel text-retro-green text-xl">
                    {user.name}
                  </h4>
                  <span className="font-pixel text-retro-yellow text-2xl">
                    {buyIns}
                  </span>
                </div>
                <p className="text-retro-light">
                  Buy‑ins: <span className="font-pixel">{buyIns}</span>
                </p>
                <p className="text-retro-gray text-sm">
                  Total paid:{" "}
                  <MoneyDisplay cents={buyIns * match.buyInAmount} />
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => handleRebuy(user.id)}
                    className="rounded-retro font-pixel w-full bg-white px-6 py-3 text-black transition-colors hover:bg-gray-200 sm:w-auto"
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
            <h3 className="font-pixel text-retro-blue mb-4 text-xl">
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
              <div className="border-retro-gray flex justify-between border-t pt-3">
                <span className="text-retro-light">Total pot</span>
                <MoneyDisplay
                  cents={totalPot}
                  className="font-pixel text-retro-green"
                />
              </div>
            </div>
          </div>

          <div className="border-retro-gray border-t pt-6">
            <div className="space-y-4">
              <button
                onClick={handleProceedToCashout}
                className="rounded-retro font-pixel hover:shadow-retro-outset w-full bg-white px-6 py-4 text-black transition-all hover:bg-gray-200"
              >
                PROCEED TO CASHOUT
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
