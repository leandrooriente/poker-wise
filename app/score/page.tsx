"use client";

import { useEffect, useMemo, useState } from "react";

import MoneyDisplay from "@/components/MoneyDisplay";
import { getMatchesByGroup } from "@/db/matches";
import { getPlayersForGroup } from "@/db/players";
import { useActiveGroup } from "@/lib/active-group";
import { buildScoreRows, ScoreMode, sortScoreRows } from "@/lib/score";

export default function ScorePage() {
  const { activeGroupId, error } = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [scoreMode, setScoreMode] = useState<ScoreMode>("total");
  const [rows, setRows] = useState<ReturnType<typeof buildScoreRows>>([]);

  useEffect(() => {
    const loadScores = async () => {
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
    };

    setLoading(true);
    loadScores()
      .catch(() => {
        setPageError("Failed to load score data");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeGroupId]);

  const rankedRows = useMemo(
    () => sortScoreRows(rows, scoreMode),
    [rows, scoreMode]
  );

  if (loading) {
    return (
      <div className="nes-container with-title is-dark">
        <p className="title">SCOREBOARD</p>
        <p className="nes-text-sm">Rankings based on settled matches only.</p>
        <div className="nes-container is-dark nes-v-center nes-min-h-content">
          <i className="nes-loader"></i>
        </div>
      </div>
    );
  }

  if (!activeGroupId) {
    return (
      <div className="nes-container with-title is-dark">
        <p className="title">SCOREBOARD</p>
        <div className="nes-container is-rounded nes-text-center">
          <p className="nes-text is-disabled">No group selected.</p>
          <p className="nes-text is-disabled text-sm">
            Please select a group from header dropdown or create one on Groups
            page.
          </p>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="nes-container with-title is-dark">
        <p className="title">ERROR</p>
        <p className="nes-text is-error">{pageError}</p>
      </div>
    );
  }

  return (
    <div className="nes-container is-dark">
      {pageError && (
        <div className="nes-container is-rounded is-error nes-mb-2">
          <div className="nes-flex nes-justify-between nes-items-center">
            <span className="nes-text is-error">{pageError}</span>
            <button
              onClick={() => setPageError(null)}
              className="nes-btn is-error"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      <h1>SCOREBOARD</h1>
      <p className="nes-text-sm">Rankings based on settled matches only.</p>

      <div className="nes-flex nes-gap-1 nes-mb-4">
        <button
          type="button"
          onClick={() => setScoreMode("total")}
          className="nes-btn"
        >
          TOTAL
        </button>
        <button
          type="button"
          onClick={() => setScoreMode("average")}
          className="nes-btn"
        >
          AVERAGE
        </button>
      </div>

      {rankedRows.length === 0 ? (
        <div className="nes-container is-rounded nes-text-center">
          <p className="nes-text is-disabled">No settled matches yet.</p>
          <p className="nes-text is-disabled text-sm">
            Settle a match to see player rankings.
          </p>
        </div>
      ) : (
        <div className="nes-stack">
          {rankedRows.map((row, index) => {
            const value = scoreMode === "total" ? row.totalNet : row.averageNet;
            const valueColorClass =
              value > 0
                ? "nes-text is-success"
                : value < 0
                  ? "nes-text is-error"
                  : "nes-text is-disabled";
            return (
              <div
                key={row.id}
                data-testid="score-row"
                className="nes-container is-rounded"
              >
                <div className="nes-flex nes-justify-between nes-gap-2">
                  <div>
                    <p className="nes-text-sm">#{index + 1}</p>
                    <h3 className="nes-text is-warning">{row.name}</h3>
                    <p className="nes-text-sm">
                      {row.matchCount}{" "}
                      {row.matchCount === 1 ? "match" : "matches"}
                    </p>
                  </div>
                  <MoneyDisplay
                    cents={value}
                    className={`nes-text-lg ${valueColorClass}`}
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
