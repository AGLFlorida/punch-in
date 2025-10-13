import { CompanyModel } from "./main/services/company";

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

    // reporting
    getSessions(): Promise<SessionRow[]>;

    // events
    onTick(cb: () => void): () => void;
    onSessionsUpdated(cb: () => void): () => void;
  }

  export interface PunchInState {
    running: boolean;
    currentProject: string;
    startTs: number | null; // epoch ms
    projects: string[];
    companies: string[];
  }

  interface Window {
    tp: PunchInAPI;
  }
}
