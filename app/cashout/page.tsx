"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

import MoneyDisplay from "@/components/MoneyDisplay";
import MoneyInput from "@/components/MoneyInput";
import { getMatchWithUsers, settleMatch } from "@/db/matches";
import { validateTotals } from "@/lib/settlement";

function CashoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [finalValues, setFinalValues] = useState<Record<string, number>>({});
  const [validation, setValidation] = useState<{
    isValid: boolean;
    totalPaidIn: number;
    totalFinalValue: number;
    diff: number;
  } | null>(null);

  useEffect(() => {
    if (matchId) loadMatch(matchId);
    else setError("No match ID provided");
  }, [matchId]);

  const loadMatch = async (id: string) => {
    try {
      const data = await getMatchWithUsers(id);

      if (!data) {
        setError("Match not found");
        return;
      }
      setMatch(data.match);
      setPlayers(data.players);
      // Initialize finalValues with existing finalValue or zero
      const initialValues: Record<string, number> = {};
      data.players.forEach((p: any) => {
        initialValues[p.user.id] = p.finalValue || 0;
      });
      setFinalValues(initialValues);
      // Compute validation
      const matchPlayers = data.match.players.map((mp: any) => ({
        userId: mp.userId,
        buyIns: mp.buyIns,
        finalValue: initialValues[mp.userId] || 0,
      }));

      const validationResult = validateTotals(
        matchPlayers,
        data.match.buyInAmount
      );

      setValidation(validationResult);
    } catch {
      setError("Failed to load match");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalValueChange = (playerId: string, cents: number) => {
    const newValues = { ...finalValues, [playerId]: cents };
    setFinalValues(newValues);
    if (match) {
      const matchPlayers = match.players.map((mp: any) => ({
        userId: mp.userId,
        buyIns: mp.buyIns,
        finalValue: newValues[mp.userId] || 0,
      }));

      const validationResult = validateTotals(matchPlayers, match.buyInAmount);

      setValidation(validationResult);
    }
  };

  const handleSaveAndSettle = async () => {
    if (!match || !validation || !validation.isValid) {
      alert("Cannot settle until totals match.");
      return;
    }
    await settleMatch(match.id, finalValues);
    router.push(`/results?match=${match.id}`);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="font-pixel text-retro-green">Loading match...</div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
        <h2 className="mb-4 font-pixel text-2xl text-retro-red">ERROR</h2>
        <p className="text-retro-light">{error || "Match not found"}</p>
        <button
          onClick={() => router.push("/new-match")}
          className="mt-4 rounded-retro bg-white px-4 py-2 font-pixel text-black"
        >
          Start New Match
        </button>
      </div>
    );
  }

  const totalBuyIns = players.reduce((sum, p) => sum + p.buyIns, 0);
  const totalPaidIn = totalBuyIns * match.buyInAmount;

  return (
    <div className="rounded-retro border border-retro-gray bg-retro-dark p-6 shadow-retro-outset">
      <h2 className="mb-4 font-pixel text-2xl text-retro-green">CASHOUT</h2>
      <p className="mb-6 text-retro-light">
        Enter each player’s final chip value in euros. The total must match the
        total paid‑in amount.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Player inputs */}
        <div className="lg:col-span-2">
          <h3 className="mb-4 font-pixel text-xl text-retro-yellow">
            FINAL CHIP VALUES
          </h3>
          <div className="space-y-6">
            {players.map(({ user, buyIns }) => {
              const paidIn = buyIns * match.buyInAmount;
              const finalValue = finalValues[user.id] || 0;
              return (
                <div
                  key={user.id}
                  className="rounded-retro border border-retro-gray bg-retro-dark p-6 transition-colors hover:border-retro-green"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <h4 className="font-pixel text-2xl text-retro-green">
                        {user.name}
                      </h4>
                      <p className="text-retro-light">
                        Buy‑ins: <span className="font-pixel">{buyIns}</span>
                      </p>
                    </div>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="text-left">
                        <label
                          htmlFor={`final-value-${user.id}`}
                          className="mb-2 block font-pixel text-sm text-retro-light"
                        >
                          FINAL VALUE
                        </label>
                        <MoneyInput
                          id={`final-value-${user.id}`}
                          value={finalValue}
                          onChange={(cents) =>
                            handleFinalValueChange(user.id, cents)
                          }
                          className="w-full px-4 py-3 text-left font-pixel md:w-40"
                          data-testid={`final-value-input-${user.id}`}
                        />
                      </div>
                      <div className="text-left">
                        <div className="font-pixel text-sm text-retro-gray">
                          Net
                        </div>
                        <div
                          className={`font-pixel text-xl ${finalValue - paidIn >= 0 ? "text-retro-green" : "text-retro-red"}`}
                        >
                          <MoneyDisplay cents={finalValue - paidIn} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Validation & actions */}
        <div className="space-y-6">
          <div>
            <h3 className="mb-4 font-pixel text-xl text-retro-blue">
              VALIDATION
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-retro-light">Total paid‑in</span>
                <MoneyDisplay cents={totalPaidIn} />
              </div>
              <div className="flex justify-between">
                <span className="text-retro-light">Total final value</span>
                <MoneyDisplay cents={validation?.totalFinalValue ?? 0} />
              </div>
              <div
                className={`flex justify-between border-t border-retro-gray pt-4 ${validation?.isValid ? "text-retro-green" : "text-retro-red"}`}
              >
                <span className="text-retro-light">Difference</span>
                <MoneyDisplay cents={validation?.diff ?? 0} />
              </div>
              {validation && (
                <div
                  data-testid="validation-message"
                  className={`rounded-retro border p-3 text-center ${validation.isValid ? "border-retro-green bg-retro-green/10 text-retro-green" : "border-retro-red bg-retro-red/10 text-retro-red"}`}
                >
                  {validation.isValid
                    ? "✓ Totals match! Ready to settle."
                    : "✗ Totals do not match. Adjust values."}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-retro-gray pt-6">
            <div className="space-y-4">
              <button
                onClick={handleSaveAndSettle}
                disabled={!validation || !validation.isValid}
                className="w-full rounded-retro bg-white px-6 py-4 font-pixel text-black transition-all hover:bg-gray-200 hover:shadow-retro-outset disabled:cursor-not-allowed disabled:opacity-50"
              >
                SETTLE & SHOW RESULTS
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CashoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="font-pixel text-retro-green">Loading cashout...</div>
        </div>
      }
    >
      <CashoutContent />
    </Suspense>
  );
}
