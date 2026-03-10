export interface Group {
  id: string; // unique identifier (slug)
  name: string; // display name
  createdAt: string;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  joinedAt: string;
}