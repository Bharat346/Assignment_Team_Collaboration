import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'newtonite.db');

let db;

export function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'MEMBER' CHECK(role IN ('MEMBER', 'LEAD', 'ADMIN')),
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS team_members (
      userId TEXT NOT NULL,
      teamId TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'MEMBER' CHECK(role IN ('MEMBER', 'LEAD', 'ADMIN')),
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (userId, teamId),
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (teamId) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS work_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED', 'CLOSED')),
      priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      teamId TEXT NOT NULL,
      assigneeId TEXT,
      createdById TEXT NOT NULL,
      dueAt TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (teamId) REFERENCES teams(id),
      FOREIGN KEY (assigneeId) REFERENCES users(id),
      FOREIGN KEY (createdById) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      workItemId TEXT NOT NULL,
      userId TEXT NOT NULL,
      body TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workItemId) REFERENCES work_items(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      workItemId TEXT NOT NULL,
      actorId TEXT NOT NULL,
      action TEXT NOT NULL,
      oldValue TEXT,
      newValue TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workItemId) REFERENCES work_items(id),
      FOREIGN KEY (actorId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT NOT NULL,
      userId TEXT NOT NULL,
      operation TEXT NOT NULL,
      result TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (key, userId)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_work_items_teamId ON work_items(teamId);
    CREATE INDEX IF NOT EXISTS idx_work_items_assigneeId ON work_items(assigneeId);
    CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status);
    CREATE INDEX IF NOT EXISTS idx_work_items_priority ON work_items(priority);
    CREATE INDEX IF NOT EXISTS idx_work_items_updatedAt ON work_items(updatedAt);
    CREATE INDEX IF NOT EXISTS idx_work_items_createdById ON work_items(createdById);
    CREATE INDEX IF NOT EXISTS idx_work_items_dueAt ON work_items(dueAt);
    CREATE INDEX IF NOT EXISTS idx_comments_workItemId ON comments(workItemId);
    CREATE INDEX IF NOT EXISTS idx_audit_events_workItemId ON audit_events(workItemId);
    CREATE INDEX IF NOT EXISTS idx_audit_events_createdAt ON audit_events(createdAt);
    CREATE INDEX IF NOT EXISTS idx_team_members_userId ON team_members(userId);
    CREATE INDEX IF NOT EXISTS idx_team_members_teamId ON team_members(teamId);
    CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiresAt ON sessions(expiresAt);
  `);
}

export default getDb;
