import { contextBridge, ipcRenderer } from 'electron';
import type { ProjectRow } from './main/services/project';
import type { CompanyModel } from './main/services/company';
import type { SessionRow } from './main/services/data';

contextBridge.exposeInMainWorld('tp', {
  getState: () => ipcRenderer.invoke('tp:getState'),
  start: (project: string) => ipcRenderer.invoke('tp:start', project),
  stop: () => ipcRenderer.invoke('tp:stop'),
  setProjectList: (projects: ProjectRow[]) => ipcRenderer.invoke('tp:setProjectList', projects),
  setCompanyList: (companies: CompanyModel[]) => ipcRenderer.invoke('tp:setCompanyList', companies),
  getCompanyList: (): Promise<CompanyModel[]> => ipcRenderer.invoke('tp:getCompanyList'),
  getSessions: () => ipcRenderer.invoke('tp:getSessions'),

  onTick: (cb: () => void) => {
    const fn = () => cb();
    ipcRenderer.on('tp:tick', fn);
    return () => ipcRenderer.off('tp:tick', fn);
  },
  onSessionsUpdated: (cb: () => void) => {
    const fn = () => cb();
    ipcRenderer.on('tp:sessionsUpdated', fn);
    return () => ipcRenderer.off('tp:sessionsUpdated', fn);
  }
});

export interface PunchInState {
  running: boolean;
  currentProject: string;
  startTs: number | null; // epoch ms
  projects: string[];
  companies: string[];
}

export interface PunchInAPI {
  // state & control
  getState(): Promise<PunchInState>;
  start(project: string): Promise<void>;
  stop(): Promise<void>;
  setProjectList(projects: ProjectRow[]): Promise<void>;
  setCompanyList(companies: string[]): Promise<void>;
  getCompanyList(): Promise<CompanyModel[]>

  // reporting
  getSessions(): Promise<SessionRow[]>;

  // events
  onTick(cb: () => void): () => void;
  onSessionsUpdated(cb: () => void): () => void;
}