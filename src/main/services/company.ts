import { ServiceInterface } from "./service";
import type { PunchinDatabase } from "./data";
import { BaseModel } from './types';

export interface CompanyModel extends BaseModel {
  name: string;
}

export class CompanyService implements ServiceInterface<CompanyModel> {
  db: PunchinDatabase | null = null;

  constructor(db: PunchinDatabase) {
    if (!this.db) {
      this.db = db;
    }
  }

  getByName(n: string): CompanyModel {
    const row = this.db?.prepare(`
      SELECT id, name 
      FROM company
      WHERE name in (?)
      ORDER BY id DESC
    `).get(n.trim());
    return (row as CompanyModel) ?? null;
  }
  
  getOne(id: number): CompanyModel {
    const row = this.db?.prepare(`
      SELECT id, name 
      FROM company
      WHERE id = ?
      AND is_active = 1
      ORDER BY id DESC LIMIT 1
    `).get(id);
    return (row as CompanyModel) ?? null;
  }

  set(companyList: CompanyModel[]): boolean {
    const insert = this.db?.prepare(`INSERT OR IGNORE INTO company(name) VALUES (?)`);
    const filteredList: CompanyModel[] = companyList.filter((c: CompanyModel) => c.id == undefined);

    if (filteredList.length < 1) {
      console.info("[company::set] Nothing to update.")
      return false;
    }

    const namesOnly: string[] = filteredList.map((c: CompanyModel) => c.name);
    let has_one: CompanyModel[] = [];
    for(const i in namesOnly) {
      const gbn = this.getByName(namesOnly[i]);
      if (gbn) has_one.push(gbn);
    }

    let toBeAdded: CompanyModel[];
    if (has_one && has_one.length) {
      console.info(`[company::set] Company with name(s) '${has_one.map((c: CompanyModel) => c.name)}' already exist(s).`);
      for (const i in has_one) {
        if (has_one[i].id) this.activate(has_one[i].id);
      }

      const ids_only = has_one.map((c: CompanyModel) => c.id);

      toBeAdded = filteredList.filter((c: CompanyModel) => !ids_only.includes(c.id as number));
    } else {
      toBeAdded = filteredList;
    }

    const tx = this.db?.transaction((items: CompanyModel[]) => {
      for (const { name } of items) {
        insert?.run(name.trim());
      }
    });

    tx?.(toBeAdded); // TODO: need better guardrails here.
        
    
    return true; 
  }

  get(): CompanyModel[] {
    return this.db?.prepare(`
      SELECT id, name, is_active, deleted_at, updated_at, created_at 
      FROM company 
      WHERE is_active = 1
      ORDER BY id DESC`).all() as CompanyModel[];
  }

  remove(c: CompanyModel): boolean {
    if (!c.id) {
      return false;
    }

    const del = this.db?.prepare(`
      UPDATE company
      SET is_active = 0
      WHERE id = ?`).run(c.id);

    if (del?.changes && del?.changes > 0) {
      console.log("removed: ", del?.lastInsertRowid);
      return true;
    }

    return false;
  }

  activate(id: number): boolean {
    const upd = this.db?.prepare(`
      UPDATE company
      SET is_active = 1
      WHERE id = ?`).run(id);

    return (upd?.changes !== undefined && upd?.changes > 0);
  }

  removeMany(cs: CompanyModel[]): boolean {
    console.debug(cs);
    return false;
  }

  toCompanyModel(companies: string[]): CompanyModel[] {
    const _c: CompanyModel[] = [];
    for (let i = 0; i < companies.length; i++) {
      const name = (companies[i] as string).trim();
      if (name) {
        _c.push({ name: name} as CompanyModel)
      }
    }

    return _c;
  }
}