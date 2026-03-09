import { Player } from "@/types/player";
import { generateId } from "@/lib/uuid";

const STORAGE_KEY = "poker-wise-players";

export async function getPlayers(): Promise<Player[]> {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load players from localStorage:", error);
    return [];
  }
}

export async function savePlayers(players: Player[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  } catch (error) {
    console.error("Failed to save players to localStorage:", error);
  }
}

export async function addPlayer(player: Omit<Player, "id" | "createdAt">): Promise<Player> {
  const newPlayer: Player = {
    ...player,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  const players = await getPlayers();
  players.push(newPlayer);
  await savePlayers(players);
  return newPlayer;
}

export async function updatePlayer(updatedPlayer: Player): Promise<void> {
  const players = await getPlayers();
  const index = players.findIndex((p) => p.id === updatedPlayer.id);
  if (index >= 0) {
    players[index] = updatedPlayer;
    await savePlayers(players);
  }
}

export async function deletePlayer(id: string): Promise<void> {
  const players = await getPlayers();
  const filtered = players.filter((p) => p.id !== id);
  await savePlayers(filtered);
}