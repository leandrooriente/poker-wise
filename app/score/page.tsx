"use client";

import { useEffect, useMemo, useState } from "react";

import MoneyDisplay from "@/components/MoneyDisplay";
import { getMatchesByGroup } from "@/db/matches";
import { getPlayersForGroup } from "@/db/players";
import { useActiveGroup } from "@/lib/active-group";
import { buildScoreRows, ScoreMode, sortScoreRows } from "@/lib/score";

export default function ScorePage() {
  const { activeGroupId, error, clearError } = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [scoreMode, setScoreMode] = useState<ScoreMode>("total");
  const [rows, setRows] = useState<ReturnType<typeof buildScoreRows>>([]);

  useEffect(() => {
    const loadScores = async () => {
      try {
        setPageError(null);

        if (!activeGroupId) {
          setRows([]);
          return;
        }

        const [matches, players] = await Promise.all([
          getMatchesByGroup(activeGroupId),
          getPlayersForGroup(activeGroupId),
        ]);

        setRows(buildScoreRows(matches, players));
      } catch {
        setPageError("Failed to load score data");
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    loadScores();
  }, [activeGroupId]);

  const rankedRows = useMemo(
    () => sortScoreRows(rows, scoreMode),
    [rows, scoreMode]
  );

  const toggleButtonClass = (mode: ScoreMode) =>
    `rounded-retro border px-4 py-4 text-center font-pixel text-sm transition-all ${
      scoreMode === mode
        ? "border-white bg-white text-black"
        : "border-white bg-retro-dark text-white hover:bg-white/10"
    }`;

  if (loading) {
    return (
      <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
        <h2 className="mb-2 font-pixel text-2xl text-retro-green">SCOREBOARD</h2>
        <p className="mb-6 text-sm text-retro-light">
          Rankings based on settled matches only.
        </p>
        <div className="flex h-64 items-center justify-center">
          <div className="font-pixel text-retro-green">Loading scores...</div>
        </div>
      </div>
    );
  }

  if (!activeGroupId) {
    return (
      <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
        <h2 className="mb-2 font-pixel text-2xl text-retro-green">SCOREBOARD</h2>
        <p className="mb-6 text-sm text-retro-light">
          Rankings based on settled matches only.
        </p>
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

  if (pageError) {
    return (
      <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
        <h2 className="mb-4 font-pixel text-2xl text-retro-red">ERROR</h2>
        <p className="text-retro-light">{pageError}</p>
      </div>
    );
  }

  return (
    <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
      {error && (
        <div className="mb-4 rounded-retro border-retro-red border bg-retro-red/10 p-4">
          <div className="flex items-center justify-between">
            <span className="font-pixel text-sm text-retro-red">{error}</span>
            <button
              onClick={clearError}
              className="font-pixel text-xs text-retro-red hover:text-retro-red/80"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      <h2 className="mb-2 font-pixel text-2xl text-retro-green">SCOREBOARD</h2>
      <p className="mb-6 text-sm text-retro-light">
        Rankings based on settled matches only.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setScoreMode("total")}
          className={toggleButtonClass("total")}
        >
          TOTAL
        </button>
        <button
          type="button"
          onClick={() => setScoreMode("average")}
          className={toggleButtonClass("average")}
        >
          AVERAGE
        </button>
      </div>

      {rankedRows.length === 0 ? (
        <div className="rounded-retro border border-retro-gray p-8 text-center">
          <p className="text-retro-gray">No settled matches yet.</p>
          <p className="mt-2 text-sm">
            Settle a match to see player rankings.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rankedRows.map((row, index) => {
            const value = scoreMode === "total" ? row.totalNet : row.averageNet;
            const valueColor =
              value > 0
                ? "text-retro-green"
                : value < 0
                  ? "text-retro-red"
                  : "text-retro-light";

            return (
              <div
                key={row.id}
                data-testid="score-row"
                className="rounded-retro border border-retro-gray bg-retro-darker p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-1 font-pixel text-sm text-retro-blue">
                      #{index + 1}
                    </p>
                    <h3 className="font-pixel text-xl text-retro-yellow">
                      {row.name}
                    </h3>
                    <p className="mt-2 text-sm text-retro-light">
                      {row.matchCount} {row.matchCount === 1 ? "match" : "matches"}
                    </p>
                  </div>
                  <MoneyDisplay
                    cents={value}
                    className={`font-pixel text-2xl ${valueColor}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
