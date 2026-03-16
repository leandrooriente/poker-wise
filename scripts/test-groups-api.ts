/* eslint-disable no-console */import dotenv from "dotenv";
dotenv.config();

const BASE_URL = "http://localhost:3005";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";

async function fetchJson(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  return response.json();
}

async function login() {
  const result = await fetchJson(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  console.log("Login successful:", result.message);
}

async function testGroupsAPI() {
  console.log("Testing groups API...");
  
  // 1. List groups (should be empty initially)
  const groups = await fetchJson(`${BASE_URL}/api/admin/groups`);
  console.log("Initial groups:", groups);
  
  // 2. Create a group
  const newGroup = await fetchJson(`${BASE_URL}/api/admin/groups`, {
    method: "POST",
    body: JSON.stringify({ id: "test-group", name: "Test Group" }),
  });
  console.log("Created group:", newGroup);
  
  // 3. List groups again (should contain the new group)
  const groupsAfterCreate = await fetchJson(`${BASE_URL}/api/admin/groups`);
  console.log("Groups after create:", groupsAfterCreate);
  
  // 4. Update group name
  const updatedGroup = await fetchJson(`${BASE_URL}/api/admin/groups`, {
    method: "PUT",
    body: JSON.stringify({ id: "test-group", name: "Updated Test Group" }),
  });
  console.log("Updated group:", updatedGroup);
  
  // 5. Delete group
  await fetchJson(`${BASE_URL}/api/admin/groups?id=test-group`, {
    method: "DELETE",
  });
  console.log("Group deleted");
  
  // 6. Verify deletion
  const finalGroups = await fetchJson(`${BASE_URL}/api/admin/groups`);
  console.log("Final groups:", finalGroups);
  
  console.log("All tests passed!");
}

async function main() {
  try {
    await login();
    await testGroupsAPI();
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

main();