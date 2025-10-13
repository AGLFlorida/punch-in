import { ServiceInterface } from "./service";
import type { PunchinDatabase } from "./data";

export interface CompanyModel {
  id?: number;
  name: string;
}

export class CompanyService implements ServiceInterface<CompanyModel> {
    db: PunchinDatabase | null = null;
  
    constructor(db: PunchinDatabase) {
      if (!this.db) {
        this.db = db;
      }
    }
  
  getOne(id: number): CompanyModel {
    const row = this.db?.prepare(`
      SELECT id, name 
      FROM company
      WHERE id = ?
      ORDER BY id DESC LIMIT 1
    `).get(id);
    return (row as CompanyModel) ?? null;
  }

  set(companyList: CompanyModel[]): boolean { // TODO: This allows duplicate company names.
    const insert = this.db?.prepare(`INSERT OR IGNORE INTO company(name) VALUES (?)`);
    console.log(companyList);
    const tx = this.db?.transaction((items: CompanyModel[]) => {
      for (const { name } of items) {
        insert?.run(name.trim());
      }
    });
  
    tx?.(companyList); // TODO: need better guardrails here.
      
    return true; 
  }

  get(): CompanyModel[] {
    return this.db?.prepare(`SELECT id, name FROM company ORDER BY id DESC`).all() as CompanyModel[];
  }

  // TODO: soft deletes only....?
  remove(c: CompanyModel): boolean {
    if (!c.id) {
      return false;
    }

    //const delete = 
    return true;
  }

  removeMany(cs: CompanyModel[]): boolean {
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