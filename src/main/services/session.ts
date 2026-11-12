import { ServiceInterface } from "./service";
import type { PunchinDatabase } from "./data";
import { BaseModel } from "./types";
import { TaskModel } from "./task";

export interface SessionModel extends BaseModel {
  task: TaskModel
  start_time: Date;
  end_time?: Date;
}

/**
 * Raw session row as returned from the database
 */
export interface SessionRow {
  id: number;
  task_id: number;
  start_time: number; // epoch milliseconds
  end_time: number | null;
  break_ms: number; // accumulated pomodoro break duration in milliseconds
}

export class SessionService implements ServiceInterface<SessionModel> {
    db: PunchinDatabase | null = null;
  
    constructor(db: PunchinDatabase) {
      if (!this.db) {
        this.db = db;
      }
    }
  
  getOne(): SessionModel {
    const row = this.db?.prepare(`
      SELECT id, task_id, start_time, end_time 
      -- FROM v_session
      FROM session
      WHERE end_time IS NULL
      ORDER BY id DESC LIMIT 1
    `).get();
    return (row as SessionModel) ?? null;
  }

  /**
   * Get the raw session row data (for internal use)
   */
  getOneRow(): SessionRow | null {
    const row = this.db?.prepare(`
      SELECT id, task_id, start_time, end_time, break_ms
      FROM session
      WHERE end_time IS NULL
      ORDER BY id DESC LIMIT 1
    `).get() as SessionRow | undefined;
    return row ?? null;
  }

  set(data: SessionModel[]) { console.log("TO BE IMPLEMENTED,", data); return false; }

  start(task_id: number): boolean {
    // close any orphan open session (defensive)
    if (this.getOpenSessions() > 0) {
      this.db?.prepare(`UPDATE session SET end_time = ? WHERE end_time IS NULL`).run(Date.now());
    }

    // TODO: this basically ignores the UI's start 'time'
    const res = this.db?.prepare(`INSERT INTO session(task_id, start_time) values(?,?)`).run(task_id, Date.now()); 
    
    if (!res?.changes || res.changes < 1) {
      return false;
    }

    return true;
  }

  stop(): boolean {
    // TODO: this is a hammer. it closes ALL open sessions.
    const res = this.db?.prepare(`UPDATE session SET end_time = ? WHERE end_time IS NULL`).run(Date.now());

    if (!res?.changes || res.changes < 1) {
      return false;
    }

    return true;
  }

  /**
   * Close a specific open session at an exact end timestamp.
   * Used by the midnight guard to stamp each cross-midnight session at the
   * correct end-of-day for its own start date.
   *
   * @param id      - session ID to close
   * @param endTime - epoch milliseconds to record as end_time
   * @returns true if the session was updated
   */
  stopSessionAt(id: number, endTime: number): boolean {
    const res = this.db?.prepare(
      `UPDATE session SET end_time = ? WHERE id = ? AND end_time IS NULL AND is_active = 1`
    ).run(endTime, id);

    return (res?.changes ?? 0) > 0;
  }

  /**
   * Return all open sessions (end_time IS NULL) whose start_time is strictly
   * before the given cutoff (epoch ms).
   * Used by the midnight guard to find sessions that crossed midnight.
   */
  getOpenRowsBeforeTime(cutoff: number): SessionRow[] {
    const rows = this.db?.prepare(
      `SELECT id, task_id, start_time, end_time, break_ms
       FROM session
       WHERE end_time IS NULL AND is_active = 1 AND start_time < ?
       ORDER BY start_time ASC`
    ).all(cutoff) as SessionRow[] | undefined;

    return rows ?? [];
  }

  get(): SessionModel[] {
    return this.db?.prepare(`SELECT id, task_id, start_time, end_time FROM session ORDER BY id DESC`).all() as SessionModel[];
  }

  /**
   * Get all active sessions with full company/project/task details.
   * Returns a flattened view with company_name, project_name, and task_name included.
   * Calculates duration_ms for each session (current time for running sessions).
   * 
   * @returns Array of session detail objects with company/project/task names and calculated duration
   */
  getAllWithDetails(): Array<{
    id: number;
    company_name: string;
    project_name: string;
    task_name: string;
    start_time: number;
    end_time: number | null;
    duration_ms: number;
  }> {
    const now = Date.now();
    const rows = this.db?.prepare(`
      SELECT
        s.id,
        c.name AS company_name,
        p.name AS project_name,
        t.name AS task_name,
        s.start_time,
        s.end_time,
        COALESCE(s.break_ms, 0) AS break_ms
      FROM session s
      JOIN task t ON t.id = s.task_id AND t.is_active = 1
      JOIN project p ON p.id = t.project_id AND p.is_active = 1
      JOIN company c ON c.id = p.company_id AND c.is_active = 1
      WHERE s.is_active = 1
      ORDER BY s.id DESC
    `).all() as Array<{
      id: number;
      company_name: string;
      project_name: string;
      task_name: string;
      start_time: number;
      end_time: number | null;
      break_ms: number;
    }>;

    // Calculate duration in JavaScript, subtracting pomodoro break time
    return (rows ?? []).map(row => ({
      id: row.id,
      company_name: row.company_name,
      project_name: row.project_name,
      task_name: row.task_name,
      start_time: row.start_time,
      end_time: row.end_time,
      duration_ms: Math.max(
        0,
        (row.end_time !== null ? (row.end_time - row.start_time) : (now - row.start_time)) - row.break_ms
      )
    }));
  }

  /**
   * Accumulate pomodoro break time for an open session.
   * Adds `breakMs` to the session's existing break_ms total.
   * Only updates sessions that are currently open (end_time IS NULL).
   *
   * @param id      - session ID to update
   * @param breakMs - break duration in milliseconds to add
   * @returns true if the session was updated
   */
  addBreakTime(id: number, breakMs: number): boolean {
    if (!id || !breakMs || breakMs <= 0) {
      return false;
    }

    const res = this.db?.prepare(
      `UPDATE session SET break_ms = break_ms + ? WHERE id = ? AND end_time IS NULL AND is_active = 1`
    )?.run(breakMs, id);

    return (res?.changes ?? 0) > 0;
  }

  /**
   * Return the most recently closed session row (end_time IS NOT NULL, is_active = 1).
   * Used by the timer UI to surface the last stopped session for end-time correction.
   *
   * @returns the latest closed SessionRow, or null if none exists
   */
  getLastClosedRow(): SessionRow | null {
    const row = this.db?.prepare(
      `SELECT id, task_id, start_time, end_time, break_ms
       FROM session
       WHERE end_time IS NOT NULL AND is_active = 1
       ORDER BY end_time DESC LIMIT 1`
    )?.get() as SessionRow | undefined;

    return row ?? null;
  }

  /**
   * Update the end_time of a completed session.
   * Validates that the new end time is after the session's start time and not in
   * the future. Only updates sessions that have already been closed (end_time IS NOT NULL).
   *
   * @param id      - session ID to update
   * @param endTime - new end timestamp in epoch milliseconds
   * @returns true if the session was updated, false if not found / validation failed
   */
  updateEndTime(id: number, endTime: number): boolean {
    if (!id || !endTime) {
      return false;
    }

    // Fetch the session to validate constraints
    const row = this.db?.prepare(
      `SELECT start_time, end_time FROM session WHERE id = ? AND is_active = 1`
    )?.get(id) as { start_time: number; end_time: number | null } | undefined;

    if (!row) {
      return false;
    }

    // Session must already be stopped (not running)
    if (row.end_time === null) {
      return false;
    }

    // end_time must be after start_time
    if (endTime <= row.start_time) {
      return false;
    }

    // end_time must not be in the future
    if (endTime > Date.now()) {
      return false;
    }

    const res = this.db?.prepare(
      `UPDATE session SET end_time = ? WHERE id = ? AND is_active = 1 AND end_time IS NOT NULL`
    )?.run(endTime, id);

    return (res?.changes ?? 0) > 0;
  }

  /**
   * Soft delete a session by setting is_active = 0.
   * This marks the session as deleted but preserves the data in the database.
   *
   * @param id - The session ID to delete
   * @returns true if the session was successfully deleted, false otherwise
   */
  remove(id: number): boolean {
    if (!id) {
      return false;
    }

    const del = this.db?.prepare(`
      UPDATE session
      SET is_active = 0
      WHERE id = ?`).run(id);

    if (del?.changes && del?.changes > 0) {
      return true;
    }

    return false;
  }

  private getOpenSessions(): number {
    const row = this.db?.prepare(`SELECT count(1) as count FROM session WHERE end_time IS NULL`).get() as { count: number } | undefined;
    return row?.count ?? 0;
  }
}