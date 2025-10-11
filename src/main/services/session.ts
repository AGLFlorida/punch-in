import { ServiceInterface } from "./service";
import type { PunchinDatabase } from "./data";

export interface SessionRow {
  start_time: Date;
  end_time: Date;
}


export interface Session extends SessionRow {
  id: number;
  task_id: number;
}

export class SessionService implements ServiceInterface<Session> {
    db: PunchinDatabase | null = null;
  
    constructor(db: PunchinDatabase) {
      if (!this.db) {
        this.db = db;
      }
    }
  
  getOne(_?: number): Session {
    const row = this.db?.prepare(`
      SELECT id, task_id, start_time, end_time 
      -- FROM v_session
      FROM session
      WHERE end_time IS NULL
      ORDER BY id DESC LIMIT 1
    `).get();
    return (row as Session) ?? null;
  }

  set(data: Session[]) { return false; }

  start(task: number) {
    // this.ensureProject(project);
    // close any orphan open session (defensive)
    if (this.getOpenSessions() > 0) {
      this.db?.prepare(`UPDATE session SET end_time = ? WHERE end_time IS NULL`).run(Date.now());
    }
    //this.db?.prepare(`UPDATE session SET end_time = ? WHERE end_time IS NULL`).run(Date.now());
    //const s:  = this.db?.prepare(`SELECT id FROM session WHERE task_id = ?`).get(project) as ProjectRow;
    //this.db.prepare(`INSERT INTO session(project_id, start_time) VALUES(?, ?)`).run(p?.id, Date.now());
  }

  stop() {
    //this.db?.prepare(`UPDATE session SET end_time = ? WHERE end_time IS NULL`).run(Date.now());
  }

  get(): Session[] {
    return this.db?.prepare(`SELECT id, task_id, start_time, end_time FROM session ORDER BY id DESC`).all() as Session[];
  }

  private getOpenSessions(): number {
    const rows = this.db?.prepare(`SELECT count(1) FROM session ORDER BY id DESC`).run();
    console.log("open sessions", rows);
    return 0;
  }
}