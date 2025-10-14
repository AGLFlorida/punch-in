import { CompanyService } from "./company";
import { DB, type PunchinDatabase } from "./data";
import { ProjectService } from "./project";
import { SessionService } from "./session";
import { TaskService } from "./task";

export class ServiceManager {
  private db: PunchinDatabase | null = null;
  
  private _project: ProjectService | null = null;
  private _session: SessionService | null = null;
  private _company: CompanyService | null = null;
  private _task: TaskService | null = null;

  private static instance: ServiceManager | null = null;

  private constructor(){
    if (this.db === null || !this.db) {
      this.db = (new DB()).db;
    } 

    if (this._project == null) {
      this._project = new ProjectService(this.db as PunchinDatabase);
    }

    if (this._session == null) {
      this._session = new SessionService(this.db as PunchinDatabase);
    }

    if (this._company == null) {
      this._company = new CompanyService(this.db as PunchinDatabase);
    }

    if (this._task == null) {
      this._task = new TaskService(this.db as PunchinDatabase);
    }
  }

  static getInstance(): ServiceManager {
    if (this.instance == null) {
      this.instance = new this();
    }
    
    return this.instance;
  }

  project() {
    return this._project;
  }

  session() {
    return this._session
  }

  company() {
    return this._company;
  }

  task() {
    return this._task;
  }

  closeDB() {
    this.db?.close()
  }
}