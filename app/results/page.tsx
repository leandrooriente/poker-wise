"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

import MoneyDisplay from "@/components/MoneyDisplay";
import { getMatchWithUsers } from "@/db/matches";
import { calculateSettlement, formatSettlementShareText } from "@/lib/settlement";

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

  const handleShare = () => {
    if (!match || !players || !settlement) return;

    const text = formatSettlementShareText({
      createdAt: match.createdAt,
      matchPlayers: match.players,
      players: players.map((p: any) => ({ id: p.user.id, name: p.user.name })),
      settlement,
    });
    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank", "noopener,noreferrer");
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
      <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
        <h2 className="mb-4 font-pixel text-2xl text-retro-red">ERROR</h2>
        <p className="text-retro-light">{error || "Results unavailable"}</p>
        <button
          onClick={() => router.push("/new-match")}
          className="mt-4 rounded-retro bg-white px-4 py-2 font-pixel text-black"
        >
          Start New Match
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
      <h2 className="mb-4 font-pixel text-2xl text-retro-green">
        SETTLEMENT RESULTS
      </h2>
      <p className="mb-6 text-retro-light">
        View net results and exact “who pays whom” transfers after cashout.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Player balances */}
        <div className="lg:col-span-2">
          <h3 className="mb-4 font-pixel text-xl text-retro-yellow">
            PLAYER BALANCES
          </h3>
          <div className="space-y-4">
            {settlement.playerBalances.map((balance: any) => {
              const player = players.find(
                (p) => p.user.id === balance.userId
              )?.user;
              const net = balance.net;
              const statusLabel =
                net > 0 ? "TO RECEIVE" : net < 0 ? "TO PAY" : "BREAK EVEN";
              const statusColor =
                net > 0
                  ? "text-retro-green"
                  : net < 0
                    ? "text-retro-red"
                    : "text-retro-gray";
              return (
                <div
                  key={balance.userId}
                  className="rounded-retro border border-retro-gray bg-retro-dark p-6 transition-colors hover:border-retro-green"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-pixel text-2xl text-retro-green">
                        {player?.name || "Unknown"}
                      </h4>
                      <p className="text-retro-light">
                        Paid in: <MoneyDisplay cents={balance.paidIn} />
                        {" • "}
                        Final value: <MoneyDisplay cents={balance.finalValue} />
                      </p>
                    </div>
                    <div className={`text-right ${statusColor}`}>
                      <div className="mb-2 font-pixel text-sm">
                        {statusLabel}
                      </div>
                      <div className="font-pixel text-5xl">
                        <MoneyDisplay cents={Math.abs(net)} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transfers & summary */}
        <div className="space-y-6">
          <div>
            <h3 className="mb-4 font-pixel text-xl text-retro-blue">
              TRANSFERS
            </h3>
            {settlement.transfers.length === 0 ? (
              <div className="rounded-retro border border-retro-gray p-6 text-center">
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
                      className="rounded-retro border border-retro-gray bg-retro-dark p-4"
                      data-testid="transfer-item"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <div className="font-pixel text-retro-red">
                          {from?.name}
                        </div>
                        <div className="text-retro-gray">→</div>
                        <div className="font-pixel text-retro-green">
                          {to?.name}
                        </div>
                      </div>
                      <div className="mt-4 text-center">
                        <div className="font-pixel text-3xl text-retro-yellow">
                          <MoneyDisplay cents={transfer.amount} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-retro-gray pt-6">
            <h3 className="mb-4 font-pixel text-xl text-retro-purple">
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
            </div>
          </div>

          <div className="border-t border-retro-gray pt-6">
            <div className="space-y-4">
              <button
                onClick={handleShare}
                className="w-full rounded-retro border border-retro-gray px-6 py-4 font-pixel text-retro-light transition-all hover:border-retro-green hover:text-retro-green"
              >
                SHARE
              </button>
              <button
                onClick={handleNewMatch}
                className="w-full rounded-retro bg-white px-6 py-4 font-pixel text-black transition-all hover:bg-gray-200 hover:shadow-retro-outset"
              >
                START NEW MATCH
              </button>
              <button
                onClick={handleViewHistory}
                className="w-full rounded-retro border border-retro-gray px-6 py-4 font-pixel text-retro-light transition-all hover:border-retro-green hover:text-retro-green"
              >
                VIEW HISTORY
              </button>
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
