"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import MoneyDisplay from "@/components/MoneyDisplay";
import MoneyInput from "@/components/MoneyInput";
import PlayerSelectionGrid from "@/components/PlayerSelectionGrid";
import { getMatchWithUsers, updateMatch } from "@/db/matches";
import { getPlayersForGroup } from "@/db/players";
import { useActiveGroup } from "@/lib/active-group";
import { Match } from "@/types/match";
import { Player } from "@/types/player";

type LiveMatchPlayer = {
  user: { id: string; name: string };
  buyIns: number;
  finalValue: number;
  cashedOutAt?: string;
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
  const [cashOutEditorByUserId, setCashOutEditorByUserId] = useState<
    Record<string, number>
  >({});
  const [editingCashOutUserId, setEditingCashOutUserId] = useState<
    string | null
  >(null);
  const [isAddPlayersModalOpen, setIsAddPlayersModalOpen] = useState(false);
  const [groupPlayers, setGroupPlayers] = useState<Player[]>([]);
  const [selectedPlayerIdsToAdd, setSelectedPlayerIdsToAdd] = useState<
    string[]
  >([]);
  const [isLoadingGroupPlayers, setIsLoadingGroupPlayers] = useState(false);
  const [addPlayersError, setAddPlayersError] = useState<string | null>(null);
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
        setEditingCashOutUserId(null);
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
      const updatedPlayers = baseMatch.players.map((player) => {
        if (player.userId !== userId) {
          return player;
        }

        if (player.cashedOutAt) {
          return player;
        }

        return { ...player, buyIns: player.buyIns + 1 };
      });
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

  const handleStartCashOut = (userId: string) => {
    setCashOutEditorByUserId((prev) => ({
      ...prev,
      [userId]: 0,
    }));
    setEditingCashOutUserId(userId);
  };

  const handleCashOutAmountChange = (userId: string, cents: number) => {
    setCashOutEditorByUserId((prev) => ({
      ...prev,
      [userId]: cents,
    }));
  };

  const handleSaveCashOut = async (userId: string) => {
    try {
      if (!match) return;

      const currentData = await getMatchWithUsers(match.id);
      const baseMatch = currentData?.match ?? match;
      const cashOutAmount = cashOutEditorByUserId[userId] ?? 0;

      const updatedPlayers = baseMatch.players.map((player) =>
        player.userId === userId
          ? {
              ...player,
              finalValue: cashOutAmount,
              cashedOutAt: new Date().toISOString(),
            }
          : player
      );

      await updateMatch({ ...baseMatch, players: updatedPlayers });

      const data = await getMatchWithUsers(baseMatch.id);
      if (data) {
        setMatch(data.match);
        setPlayers(data.players as LiveMatchPlayer[]);
        setEditingCashOutUserId(null);
      }
    } catch {
      alert("Failed to record cash out. Please try again.");
    }
  };

  const handleReturnToMatch = async (userId: string) => {
    try {
      if (!match) return;

      const currentData = await getMatchWithUsers(match.id);
      const baseMatch = currentData?.match ?? match;

      const updatedPlayers = baseMatch.players.map((player) =>
        player.userId === userId
          ? {
              ...player,
              finalValue: 0,
              cashedOutAt: undefined,
            }
          : player
      );

      await updateMatch({ ...baseMatch, players: updatedPlayers });

      const data = await getMatchWithUsers(baseMatch.id);
      if (data) {
        setMatch(data.match);
        setPlayers(data.players as LiveMatchPlayer[]);
      }

      setEditingCashOutUserId(null);
      setCashOutEditorByUserId((prev) => ({
        ...prev,
        [userId]: 0,
      }));
    } catch {
      alert("Failed to return player to match. Please try again.");
    }
  };

  const handleProceedToCashout = () => {
    router.push(`/cashout?match=${matchId}`);
  };

  const togglePlayerToAdd = (userId: string) => {
    setSelectedPlayerIdsToAdd((prev) =>
      prev.includes(userId)
        ? prev.filter((selectedId) => selectedId !== userId)
        : [...prev, userId]
    );
  };

  const openAddPlayersModal = async () => {
    if (!activeGroupId) {
      setAddPlayersError("Please select a group first.");
      return;
    }

    try {
      setIsLoadingGroupPlayers(true);
      setAddPlayersError(null);
      setSelectedPlayerIdsToAdd([]);

      const allGroupPlayers = await getPlayersForGroup(activeGroupId);
      setGroupPlayers(allGroupPlayers);
      setIsAddPlayersModalOpen(true);
    } catch {
      setAddPlayersError("Failed to load group players.");
    } finally {
      setIsLoadingGroupPlayers(false);
    }
  };

  const closeAddPlayersModal = () => {
    setIsAddPlayersModalOpen(false);
    setSelectedPlayerIdsToAdd([]);
    setAddPlayersError(null);
  };

  const handleAddPlayersToMatch = async () => {
    try {
      if (!match || selectedPlayerIdsToAdd.length === 0) return;

      const currentData = await getMatchWithUsers(match.id);
      const baseMatch = currentData?.match ?? match;
      const existingUserIds = new Set(
        baseMatch.players.map((player) => player.userId)
      );

      const playersToAdd = selectedPlayerIdsToAdd
        .filter((userId) => !existingUserIds.has(userId))
        .map((userId) => ({
          userId,
          buyIns: 1,
          finalValue: 0,
        }));

      if (playersToAdd.length === 0) {
        closeAddPlayersModal();
        return;
      }

      await updateMatch({
        ...baseMatch,
        players: [...baseMatch.players, ...playersToAdd],
      });

      const updatedData = await getMatchWithUsers(baseMatch.id);
      if (updatedData) {
        setMatch(updatedData.match);
        setPlayers(updatedData.players as LiveMatchPlayer[]);
      }

      closeAddPlayersModal();
    } catch {
      setAddPlayersError(
        "Failed to add players to the match. Please try again."
      );
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="font-pixel text-retro-green">Loading...</div>
      </div>
    );
  }

  if (error || activeGroupError || !activeGroupId) {
    return (
      <div className="rounded-retro border-retro-gray bg-retro-dark shadow-retro-outset border p-6">
        <h2 className="font-pixel text-retro-red mb-4 text-xl sm:text-2xl">
          ERROR
        </h2>
        <p className="text-retro-light">
          {error || activeGroupError || "No match found or no active group"}
        </p>
        <button
          onClick={() => router.push("/new-match")}
          className="rounded-retro font-pixel mt-4 bg-white px-4 py-2 text-black hover:bg-gray-200"
        >
          Start New Match
        </button>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="rounded-retro border-retro-gray bg-retro-dark shadow-retro-outset border p-6">
        <p className="text-retro-light">Match data not available</p>
      </div>
    );
  }

  const totalBuyIns = players.reduce(
    (sum: number, p: LiveMatchPlayer) => sum + p.buyIns,
    0
  );
  const totalPot = totalBuyIns * match.buyInAmount;
  const currentMatchUserIds = new Set(players.map((player) => player.user.id));
  const availablePlayersToAdd = groupPlayers.filter(
    (groupPlayer) => !currentMatchUserIds.has(groupPlayer.id)
  );

  return (
    <div className="rounded-retro border-retro-gray bg-retro-dark shadow-retro-outset border p-6">
      {activeGroupError && (
        <div className="rounded-retro border-retro-red bg-retro-red/10 mb-4 border p-4">
          <div className="flex items-center justify-between">
            <span className="font-pixel text-retro-red text-sm">
              {activeGroupError}
            </span>
            <button
              onClick={clearError}
              className="text-retro-red hover:text-retro-red/80 font-pixel text-xs"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}
      <h2 className="font-pixel text-retro-green mb-4 text-xl sm:text-2xl">
        LIVE MATCH
      </h2>
      <p className="text-retro-light mb-6">
        Track rebuys during game. Tap <span>&quot;Rebuy&quot;</span> when a
        player adds another buy-in.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Player list */}
        <div className="lg:col-span-2">
          <h3 className="font-pixel text-retro-yellow mb-4 text-xl">PLAYERS</h3>
          <div className="space-y-4">
            {players.map(
              ({ user, buyIns, finalValue, cashedOutAt }: LiveMatchPlayer) => {
                const isCashedOut = Boolean(cashedOutAt);
                const isEditingCashOut = editingCashOutUserId === user.id;

                return (
                  <div
                    key={user.id}
                    className={`rounded-retro border-retro-gray flex flex-col border p-4 transition-colors ${
                      isCashedOut
                        ? "bg-retro-dark/60 border-retro-gray/60 opacity-75"
                        : "bg-retro-dark hover:border-retro-green"
                    }`}
                    data-testid="player-row"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-pixel text-retro-green text-xl">
                        {user.name}
                      </h4>
                      <span className="font-pixel text-retro-yellow text-2xl">
                        {buyIns}
                      </span>
                    </div>

                    <p className="text-retro-gray text-sm">
                      Total paid:{" "}
                      <MoneyDisplay cents={buyIns * match.buyInAmount} />
                    </p>

                    {isCashedOut && (
                      <div className="mt-2 space-y-1">
                        <div className="font-pixel text-retro-blue text-xs">
                          CASHED OUT EARLY
                        </div>
                        <div className="text-retro-light text-sm">
                          Cash out amount: <MoneyDisplay cents={finalValue} />
                        </div>
                      </div>
                    )}

                    {isEditingCashOut ? (
                      <div className="mt-4 space-y-3">
                        <div>
                          <label
                            htmlFor={`cashout-input-${user.id}`}
                            className="font-pixel text-retro-light mb-1 block text-xs"
                          >
                            CASH OUT AMOUNT
                          </label>
                          <MoneyInput
                            id={`cashout-input-${user.id}`}
                            value={cashOutEditorByUserId[user.id] ?? finalValue}
                            onChange={(cents) =>
                              handleCashOutAmountChange(user.id, cents)
                            }
                            className="font-pixel w-full max-w-xs"
                            data-testid="cashout-input"
                          />
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => handleSaveCashOut(user.id)}
                            className="rounded-retro font-pixel bg-white px-4 py-2 text-black hover:bg-gray-200"
                          >
                            SAVE CASH OUT
                          </button>
                          <button
                            onClick={() => setEditingCashOutUserId(null)}
                            className="rounded-retro border-retro-gray font-pixel text-retro-light hover:border-retro-green border px-4 py-2"
                          >
                            CANCEL
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          onClick={() => handleRebuy(user.id)}
                          disabled={isCashedOut}
                          className="rounded-retro font-pixel bg-white px-6 py-3 text-black transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          REBUY
                        </button>
                        {!isCashedOut ? (
                          <button
                            onClick={() => handleStartCashOut(user.id)}
                            className="rounded-retro border-retro-gray font-pixel text-retro-light hover:border-retro-green border px-4 py-3 transition-colors"
                          >
                            CASH OUT
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReturnToMatch(user.id)}
                            className="rounded-retro border-retro-gray font-pixel text-retro-light hover:border-retro-green border px-4 py-3 transition-colors"
                          >
                            RETURN TO MATCH
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Match info & actions */}
        <div className="space-y-6">
          <div>
            <h3 className="font-pixel text-retro-blue mb-4 text-xl">
              MATCH INFO
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-retro-light">Buy‑in each</span>
                <MoneyDisplay cents={match.buyInAmount} />
              </div>
              <div className="flex justify-between">
                <span className="text-retro-light">Total buy‑ins</span>
                <span className="font-pixel">{totalBuyIns}</span>
              </div>
              <div className="border-retro-gray flex justify-between border-t pt-3">
                <span className="text-retro-light">Total pot</span>
                <MoneyDisplay
                  cents={totalPot}
                  className="font-pixel text-retro-green"
                />
              </div>
            </div>
          </div>

          <div className="border-retro-gray border-t pt-6">
            <div className="space-y-4">
              <button
                onClick={handleProceedToCashout}
                className="rounded-retro font-pixel hover:shadow-retro-outset w-full bg-white px-6 py-4 text-black transition-all hover:bg-gray-200"
              >
                PROCEED TO CASHOUT
              </button>
              <button
                onClick={openAddPlayersModal}
                disabled={isLoadingGroupPlayers}
                className="rounded-retro border-retro-gray font-pixel text-retro-light hover:border-retro-green w-full border px-6 py-4 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingGroupPlayers ? "LOADING PLAYERS..." : "ADD PLAYER"}
              </button>
              {addPlayersError && (
                <p className="font-pixel text-retro-red text-xs">
                  {addPlayersError}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {isAddPlayersModalOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4"
          data-testid="add-players-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Add players modal"
        >
          <div className="bg-retro-dark sm:rounded-retro sm:border-retro-gray sm:shadow-retro-outset relative z-[101] h-full w-full overflow-y-auto p-6 sm:h-auto sm:max-h-[85vh] sm:max-w-3xl sm:border">
            <h3 className="font-pixel text-retro-yellow mb-2 text-lg sm:text-xl">
              ADD PLAYERS
            </h3>
            <p className="text-retro-light mb-4 text-sm">
              Select group players not already in this match.
            </p>

            {availablePlayersToAdd.length === 0 ? (
              <div className="rounded-retro border-retro-gray border p-6 text-center">
                <p className="text-retro-gray">
                  All group players are already in this match.
                </p>
              </div>
            ) : (
              <PlayerSelectionGrid
                players={availablePlayersToAdd}
                selectedPlayerIds={selectedPlayerIdsToAdd}
                onTogglePlayer={togglePlayerToAdd}
                idPrefix="live-add-player"
              />
            )}

            <div className="border-retro-gray bg-retro-dark sticky bottom-0 mt-6 flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
              <button
                onClick={closeAddPlayersModal}
                className="rounded-retro border-retro-gray font-pixel text-retro-light hover:border-retro-green w-full border px-4 py-2 sm:w-auto"
              >
                CANCEL
              </button>
              <button
                onClick={handleAddPlayersToMatch}
                disabled={selectedPlayerIdsToAdd.length === 0}
                className="rounded-retro font-pixel w-full bg-white px-4 py-2 text-black hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                ADD PLAYERS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveMatchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="font-pixel text-retro-green">Loading...</div>
        </div>
      }
    >
      <LiveMatchContent />
    </Suspense>
  );
}
