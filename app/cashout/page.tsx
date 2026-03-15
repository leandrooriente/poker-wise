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
        <div className="font-pixel">Loading match...</div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="nes-container is-bordered p-6">
        <h2 className="font-pixel mb-4 text-2xl" style={{ color: "#e74c3c" }}>
          ERROR
        </h2>
        <p style={{ color: "#fff" }}>{error || "Match not found"}</p>
        <button
          onClick={() => router.push("/new-match")}
          className="nes-btn mt-4"
        >
          Start New Match
        </button>
      </div>
    );
  }

  const totalBuyIns = players.reduce((sum, p) => sum + p.buyIns, 0);
  const totalPaidIn = totalBuyIns * match.buyInAmount;

  return (
    <div className="nes-container with-title is-dark">
      <p className="title">CASHOUT</p>
      <p className="mb-6" style={{ color: "#fff" }}>
        Enter each player&apos;s final chip value in euros. The total must match
        total paid‑in amount.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Player inputs */}
        <div className="lg:col-span-2">
          <h3 className="font-pixel mb-4 text-xl" style={{ color: "#ffdd57" }}>
            FINAL CHIP VALUES
          </h3>
          <div className="space-y-6">
            {players.map(({ user, buyIns }) => {
              const paidIn = buyIns * match.buyInAmount;
              const finalValue = finalValues[user.id] || 0;
              return (
                <div
                  key={user.id}
                  className="nes-container is-bordered p-6"
                  style={{ background: "#212529" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "#48c774")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "#ccc")
                  }
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <h4
                        className="font-pixel text-2xl"
                        style={{ color: "#48c774" }}
                      >
                        {user.name}
                      </h4>
                      <p style={{ color: "#fff" }}>
                        Buy‑ins: <span className="font-pixel">{buyIns}</span>
                      </p>
                    </div>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="text-left">
                        <label
                          htmlFor={`final-value-${user.id}`}
                          className="font-pixel mb-2 block text-sm"
                          style={{ color: "#999" }}
                        >
                          FINAL VALUE
                        </label>
                        <MoneyInput
                          id={`final-value-${user.id}`}
                          value={finalValue}
                          onChange={(cents) =>
                            handleFinalValueChange(user.id, cents)
                          }
                          className="w-full text-left md:w-40"
                          data-testid={`final-value-input-${user.id}`}
                        />
                      </div>
                      <div className="text-left">
                        <div
                          className="font-pixel text-sm"
                          style={{ color: "#999" }}
                        >
                          Net
                        </div>
                        <div
                          className="font-pixel text-xl"
                          style={
                            finalValue - paidIn >= 0
                              ? { color: "#48c774" }
                              : { color: "#e74c3c" }
                          }
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
            <h3
              className="font-pixel mb-4 text-xl"
              style={{ color: "#3273dc" }}
            >
              VALIDATION
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span style={{ color: "#fff" }}>Total paid‑in</span>
                <MoneyDisplay cents={totalPaidIn} />
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#fff" }}>Total final value</span>
                <MoneyDisplay cents={validation?.totalFinalValue ?? 0} />
              </div>
              <div
                className="flex justify-between pt-4"
                style={{
                  borderTop: "4px solid #ccc",
                  color: validation?.isValid ? "#48c774" : "#e74c3c",
                }}
              >
                <span style={{ color: "#fff" }}>Difference</span>
                <MoneyDisplay cents={validation?.diff ?? 0} />
              </div>
              {validation && (
                <div
                  data-testid="validation-message"
                  className="nes-container is-bordered p-3 text-center"
                  style={{
                    background: validation.isValid
                      ? "rgba(72, 199, 116, 0.1)"
                      : "rgba(231, 76, 60, 0.1)",
                    borderColor: validation.isValid ? "#48c774" : "#e74c3c",
                    color: validation.isValid ? "#48c774" : "#e74c3c",
                  }}
                >
                  {validation.isValid
                    ? "✓ Totals match! Ready to settle."
                    : "✗ Totals do not match. Adjust values."}
                </div>
              )}
            </div>
          </div>

          <div className="pt-6" style={{ borderTop: "4px solid #ccc" }}>
            <div className="space-y-4">
              <button
                onClick={handleSaveAndSettle}
                disabled={!validation || !validation.isValid}
                className="nes-btn is-primary w-full"
                style={{ padding: "16px 24px" }}
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
          <div className="font-pixel">Loading cashout...</div>
        </div>
      }
    >
      <CashoutContent />
    </Suspense>
  );
}
