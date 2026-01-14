import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Session, SessionWithData, DataPoint } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../..', 'data', 'sessions.db');

let db: Database.Database;

export function initDatabase(): void {
  console.log('Initializing database at', DB_PATH);
  db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pid INTEGER NOT NULL,
      processName TEXT NOT NULL,
      command TEXT NOT NULL,
      startTime INTEGER NOT NULL,
      endTime INTEGER,
      avgCpu REAL,
      maxCpu REAL,
      avgMemory REAL,
      maxMemory REAL
    );

    CREATE TABLE IF NOT EXISTS data_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      cpu REAL NOT NULL,
      memory REAL NOT NULL,
      ppid INTEGER,
      FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_data_points_session ON data_points(sessionId);
    CREATE INDEX IF NOT EXISTS idx_data_points_timestamp ON data_points(timestamp);
  `);
}

export function createSession(
  name: string,
  pid: number,
  processName: string,
  command: string
): Session {
  const id = uuidv4();
  const startTime = Date.now();

  const stmt = db.prepare(`
    INSERT INTO sessions (id, name, pid, processName, command, startTime)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, name, pid, processName, command, startTime);

  return {
    id,
    name,
    pid,
    processName,
    command,
    startTime,
    endTime: null,
    avgCpu: null,
    maxCpu: null,
    avgMemory: null,
    maxMemory: null,
  };
}

export function addDataPoint(
  sessionId: string,
  timestamp: number,
  cpu: number,
  memory: number,
  ppid?: number
): void {
  const stmt = db.prepare(`
    INSERT INTO data_points (sessionId, timestamp, cpu, memory, ppid)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(sessionId, timestamp, cpu, memory, ppid ?? null);
}

export function endSession(sessionId: string): Session | null {
  const endTime = Date.now();

  const statsStmt = db.prepare(`
    SELECT
      AVG(cpu) as avgCpu,
      MAX(cpu) as maxCpu,
      AVG(memory) as avgMemory,
      MAX(memory) as maxMemory
    FROM data_points
    WHERE sessionId = ?
  `);

  const stats = statsStmt.get(sessionId) as {
    avgCpu: number | null;
    maxCpu: number | null;
    avgMemory: number | null;
    maxMemory: number | null;
  };

  const updateStmt = db.prepare(`
    UPDATE sessions
    SET endTime = ?, avgCpu = ?, maxCpu = ?, avgMemory = ?, maxMemory = ?
    WHERE id = ?
  `);

  updateStmt.run(
    endTime,
    stats.avgCpu,
    stats.maxCpu,
    stats.avgMemory,
    stats.maxMemory,
    sessionId
  );

  return getSession(sessionId);
}

export function getSession(sessionId: string): Session | null {
  const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
  return stmt.get(sessionId) as Session | null;
}

export function getSessionWithData(sessionId: string): SessionWithData | null {
  const session = getSession(sessionId);
  if (!session) return null;

  const dataStmt = db.prepare(`
    SELECT timestamp, cpu, memory, ppid
    FROM data_points
    WHERE sessionId = ?
    ORDER BY timestamp ASC
  `);

  const dataPoints = dataStmt.all(sessionId) as DataPoint[];

  return {
    ...session,
    dataPoints,
  };
}

export function getAllSessions(): Session[] {
  const stmt = db.prepare('SELECT * FROM sessions ORDER BY startTime DESC');
  return stmt.all() as Session[];
}

export function deleteSession(sessionId: string): boolean {
  const deleteDataStmt = db.prepare('DELETE FROM data_points WHERE sessionId = ?');
  deleteDataStmt.run(sessionId);

  const deleteSessionStmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  const result = deleteSessionStmt.run(sessionId);

  return result.changes > 0;
}

export function updateSessionName(sessionId: string, name: string): Session | null {
  const stmt = db.prepare('UPDATE sessions SET name = ? WHERE id = ?');
  stmt.run(name, sessionId);
  return getSession(sessionId);
}
