"use client";

import { useState, useEffect } from "react";

import MoneyDisplay from "@/components/MoneyDisplay";
import { getMatchesByGroup, deleteMatch } from "@/db/matches";
import { getPlayersForGroup } from "@/db/players";
import { useActiveGroup } from "@/lib/active-group";
import {
  calculateSettlement,
  formatSettlementShareText,
} from "@/lib/settlement";
import { Match } from "@/types/match";
import { Player } from "@/types/player";

interface MatchWithDetails extends Match {
  playerDetails: Array<{
    player: Player;
    buyIns: number;
    finalValue: number;
  }>;
  settlement: ReturnType<typeof calculateSettlement>;
}

export default function HistoryPage() {
  const { activeGroupId, error, clearError } = useActiveGroup();
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  useEffect(() => {
    const loadMatches = async () => {
      try {
        if (!activeGroupId) {
          setMatches([]);
          setLoading(false);
          return;
        }
        const [matchesData, playersData] = await Promise.all([
          getMatchesByGroup(activeGroupId),
          getPlayersForGroup(activeGroupId),
        ]);

        const enriched = matchesData.map((match): MatchWithDetails => {
          const playerDetails = match.players
            .map((mp) => {
              const player = playersData.find((p) => p.id === mp.userId);
              return {
                player: player!,
                buyIns: mp.buyIns,
                finalValue: mp.finalValue,
              };
            })
            .filter((pd) => pd.player);

          // Use persisted settlement if available, otherwise compute
          const settlement =
            match.settlement ??
            calculateSettlement(match.players, match.buyInAmount);

          return {
            ...match,
            playerDetails,
            settlement,
          };
        });

        // Sort by date descending (newest first)
        enriched.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setMatches(enriched);
      } catch {
        // Failed to load matches
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, [activeGroupId]);

  const toggleExpand = (matchId: string) => {
    setExpandedMatchId(expandedMatchId === matchId ? null : matchId);
  };

  const handleShare = (match: MatchWithDetails, e: React.MouseEvent) => {
    e.stopPropagation();
    const players = match.playerDetails.map((pd) => ({
      id: pd.player.id,
      name: pd.player.name,
    }));
    const text = formatSettlementShareText({
      createdAt: match.createdAt,
      matchPlayers: match.players,
      players,
      settlement: match.settlement,
    });
    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDelete = async (matchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this match?")) {
      return;
    }

    try {
      await deleteMatch(matchId);
      setMatches(matches.filter((m) => m.id !== matchId));
    } catch (err) {
      console.error("Failed to delete match:", err);
      // Could add error state display here if needed
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="nes-container with-title is-dark">
        <p className="title">MATCH HISTORY</p>
        <div className="nes-container is-dark nes-v-center nes-min-h-content">
          <i className="nes-loader"></i>
        </div>
      </div>
    );
  }

  if (!activeGroupId) {
    return (
      <div className="nes-container with-title is-dark">
        <p className="title">MATCH HISTORY</p>
        <div className="nes-container is-rounded nes-text-center">
          <p className="nes-text is-disabled">No group selected.</p>
          <p className="nes-text is-disabled nes-text-sm">
            Please select a group from header dropdown or create one on the
            Groups page.
          </p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="nes-container with-title is-dark">
        <p className="title">MATCH HISTORY</p>

        <div className="nes-container is-rounded nes-text-center">
          <p className="nes-text is-disabled">No matches yet.</p>
          <p className="nes-text-sm">
            Start a new match from "New Match" tab to see history here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="nes-container is-dark">
      {error && (
        <div className="nes-container is-rounded is-error nes-mb-2">
          <div className="nes-flex nes-justify-between nes-items-center">
            <span className="nes-text is-error">{error}</span>
            <button onClick={clearError} className="nes-btn is-error">
              DISMISS
            </button>
          </div>
        </div>
      )}

      <h1>MATCH HISTORY</h1>

      <div className="nes-stack">
        {matches.map((match) => {
          const isExpanded = expandedMatchId === match.id;
          const dateStr = formatDate(match.createdAt);

          const playerCount = match.playerDetails.length;

          return (
            <div
              key={match.id}
              className="nes-container is-rounded"
              onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
            >
              <div className="nes-flex nes-justify-between nes-items-center">
                <div>
                  <h2>{dateStr}</h2>
                  <p>
                    Buy-in: <MoneyDisplay cents={match.buyInAmount} /> |
                    Players: {playerCount} | Pot:{" "}
                    <MoneyDisplay cents={match.settlement.totalPot} />
                  </p>
                </div>
                <i className={`nes-icon ${isExpanded ? "close" : "star"}`}></i>
              </div>

              {isExpanded && (
                <div className="nes-mt-3">
                  <h3>SETTLEMENT</h3>
                  <div className="nes-grid nes-grid-2">
                    <div className="nes-container is-dark">
                      <h4>Balances</h4>
                      <ul className="nes-list is-disc">
                        {match.settlement.playerBalances.map((balance) => {
                          const player = match.playerDetails.find(
                            (pd) => pd.player.id === balance.userId
                          );
                          return (
                            <li key={balance.userId}>
                              {player?.player.name || "Unknown"}:{" "}
                              <span
                                className={
                                  balance.net >= 0
                                    ? "nes-text is-success"
                                    : "nes-text is-error"
                                }
                              >
                                <MoneyDisplay cents={balance.net} />
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div className="nes-container is-dark">
                      <h4>Transfers</h4>
                      {match.settlement.transfers.length === 0 ? (
                        <p className="nes-text is-disabled">
                          No transfers needed.
                        </p>
                      ) : (
                        <ul className="nes-list is-disc">
                          {match.settlement.transfers.map((t, i) => {
                            const from = match.playerDetails.find(
                              (pd) => pd.player.id === t.fromPlayerId
                            );
                            const to = match.playerDetails.find(
                              (pd) => pd.player.id === t.toPlayerId
                            );
                            return (
                              <li key={i}>
                                {from?.player.name || "Unknown"} →{" "}
                                {to?.player.name || "Unknown"}:{" "}
                                <MoneyDisplay cents={t.amount} />
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="nes-flex nes-gap-1 nes-mt-3">
                    <button
                      onClick={(e) => handleShare(match, e)}
                      className="nes-btn is-primary"
                    >
                      SHARE
                    </button>
                    <button
                      onClick={(e) => handleDelete(match.id, e)}
                      className="nes-btn is-error"
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
