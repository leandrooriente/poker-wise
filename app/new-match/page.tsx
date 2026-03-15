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
  const [buyInAmount, setBuyInAmount] = useState<number>(1000);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!activeGroupId) {
        setPlayers([]);
        setLoading(false);
        return;
      }
      try {
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
      <div className="nes-container is-dark nes-v-center nes-min-h-content">
        <span className="nes-text">Loading...</span>
      </div>
    );
  }

  if (!activeGroupId) {
    return (
      <div className="nes-container with-title is-dark">
        <p className="title">NEW MATCH</p>
        <div className="nes-container is-rounded nes-text-center">
          <p className="nes-text is-disabled">No group selected.</p>
          <p className="nes-text is-disabled nes-text-sm">
            Please select a group from the header dropdown or create one on the
            Groups page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="nes-container with-title is-dark">
      <p className="title">NEW MATCH SETUP</p>

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

      <p className="nes-mb-3">
        Select players and configure buy-in amount for a new Texas Hold em
        match.
      </p>

      <div className="nes-grid nes-grid-responsive nes-grid-responsive-3">
        {/* Player selection */}
        <div className="nes-grid-responsive-3">
          <h2>SELECT PLAYERS</h2>

          {players.length === 0 ? (
            <div className="nes-container is-rounded nes-text-center">
              <p className="nes-text is-disabled">No players found.</p>
              <p className="nes-text-sm">
                Go to Players tab to add players first.
              </p>
            </div>
          ) : (
            <div className="nes-grid nes-grid-responsive">
              {players.map((player) => {
                const isSelected = selectedPlayerIds.includes(player.id);
                return (
                  <label key={player.id} className="nes-container">
                    <input
                      type="checkbox"
                      className="nes-checkbox"
                      checked={isSelected}
                      onChange={() => togglePlayer(player.id)}
                    />
                    <span>{player.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Configuration */}
        <div>
          <h2>BUY-IN AMOUNT</h2>
          <div className="nes-field">
            <MoneyInput
              value={buyInAmount}
              onChange={setBuyInAmount}
              data-testid="buy-in-amount-input"
            />
          </div>

          <div className="nes-container is-dark nes-mt-3">
            <p>
              Total pot:{" "}
              <MoneyDisplay cents={selectedPlayerIds.length * buyInAmount} />
            </p>
          </div>

          <button
            onClick={handleStartMatch}
            disabled={selectedPlayerIds.length < 2}
            className={`nes-btn is-primary nes-w-full nes-mt-3 ${
              selectedPlayerIds.length >= 2 ? "" : "is-disabled"
            }`}
          >
            START MATCH
          </button>
        </div>
      </div>
    </div>
  );
}
