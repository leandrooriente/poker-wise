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
      <div className="nes-container is-dark nes-v-center nes-min-h-content">
        <i className="nes-loader"></i>
      </div>
    );
  }

  if (error || activeGroupError || !activeGroupId) {
    return (
      <div className="nes-container is-dark">
        <h1 className="nes-text is-error">ERROR</h1>
        <p>
          {error || activeGroupError || "No match found or no active group"}
        </p>
        <button onClick={() => router.push("/new-match")} className="nes-btn">
          Start New Match
        </button>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="nes-container is-dark">
        <p className="nes-text is-disabled">Match data not available</p>
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
        <div className="nes-container is-rounded is-error nes-mb-2">
          <div className="nes-flex nes-justify-between nes-items-center">
            <span className="nes-text is-error">{activeGroupError}</span>
            <button onClick={clearError} className="nes-btn is-error">
              DISMISS
            </button>
          </div>
        </div>
      )}

      <p>
        Track rebuys during game. Tap REBUY when a player adds another buy-in.
      </p>

      <div className="nes-grid nes-grid-responsive nes-grid-responsive-3">
        {/* Player list */}
        <div className="nes-grid-responsive-3">
          <h2>PLAYERS</h2>
          <div className="nes-stack">
            {players.map(({ user, buyIns }) => (
              <div key={user.id} className="nes-container is-rounded">
                <div className="nes-flex nes-justify-between nes-items-center">
                  <h3 className="nes-text is-success">{user.name}</h3>
                  <span className="nes-text is-warning">{buyIns}</span>
                </div>
                <p className="nes-text is-disabled">
                  Total paid:{" "}
                  <MoneyDisplay cents={buyIns * match.buyInAmount} />
                </p>
                <button
                  onClick={() => handleRebuy(user.id)}
                  className="nes-btn nes-mt-2"
                >
                  REBUY
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Match info & actions */}
        <div>
          <h2>MATCH INFO</h2>
          <div className="nes-container is-dark">
            <p>
              Buy-in each: <MoneyDisplay cents={match.buyInAmount} />
            </p>
            <p>Total buy-ins: {totalBuyIns}</p>
            <p className="nes-text is-success">
              Total pot: <MoneyDisplay cents={totalPot} />
            </p>
          </div>
          <button
            onClick={handleProceedToCashout}
            className="nes-btn is-primary nes-w-full nes-mt-3"
          >
            PROCEED TO CASHOUT
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LiveMatchPage() {
  return (
    <Suspense
      fallback={
        <div className="nes-container is-dark nes-v-center nes-min-h-content">
          <i className="nes-loader"></i>
        </div>
      }
    >
      <LiveMatchContent />
    </Suspense>
  );
}
