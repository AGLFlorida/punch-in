import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import Database from 'better-sqlite3';

import type { Session } from '../types';

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const dbPath = path.join(app.getPath('userData'), 'punchin.sqlite');

type Row = { project: string; start: number; end: number };

type PunchinDatabase = Database.Database;
let db: PunchinDatabase;

export interface DBManagerInterface {
  get: () => PunchinDatabase;
  saveSession: (x: Row) => void;
  listSessions: (x: string) => Array<Session>;
  closeDB: () => boolean;
}

export class DBManager implements DBManagerInterface {
  private isInit: boolean = false;

  constructor() {
    this.ensureDataDir();
    db = this.initDb();
  }

  // PUBLIC
  public get(): PunchinDatabase {
    return db;
  }

  public getPath() {
    return DATA_DIR;
  }

  public saveSession(row: Row) {
    const stmt = db.prepare(
      'INSERT INTO sessions (project, start_ms, end_ms) VALUES (?, ?, ?)'
    );
    stmt.run(row.project, row.start, row.end);
  }

  public listSessions(project: string): Array<Session> {
    const stmt = db.prepare(
      'SELECT project, start_ms AS start, end_ms AS end FROM sessions ORDER BY start_ms DESC LIMIT 2000'
    );
    
    return stmt.all() as Array<Session>;
  }

  public closeDB(): boolean{
    try { 
      db.close(); 
      return true;
    } catch (err) {
      console.error(`[${new Date(Date.now()).toISOString()}:ERROR:DATABASE:CLOSE]`, err)
      return false;
    }
  }

  // PRIVATE
  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  private initDb(): PunchinDatabase {
    if (this.isInit) {
      if (process.env.NODE_ENV == 'development') {
        console.log('[DB init] Tried to initialize already after initDB() called on ', DATA_DIR); 
      }

      return db;
    }

    if (process.env.NODE_ENV == 'development') {
      console.log('[DB path]', DATA_DIR); 
    }

    db = new Database(dbPath);

    try {
      createScema(db);
    } catch (e) {
      console.error(e);
      this.isInit = false;
    }

    this.isInit = true;

    return db;
  }
  
}

function createScema(db: PunchinDatabase): PunchinDatabase {
  if (process.env.NODE_ENV == 'development') {
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

      -- SESSION  (quotes around start/end to avoid any keyword conflicts)
      CREATE TABLE IF NOT EXISTS "session" (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id     INTEGER NOT NULL,
        "start"     DATETIME NOT NULL,
        "end"       DATETIME,                 -- allow NULL until session is closed
        created_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        CONSTRAINT fk_session_task
          FOREIGN KEY (task_id)
          REFERENCES "task"(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        -- Optional sanity check: end >= start when end is set
        CONSTRAINT session_time_order CHECK ("end" IS NULL OR "end" >= "start")
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
    `);
  } catch (e) {
    if (process.env.NODE_ENV == 'development') {
      console.error("[DEBUG:ERROR] Error creating db schema");
    }
    throw e; // TODO: sane fallback to file storage when we can't get the db
  }

  return db;
}

