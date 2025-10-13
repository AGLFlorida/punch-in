import { PunchinDatabase } from "./data";
import { ServiceInterface } from "./service";
import { BaseModel } from './types';

export interface ProjectModel extends BaseModel {
  id?: number;
  name: string;
  company_id?: number;
}

export class ProjectService implements ServiceInterface<ProjectModel> {
  db: PunchinDatabase | null = null;

  constructor(db: PunchinDatabase) {
    if (!this.db) {
      this.db = db;
    }
  }

  get(): ProjectModel[] {
    const rows = this.db?.prepare(`SELECT id, name, comnpany_id FROM project ORDER BY name`).all();
    return rows?.map((r) => r as ProjectModel) || [];
  };

  getOne(id: number): ProjectModel {
    const row: ProjectModel | null = this.db?.prepare(`SELECT id FROM project WHERE name = ?`).get(id) as ProjectModel;
    return row;
  }

  set(inputs: ProjectModel[]): boolean {
    const insert = this.db?.prepare(
      `INSERT OR IGNORE INTO project(name, company_id) VALUES (?, ?)`
    );
    const tx = this.db?.transaction((items: ProjectModel[]) => {
      for (const { name, company_id } of items) {
        insert?.run(name.trim(), company_id);
      }
    });

    tx?.(inputs); // TODO: need better guardrails here.
   
    return true;
  }
}
