import { GroupMember } from "@/types/group";
import { ensureMigration } from "./migrate";

const STORAGE_KEY = "poker-wise-group-members";

export async function getGroupMembers(): Promise<GroupMember[]> {
  await ensureMigration();
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load group members from localStorage:", error);
    return [];
  }
}

export async function saveGroupMembers(members: GroupMember[]): Promise<void> {
  await ensureMigration();
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  } catch (error) {
    console.error("Failed to save group members to localStorage:", error);
  }
}

export async function addGroupMember(member: Omit<GroupMember, "joinedAt">): Promise<GroupMember> {
  await ensureMigration();
  const newMember: GroupMember = {
    ...member,
    joinedAt: new Date().toISOString(),
  };
  const members = await getGroupMembers();
  // Ensure uniqueness (groupId, userId)
  if (members.some(m => m.groupId === member.groupId && m.userId === member.userId)) {
    throw new Error(`User ${member.userId} is already a member of group ${member.groupId}`);
  }
  members.push(newMember);
  await saveGroupMembers(members);
  return newMember;
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  await ensureMigration();
  const members = await getGroupMembers();
  const filtered = members.filter(m => !(m.groupId === groupId && m.userId === userId));
  await saveGroupMembers(filtered);
}

export async function getGroupMembersForGroup(groupId: string): Promise<GroupMember[]> {
  await ensureMigration();
  const members = await getGroupMembers();
  return members.filter(m => m.groupId === groupId);
}

export async function getGroupMembersForUser(userId: string): Promise<GroupMember[]> {
  await ensureMigration();
  const members = await getGroupMembers();
  return members.filter(m => m.userId === userId);
}

export async function isUserMemberOfGroup(groupId: string, userId: string): Promise<boolean> {
  await ensureMigration();
  const members = await getGroupMembers();
  return members.some(m => m.groupId === groupId && m.userId === userId);
}