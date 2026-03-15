"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import MoneyDisplay from "@/components/MoneyDisplay";
import MoneyInput from "@/components/MoneyInput";
import { addMatch } from "@/db/matches";
import { getPlayersForGroup } from "@/db/players";
import { getSettings } from "@/db/settings";
import { useActiveGroup } from "@/lib/active-group";
import { Player } from "@/types/player";

export default function NewMatchPage() {
  const router = useRouter();
  const { activeGroupId, error, clearError } = useActiveGroup();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [buyInAmount, setBuyInAmount] = useState<number>(1000); // cents
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!activeGroupId) {
          setPlayers([]);
          setLoading(false);
          return;
        }
        const [playerList, settings] = await Promise.all([
          getPlayersForGroup(activeGroupId),
          getSettings(),
        ]);
        setPlayers(playerList);
        setBuyInAmount(settings.defaultBuyIn);
      } catch {
        // Failed to load data
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeGroupId]);

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleStartMatch = async () => {
    if (!activeGroupId) {
      alert("Please select a group first.");
      return;
    }
    if (selectedPlayerIds.length < 2) {
      alert("Select at least two players.");
      return;
    }
    const matchPlayers = selectedPlayerIds.map((userId) => ({
      userId,
      buyIns: 1, // each player starts with one buy-in
      finalValue: 0, // will be set at cashout
    }));
    const match = {
      groupId: activeGroupId,
      buyInAmount,
      players: matchPlayers,
      startedAt: new Date().toISOString(),
    };
    const created = await addMatch(match);
    router.push(`/live-match?match=${created.id}`);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="font-pixel">Loading...</div>
      </div>
    );
  }

  if (!activeGroupId) {
    return (
      <div className="nes-container with-title is-dark">
        <p className="title">NEW MATCH</p>
        <div className="py-8 text-center">
          <p style={{ color: "#999" }}>No group selected.</p>
          <p className="mt-2 text-sm" style={{ color: "#999" }}>
            Please select a group from the header dropdown or create one on the
            Groups page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="nes-container with-title is-dark">
      {error && (
        <div
          className="nes-container is-bordered mb-4"
          style={{ background: "#fee", border: "4px solid #e74c3c" }}
        >
          <div className="flex items-center justify-between">
            <span className="font-pixel text-sm" style={{ color: "#e74c3c" }}>
              {error}
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
      <p className="title">NEW MATCH SETUP</p>
      <p className="mb-6" style={{ color: "#fff" }}>
        Select players and configure buy‑in amount for a new Texas Hold&apos;em
        match.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Player selection */}
        <div className="lg:col-span-2">
          <h3 className="font-pixel mb-4 text-xl" style={{ color: "#ffdd57" }}>
            SELECT PLAYERS
          </h3>
          {players.length === 0 ? (
            <div className="nes-container is-bordered py-8 text-center">
              <p style={{ color: "#999" }}>No players found.</p>
              <p className="mt-2 text-sm">
                Go to <strong>Players</strong> tab to add players first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {players.map((player) => {
                const isSelected = selectedPlayerIds.includes(player.id);
                return (
                  <div key={player.id} className="relative">
                    <input
                      type="checkbox"
                      id={`player-${player.id}`}
                      checked={isSelected}
                      onChange={() => togglePlayer(player.id)}
                      className="hidden"
                    />
                    <label
                      htmlFor={`player-${player.id}`}
                      className="nes-container is-bordered block cursor-pointer p-4 transition-all"
                      style={{
                        background: isSelected
                          ? "rgba(72, 199, 116, 0.1)"
                          : "#212529",
                        borderColor: isSelected ? "#48c774" : "#ccc",
                        color: isSelected ? "#48c774" : "#fff",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          data-testid={`player-checkbox-indicator-${player.id}`}
                          data-state={isSelected ? "checked" : "unchecked"}
                          aria-hidden="true"
                          className="nes-pointer inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 transition-all"
                          style={{
                            borderColor: isSelected ? "#48c774" : "#ccc",
                            background: isSelected
                              ? "rgba(72, 199, 116, 0.2)"
                              : "#212529",
                          }}
                        >
                          <span
                            className={`h-3.5 w-2 rotate-45 border-r-[3px] border-b-[3px] transition-opacity ${
                              isSelected
                                ? "opacity-100"
                                : "border-transparent opacity-0"
                            }`}
                            style={{
                              borderColor: isSelected
                                ? "#48c774"
                                : "transparent",
                            }}
                          />
                        </span>
                        <span className="font-pixel text-lg">
                          {player.name}
                        </span>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Configuration */}
        <div className="space-y-6">
          <div>
            <h3
              className="font-pixel mb-4 text-xl"
              style={{ color: "#3273dc" }}
            >
              BUY‑IN AMOUNT (EUR)
            </h3>
            <div className="space-y-4">
              <div>
                <MoneyInput
                  value={buyInAmount}
                  onChange={setBuyInAmount}
                  className="w-full"
                  data-testid="buy-in-amount-input"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6" style={{ borderColor: "#ccc" }}>
            <div className="mb-6 flex justify-between">
              <span style={{ color: "#fff" }}>Total pot</span>
              <MoneyDisplay
                cents={selectedPlayerIds.length * buyInAmount}
                className="font-pixel"
                style={{ color: "#48c774" }}
              />
            </div>
            <button
              onClick={handleStartMatch}
              disabled={selectedPlayerIds.length < 2}
              className="nes-btn is-primary w-full"
              style={{ padding: "16px 24px" }}
            >
              START MATCH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
