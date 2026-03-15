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

  if (loading) {
    return (
      <div className="nes-container with-title is-dark">
        <p className="title">SCOREBOARD</p>
        <p className="mb-6 text-sm">Rankings based on settled matches only.</p>
        <div className="flex h-64 items-center justify-center">
          <div className="font-pixel">Loading scores...</div>
        </div>
      </div>
    );
  }

  if (!activeGroupId) {
    return (
      <div className="nes-container with-title is-dark">
        <p className="title">SCOREBOARD</p>
        <p className="mb-6 text-sm">Rankings based on settled matches only.</p>
        <div className="nes-container is-bordered py-8 text-center">
          <p style={{ color: "#999" }}>No group selected.</p>
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
      <div className="nes-container with-title is-dark">
        <p className="title">ERROR</p>
        <p style={{ color: "#fff" }}>{pageError}</p>
      </div>
    );
  }

  return (
    <div className="nes-container is-dark">
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

      <h2 className="font-pixel mb-2 text-2xl" style={{ color: "#48c774" }}>
        SCOREBOARD
      </h2>
      <p className="mb-6 text-sm">Rankings based on settled matches only.</p>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setScoreMode("total")}
          className="nes-btn"
          style={{
            background: scoreMode === "total" ? "#fff" : "transparent",
            color: scoreMode === "total" ? "#000" : "#fff",
          }}
        >
          TOTAL
        </button>
        <button
          type="button"
          onClick={() => setScoreMode("average")}
          className="nes-btn"
          style={{
            background: scoreMode === "average" ? "#fff" : "transparent",
            color: scoreMode === "average" ? "#000" : "#fff",
          }}
        >
          AVERAGE
        </button>
      </div>

      {rankedRows.length === 0 ? (
        <div className="nes-container is-bordered py-8 text-center">
          <p style={{ color: "#999" }}>No settled matches yet.</p>
          <p className="mt-2 text-sm">Settle a match to see player rankings.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rankedRows.map((row, index) => {
            const value = scoreMode === "total" ? row.totalNet : row.averageNet;
            const valueColor =
              value > 0
                ? { color: "#48c774" }
                : value < 0
                  ? { color: "#e74c3c" }
                  : { color: "#fff" };

            return (
              <div
                key={row.id}
                data-testid="score-row"
                className="nes-container is-bordered p-5"
                style={{ background: "#1a1a1a" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "#48c774")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "#ccc")
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      className="font-pixel mb-1 text-sm"
                      style={{ color: "#3273dc" }}
                    >
                      #{index + 1}
                    </p>
                    <h3
                      className="font-pixel text-xl"
                      style={{ color: "#ffdd57" }}
                    >
                      {row.name}
                    </h3>
                    <p className="mt-2 text-sm" style={{ color: "#fff" }}>
                      {row.matchCount}{" "}
                      {row.matchCount === 1 ? "match" : "matches"}
                    </p>
                  </div>
                  <MoneyDisplay
                    cents={value}
                    className="font-pixel text-2xl"
                    style={valueColor}
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
