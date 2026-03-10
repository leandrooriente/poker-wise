"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

import { getMatchWithPlayers, updateMatch } from "@/db/matches";
import { validateTotals } from "@/lib/settlement";
import MoneyInput from "@/components/MoneyInput";
import MoneyDisplay from "@/components/MoneyDisplay";

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
      const data = await getMatchWithPlayers(id);
      if (!data) {
        setError("Match not found");
        return;
      }
      setMatch(data.match);
      setPlayers(data.players);
      // Initialize finalValues with existing finalValue or zero
      const initialValues: Record<string, number> = {};
      data.players.forEach((p: any) => {
        initialValues[p.player.id] = p.finalValue || 0;
      });
      setFinalValues(initialValues);
      // Compute validation
      const matchPlayers = data.match.players.map((mp: any) => ({
        playerId: mp.playerId,
        buyIns: mp.buyIns,
        finalValue: initialValues[mp.playerId] || 0,
      }));
      const validationResult = validateTotals(matchPlayers, data.match.buyInAmount);
      setValidation(validationResult);
    } catch (err) {
      console.error(err);
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
        playerId: mp.playerId,
        buyIns: mp.buyIns,
        finalValue: newValues[mp.playerId] || 0,
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
    // Update match with final values
    const updatedPlayers = match.players.map((mp: any) => ({
      ...mp,
      finalValue: finalValues[mp.playerId] || 0,
    }));
    const updatedMatch = {
      ...match,
      players: updatedPlayers,
      endedAt: match.endedAt || new Date().toISOString(),
    };
    await updateMatch(updatedMatch);
    // Compute settlement (computed again in results page)
    // const settlement = calculateSettlement(updatedPlayers, match.buyInAmount);
    // Navigate to results with settlement data (we can store in match or pass via query)
    // For simplicity, store settlement in match as derived field (not persisted)
    // We'll pass match ID and compute again in results page.
    router.push(`/results?match=${match.id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-retro-green font-pixel">Loading match...</div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="border border-retro-gray rounded-retro p-6 bg-retro-dark shadow-retro-outset">
        <h2 className="text-2xl font-pixel text-retro-red mb-4">ERROR</h2>
        <p className="text-retro-light">{error || "Match not found"}</p>
        <button
          onClick={() => router.push("/new-match")}
          className="mt-4 px-4 py-2 bg-retro-green text-retro-dark font-pixel rounded-retro"
        >
          Start New Match
        </button>
      </div>
    );
  }

  const totalBuyIns = players.reduce((sum, p) => sum + p.buyIns, 0);
  const totalPaidIn = totalBuyIns * match.buyInAmount;

  return (
    <div className="border border-retro-gray rounded-retro p-6 bg-retro-dark shadow-retro-outset">
      <h2 className="text-2xl font-pixel text-retro-green mb-4">CASHOUT</h2>
      <p className="text-retro-light mb-6">
        Enter each player’s final chip value in euros. The total must match the total paid‑in amount.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Player inputs */}
        <div className="lg:col-span-2">
          <h3 className="text-xl font-pixel text-retro-yellow mb-4">FINAL CHIP VALUES</h3>
          <div className="space-y-6">
            {players.map(({ player, buyIns }) => {
              const paidIn = buyIns * match.buyInAmount;
              const finalValue = finalValues[player.id] || 0;
              return (
                <div
                  key={player.id}
                  className="border border-retro-gray rounded-retro p-6 bg-retro-dark hover:border-retro-green transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-2xl font-pixel text-retro-green">{player.name}</h4>
                      <p className="text-retro-light">
                        Buy‑ins: <span className="font-pixel">{buyIns}</span> • Paid in:{" "}
                         <MoneyDisplay cents={paidIn} />
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                         <label htmlFor={`final-value-${player.id}`} className="block text-retro-light text-sm mb-2 font-pixel">
                           FINAL VALUE (EUR)
                         </label>
                           <MoneyInput
                             id={`final-value-${player.id}`}
                             value={finalValue}
                             onChange={(cents) => handleFinalValueChange(player.id, cents)}
                             className="px-4 py-3 w-40 text-right font-pixel"
                             data-testid={`final-value-input-${player.id}`}
                           />
                      </div>
                      <div className="text-center">
                        <div className="text-retro-gray text-sm">Net</div>
                        <div className={`text-xl font-pixel ${finalValue - paidIn >= 0 ? "text-retro-green" : "text-retro-red"}`}>
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
            <h3 className="text-xl font-pixel text-retro-blue mb-4">VALIDATION</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-retro-light">Total paid‑in</span>
                 <MoneyDisplay cents={totalPaidIn} />
              </div>
              <div className="flex justify-between">
                <span className="text-retro-light">Total final value</span>
                 <MoneyDisplay cents={validation?.totalFinalValue ?? 0} />
              </div>
              <div className={`flex justify-between border-t border-retro-gray pt-4 ${validation?.isValid ? "text-retro-green" : "text-retro-red"}`}>
                <span className="text-retro-light">Difference</span>
                 <MoneyDisplay cents={validation?.diff ?? 0} />
              </div>
              {validation && (
                <div className={`p-3 border rounded-retro text-center ${validation.isValid ? "border-retro-green bg-retro-green/10 text-retro-green" : "border-retro-red bg-retro-red/10 text-retro-red"}`}>
                  {validation.isValid ? "✓ Totals match! Ready to settle." : "✗ Totals do not match. Adjust values."}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-retro-gray pt-6">
            <h3 className="text-xl font-pixel text-retro-purple mb-4">ACTIONS</h3>
            <div className="space-y-4">
              <button
                onClick={handleSaveAndSettle}
                disabled={!validation || !validation.isValid}
                className="w-full px-6 py-4 bg-retro-green text-retro-dark font-pixel rounded-retro hover:bg-retro-teal hover:shadow-retro-outset disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                SETTLE & SHOW RESULTS
              </button>
              <p className="text-retro-gray text-sm">
                This will save final values, compute net results, and show who pays whom.
              </p>
            </div>
          </div>

          <div className="border-t border-retro-gray pt-6">
            <h3 className="text-xl font-pixel text-retro-yellow mb-4">NOTES</h3>
            <ul className="text-retro-light text-sm space-y-2">
              <li>• Enter the total euro value of each player’s chips at the end of the match.</li>
              <li>• The sum of final values must equal the total paid‑in amount.</li>
              <li>• Net = final value − paid‑in (positive means profit, negative means loss).</li>
              <li>• The app will generate minimized transfers between players.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CashoutPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-64">
        <div className="text-retro-green font-pixel">Loading cashout...</div>
      </div>
    }>
      <CashoutContent />
    </Suspense>
  );
}