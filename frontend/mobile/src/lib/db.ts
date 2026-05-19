import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('medguard360.db');
    await initSchema(db);
  }
  return db;
}

async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cached_patients (
      id TEXT PRIMARY KEY,
      medicaid_id TEXT,
      first_name TEXT,
      last_name TEXT,
      dob TEXT,
      state_code TEXT,
      cached_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS cached_encounters (
      id TEXT PRIMARY KEY,
      patient_id TEXT,
      status TEXT,
      service_date TEXT,
      transcript TEXT,
      cached_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS offline_queue (
      id TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      body TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      synced_at INTEGER
    );
  `);
}

export async function cachePatient(patient: Record<string, string>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO cached_patients (id, medicaid_id, first_name, last_name, dob, state_code) VALUES (?,?,?,?,?,?)',
    [patient.id, patient.medicaid_id, patient.first_name, patient.last_name, patient.dob, patient.state_code]
  );
}

export async function getCachedPatients(): Promise<Record<string, string>[]> {
  const db = await getDb();
  return db.getAllAsync<Record<string, string>>('SELECT * FROM cached_patients ORDER BY first_name');
}

export async function queueOfflineAction(endpoint: string, method: string, body?: unknown): Promise<void> {
  const db = await getDb();
  const id = Math.random().toString(36).slice(2);
  await db.runAsync(
    'INSERT INTO offline_queue (id, endpoint, method, body) VALUES (?,?,?,?)',
    [id, endpoint, method, body ? JSON.stringify(body) : null]
  );
}
