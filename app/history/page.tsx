"use client";

import { useState, useEffect } from "react";

import MoneyDisplay from "@/components/MoneyDisplay";
import { getMatchesByGroup } from "@/db/matches";
import { getPlayersForGroup } from "@/db/players";
import { useActiveGroup } from "@/lib/active-group";
import { calculateSettlement, formatSettlementShareText } from "@/lib/settlement";
import { Match } from "@/types/match";
import { Player } from "@/types/player";

interface MatchWithDetails extends Match {
  playerDetails: Array<{
    player: Player;
    buyIns: number;
    finalValue: number;
  }>;
  totalBuyIns: number;
  totalValue: number;
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

          const totalBuyIns = playerDetails.reduce(
            (sum, pd) => sum + pd.buyIns,
            0
          );
          const totalValue = playerDetails.reduce(
            (sum, pd) => sum + pd.finalValue,
            0
          );

          // Use persisted settlement if available, otherwise compute
          const settlement =
            match.settlement ??
            calculateSettlement(match.players, match.buyInAmount);

          return {
            ...match,
            playerDetails,
            totalBuyIns,
            totalValue,
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
    e.stopPropagation(); // prevent toggling expansion
    const players = match.playerDetails.map(pd => ({
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
      <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
        <h2 className="mb-6 font-pixel text-2xl text-retro-green">
          MATCH HISTORY
        </h2>
        <div className="flex h-64 items-center justify-center">
          <div className="font-pixel text-retro-green">Loading matches...</div>
        </div>
      </div>
    );
  }

  if (!activeGroupId) {
    return (
      <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
        <h2 className="mb-6 font-pixel text-2xl text-retro-green">
          MATCH HISTORY
        </h2>
        <div className="rounded-retro border border-retro-gray p-8 text-center">
          <p className="text-retro-gray">No group selected.</p>
          <p className="mt-2 text-sm">
            Please select a group from the header dropdown or create one on the
            Groups page.
          </p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
        <h2 className="mb-6 font-pixel text-2xl text-retro-green">
          MATCH HISTORY
        </h2>

        <div className="rounded-retro border border-retro-gray p-8 text-center">
          <p className="text-retro-gray">No matches yet.</p>
          <p className="mt-2 text-sm">
            Start a new match from the &quot;New Match&quot; tab to see history
            here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
      {error && (
        <div className="mb-4 rounded-retro border-retro-red bg-retro-red/10 border p-4">
          <div className="flex items-center justify-between">
            <span className="font-pixel text-retro-red text-sm">{error}</span>
            <button
              onClick={clearError}
              className="text-retro-red hover:text-retro-red/80 font-pixel text-xs"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}
      <h2 className="mb-6 font-pixel text-2xl text-retro-green">
        MATCH HISTORY
      </h2>

      <div className="space-y-6">
        {matches.map((match) => {
          const isExpanded = expandedMatchId === match.id;
          const dateStr = formatDate(match.createdAt);

          const playerCount = match.playerDetails.length;

          return (
            <div
              key={match.id}
              className="bg-retro-darker cursor-pointer rounded-retro border border-retro-gray p-4 transition-colors hover:border-retro-green"
              data-testid="match-entry"
              onClick={() => toggleExpand(match.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-pixel text-xl text-retro-yellow">
                    Match on {dateStr}
                    {match.title && `: ${match.title}`}
                  </h3>
                  <div className="mt-1 text-retro-light">
                    <span className="mr-4 inline-block">
                      <span className="text-retro-blue">Buy‑in:</span>{" "}
                      <MoneyDisplay cents={match.buyInAmount} />
                    </span>
                    <span className="mr-4 inline-block">
                      <span className="text-retro-blue">Players:</span>{" "}
                      {playerCount}
                    </span>
                    <span className="inline-block">
                      <span className="text-retro-blue">Pot:</span>{" "}
                      <MoneyDisplay cents={match.settlement.totalPot} />
                    </span>
                  </div>
                </div>
                <div className="font-pixel text-retro-green">
                  {isExpanded ? "▲" : "▼"}
                  </div>
                  {/* Share button */}
                  <div className="mt-6 border-t border-retro-gray pt-6">
                    <button
                      onClick={(e) => handleShare(match, e)}
                      className="w-full rounded-retro border border-retro-gray px-6 py-4 font-pixel text-retro-light transition-all hover:border-retro-green hover:text-retro-green"
                    >
                      SHARE
                    </button>
                  </div>
                </div>

              {isExpanded && (
                <div className="mt-6 border-t border-retro-gray pt-6">
                  {/* Settlement summary */}
                  <div className="mb-6">
                    <h4 className="mb-3 font-pixel text-lg text-retro-green">
                      SETTLEMENT
                    </h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-retro border border-retro-gray p-4">
                        <h5 className="mb-2 font-pixel text-retro-yellow">
                          Balances
                        </h5>
                        <ul className="space-y-1">
                          {match.settlement.playerBalances.map((balance) => {
                            const player = match.playerDetails.find(
                              (pd) => pd.player.id === balance.userId
                            );
                            const netColor =
                              balance.net >= 0
                                ? "text-retro-green"
                                : "text-retro-red";
                            return (
                              <li
                                key={balance.userId}
                                className="flex justify-between"
                              >
                                <span className="text-retro-light">
                                  {player?.player.name || "Unknown"}
                                </span>
                                <span className={`font-pixel ${netColor}`}>
                                  <MoneyDisplay cents={balance.net} />
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div className="rounded-retro border border-retro-gray p-4">
                        <h5 className="mb-2 font-pixel text-retro-yellow">
                          Transfers
                        </h5>
                        {match.settlement.transfers.length === 0 ? (
                          <p className="text-sm text-retro-gray">
                            No transfers needed.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {match.settlement.transfers.map((t, idx) => {
                              const fromPlayer = match.playerDetails.find(
                                (pd) => pd.player.id === t.fromPlayerId
                              );
                              const toPlayer = match.playerDetails.find(
                                (pd) => pd.player.id === t.toPlayerId
                              );
                              return (
                                <li
                                  key={idx}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-retro-light">
                                    {fromPlayer?.player.name || "Unknown"} →{" "}
                                    {toPlayer?.player.name || "Unknown"}
                                  </span>
                                  <span className="font-pixel text-retro-yellow">
                                    <MoneyDisplay cents={t.amount} />
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Player details */}
                  <div>
                    <h4 className="mb-3 font-pixel text-lg text-retro-green">
                      PLAYER DETAILS
                    </h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {match.playerDetails.map((pd) => {
                        const balance = match.settlement.playerBalances.find(
                          (b) => b.userId === pd.player.id
                        );
                        return (
                          <div
                            key={pd.player.id}
                            className="rounded-retro border border-retro-gray bg-retro-dark p-4"
                          >
                            <h5 className="mb-2 font-pixel text-retro-yellow">
                              {pd.player.name}
                            </h5>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-retro-light">
                                  Buy‑ins:
                                </span>
                                <span className="font-pixel">{pd.buyIns}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-retro-light">
                                  Final value:
                                </span>
                                <MoneyDisplay cents={pd.finalValue} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-retro-light">
                                  Paid in:
                                </span>
                                <MoneyDisplay
                                  cents={pd.buyIns * match.buyInAmount}
                                />
                              </div>
                              <div className="mt-1 flex justify-between border-t border-retro-gray pt-1">
                                <span className="text-retro-light">
                                  Net result:
                                </span>
                                <span
                                  className={`font-pixel ${balance?.net && balance.net >= 0 ? "text-retro-green" : "text-retro-red"}`}
                                >
                                  {balance ? (
                                    <MoneyDisplay cents={balance.net} />
                                  ) : (
                                    "—"
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
