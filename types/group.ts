export interface Group {
  id: string; // handcrafted slug (also used as display name)
  createdAt: string;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  joinedAt: string;
}