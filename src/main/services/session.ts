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
      SELECT id, task_id, start_time, end_time 
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
        s.end_time
      FROM session s
      JOIN task t ON t.id = s.task_id
      JOIN project p ON p.id = t.project_id
      JOIN company c ON c.id = p.company_id
      WHERE s.is_active = 1
      ORDER BY s.id DESC
    `).all() as Array<{
      id: number;
      company_name: string;
      project_name: string;
      task_name: string;
      start_time: number;
      end_time: number | null;
    }>;
    
    // Calculate duration in JavaScript to handle running sessions correctly
    return (rows ?? []).map(row => ({
      ...row,
      duration_ms: row.end_time !== null 
        ? (row.end_time - row.start_time)
        : (now - row.start_time)
    }));
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