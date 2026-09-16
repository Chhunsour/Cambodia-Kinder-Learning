import * as SQLite from "expo-sqlite";
import { DB_NAME } from "./schema";
import { runMigrations } from "./migrations";

export * from "./schema";
export * from "./types";
export * from "./migrations";

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Get the singleton SQLite database instance for Koki.
 * Safe for concurrent cold-boot calls: reuses in-flight initialization promise.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      // Configure SQLite pragmas for high performance, crash resilience, and integrity
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
      `);

      // Execute sequential migrations idempotently
      await runMigrations(db);

      dbInstance = db;
      return db;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Closes the active database connection if open.
 * Useful for development reset workflows and isolated testing.
 */
export async function closeDatabaseAsync(): Promise<void> {
  if (dbInstance) {
    try {
      await dbInstance.closeAsync();
    } catch (err) {
      console.warn("[Database] Error closing database:", err);
    }
    dbInstance = null;
  }
  initPromise = null;
}
