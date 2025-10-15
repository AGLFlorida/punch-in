import { ServiceInterface } from "./service";
import type { PunchinDatabase } from "./data";

export interface ReportModel {
  company_name: string;
  project_name: string;
  task_name: string;
  day: string;
  total_seconds: number;
}

export class ReportService implements ServiceInterface<ReportModel> {
    db: PunchinDatabase | null = null;
    private tableName: string = "v_task_daily_totals_exact"
  
    constructor(db: PunchinDatabase) {
      if (!this.db) {
        this.db = db;
      }
    }

  set(data: ReportModel[]) { console.info("NOOP,", data); return true; }
  getOne() { console.info("NOOP,"); return {} as ReportModel; }

  get(): ReportModel[] {
    const data = this.db?.prepare(`
      SELECT 
        company_name, 
        project_name, 
        task_name, 
        day, 
        total_seconds
      FROM ${this.tableName}
      ORDER BY total_hours DESC;
    `).all();

    //console.log("DATA QUERY", data)
    
    return data as ReportModel[];
  }
}