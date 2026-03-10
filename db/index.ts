// This module ensures migration runs before any other db operations.
export { ensureMigration } from "./migrate";
export { runMigrationIfNeeded } from "./migrate";

// Re-export all storage functions (they should call ensureMigration internally)
export * from "./users";
export * from "./groups";
export * from "./members";
export * from "./matches";

// Note: each db module now calls ensureMigration before accessing storage.
// See each module's functions for the guard.