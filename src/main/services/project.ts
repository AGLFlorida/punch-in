import { PunchinDatabase } from "./data";
import { ServiceInterface } from "./service";

export interface Project extends ProjectRow {
  id: number;
}

export interface ProjectRow {
  name: string;
  company_id: number;
}

export class ProjectService implements ServiceInterface<Project> {
  db: PunchinDatabase | null = null;

  constructor(db: PunchinDatabase) {
    if (!this.db) {
      this.db = db;
    }
  }

  get(): Project[] {
    const rows = this.db?.prepare(`SELECT id, name, comnpany_id FROM project ORDER BY name`).all();
    return rows?.map((r) => r as Project) || [];
  };

  getOne(id: number): Project {
    const row: Project | null = this.db?.prepare(`SELECT id FROM project WHERE name = ?`).get(id) as Project;
    return row || null;
  }

  set(inputs: ProjectRow[]): boolean {
    const insert = this.db?.prepare(
      `INSERT OR IGNORE INTO project(name, company_id) VALUES (?, ?)`
    );
    const tx = this.db?.transaction((items: ProjectRow[]) => {
      for (const { name, company_id } of items) {
        insert?.run(name.trim(), company_id);
      }
    });

    tx?.(inputs); // TODO: need better guardrails here.
   
    return true;
  }
}
