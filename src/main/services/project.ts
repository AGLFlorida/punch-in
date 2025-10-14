import { PunchinDatabase } from "./data";
import { ServiceInterface } from "./service";
import { BaseModel } from './types';

export interface ProjectModel extends BaseModel {
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
    const rows = this.db?.prepare(`
      SELECT id, name, company_id 
      FROM project 
      WHERE is_active = 1 
      ORDER BY name`).all();
    return rows?.map((r) => r as ProjectModel) || [];
  };

  getOne(id: number): ProjectModel {
    const row: ProjectModel = this.db?.prepare(`SELECT id FROM project WHERE id = ?`).get(id) as ProjectModel;
    return row;
  }

  getByName(name: string): ProjectModel {
    const row: ProjectModel = this.db?.prepare("SELECT id FROM project where name = ?").get(name.trim()) as ProjectModel;
    return row;
  }

  remove(p: ProjectModel): boolean {
    if (!p.id) {
      return false;
    }

    const del = this.db?.prepare(`
      UPDATE project
      SET is_active = 0
      WHERE id = ?`).run(p.id);

    if (del?.changes && del?.changes > 0) {
      console.log("removed: ", del?.lastInsertRowid);
      return true;
    }

    return false;
  }

  activate(id: number): boolean {
    const upd = this.db?.prepare(`
      UPDATE project
      SET is_active = 1
      WHERE id = ?`).run(id);

    if (upd?.changes && upd?.changes > 0) {
      console.log(`updated ${upd?.changes} rows`);
      return true;
    }

    return false;
  }

  set(projectList: ProjectModel[]): boolean {
    const insert = this.db?.prepare(
      `INSERT OR IGNORE INTO project(name, company_id) VALUES (?, ?)`
    );
    
    const filteredList: ProjectModel[] = projectList.filter((p: ProjectModel) => p.id == undefined);

    console.log("save: ", filteredList);
    return false;
    
    /*
    if (filteredList.length < 1) {
      console.info("[project::set] Nothing to update.")
      return false;
    }

    const namesOnly: string[] = filteredList.map((p: ProjectModel) => p.name);
    let has_one: ProjectModel[] = [];
    // for(const i in namesOnly) {
    //   const gbn = this.getByName(namesOnly[i]);
    //   if (gbn) has_one.push(gbn);
    // }

    let toBeAdded: ProjectModel[];
    if (has_one && has_one.length) { // TODO: this is skipped for now, we need to figure out same project name for >1 company.
      console.info(`[project::set] Project with name(s) '${has_one.map((p: ProjectModel) => p.name)}' already exist(s).`);
      for (const i in has_one) {
        if (has_one[i].id) this.activate(has_one[i].id);
      }

      const ids_only = has_one.map((p: ProjectModel) => p.id);

      toBeAdded = filteredList.filter((p: ProjectModel) => !ids_only.includes(p.id as number));
    } else {
      toBeAdded = filteredList;
    }

    const tx = this.db?.transaction((items: ProjectModel[]) => {
      for (const { name, company_id } of items) {
        insert?.run(name.trim(), company_id);
      }
    });

    tx?.(toBeAdded); // TODO: need better guardrails here.
        
    
    return true;
    */
  }
}
