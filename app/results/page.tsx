"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

import { getMatchWithPlayers } from "@/db/matches";
import { calculateSettlement } from "@/lib/settlement";
import MoneyDisplay from "@/components/MoneyDisplay";

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [settlement, setSettlement] = useState<any>(null);

  useEffect(() => {
    if (matchId) loadMatch(matchId);
    else setError("No match ID provided");
  }, [matchId]);

  const loadMatch = async (id: string) => {
    try {
      const data = await getMatchWithPlayers(id);
      if (!data) {
        setError("Match not found");
        return;
      }
      setMatch(data.match);
      setPlayers(data.players);
      // Compute settlement
      const settlementResult = calculateSettlement(
        data.match.players,
        data.match.buyInAmount
      );
      setSettlement(settlementResult);
    } catch (err) {
      console.error(err);
      setError("Failed to load match");
    } finally {
      setLoading(false);
    }
  };

  const handleNewMatch = () => {
    router.push("/new-match");
  };

  const handleViewHistory = () => {
    router.push("/history");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-retro-green font-pixel">Loading results...</div>
      </div>
    );
  }

  if (error || !match || !settlement) {
    return (
      <div className="border border-retro-gray rounded-retro p-6 bg-retro-dark shadow-retro-outset">
        <h2 className="text-2xl font-pixel text-retro-red mb-4">ERROR</h2>
        <p className="text-retro-light">{error || "Results unavailable"}</p>
        <button
          onClick={() => router.push("/new-match")}
          className="mt-4 px-4 py-2 bg-white text-black font-pixel rounded-retro"
        >
          Start New Match
        </button>
      </div>
    );
  }

  return (
    <div className="border border-retro-gray rounded-retro p-6 bg-retro-dark shadow-retro-outset">
      <h2 className="text-2xl font-pixel text-retro-green mb-4">SETTLEMENT RESULTS</h2>
      <p className="text-retro-light mb-6">
        View net results and exact “who pays whom” transfers after cashout.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Player balances */}
        <div className="lg:col-span-2">
          <h3 className="text-xl font-pixel text-retro-yellow mb-4">PLAYER BALANCES</h3>
          <div className="space-y-4">
            {settlement.playerBalances.map((balance: any) => {
              const player = players.find((p) => p.player.id === balance.playerId)?.player;
              const net = balance.net;
              return (
                <div
                  key={balance.playerId}
                  className="border border-retro-gray rounded-retro p-6 bg-retro-dark hover:border-retro-green transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-2xl font-pixel text-retro-green">{player?.name || "Unknown"}</h4>
                      <p className="text-retro-light">
                         Paid in: <MoneyDisplay cents={balance.paidIn} />
                        {" • "}
                         Final value: <MoneyDisplay cents={balance.finalValue} />
                      </p>
                    </div>
                    <div className={`text-3xl font-pixel ${net >= 0 ? "text-retro-green" : "text-retro-red"}`}>
                       <MoneyDisplay cents={net} />
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-retro-gray text-retro-light">
                    {net > 0 ? (
                      <span className="text-retro-green">Receives {settlement.transfers.filter((t: any) => t.toPlayerId === balance.playerId).length} payment(s)</span>
                    ) : net < 0 ? (
                      <span className="text-retro-red">Pays {settlement.transfers.filter((t: any) => t.fromPlayerId === balance.playerId).length} payment(s)</span>
                    ) : (
                      <span className="text-retro-gray">Breaks even</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transfers & summary */}
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-pixel text-retro-blue mb-4">TRANSFERS</h3>
            {settlement.transfers.length === 0 ? (
              <div className="border border-retro-gray rounded-retro p-6 text-center">
                <p className="text-retro-gray">No transfers needed — all players break even.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {settlement.transfers.map((transfer: any, idx: number) => {
                  const from = players.find((p) => p.player.id === transfer.fromPlayerId)?.player;
                  const to = players.find((p) => p.player.id === transfer.toPlayerId)?.player;
                  return (
                    <div
                      key={idx}
                      className="border border-retro-gray rounded-retro p-4 bg-retro-dark"
                      data-testid="transfer-item"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="text-retro-red font-pixel">{from?.name}</div>
                          <div className="text-retro-gray">→</div>
                          <div className="text-retro-green font-pixel">{to?.name}</div>
                        </div>
                        <div className="text-xl font-pixel text-retro-yellow">
                           <MoneyDisplay cents={transfer.amount} />
                        </div>
                      </div>
                      <p className="text-retro-gray text-sm mt-2">
                        {transfer.description || "Payment"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-retro-gray pt-6">
            <h3 className="text-xl font-pixel text-retro-purple mb-4">SUMMARY</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-retro-light">Total pot</span>
                 <MoneyDisplay cents={settlement.totalPot} />
              </div>
              <div className="flex justify-between">
                <span className="text-retro-light">Total buy‑ins</span>
                <span className="font-pixel">{match.players.reduce((sum: number, mp: any) => sum + mp.buyIns, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-retro-light">Match duration</span>
                <span className="text-retro-gray text-sm">
                  {match.startedAt && match.endedAt
                    ? `${Math.round((new Date(match.endedAt).getTime() - new Date(match.startedAt).getTime()) / 60000)} min`
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-retro-gray pt-6">
            <h3 className="text-xl font-pixel text-retro-red mb-4">ACTIONS</h3>
            <div className="space-y-4">
              <button
                onClick={handleNewMatch}
                 className="w-full px-6 py-4 bg-white text-black font-pixel rounded-retro hover:bg-gray-200 hover:shadow-retro-outset transition-all"
              >
                START NEW MATCH
              </button>
              <button
                onClick={handleViewHistory}
                className="w-full px-6 py-4 border border-retro-gray text-retro-light font-pixel rounded-retro hover:border-retro-green hover:text-retro-green transition-all"
              >
                VIEW HISTORY
              </button>
              <p className="text-retro-gray text-sm text-center">
                This match is saved locally in your browser.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-64">
        <div className="text-retro-green font-pixel">Loading results...</div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}