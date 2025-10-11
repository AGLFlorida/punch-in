import { ServiceInterface } from "./service";
import type { PunchinDatabase } from "./data";

export interface CompanyRow {
  name: string
}


export interface CompanyModel extends CompanyRow {
  id: number
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

  set(companyList: CompanyRow[]): boolean { // TODO: This allows duplicate company names.
    const insert = this.db?.prepare(`INSERT OR IGNORE INTO company(name) VALUES (?)`);
    console.log(companyList);
    const tx = this.db?.transaction((items: CompanyRow[]) => {
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

  toCompanyRow(companies: string[]): CompanyRow[] {
    const _c: CompanyRow[] = [];
    for (let i = 0; i < companies.length; i++) {
      const name = (companies[i] as string).trim();
      if (name) {
        _c.push({ name: name} as CompanyRow)
      }
    }

    return _c;
  }
}