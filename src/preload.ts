import { contextBridge, ipcRenderer } from 'electron';
import type { ProjectModel } from './main/services/project';
import type { CompanyModel } from './main/services/company';
import type { TaskModel } from './main/services/task';
import type { SessionModel } from './main/services/session';

contextBridge.exposeInMainWorld('tp', {
  getState: () => ipcRenderer.invoke('tp:getState'),
  start: (task: TaskModel): Promise<number> => ipcRenderer.invoke('tp:start', task),
  stop: (task: TaskModel): Promise<boolean> => ipcRenderer.invoke('tp:stop', task),
  setProjectList: (projects: ProjectModel[]) => ipcRenderer.invoke('tp:setProjectList', projects),
  getProjectList: (): Promise<ProjectModel[]> => ipcRenderer.invoke('tp:getProjectList'),
  removeProject: (id: number) => ipcRenderer.invoke('tp:removeProject', id), 
  setCompanyList: (companies: CompanyModel[]) => ipcRenderer.invoke('tp:setCompanyList', companies),
  getCompanyList: (): Promise<CompanyModel[]> => ipcRenderer.invoke('tp:getCompanyList'),
  getSessions: (): Promise<SessionModel[]> => ipcRenderer.invoke('tp:getSessions'),
  removeCompany: (id: number) => ipcRenderer.invoke('tp:removeCompany', id),
  getTasks: (): Promise<TaskModel[]> => ipcRenderer.invoke('tp:getTasks'),

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


//TODO: when wifi is off, "[93246:1012/104242.984066:WARNING:net/dns/dns_config_service_posix.cc:203] Failed to read DnsConfig."