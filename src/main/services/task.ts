import { ServiceInterface } from "./service";
import type { PunchinDatabase } from "./data";
import { BaseModel } from './types';

export interface TaskModel extends BaseModel {
  id?: number;
  name: string;
  project_id?: number;
}

export class TaskService implements ServiceInterface<TaskModel> {
  db: PunchinDatabase | null = null;

  constructor(db: PunchinDatabase) {
    if (!this.db) {
      this.db = db;
    }
  }

  getOne(): TaskModel {
    return {} as TaskModel;
  }

  get(): TaskModel[] {
    return this.db?.prepare(`
      SELECT id, name, project_id, is_active, deleted_at, updated_at, created_at 
      FROM task 
      WHERE is_active = 1
      ORDER BY id DESC`).all() as TaskModel[];
  }

  set(): boolean {
    console.log('TO BE IMPLEMENTED');
    return false;
  }
}