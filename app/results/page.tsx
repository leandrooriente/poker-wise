"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

import MoneyDisplay from "@/components/MoneyDisplay";
import { getMatchWithUsers } from "@/db/matches";
import {
  calculateSettlement,
  formatSettlementShareText,
} from "@/lib/settlement";

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
      <div className="nes-container is-dark nes-v-center nes-min-h-content">
        <span className="nes-text">Loading results...</span>
      </div>
    );
  }

  if (error || !match || !settlement) {
    return (
      <div className="nes-container is-dark">
        <h1 className="nes-text is-error">ERROR</h1>
        <p>{error || "Results unavailable"}</p>
        <button onClick={() => router.push("/new-match")} className="nes-btn">
          Start New Match
        </button>
      </div>
    );
  }

  return (
    <div className="nes-container with-title is-dark">
      <p className="title">SETTLEMENT RESULTS</p>
      <p>View net results and exact "who pays whom" transfers after cashout.</p>

      <div className="nes-grid nes-grid-responsive nes-grid-responsive-3">
        {/* Player balances */}
        <div className="nes-grid-responsive-3">
          <h2>PLAYER BALANCES</h2>
          <div className="nes-stack">
            {[...settlement.playerBalances]
              .sort((a, b) => b.net - a.net)
              .map((balance: any) => {
                const player = players.find(
                  (p) => p.user.id === balance.userId
                );
                const net = balance.net;
                const statusLabel =
                  net > 0 ? "TO RECEIVE" : net < 0 ? "TO PAY" : "BREAK EVEN";
                return (
                  <div
                    key={balance.userId}
                    className="nes-container is-rounded"
                  >
                    <div className="nes-stack">
                      <h3 className="nes-text is-success">
                        {player?.name || "Unknown"}
                      </h3>
                      <div className="nes-mt-1">
                        <p>
                          Paid in: <MoneyDisplay cents={balance.paidIn} />
                        </p>
                        <p>
                          Final value:{" "}
                          <MoneyDisplay cents={balance.finalValue} />
                        </p>
                      </div>
                      <div className="nes-mt-2">
                        <div className="nes-text-lg">{statusLabel}</div>
                        <div className="nes-text-lg">
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
        <div className="nes-stack">
          <div>
            <h2>TRANSFERS</h2>
            {settlement.transfers.length === 0 ? (
              <div className="nes-container is-rounded nes-text-center">
                <p className="nes-text is-disabled">
                  No transfers needed — all players break even.
                </p>
              </div>
            ) : (
              <div className="nes-stack">
                {settlement.transfers.map((transfer: any, idx: number) => {
                  const from = players.find(
                    (p) => p.user.id === transfer.fromPlayerId
                  );
                  const to = players.find(
                    (p) => p.user.id === transfer.toPlayerId
                  );
                  return (
                    <div key={idx} className="nes-container is-rounded">
                      <div className="nes-flex nes-items-center nes-justify-center nes-gap-2">
                        <div className="nes-text is-error">{from?.name}</div>
                        <div className="nes-text is-disabled">→</div>
                        <div className="nes-text is-success">{to?.name}</div>
                      </div>
                      <div className="nes-mt-2 nes-text-center">
                        <div className="nes-text-lg">
                          <MoneyDisplay cents={transfer.amount} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="nes-mt-3">
            <h2>SUMMARY</h2>
            <div className="nes-container is-dark">
              <p>
                Total pot: <MoneyDisplay cents={settlement.totalPot} />
              </p>
              <p>
                Total buy-ins:{" "}
                {match.players.reduce(
                  (sum: number, mp: any) => sum + mp.buyIns,
                  0
                )}
              </p>
            </div>
          </div>

          <div className="nes-mt-3">
            <button
              onClick={handleShare}
              className="nes-btn is-primary nes-w-full nes-mb-1"
            >
              SHARE
            </button>
            <button
              onClick={handleNewMatch}
              className="nes-btn is-primary nes-w-full nes-mb-1"
            >
              START NEW MATCH
            </button>
            <button onClick={handleViewHistory} className="nes-btn nes-w-full">
              VIEW HISTORY
            </button>
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
        <div className="nes-container is-dark nes-v-center nes-min-h-content">
          <span className="nes-text">Loading results...</span>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
