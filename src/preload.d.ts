import { CompanyModel } from "./main/services/company";
import { TaskModel } from "./main/services/task";

export {};

// Bootstrap event han interface
declare global {
  interface PunchInAPI {
    // state & control
    getState(): Promise<PunchInState>;
    start(task: TaskModel): Promise<number>;
    stop(task: TaskModel): Promise<boolean>;
    setProjectList(projects: ProjectModel[]): Promise<void>;
    getProjectList(): Promise<ProjectModel[]>;
    removeProject(id: number): Promise<boolean>;
    setCompanyList(companies: CompanyModel[]): Promise<void>;
    getCompanyList(): Promise<CompanyModel[]>;
    removeCompany(id: number): Promise<boolean>;
    getTasks(): Promise<TaskModel[]>;
    getReport(includeDeleted?: boolean): Promise<ReportModel[]>;

    // reporting
    getSessions(): Promise<SessionModel[]>;
    getAllSessionsWithDetails(): Promise<Array<{
      id: number;
      company_name: string;
      project_name: string;
      task_name: string;
      start_time: number;
      end_time: number | null;
      duration_ms: number;
    }>>;
    removeSession(id: number): Promise<boolean>;

    // events
    onTick(cb: () => void): () => void;
    onSessionsUpdated(cb: () => void): () => void;
  }

  interface PunchInState {
    running: boolean;
    currentTask: TaskModel;
    startTs: number | null; // epoch ms
  }

  interface Window {
    tp: PunchInAPI;
  }
}
