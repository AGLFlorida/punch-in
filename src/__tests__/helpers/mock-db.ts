import Database from 'better-sqlite3';
import type { PunchinDatabase } from '../../main/services/data';

/**
 * Creates an in-memory SQLite database for testing
 */
export function createMockDatabase(): PunchinDatabase {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  // Create schema
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

    -- SESSION
    CREATE TABLE IF NOT EXISTS "session" (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id     INTEGER NOT NULL,
      start_time     DATETIME NOT NULL,
      end_time       DATETIME,
      break_ms    INTEGER NOT NULL DEFAULT 0,
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

    CREATE INDEX IF NOT EXISTS idx_session_open ON session(end_time);
    CREATE INDEX IF NOT EXISTS idx_session_project ON session(task_id);

    -- report view
    CREATE VIEW IF NOT EXISTS v_task_daily_totals_exact AS
    WITH
    -- completed sessions only; convert ms → sec (INTEGER)
    normalized AS (
      SELECT
        s.id,
        s.task_id,
        CAST(s.start_time / 1000 AS INTEGER) AS start_s,
        CAST(s.end_time   / 1000 AS INTEGER) AS end_s,
        CAST(COALESCE(s.break_ms, 0) / 1000 AS INTEGER) AS break_s
      FROM "session" s
      WHERE s.end_time IS NOT NULL
        AND s.is_active = 1
    ),

    -- one row per calendar day touched
    expanded(day, id, task_id, start_s, end_s, break_s) AS (
      SELECT
        DATE(start_s, 'unixepoch') AS day,
        id, task_id, start_s, end_s, break_s
      FROM normalized
      UNION ALL
      SELECT
        DATE(DATETIME(day, '+1 day')) AS day,
        id, task_id, start_s, end_s, break_s
      FROM expanded
      WHERE DATETIME(day, '+1 day') < DATE(end_s, 'unixepoch', '+1 day')
    ),

    -- clamp to that day's [00:00, 24:00) window, all in SECONDS (INTEGER)
    per_day AS (
      SELECT
        id,
        task_id,
        day,
        -- midnight of this day in seconds
        CAST(STRFTIME('%s', day) AS INTEGER)              AS day_start_s,
        CAST(STRFTIME('%s', DATETIME(day, '+1 day')) AS INTEGER) AS day_end_s,
        start_s,
        end_s,
        break_s
      FROM expanded
    ),
    segments AS (
      SELECT
        id,
        task_id,
        day,
        MAX(start_s, day_start_s) AS seg_start,
        MIN(end_s,   day_end_s)   AS seg_end,
        -- Deduct break only on the first day of the session to avoid double-counting
        CASE WHEN DATE(start_s, 'unixepoch') = day THEN break_s ELSE 0 END AS day_break_s
      FROM per_day
    ),
    raw_totals AS (
      SELECT
        task_id,
        day,
        SUM(CASE WHEN (seg_end - seg_start) > 0 THEN (seg_end - seg_start) ELSE 0 END) - SUM(day_break_s) AS net_s
      FROM segments
      GROUP BY task_id, day
    )
    SELECT
      c.name AS company_name,
      p.name AS project_name,
      t.name AS task_name,
      t.id   AS task_id,
      r.day  AS day,
      CASE WHEN r.net_s > 0 THEN r.net_s ELSE 0 END AS total_seconds,
      ROUND(CASE WHEN r.net_s > 0 THEN r.net_s ELSE 0 END / 3600.0, 2) AS total_hours
    FROM raw_totals r
    JOIN task    t ON t.id = r.task_id AND t.is_active = 1
    JOIN project p ON p.id = t.project_id AND p.is_active = 1
    JOIN company c ON c.id = p.company_id AND c.is_active = 1
    ORDER BY c.name, p.name, t.name, r.day;
  `);

  return db;
}

