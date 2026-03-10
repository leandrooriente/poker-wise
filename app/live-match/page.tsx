"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

import { getMatchWithUsers, updateMatch } from "@/db/matches";
import MoneyDisplay from "@/components/MoneyDisplay";


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
    } catch (err) {
      console.error(err);
      setError("Failed to load match");
    } finally {
      setLoading(false);
    }
  };

  const handleRebuy = async (playerId: string) => {
    if (!match) return;
    const updatedPlayers = match.players.map((mp: any) =>
       mp.userId === playerId ? { ...mp, buyIns: mp.buyIns + 1 } : mp
    );
    const updatedMatch = { ...match, players: updatedPlayers };
    await updateMatch(updatedMatch);
    setMatch(updatedMatch);
    // Refresh players list
    const data = await getMatchWithUsers(match.id);
    if (data) setPlayers(data.players);
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
      <div className="flex justify-center items-center h-64">
        <div className="text-retro-green font-pixel">Loading match...</div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="border border-retro-gray rounded-retro p-6 bg-retro-dark shadow-retro-outset">
        <h2 className="text-2xl font-pixel text-retro-red mb-4">ERROR</h2>
        <p className="text-retro-light">{error || "Match not found"}</p>
        <button
          onClick={() => router.push("/new-match")}
          className="mt-4 px-4 py-2 bg-white text-black font-pixel rounded-retro"
        >
          Start New Match
        </button>
      </div>
    );
  }

  const totalBuyIns = players.reduce((sum, p) => sum + p.buyIns, 0);
  const totalPot = totalBuyIns * match.buyInAmount;

  return (
    <div className="border border-retro-gray rounded-retro p-6 bg-retro-dark shadow-retro-outset">
      <h2 className="text-2xl font-pixel text-retro-green mb-4">LIVE MATCH</h2>
      <p className="text-retro-light mb-6">
        Track rebuys during the game. Tap “Rebuy” when a player adds another buy‑in.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Player list */}
        <div className="lg:col-span-2">
          <h3 className="text-xl font-pixel text-retro-yellow mb-4">PLAYERS</h3>
          <div className="space-y-4">
             {players.map(({ user, buyIns }) => (
              <div
                 key={user.id}
                className="border border-retro-gray rounded-retro p-4 flex justify-between items-center bg-retro-dark hover:border-retro-green transition-colors"
                data-testid="player-row"
              >
                <div>
                   <h4 className="text-xl font-pixel text-retro-green">{user.name}</h4>
                  <p className="text-retro-light">
                    Buy‑ins: <span className="font-pixel">{buyIns}</span>
                  </p>
                  <p className="text-retro-gray text-sm">
                      Total paid: <MoneyDisplay cents={buyIns * match.buyInAmount} />
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-pixel text-retro-yellow">{buyIns}</span>
                  <button
                     onClick={() => handleRebuy(user.id)}
                     className="px-6 py-3 bg-white text-black font-pixel rounded-retro hover:bg-gray-200 transition-colors"
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
            <h3 className="text-xl font-pixel text-retro-blue mb-4">MATCH INFO</h3>
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
                  <MoneyDisplay cents={totalPot} className="font-pixel text-retro-green" />
              </div>
              <div className="flex justify-between">
                <span className="text-retro-light">Started</span>
                <span className="text-retro-gray text-sm">
                  {new Date(match.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-retro-gray pt-6">
            <h3 className="text-xl font-pixel text-retro-purple mb-4">ACTIONS</h3>
            <div className="space-y-4">
              <button
                onClick={handleProceedToCashout}
                 className="w-full px-6 py-4 bg-white text-black font-pixel rounded-retro hover:bg-gray-200 hover:shadow-retro-outset transition-all"
              >
                PROCEED TO CASHOUT
              </button>
              <p className="text-retro-gray text-sm">
                Once all rebuys are recorded, proceed to enter final chip values.
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
    <Suspense fallback={
      <div className="flex justify-center items-center h-64">
        <div className="text-retro-green font-pixel">Loading match...</div>
      </div>
    }>
      <LiveMatchContent />
    </Suspense>
  );
}