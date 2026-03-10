import { Group } from "@/types/group";
import { ensureMigration } from "./migrate";

const STORAGE_KEY = "poker-wise-groups";

export async function getGroups(): Promise<Group[]> {
  await ensureMigration();
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load groups from localStorage:", error);
    return [];
  }
}

export async function saveGroups(groups: Group[]): Promise<void> {
  await ensureMigration();
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch (error) {
    console.error("Failed to save groups to localStorage:", error);
  }
}

export async function addGroup(group: Omit<Group, "createdAt">): Promise<Group> {
  await ensureMigration();
  const newGroup: Group = {
    ...group,
    createdAt: new Date().toISOString(),
  };
  const groups = await getGroups();
  // Ensure id uniqueness
  if (groups.some(g => g.id === newGroup.id)) {
    throw new Error(`Group with id "${newGroup.id}" already exists`);
  }
  groups.push(newGroup);
  await saveGroups(groups);
  return newGroup;
}

export async function updateGroup(updatedGroup: Group): Promise<void> {
  await ensureMigration();
  const groups = await getGroups();
  const index = groups.findIndex((g) => g.id === updatedGroup.id);
  if (index >= 0) {
    groups[index] = updatedGroup;
    await saveGroups(groups);
  }
}

export async function deleteGroup(id: string): Promise<void> {
  await ensureMigration();
  const groups = await getGroups();
  const filtered = groups.filter((g) => g.id !== id);
  await saveGroups(filtered);
}

export async function getGroup(id: string): Promise<Group | undefined> {
  await ensureMigration();
  const groups = await getGroups();
  return groups.find((g) => g.id === id);
}