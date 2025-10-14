import { CompanyModel } from "./main/services/company";
import { TaskModel } from "./main/services/task";

export {};

// Bootstrap event han interface
declare global {
  interface PunchInAPI {
    // state & control
    getState(): Promise<PunchInState>;
    start(project: string): Promise<void>;
    stop(): Promise<void>;
    setProjectList(projects: ProjectModel[]): Promise<void>;
    getProjectList(): Promise<ProjectModel[]>;
    removeProject(id: number): Promise<boolean>;
    setCompanyList(companies: CompanyModel[]): Promise<void>;
    getCompanyList(): Promise<CompanyModel[]>;
    removeCompany(id: number): Promise<boolean>;
    getTasks(): Promise<TaskModel[]>;

    // reporting
    getSessions(): Promise<SessionRow[]>;

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
