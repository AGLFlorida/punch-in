import { ServiceInterface } from "./service";
import type { PunchinDatabase } from "./data";

export interface ReportModel {
  company_name: string;
  project_name: string;
  task_name: string;
  day: string;
  total_seconds: number;
  is_deleted?: boolean; // true if any related entity (session, task, project, company) is deleted
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

  get(includeDeleted: boolean = false): ReportModel[] {
    let query = `
      SELECT 
        company_name, 
        project_name, 
        task_name, 
        day, 
        total_seconds,
        0 AS is_deleted
      FROM ${this.tableName}
    `;

    // If including deleted entries, we need to query differently
    // The view filters by is_active=1, so we need a custom query for deleted entries
    if (includeDeleted) {
      query = `
        WITH
        -- completed sessions only (including deleted); convert ms → sec (INTEGER)
        normalized AS (
          SELECT
            s.id,
            s.task_id,
            s.is_active AS session_is_active,
            CAST(s.start_time / 1000 AS INTEGER) AS start_s,
            CAST(s.end_time   / 1000 AS INTEGER) AS end_s
          FROM "session" s
          WHERE s.end_time IS NOT NULL
        ),
        -- one row per calendar day touched
        expanded(day, id, task_id, session_is_active, start_s, end_s) AS (
          SELECT
            DATE(start_s, 'unixepoch') AS day,
            id, task_id, session_is_active, start_s, end_s
          FROM normalized
          UNION ALL
          SELECT
            DATE(DATETIME(day, '+1 day')) AS day,
            id, task_id, session_is_active, start_s, end_s
          FROM expanded
          WHERE DATETIME(day, '+1 day') < DATE(end_s, 'unixepoch', '+1 day')
        ),
        -- clamp to that day's [00:00, 24:00) window, all in SECONDS (INTEGER)
        per_day AS (
          SELECT
            id,
            task_id,
            day,
            session_is_active,
            CAST(STRFTIME('%s', day) AS INTEGER) AS day_start_s,
            CAST(STRFTIME('%s', DATETIME(day, '+1 day')) AS INTEGER) AS day_end_s,
            start_s,
            end_s
          FROM expanded
        ),
        segments AS (
          SELECT
            id,
            task_id,
            day,
            session_is_active,
            MAX(start_s, day_start_s) AS seg_start,
            MIN(end_s,   day_end_s)   AS seg_end
          FROM per_day
        )
        SELECT
          c.name AS company_name,
          p.name AS project_name,
          t.name AS task_name,
          s.day  AS day,
          SUM(CASE WHEN (s.seg_end - s.seg_start) > 0 THEN (s.seg_end - s.seg_start) ELSE 0 END) AS total_seconds,
          MAX(CASE 
            WHEN s.session_is_active = 0 OR t.is_active = 0 OR p.is_active = 0 OR c.is_active = 0 
            THEN 1 
            ELSE 0 
          END) AS is_deleted
        FROM segments s
        JOIN task    t ON t.id = s.task_id
        JOIN project p ON p.id = t.project_id
        JOIN company c ON c.id = p.company_id
        GROUP BY c.name, p.name, t.name, t.id, s.day
      `;
    }

    query += ' ORDER BY total_seconds DESC;';

    const data = this.db?.prepare(query).all();
    
    return data as ReportModel[];
  }
}