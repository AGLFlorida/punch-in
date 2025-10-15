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
    getReport(): Promise<ReportModel[]>;

    // reporting
    getSessions(): Promise<SessionModel[]>;

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
