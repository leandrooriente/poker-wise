"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

import MoneyDisplay from "@/components/MoneyDisplay";
import { getMatchWithUsers } from "@/db/matches";
import { calculateSettlement } from "@/lib/settlement";

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
      const data = await getMatchWithUsers(id);
      if (!data) {
        setError("Match not found");
        return;
      }
      setMatch(data.match);
      setPlayers(data.players);
      setSettlement(
        data.settlement ??
          calculateSettlement(data.match.players, data.match.buyInAmount)
      );
    } catch {
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
      <div className="flex h-64 items-center justify-center">
        <div className="font-pixel text-retro-green">Loading results...</div>
      </div>
    );
  }

  if (error || !match || !settlement) {
    return (
      <div className="rounded-retro border-retro-gray bg-retro-dark shadow-retro-outset border p-6">
        <h2 className="font-pixel text-retro-red mb-4 text-2xl">ERROR</h2>
        <p className="text-retro-light">{error || "Results unavailable"}</p>
        <button
          onClick={() => router.push("/new-match")}
          className="rounded-retro font-pixel mt-4 bg-white px-4 py-2 text-black"
        >
          Start New Match
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-retro border-retro-gray bg-retro-dark shadow-retro-outset border p-6">
      <h2 className="font-pixel text-retro-green mb-4 text-2xl">
        SETTLEMENT RESULTS
      </h2>
      <p className="text-retro-light mb-6">
        View net results and exact “who pays whom” transfers after cashout.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Player balances */}
        <div className="lg:col-span-2">
          <h3 className="font-pixel text-retro-yellow mb-4 text-xl">
            PLAYER BALANCES
          </h3>
          <div className="space-y-4">
            {settlement.playerBalances.map((balance: any) => {
              const player = players.find(
                (p) => p.user.id === balance.userId
              )?.user;
              const net = balance.net;
              return (
                <div
                  key={balance.userId}
                  className="rounded-retro border-retro-gray bg-retro-dark hover:border-retro-green border p-6 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-pixel text-retro-green text-2xl">
                        {player?.name || "Unknown"}
                      </h4>
                      <p className="text-retro-light">
                        Paid in: <MoneyDisplay cents={balance.paidIn} />
                        {" • "}
                        Final value: <MoneyDisplay cents={balance.finalValue} />
                      </p>
                    </div>
                    <div
                      className={`font-pixel text-3xl ${net >= 0 ? "text-retro-green" : "text-retro-red"}`}
                    >
                      <MoneyDisplay cents={net} />
                    </div>
                  </div>
                  <div className="border-retro-gray text-retro-light mt-4 border-t pt-4">
                    {net > 0 ? (
                      <span className="text-retro-green">
                        Receives{" "}
                        {
                          settlement.transfers.filter(
                            (t: any) => t.toPlayerId === balance.userId
                          ).length
                        }{" "}
                        payment(s)
                      </span>
                    ) : net < 0 ? (
                      <span className="text-retro-red">
                        Pays{" "}
                        {
                          settlement.transfers.filter(
                            (t: any) => t.fromPlayerId === balance.userId
                          ).length
                        }{" "}
                        payment(s)
                      </span>
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
            <h3 className="font-pixel text-retro-blue mb-4 text-xl">
              TRANSFERS
            </h3>
            {settlement.transfers.length === 0 ? (
              <div className="rounded-retro border-retro-gray border p-6 text-center">
                <p className="text-retro-gray">
                  No transfers needed — all players break even.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {settlement.transfers.map((transfer: any, idx: number) => {
                  const from = players.find(
                    (p) => p.user.id === transfer.fromPlayerId
                  )?.user;
                  const to = players.find(
                    (p) => p.user.id === transfer.toPlayerId
                  )?.user;
                  return (
                    <div
                      key={idx}
                      className="rounded-retro border-retro-gray bg-retro-dark border p-4"
                      data-testid="transfer-item"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="font-pixel text-retro-red">
                            {from?.name}
                          </div>
                          <div className="text-retro-gray">→</div>
                          <div className="font-pixel text-retro-green">
                            {to?.name}
                          </div>
                        </div>
                        <div className="font-pixel text-retro-yellow text-xl">
                          <MoneyDisplay cents={transfer.amount} />
                        </div>
                      </div>
                      <p className="text-retro-gray mt-2 text-sm">
                        {transfer.description || "Payment"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-retro-gray border-t pt-6">
            <h3 className="font-pixel text-retro-purple mb-4 text-xl">
              SUMMARY
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-retro-light">Total pot</span>
                <MoneyDisplay cents={settlement.totalPot} />
              </div>
              <div className="flex justify-between">
                <span className="text-retro-light">Total buy‑ins</span>
                <span className="font-pixel">
                  {match.players.reduce(
                    (sum: number, mp: any) => sum + mp.buyIns,
                    0
                  )}
                </span>
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

          <div className="border-retro-gray border-t pt-6">
            <h3 className="font-pixel text-retro-red mb-4 text-xl">ACTIONS</h3>
            <div className="space-y-4">
              <button
                onClick={handleNewMatch}
                className="rounded-retro font-pixel hover:shadow-retro-outset w-full bg-white px-6 py-4 text-black transition-all hover:bg-gray-200"
              >
                START NEW MATCH
              </button>
              <button
                onClick={handleViewHistory}
                className="rounded-retro border-retro-gray font-pixel text-retro-light hover:border-retro-green hover:text-retro-green w-full border px-6 py-4 transition-all"
              >
                VIEW HISTORY
              </button>
              <p className="text-retro-gray text-center text-sm">
                This match settlement is loaded from persisted match data.
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
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="font-pixel text-retro-green">Loading results...</div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
