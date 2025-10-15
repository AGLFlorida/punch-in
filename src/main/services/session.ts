import { ServiceInterface } from "./service";
import type { PunchinDatabase } from "./data";
import { BaseModel } from "./types";
import { TaskModel } from "./task";

export interface SessionModel extends BaseModel {
  task: TaskModel
  start_time: Date;
  end_time?: Date;
}

export class SessionService implements ServiceInterface<SessionModel> {
    db: PunchinDatabase | null = null;
  
    constructor(db: PunchinDatabase) {
      if (!this.db) {
        this.db = db;
      }
    }
  
  getOne(id?: number): SessionModel {
    console.log("ID", id);
    const row = this.db?.prepare(`
      SELECT id, task_id, start_time, end_time 
      -- FROM v_session
      FROM session
      WHERE end_time IS NULL
      ORDER BY id DESC LIMIT 1
    `).get();
    return (row as SessionModel) ?? null;
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

  private getOpenSessions(): number {
    const rows = this.db?.prepare(`SELECT count(1) FROM session ORDER BY id DESC`).run();
    console.log("open sessions", rows);
    return 0;
  }
}