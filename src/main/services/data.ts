import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';
//import { ProjectRow } from './project';

export type PunchinDatabase = Database.Database

export class DB {
  db: PunchinDatabase | null = null;

  private iNo: number;

  constructor() {
    this.iNo = Math.random();
    if (this.db === null) {
      const dir = app.getPath('userData');
      const file = path.join(dir, 'punchin.db');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      this.db = new Database(file);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      this.init();
    }
  }

  private init() {
    console.log("iNo:", this.iNo);
    if (this.db) createScema(this.db);
  }

  /*
  setCompanies(list: string[]) {
    if (!this.db) {
      throw new Error("db not set")
    }
    const insert = this.db.prepare(`INSERT OR IGNORE INTO company(name) VALUES (?)`);
    const tx = this.db.transaction((items: string[]) => {
      for (const n of items) insert.run(n);
    });

    try {
      tx(list);
    } catch (e) {
      console.error(e);
    }
  }

  setProjects(list: ProjectRow[]) {
    const insert = this.db?.prepare(
      `INSERT OR IGNORE INTO project(name, companyId) VALUES (?, ?)`
    );
    const tx = this.db.transaction((items: { name: string; companyId: number }[]) => {
      for (const { name, companyId } of items) {
        insert.run(name.trim(), companyId);
      }
    });

    try {
      tx(list);
    } catch (e) {
      console.error(e);
    }
  }

  getProjects(): string[] {
    const rows = this.db.prepare(`SELECT name FROM project ORDER BY name`).all();
    return rows.map((r) => (r as ProjectRow).name as string);
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
  } */

  close() {
    try { this.db?.close(); } catch (e) { console.error(e) }
  }
}

//export const db = new DB();



function createScema(db: PunchinDatabase): PunchinDatabase {
  if (process.env.ENV == 'development') {
    console.log('[DEBUG:CREATE SCEHEMA]', 'Called create schema'); 
  }

  try {
    db.exec(`
      -- COMPANY
      CREATE TABLE IF NOT EXISTS "company" (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        is_active   BOOLEAN NOT NULL DEFAULT 1,
        deleted_at  DATETIME,
        created_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        CONSTRAINT company_name_len CHECK (length(name) <= 32)
      );

      CREATE INDEX IF NOT EXISTS idx_company_active
      ON company (id)
      WHERE is_active = 1;

      CREATE TRIGGER IF NOT EXISTS trg_company_updated_at
      AFTER UPDATE ON "company"
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE "company"
          SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
      END;

      CREATE TRIGGER IF NOT EXISTS company_deleted_at_on_deactivate
      AFTER UPDATE ON "company"
      FOR EACH ROW
      WHEN NEW.is_active = 0 AND OLD.is_active = 1
      BEGIN
        UPDATE "company"
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
      END;

      -- PROJECT
      CREATE TABLE IF NOT EXISTS "project" (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        company_id  INTEGER NOT NULL,
        is_active   BOOLEAN NOT NULL DEFAULT 1,
        deleted_at  DATETIME,
        created_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        CONSTRAINT project_name_len CHECK (length(name) <= 32),
        CONSTRAINT fk_project_company
          FOREIGN KEY (company_id)
          REFERENCES "company"(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_project_active
      ON project (id)
      WHERE is_active = 1;

      CREATE TRIGGER IF NOT EXISTS trg_project_updated_at
      AFTER UPDATE ON "project"
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE "project"
          SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
      END;

      CREATE TRIGGER IF NOT EXISTS proj_deleted_at_on_deactivate
      AFTER UPDATE ON "project"
      FOR EACH ROW
      WHEN NEW.is_active = 0 AND OLD.is_active = 1
      BEGIN
        UPDATE "project"
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
      END;

      -- TASK
      CREATE TABLE IF NOT EXISTS "task" (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        project_id  INTEGER NOT NULL,
        is_active   BOOLEAN NOT NULL DEFAULT 1,
        deleted_at  DATETIME,
        created_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        CONSTRAINT task_name_len CHECK (length(name) <= 32),
        CONSTRAINT fk_task_project
          FOREIGN KEY (project_id)
          REFERENCES "project"(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_task_active
      ON task (id)
      WHERE is_active = 1;

      CREATE TRIGGER IF NOT EXISTS trg_task_updated_at
      AFTER UPDATE ON "task"
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE "task"
          SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
      END;

      CREATE TRIGGER IF NOT EXISTS task_deleted_at_on_deactivate
      AFTER UPDATE ON "task"
      FOR EACH ROW
      WHEN NEW.is_active = 0 AND OLD.is_active = 1
      BEGIN
        UPDATE "task"
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
      END;

      -- SESSION
      CREATE TABLE IF NOT EXISTS "session" (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id     INTEGER NOT NULL,
        start_time     DATETIME NOT NULL,
        end_time       DATETIME, 
        is_active   BOOLEAN NOT NULL DEFAULT 1,
        deleted_at  DATETIME,                
        created_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        CONSTRAINT fk_session_task
          FOREIGN KEY (task_id)
          REFERENCES "task"(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT session_time_order CHECK (end_time IS NULL OR end_time >= start_time)
      );

      CREATE INDEX IF NOT EXISTS idx_session_active
      ON session (id)
      WHERE is_active = 1;

      CREATE TRIGGER IF NOT EXISTS trg_session_updated_at
      AFTER UPDATE ON "session"
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE "session"
          SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
      END;

      CREATE TRIGGER IF NOT EXISTS session_deleted_at_on_deactivate
      AFTER UPDATE ON "session"
      FOR EACH ROW
      WHEN NEW.is_active = 0 AND OLD.is_active = 1
      BEGIN
        UPDATE "session"
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
      END;

      -- report view
      CREATE VIEW IF NOT EXISTS v_task_daily_totals_exact AS
      WITH
      -- Normalize times; ignore open sessions (or COALESCE to CURRENT_TIMESTAMP if you want to include them)
      normalized AS (
        SELECT
          s.id,
          s.task_id,
          DATETIME(s.start_time) AS start_at,
          DATETIME(s.end_time)   AS end_at
        FROM "session" s
        WHERE s.end_time IS NOT NULL
      ),

      -- For each session, generate one row per calendar day it touches
      expanded AS (
        SELECT
          n.id,
          n.task_id,
          DATE(n.start_at) AS day,
          n.start_at,
          n.end_at
        FROM normalized n

        UNION ALL

        SELECT
          e.id,
          e.task_id,
          DATE(DATETIME(e.day, '+1 day')) AS day,
          e.start_at,
          e.end_at
        FROM expanded e
        WHERE DATETIME(e.day, '+1 day') < DATE(e.end_at, '+1 day')  -- still before session's last day
      ),

      -- For each (session, day), compute the actual overlap in seconds with that day
      per_day AS (
        SELECT
          e.id,
          e.task_id,
          e.day,
          MAX(strftime('%s', MAX(e.start_at, DATETIME(e.day))))            AS seg_start,
          MIN(strftime('%s', MIN(e.end_at,   DATETIME(e.day, '+1 day'))))  AS seg_end
        FROM expanded e
        GROUP BY e.id, e.task_id, e.day
      )
      SELECT
        c.name AS company_name,
        p.name AS project_name,
        t.name AS task_name,
        t.id   AS task_id,
        pd.day AS day,
        SUM(MAX(pd.seg_end - pd.seg_start, 0))              AS total_seconds,
        ROUND(SUM(MAX(pd.seg_end - pd.seg_start, 0)) / 3600.0, 2) AS total_hours
      FROM per_day pd
      JOIN task    t ON t.id = pd.task_id
      JOIN project p ON p.id = t.project_id
      JOIN company c ON c.id = p.company_id
      WHERE (pd.seg_end - pd.seg_start) > 0
      GROUP BY c.name, p.name, t.name, t.id, pd.day
      ORDER BY c.name, p.name, t.name, pd.day;


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