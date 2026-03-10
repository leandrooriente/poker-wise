"use client";

import { useState, useEffect } from "react";

import { getMatches } from "@/db/matches";
import { getPlayers } from "@/db/players";
import { calculateSettlement } from "@/lib/settlement";
import { Match } from "@/types/match";
import { Player } from "@/types/player";
import MoneyDisplay from "@/components/MoneyDisplay";

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
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      const [matchesData, playersData] = await Promise.all([
        getMatches(),
        getPlayers(),
      ]);

      const enriched = matchesData.map((match): MatchWithDetails => {
        const playerDetails = match.players.map((mp) => {
          const player = playersData.find((p) => p.id === mp.playerId);
          return {
            player: player!,
            buyIns: mp.buyIns,
            finalValue: mp.finalValue,
          };
        }).filter((pd) => pd.player);

        const totalBuyIns = playerDetails.reduce((sum, pd) => sum + pd.buyIns, 0);
        const totalValue = playerDetails.reduce((sum, pd) => sum + pd.finalValue, 0);

        const settlement = calculateSettlement(
          match.players,
          match.buyInAmount
        );

        return {
          ...match,
          playerDetails,
          totalBuyIns,
          totalValue,
          settlement,
        };
      });

      // Sort by date descending (newest first)
      enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setMatches(enriched);
    } catch (error) {
      console.error("Failed to load matches:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (matchId: string) => {
    setExpandedMatchId(expandedMatchId === matchId ? null : matchId);
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
      <div className="border border-retro-gray rounded-retro p-6 bg-retro-dark shadow-retro-outset">
        <h2 className="text-2xl font-pixel text-retro-green mb-6">MATCH HISTORY</h2>
        <div className="flex justify-center items-center h-64">
          <div className="text-retro-green font-pixel">Loading matches...</div>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="border border-retro-gray rounded-retro p-6 bg-retro-dark shadow-retro-outset">
        <h2 className="text-2xl font-pixel text-retro-green mb-6">MATCH HISTORY</h2>

        <div className="border border-retro-gray rounded-retro p-8 text-center">
          <p className="text-retro-gray">No matches yet.</p>
          <p className="text-sm mt-2">Start a new match from the &quot;New Match&quot; tab to see history here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-retro-gray rounded-retro p-6 bg-retro-dark shadow-retro-outset">
      <h2 className="text-2xl font-pixel text-retro-green mb-6">MATCH HISTORY</h2>


      <div className="space-y-6">
        {matches.map((match) => {
          const isExpanded = expandedMatchId === match.id;
          const dateStr = formatDate(match.createdAt);

          const playerCount = match.playerDetails.length;

          return (
            <div
              key={match.id}
              className="border border-retro-gray rounded-retro p-4 bg-retro-darker hover:border-retro-green transition-colors cursor-pointer"
              data-testid="match-entry"
              onClick={() => toggleExpand(match.id)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-pixel text-retro-yellow">
                    Match on {dateStr}
                    {match.title && `: ${match.title}`}
                  </h3>
                  <div className="text-retro-light mt-1">
                    <span className="inline-block mr-4">
                       <span className="text-retro-blue">Buy‑in:</span> <MoneyDisplay cents={match.buyInAmount} />
                    </span>
                    <span className="inline-block mr-4">
                      <span className="text-retro-blue">Players:</span> {playerCount}
                    </span>
                    <span className="inline-block">
                       <span className="text-retro-blue">Pot:</span> <MoneyDisplay cents={match.settlement.totalPot} />
                    </span>
                  </div>
                </div>
                <div className="text-retro-green font-pixel">
                  {isExpanded ? "▲" : "▼"}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-6 pt-6 border-t border-retro-gray">
                  {/* Settlement summary */}
                  <div className="mb-6">
                    <h4 className="text-lg font-pixel text-retro-green mb-3">SETTLEMENT</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-retro-gray rounded-retro p-4">
                        <h5 className="font-pixel text-retro-yellow mb-2">Balances</h5>
                        <ul className="space-y-1">
                          {match.settlement.playerBalances.map((balance) => {
                            const player = match.playerDetails.find(
                              (pd) => pd.player.id === balance.playerId
                            );
                            const netColor = balance.net >= 0 ? "text-retro-green" : "text-retro-red";
                            return (
                              <li key={balance.playerId} className="flex justify-between">
                                <span className="text-retro-light">{player?.player.name || "Unknown"}</span>
                                <span className={`font-pixel ${netColor}`}>
                                   <MoneyDisplay cents={balance.net} />
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div className="border border-retro-gray rounded-retro p-4">
                        <h5 className="font-pixel text-retro-yellow mb-2">Transfers</h5>
                        {match.settlement.transfers.length === 0 ? (
                          <p className="text-retro-gray text-sm">No transfers needed.</p>
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
                                <li key={idx} className="flex justify-between items-center">
                                  <span className="text-retro-light">
                                    {fromPlayer?.player.name || "Unknown"} → {toPlayer?.player.name || "Unknown"}
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
                    <h4 className="text-lg font-pixel text-retro-green mb-3">PLAYER DETAILS</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {match.playerDetails.map((pd) => {
                        const balance = match.settlement.playerBalances.find(
                          (b) => b.playerId === pd.player.id
                        );
                        return (
                          <div
                            key={pd.player.id}
                            className="border border-retro-gray rounded-retro p-4 bg-retro-dark"
                          >
                            <h5 className="font-pixel text-retro-yellow mb-2">
                              {pd.player.name}
                            </h5>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-retro-light">Buy‑ins:</span>
                                <span className="font-pixel">{pd.buyIns}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-retro-light">Final value:</span>
                                 <MoneyDisplay cents={pd.finalValue} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-retro-light">Paid in:</span>
                                 <MoneyDisplay cents={pd.buyIns * match.buyInAmount} />
                              </div>
                              <div className="flex justify-between border-t border-retro-gray pt-1 mt-1">
                                <span className="text-retro-light">Net result:</span>
                                <span className={`font-pixel ${balance?.net && balance.net >= 0 ? "text-retro-green" : "text-retro-red"}`}>
                                   {balance ? <MoneyDisplay cents={balance.net} /> : "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Match metadata */}
                  <div className="mt-6 pt-6 border-t border-retro-gray text-sm text-retro-gray">
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <span className="text-retro-blue">Match ID:</span> {match.id}
                      </div>
                      <div>
                        <span className="text-retro-blue">Created:</span> {new Date(match.createdAt).toLocaleString()}
                      </div>
                      {match.startedAt && (
                        <div>
                          <span className="text-retro-blue">Started:</span> {new Date(match.startedAt).toLocaleString()}
                        </div>
                      )}
                      {match.endedAt && (
                        <div>
                          <span className="text-retro-blue">Ended:</span> {new Date(match.endedAt).toLocaleString()}
                        </div>
                      )}
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