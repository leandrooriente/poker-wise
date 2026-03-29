import { Player } from "@/types/player";

type PlayerSelectionGridProps = {
  players: Player[];
  selectedPlayerIds: string[];
  onTogglePlayer: (id: string) => void;
  idPrefix?: string;
};

export default function PlayerSelectionGrid({
  players,
  selectedPlayerIds,
  onTogglePlayer,
  idPrefix = "player",
}: PlayerSelectionGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {players.map((player) => {
        const isSelected = selectedPlayerIds.includes(player.id);
        const inputId = `${idPrefix}-${player.id}`;

        return (
          <div key={player.id} className="relative">
            <input
              type="checkbox"
              id={inputId}
              checked={isSelected}
              onChange={() => onTogglePlayer(player.id)}
              className="absolute h-0 w-0 opacity-0"
            />
            <label
              htmlFor={inputId}
              className={`rounded-retro block cursor-pointer border p-4 text-left transition-all ${
                isSelected
                  ? "border-retro-green bg-retro-green/10 text-retro-green"
                  : "border-retro-gray bg-retro-dark hover:border-retro-blue"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  data-testid={`player-checkbox-indicator-${player.id}`}
                  data-state={isSelected ? "checked" : "unchecked"}
                  aria-hidden="true"
                  className={`shadow-retro-outset relative inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 transition-all ${
                    isSelected
                      ? "border-retro-green bg-retro-green/20"
                      : "border-retro-gray bg-retro-dark"
                  }`}
                >
                  <span
                    className={`h-3.5 w-2 rotate-45 border-r-[3px] border-b-[3px] transition-opacity ${
                      isSelected
                        ? "border-retro-green opacity-100"
                        : "border-transparent opacity-0"
                    }`}
                  />
                </span>
                <span className="font-pixel text-lg">{player.name}</span>
              </div>
            </label>
          </div>
        );
      })}
    </div>
  );
}
