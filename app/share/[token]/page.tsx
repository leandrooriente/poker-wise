import MoneyDisplay from "@/components/MoneyDisplay";
import { sortScoreRows } from "@/lib/score";
import { getPublicGroupShareDataByToken } from "@/server/db/queries/share-tokens";
import type { PublicShareMatch } from "@/server/db/queries/share-tokens";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: Date) {
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTotalBuyIns(match: PublicShareMatch) {
  return match.players.reduce((total, player) => total + player.buyIns, 0);
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-retro border-retro-gray text-retro-gray border p-6 text-center">
      {children}
    </div>
  );
}

function InvalidShareLink() {
  return (
    <div className="rounded-retro border-retro-gray bg-retro-dark shadow-retro-outset border p-6">
      <p className="font-pixel text-retro-red mb-3 text-sm">
        SHARE LINK NOT FOUND
      </p>
      <h1 className="font-pixel text-retro-green mb-4 text-2xl">
        This Poker Wise share link is unavailable.
      </h1>
      <p className="text-retro-light">
        The link may be invalid, expired, or revoked by the group admin.
      </p>
    </div>
  );
}

function LiveMatchPanel({ match }: { match: PublicShareMatch | null }) {
  if (!match) {
    return (
      <section className="rounded-retro border-retro-gray bg-retro-dark shadow-retro-outset border p-6">
        <h2 className="font-pixel text-retro-green mb-4 text-2xl">
          CURRENT LIVE MATCH
        </h2>
        <EmptyState>No live match is currently open.</EmptyState>
      </section>
    );
  }

  const totalBuyIns = getTotalBuyIns(match);
  const totalPot = totalBuyIns * match.buyInAmount;

  return (
    <section className="rounded-retro border-retro-green bg-retro-dark shadow-retro-outset border p-6">
      <p className="font-pixel text-retro-blue mb-2 text-xs">LIVE NOW</p>
      <h2 className="font-pixel text-retro-green mb-4 text-2xl">
        {match.title || "Current live match"}
      </h2>
      <div className="mb-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-retro-gray">Started</p>
          <p className="text-retro-light">{formatDateTime(match.startedAt)}</p>
        </div>
        <div>
          <p className="text-retro-gray">Buy-in</p>
          <MoneyDisplay
            cents={match.buyInAmount}
            className="text-retro-light"
          />
        </div>
        <div>
          <p className="text-retro-gray">Total pot</p>
          <MoneyDisplay
            cents={totalPot}
            className="font-pixel text-retro-green"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {match.players.map((player) => (
          <div
            key={player.playerId}
            className="rounded-retro border-retro-gray bg-retro-darker border p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-pixel text-retro-yellow text-lg">
                {player.playerName}
              </h3>
              <span className="font-pixel text-retro-blue text-sm">
                {player.buyIns} buy-in{player.buyIns === 1 ? "" : "s"}
              </span>
            </div>
            {player.cashedOutAt && (
              <p className="text-retro-gray mt-2 text-sm">
                Cashed out for <MoneyDisplay cents={player.finalValue} />
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ScoreboardPanel({ rows }: { rows: ReturnType<typeof sortScoreRows> }) {
  const rankedRows = sortScoreRows(rows, "total");

  return (
    <section className="rounded-retro border-retro-gray bg-retro-dark shadow-retro-outset border p-6">
      <h2 className="font-pixel text-retro-green mb-2 text-2xl">SCOREBOARD</h2>
      <p className="text-retro-gray mb-6 text-sm">
        Rankings based on settled matches only.
      </p>
      {rankedRows.length === 0 ? (
        <EmptyState>No settled matches yet.</EmptyState>
      ) : (
        <div className="space-y-3">
          {rankedRows.map((row, index) => {
            const color =
              row.totalNet > 0
                ? "text-retro-green"
                : row.totalNet < 0
                  ? "text-retro-red"
                  : "text-retro-light";

            return (
              <div
                key={row.id}
                className="rounded-retro border-retro-gray bg-retro-darker border p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-pixel text-retro-blue text-xs">
                      #{index + 1}
                    </p>
                    <h3 className="font-pixel text-retro-yellow mt-1 text-lg">
                      {row.name}
                    </h3>
                    <p className="text-retro-gray mt-1 text-sm">
                      {row.matchCount}{" "}
                      {row.matchCount === 1 ? "match" : "matches"}
                    </p>
                  </div>
                  <MoneyDisplay
                    cents={row.totalNet}
                    options={{ showPlus: true }}
                    className={`font-pixel text-xl ${color}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function HistoryPanel({ matches }: { matches: PublicShareMatch[] }) {
  return (
    <section className="rounded-retro border-retro-gray bg-retro-dark shadow-retro-outset border p-6">
      <h2 className="font-pixel text-retro-green mb-4 text-2xl">
        MATCH HISTORY
      </h2>
      {matches.length === 0 ? (
        <EmptyState>No settled matches yet.</EmptyState>
      ) : (
        <div className="space-y-6">
          {matches.map((match) => (
            <article
              key={match.id}
              className="rounded-retro border-retro-gray bg-retro-darker border p-4"
            >
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <h3 className="font-pixel text-retro-yellow text-lg">
                    {match.title || `Match on ${formatDate(match.createdAt)}`}
                  </h3>
                  <p className="text-retro-gray mt-1 text-sm">
                    {formatDate(match.createdAt)} • {match.players.length}{" "}
                    players
                  </p>
                </div>
                <div className="text-sm sm:text-right">
                  <p className="text-retro-gray">Pot</p>
                  <MoneyDisplay
                    cents={match.settlement?.totalPot ?? 0}
                    className="font-pixel text-retro-green"
                  />
                </div>
              </div>

              {match.settlement && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-retro border-retro-gray border p-4">
                    <h4 className="font-pixel text-retro-green mb-3 text-sm">
                      RESULTS
                    </h4>
                    <ul className="space-y-2">
                      {match.settlement.playerBalances.map((balance) => {
                        const player = match.players.find(
                          (entry) => entry.playerId === balance.userId
                        );
                        const color =
                          balance.net > 0
                            ? "text-retro-green"
                            : balance.net < 0
                              ? "text-retro-red"
                              : "text-retro-light";

                        return (
                          <li
                            key={balance.userId}
                            className="flex items-center justify-between gap-4"
                          >
                            <span className="text-retro-light">
                              {player?.playerName ?? "Unknown"}
                            </span>
                            <MoneyDisplay
                              cents={balance.net}
                              options={{ showPlus: true }}
                              className={`font-pixel ${color}`}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="rounded-retro border-retro-gray border p-4">
                    <h4 className="font-pixel text-retro-green mb-3 text-sm">
                      TRANSFERS
                    </h4>
                    {match.settlement.transfers.length === 0 ? (
                      <p className="text-retro-gray text-sm">
                        No transfers needed.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {match.settlement.transfers.map((transfer, index) => {
                          const fromPlayer = match.players.find(
                            (entry) => entry.playerId === transfer.fromPlayerId
                          );
                          const toPlayer = match.players.find(
                            (entry) => entry.playerId === transfer.toPlayerId
                          );

                          return (
                            <li
                              key={index}
                              className="text-retro-light text-sm"
                            >
                              <span className="text-retro-red">
                                {fromPlayer?.playerName ?? "Unknown"}
                              </span>{" "}
                              pays{" "}
                              <span className="text-retro-green">
                                {toPlayer?.playerName ?? "Unknown"}
                              </span>{" "}
                              <MoneyDisplay cents={transfer.amount} />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPublicGroupShareDataByToken(token).catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to load public share link:", error);
    return null;
  });

  if (!data) {
    return <InvalidShareLink />;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-retro border-retro-gray bg-retro-dark shadow-retro-outset border p-6">
        <p className="font-pixel text-retro-blue mb-2 text-xs">
          READ-ONLY SHARE
        </p>
        <h1 className="font-pixel text-retro-green mb-2 text-3xl">
          {data.group.name}
        </h1>
        <p className="text-retro-gray text-sm">
          Public group view. Log in is not required and changes cannot be made
          from this page.
        </p>
      </section>

      <LiveMatchPanel match={data.liveMatch} />

      <section className="rounded-retro border-retro-gray bg-retro-dark shadow-retro-outset border p-6">
        <h2 className="font-pixel text-retro-green mb-4 text-2xl">
          PLAYERS ({data.players.length})
        </h2>
        {data.players.length === 0 ? (
          <EmptyState>No players in this group yet.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.players.map((player) => (
              <div
                key={player.id}
                className="rounded-retro border-retro-gray bg-retro-darker border p-4"
              >
                <h3 className="font-pixel text-retro-yellow text-lg">
                  {player.name}
                </h3>
              </div>
            ))}
          </div>
        )}
      </section>

      <ScoreboardPanel rows={data.scoreboard} />
      <HistoryPanel matches={data.settledMatches} />
    </div>
  );
}
