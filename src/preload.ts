import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('tp', {
  getState: () => ipcRenderer.invoke('tp:getState'),
  start: (project: string) => ipcRenderer.invoke('tp:start', project),
  stop: () => ipcRenderer.invoke('tp:stop'),
  setProjectList: (projects: string[]) => ipcRenderer.invoke('tp:setProjectList', projects),
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
