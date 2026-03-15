"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import MoneyDisplay from "@/components/MoneyDisplay";
import { getMatchWithUsers, updateMatch } from "@/db/matches";
import { useActiveGroup } from "@/lib/active-group";
import { Match } from "@/types/match";

type LiveMatchPlayer = {
  user: { id: string; name: string };
  buyIns: number;
  finalValue: number;
};

function LiveMatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    activeGroupId,
    error: activeGroupError,
    clearError,
  } = useActiveGroup();
  const [players, setPlayers] = useState<LiveMatchPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const matchId = searchParams.get("match");

  useEffect(() => {
    async function loadData() {
      try {
        if (!matchId) {
          setError("No match ID provided");
          setLoading(false);
          return;
        }
        const data = await getMatchWithUsers(matchId);
        if (!data) {
          setError("Match not found");
          return;
        }
        setMatch(data.match);
        setPlayers(data.players as LiveMatchPlayer[]);
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
      if (!match) return;

      const currentData = await getMatchWithUsers(match.id);
      const baseMatch = currentData?.match ?? match;
      const updatedPlayers = baseMatch.players.map(
        (player: { userId: string; buyIns: number; finalValue: number }) =>
          player.userId === userId
            ? { ...player, buyIns: player.buyIns + 1 }
            : player
      );
      const updatedMatch = { ...baseMatch, players: updatedPlayers };

      await updateMatch(updatedMatch);

      const data = await getMatchWithUsers(updatedMatch.id);
      if (data) {
        setMatch(data.match);
        setPlayers(data.players as LiveMatchPlayer[]);
      }
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
        <div className="font-pixel">Loading...</div>
      </div>
    );
  }

  if (error || activeGroupError || !activeGroupId) {
    return (
      <div className="nes-container is-bordered p-6">
        <h2
          className="font-pixel mb-4 text-xl sm:text-2xl"
          style={{ color: "#e74c3c" }}
        >
          ERROR
        </h2>
        <p style={{ color: "#fff" }}>
          {error || activeGroupError || "No match found or no active group"}
        </p>
        <button
          onClick={() => router.push("/new-match")}
          className="nes-btn mt-4"
        >
          Start New Match
        </button>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="nes-container is-bordered p-6">
        <p style={{ color: "#fff" }}>Match data not available</p>
      </div>
    );
  }

  const totalBuyIns = players.reduce(
    (sum: number, p: LiveMatchPlayer) => sum + p.buyIns,
    0
  );
  const totalPot = totalBuyIns * match.buyInAmount;

  return (
    <div className="nes-container with-title is-dark">
      <p className="title">LIVE MATCH</p>
      {activeGroupError && (
        <div
          className="nes-container is-bordered mb-4"
          style={{ background: "#fee", border: "4px solid #e74c3c" }}
        >
          <div className="flex items-center justify-between">
            <span className="font-pixel text-sm" style={{ color: "#e74c3c" }}>
              {activeGroupError}
            </span>
            <button
              onClick={clearError}
              className="nes-btn is-error"
              style={{ padding: "4px 8px", fontSize: "10px" }}
            >
              DISMISS
            </button>
          </div>
        </div>
      )}
      <p className="mb-6" style={{ color: "#fff" }}>
        Track rebuys during game. Tap <span>&quot;Rebuy&quot;</span> when a
        player adds another buy-in.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Player list */}
        <div className="lg:col-span-2">
          <h3 className="font-pixel mb-4 text-xl" style={{ color: "#ffdd57" }}>
            PLAYERS
          </h3>
          <div className="space-y-4">
            {players.map(({ user, buyIns }: LiveMatchPlayer) => (
              <div
                key={user.id}
                className="nes-container is-bordered flex flex-col p-4"
                style={{ background: "#212529" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "#48c774")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "#ccc")
                }
                data-testid="player-row"
              >
                <div className="flex items-center justify-between">
                  <h4
                    className="font-pixel text-xl"
                    style={{ color: "#48c774" }}
                  >
                    {user.name}
                  </h4>
                  <span
                    className="font-pixel text-2xl"
                    style={{ color: "#ffdd57" }}
                  >
                    {buyIns}
                  </span>
                </div>

                <p className="text-sm" style={{ color: "#999" }}>
                  Total paid:{" "}
                  <MoneyDisplay cents={buyIns * match.buyInAmount} />
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => handleRebuy(user.id)}
                    className="nes-btn"
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
            <h3
              className="font-pixel mb-4 text-xl"
              style={{ color: "#3273dc" }}
            >
              MATCH INFO
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span style={{ color: "#fff" }}>Buy‑in each</span>
                <MoneyDisplay cents={match.buyInAmount} />
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#fff" }}>Total buy‑ins</span>
                <span className="font-pixel">{totalBuyIns}</span>
              </div>
              <div
                className="flex justify-between pt-3"
                style={{ borderTop: "4px solid #ccc" }}
              >
                <span style={{ color: "#fff" }}>Total pot</span>
                <MoneyDisplay
                  cents={totalPot}
                  className="font-pixel"
                  style={{ color: "#48c774" }}
                />
              </div>
            </div>
          </div>

          <div className="pt-6" style={{ borderTop: "4px solid #ccc" }}>
            <div className="space-y-4">
              <button
                onClick={handleProceedToCashout}
                className="nes-btn is-primary w-full"
                style={{ padding: "16px 24px" }}
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

export default function LiveMatchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="font-pixel">Loading...</div>
        </div>
      }
    >
      <LiveMatchContent />
    </Suspense>
  );
}
