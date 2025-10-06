import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';

export type SessionRow = {
  id: number;
  project: string;
  start: number;    // epoch ms
  end: number|null; // epoch ms | null
};

export type ProjectRow = {
  id: number;
  name: string;
}

export type PunchinDatabase = Database.Database

class DB {
  private db: PunchinDatabase;

  constructor() {
    const dir = app.getPath('userData');
    const file = path.join(dir, 'punchin.db');
    fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(file);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.init();
  }

  private init() {
    createScema(this.db);
  }

  getProjects(): string[] {
    const rows = this.db.prepare(`SELECT name FROM project ORDER BY name`).all();
    return rows.map((r) => (r as ProjectRow).name as string);
  }

  setProjects(list: string[]) {
    const insert = this.db.prepare(`INSERT OR IGNORE INTO project(name) VALUES (?)`);
    const tx = this.db.transaction((items: string[]) => {
      for (const n of items) insert.run(n);
    });
    tx(list);
  }

  ensureProject(name: string) {
    this.db.prepare(`INSERT OR IGNORE INTO project(name) VALUES (?)`).run(name);
  }

  getOpenSession(): SessionRow | null {
    const row = this.db.prepare(`
      SELECT id, project, start, end FROM v_session
      WHERE end IS NULL
      ORDER BY id DESC LIMIT 1
    `).get();
    return (row as SessionRow) ?? null;
  }

  start(project: string) {
    this.ensureProject(project);
    // close any orphan open session (defensive)
    this.db.prepare(`UPDATE session SET end_time = ? WHERE end_time IS NULL`).run(Date.now());
    const p: ProjectRow = this.db.prepare(`SELECT id FROM project WHERE name = ?`).get(project) as ProjectRow;
    this.db.prepare(`INSERT INTO session(project_id, start_time) VALUES(?, ?)`).run(p?.id, Date.now());
  }

  stop() {
    this.db.prepare(`UPDATE session SET end_time = ? WHERE end_time IS NULL`).run(Date.now());
  }

  getSessions(): SessionRow[] {
    return this.db.prepare(`SELECT id, project, start, end FROM v_session ORDER BY id DESC`).all() as SessionRow[];
  }
}

export const db = new DB();



function createScema(db: PunchinDatabase): PunchinDatabase {
  if (process.env.ENV == 'development') {
    console.log('[DEBUG:CREATE SCEHEMA]', 'Called create schema'); 
  }

  try {
    // Faster, safe journaling
    db.pragma('journal_mode = WAL');
    
    db.exec(`
      -- Recommended whenever you use FKs in SQLite
      PRAGMA foreign_keys = ON;

      -- COMPANY
      CREATE TABLE IF NOT EXISTS "company" (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        created_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        CONSTRAINT company_name_len CHECK (length(name) <= 32)
      );

      CREATE TRIGGER IF NOT EXISTS trg_company_updated_at
      AFTER UPDATE ON "company"
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE "company"
          SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
      END;

      -- PROJECT
      CREATE TABLE IF NOT EXISTS "project" (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        company_id  INTEGER NOT NULL,
        created_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        CONSTRAINT project_name_len CHECK (length(name) <= 32),
        CONSTRAINT fk_project_company
          FOREIGN KEY (company_id)
          REFERENCES "company"(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      );

      CREATE TRIGGER IF NOT EXISTS trg_project_updated_at
      AFTER UPDATE ON "project"
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE "project"
          SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
      END;

      -- TASK
      CREATE TABLE IF NOT EXISTS "task" (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        project_id  INTEGER NOT NULL,
        created_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        CONSTRAINT task_name_len CHECK (length(name) <= 32),
        CONSTRAINT fk_task_project
          FOREIGN KEY (project_id)
          REFERENCES "project"(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      );

      CREATE TRIGGER IF NOT EXISTS trg_task_updated_at
      AFTER UPDATE ON "task"
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE "task"
          SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
      END;

      -- SESSION
      CREATE TABLE IF NOT EXISTS "session" (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id     INTEGER NOT NULL,
        start_time     DATETIME NOT NULL,
        end_time       DATETIME,                 
        created_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        CONSTRAINT fk_session_task
          FOREIGN KEY (task_id)
          REFERENCES "task"(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT session_time_order CHECK (end_time IS NULL OR end_time >= start_time)
      );

      CREATE TRIGGER IF NOT EXISTS trg_session_updated_at
      AFTER UPDATE ON "session"
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE "session"
          SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
      END;

      CREATE VIEW IF NOT EXISTS v_session AS
      SELECT s.id,
             p.name AS project,
             s.start_time AS start,
             s.end_time   AS end
      FROM session s
      JOIN project p ON p.id = s.task_id;

      CREATE INDEX IF NOT EXISTS idx_session_open ON session(end_time);
      CREATE INDEX IF NOT EXISTS idx_session_project ON session(task_id);
    `);
  } catch (e) {
    if (process.env.ENV == 'development') {
      console.error("[DEBUG:ERROR] Error creating db schema");
    }
    throw e; // TODO: sane fallback to file storage when we can't get the db
  }

  return db;
}