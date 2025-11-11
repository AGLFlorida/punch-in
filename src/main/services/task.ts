import { ServiceInterface } from "./service";
import type { PunchinDatabase } from "./data";
import { BaseModel } from './types';

export interface TaskModel extends BaseModel {
  name: string;
  project_id?: number;
}

export class TaskService implements ServiceInterface<TaskModel> {
  db: PunchinDatabase | null = null;
  private lastTask: number = -1;

  constructor(db: PunchinDatabase) {
    if (!this.db) {
      this.db = db;
    }
  }

  getOne(id?: number): TaskModel {
    if (!id) {
      return {} as TaskModel;
    }
    const row = this.db?.prepare(`
      SELECT id, name, project_id, is_active, deleted_at, updated_at, created_at 
      FROM task 
      WHERE id = ? AND is_active = 1
    `).get(id) as TaskModel | undefined;
    return row ?? ({} as TaskModel);
  }

  get(): TaskModel[] {
    return this.db?.prepare(`
      SELECT id, name, project_id, is_active, deleted_at, updated_at, created_at 
      FROM task 
      WHERE is_active = 1
      ORDER BY id DESC`).all() as TaskModel[];
  }

  getLastTaskId(): number {
    return this.lastTask;
  }

  set(tasks: TaskModel[]): boolean {
    const t = tasks[0];
    if (!t.project_id) {
      throw new Error("Project ID is required for new tasks.")
    }
    const insert = this.db?.prepare(`INSERT OR IGNORE INTO task(name, project_id) VALUES (?,?)`).run(t.name, t.project_id);
    this.lastTask = (insert?.lastInsertRowid as number) ?? -1;
    return !!(insert?.changes && insert?.changes > 0);
  }
}