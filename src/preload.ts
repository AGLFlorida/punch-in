import { contextBridge, ipcRenderer } from 'electron';
import type { ProjectModel } from './main/services/project';
import type { CompanyModel } from './main/services/company';
import type { SessionRow } from './main/services/data';

contextBridge.exposeInMainWorld('tp', {
  getState: () => ipcRenderer.invoke('tp:getState'),
  start: (project: string) => ipcRenderer.invoke('tp:start', project),
  stop: () => ipcRenderer.invoke('tp:stop'),
  setProjectList: (projects: ProjectModel[]) => ipcRenderer.invoke('tp:setProjectList', projects),
  getProjectList: (): Promise<ProjectModel[]> => ipcRenderer.invoke('tp:getProjectList'),
  removeProject: (id: number) => ipcRenderer.invoke('tp:removeProject', id), 
  setCompanyList: (companies: CompanyModel[]) => ipcRenderer.invoke('tp:setCompanyList', companies),
  getCompanyList: (): Promise<CompanyModel[]> => ipcRenderer.invoke('tp:getCompanyList'),
  getSessions: () => ipcRenderer.invoke('tp:getSessions'),
  removeCompany: (id: number) => ipcRenderer.invoke('tp:removeCompany', id),

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