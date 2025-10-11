export {};

import type { ProjectRow } from './main/services/project';
import type { CompanyRow } from './main/services/company';

declare global {
  //type ProjectRow = { name: string; company: string };

  interface TimePunchState {
    running: boolean;
    currentProject: string;
    startTs: number | null; // epoch ms
    projects: string[];
    companies: string[];
  }

  interface SessionRow {
    id: number;
    project: string;
    start: number; // epoch ms
    end: number | null;
    elapsedMs: number;
  }

  interface TimePunchAPI {
    // state & control
    getState(): Promise<TimePunchState>;
    start(project: string): Promise<void>;
    stop(): Promise<void>;
    setProjectList(projects: ProjectRow[]): Promise<void>;
    setCompanyList(companies: string[]): Promise<void>;
    getCompantList(): Promise<CompanyRow[]>

    // reporting
    getSessions(): Promise<SessionRow[]>;

    // events
    onTick(cb: () => void): () => void;
    onSessionsUpdated(cb: () => void): () => void;
  }

  interface Window {
    tp: TimePunchAPI;
  }
}
