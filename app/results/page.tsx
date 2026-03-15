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
      <div className="flex h-64 items-center justify-center">
        <div className="font-pixel">Loading results...</div>
      </div>
    );
  }

  if (error || !match || !settlement) {
    return (
      <div className="nes-container is-bordered p-6">
        <h2 className="font-pixel mb-4 text-2xl" style={{ color: "#e74c3c" }}>
          ERROR
        </h2>
        <p style={{ color: "#fff" }}>{error || "Results unavailable"}</p>
        <button
          onClick={() => router.push("/new-match")}
          className="nes-btn mt-4"
        >
          Start New Match
        </button>
      </div>
    );
  }

  return (
    <div className="nes-container with-title is-dark">
      <p className="title">SETTLEMENT RESULTS</p>
      <p className="mb-6" style={{ color: "#fff" }}>
        View net results and exact &quot;who pays whom&quot; transfers after
        cashout.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Player balances */}
        <div className="lg:col-span-2">
          <h3 className="font-pixel mb-4 text-xl" style={{ color: "#ffdd57" }}>
            PLAYER BALANCES
          </h3>
          <div className="space-y-4">
            {[...settlement.playerBalances]
              .sort((a, b) => b.net - a.net)
              .map((balance: any) => {
                const player = players.find(
                  (p) => p.user.id === balance.userId
                )?.user;
                const net = balance.net;
                const statusLabel =
                  net > 0 ? "TO RECEIVE" : net < 0 ? "TO PAY" : "BREAK EVEN";
                const statusColor =
                  net > 0
                    ? { color: "#48c774" }
                    : net < 0
                      ? { color: "#e74c3c" }
                      : { color: "#999" };
                return (
                  <div
                    key={balance.userId}
                    className="nes-container is-bordered p-6"
                    style={{ background: "#212529" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "#48c774")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "#ccc")
                    }
                  >
                    <div className="flex flex-col">
                      <h4
                        className="font-pixel text-2xl"
                        style={{ color: "#48c774" }}
                      >
                        {player?.name || "Unknown"}
                      </h4>
                      <div className="mt-2 space-y-1">
                        <p style={{ color: "#fff" }}>
                          Paid in: <MoneyDisplay cents={balance.paidIn} />
                        </p>
                        <p style={{ color: "#fff" }}>
                          Final value:{" "}
                          <MoneyDisplay cents={balance.finalValue} />
                        </p>
                      </div>
                      <div className="mt-4" style={statusColor}>
                        <div className="font-pixel text-2xl">{statusLabel}</div>
                        <div
                          className="font-pixel text-2xl"
                          data-testid="net-amount"
                        >
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
            <h3
              className="font-pixel mb-4 text-xl"
              style={{ color: "#3273dc" }}
            >
              TRANSFERS
            </h3>
            {settlement.transfers.length === 0 ? (
              <div className="nes-container is-bordered p-6 text-center">
                <p style={{ color: "#999" }}>
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
                      className="nes-container is-bordered p-4"
                      style={{ background: "#212529" }}
                      data-testid="transfer-item"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <div
                          className="font-pixel"
                          style={{ color: "#e74c3c" }}
                        >
                          {from?.name}
                        </div>
                        <div style={{ color: "#999" }}>→</div>
                        <div
                          className="font-pixel"
                          style={{ color: "#48c774" }}
                        >
                          {to?.name}
                        </div>
                      </div>
                      <div className="mt-4 text-center">
                        <div
                          className="font-pixel text-3xl"
                          style={{ color: "#ffdd57" }}
                        >
                          <MoneyDisplay cents={transfer.amount} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-6" style={{ borderTop: "4px solid #ccc" }}>
            <h3
              className="font-pixel mb-4 text-xl"
              style={{ color: "#b86e28" }}
            >
              SUMMARY
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span style={{ color: "#fff" }}>Total pot</span>
                <MoneyDisplay cents={settlement.totalPot} />
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#fff" }}>Total buy‑ins</span>
                <span className="font-pixel">
                  {match.players.reduce(
                    (sum: number, mp: any) => sum + mp.buyIns,
                    0
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6" style={{ borderTop: "4px solid #ccc" }}>
            <div className="space-y-4">
              <button onClick={handleShare} className="nes-btn w-full">
                SHARE
              </button>
              <button
                onClick={handleNewMatch}
                className="nes-btn is-primary w-full"
                style={{ padding: "16px 24px" }}
              >
                START NEW MATCH
              </button>
              <button onClick={handleViewHistory} className="nes-btn w-full">
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
          <div className="font-pixel">Loading results...</div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
