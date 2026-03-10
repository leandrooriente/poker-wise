import { Group } from "@/types/group";

const API_BASE = "/api/admin/groups";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API error ${response.status}: ${errorText}`);
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Get all groups where the authenticated admin is a member.
 */
export async function getGroups(): Promise<Group[]> {
  return fetchJson<Group[]>(API_BASE);
}

/**
 * Create a new group.
 * @param group group data without createdAt (will be generated server-side)
 */
export async function addGroup(group: Omit<Group, "createdAt">): Promise<Group> {
  const created = await fetchJson<Group>(API_BASE, {
    method: "POST",
    body: JSON.stringify({
      id: group.id,
      name: group.name,
    }),
  });
  return created;
}

/**
 * Update an existing group.
 */
export async function updateGroup(updatedGroup: Group): Promise<void> {
  await fetchJson(API_BASE, {
    method: "PUT",
    body: JSON.stringify({
      id: updatedGroup.id,
      name: updatedGroup.name,
    }),
  });
}

/**
 * Delete a group by ID.
 */
export async function deleteGroup(id: string): Promise<void> {
  await fetchJson(`${API_BASE}?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/**
 * Get a single group by ID.
 */
export async function getGroup(id: string): Promise<Group | undefined> {
  const groups = await getGroups();
  return groups.find(g => g.id === id);
}

/**
 * Save groups (batch update) – not supported by API; no-op.
 */
export async function saveGroups(groups: Group[]): Promise<void> {
  // No batch endpoint; we could implement sequentially but for compatibility just no-op.
  console.warn("saveGroups is not supported for server-backed groups; ignoring");
}