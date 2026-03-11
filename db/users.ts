import { generateId } from "@/lib/uuid";
import { User } from "@/types/user";

const STORAGE_KEY = "poker-wise-users";

export async function getUsers(): Promise<User[]> {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveUsers(users: User[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch {
    // Failed to save users
  }
}

export async function addUser(
  user: Omit<User, "id" | "createdAt">
): Promise<User> {
  const newUser: User = {
    ...user,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  const users = await getUsers();
  users.push(newUser);
  await saveUsers(users);
  return newUser;
}

export async function updateUser(updatedUser: User): Promise<void> {
  const users = await getUsers();
  const index = users.findIndex((u) => u.id === updatedUser.id);
  if (index >= 0) {
    users[index] = updatedUser;
    await saveUsers(users);
  }
}

export async function deleteUser(id: string): Promise<void> {
  const users = await getUsers();
  const filtered = users.filter((u) => u.id !== id);
  await saveUsers(filtered);
}

export async function getUser(id: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((u) => u.id === id);
}
