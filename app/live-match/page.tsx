"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

import MoneyDisplay from "@/components/MoneyDisplay";
import { getMatchWithUsers, updateMatch } from "@/db/matches";

function LiveMatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    if (matchId) loadMatch(matchId);
    else setError("No match ID provided");
  }, [matchId]);

  const loadMatch = async (id: string) => {
    try {
      const data = await getMatchWithUsers(id);
      if (!data) {
        setError("Match not found");
        return;
      }
      setMatch(data.match);
      setPlayers(data.players);
    } catch {
      setError("Failed to load match");
    } finally {
      setLoading(false);
    }
  };

  const handleRebuy = async (playerId: string) => {
    if (!match) return;

    const currentData = await getMatchWithUsers(match.id);
    const baseMatch = currentData?.match ?? match;
    const updatedPlayers = baseMatch.players.map((mp: any) =>
      mp.userId === playerId ? { ...mp, buyIns: mp.buyIns + 1 } : mp
    );
    const updatedMatch = { ...baseMatch, players: updatedPlayers };

    await updateMatch(updatedMatch);

    const data = await getMatchWithUsers(updatedMatch.id);
    if (data) {
      setMatch(data.match);
      setPlayers(data.players);
      return;
    }

    setMatch(updatedMatch);
  };

  const handleProceedToCashout = () => {
    if (!match) return;
    // Update match endedAt if not set
    if (!match.endedAt) {
      const updatedMatch = { ...match, endedAt: new Date().toISOString() };
      updateMatch(updatedMatch);
      setMatch(updatedMatch);
    }
    router.push(`/cashout?match=${match.id}`);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="font-pixel text-retro-green">Loading match...</div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
        <h2 className="mb-4 font-pixel text-2xl text-retro-red">ERROR</h2>
        <p className="text-retro-light">{error || "Match not found"}</p>
        <button
          onClick={() => router.push("/new-match")}
          className="mt-4 rounded-retro bg-white px-4 py-2 font-pixel text-black"
        >
          Start New Match
        </button>
      </div>
    );
  }

  const totalBuyIns = players.reduce((sum, p) => sum + p.buyIns, 0);
  const totalPot = totalBuyIns * match.buyInAmount;

  return (
    <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
      <h2 className="mb-4 font-pixel text-2xl text-retro-green">LIVE MATCH</h2>
      <p className="mb-6 text-retro-light">
        Track rebuys during the game. Tap “Rebuy” when a player adds another
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
              <div className="flex justify-between">
                <span className="text-retro-light">Started</span>
                <span className="text-sm text-retro-gray">
                  {new Date(match.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
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

export default function LiveMatchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="font-pixel text-retro-green">Loading match...</div>
        </div>
      }
    >
      <LiveMatchContent />
    </Suspense>
  );
}
