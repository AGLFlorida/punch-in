import { contextBridge, ipcRenderer } from 'electron';
import type {State } from './renderer/lib/types';

const api = {
  getState: (): Promise<State> => ipcRenderer.invoke('state:get'),
  start: (project: string): Promise<boolean> => ipcRenderer.invoke('timer:start', project),
  stop: (): Promise<boolean> => ipcRenderer.invoke('timer:stop'),
  setProjects: (projects: string[]): Promise<boolean> => ipcRenderer.invoke('projects:set', projects),
  listSessions: (): Promise<Array<{ project: string; start: number; end: number }>> => ipcRenderer.invoke('sessions:list'),
  onTick: (cb: () => void) => {
    const fn = () => cb();
    ipcRenderer.on('tp:tick', fn);
    return () => ipcRenderer.off('tp:tick', fn);
  },
  onSessionsUpdated: (cb: () => void) => {
    const fn = () => cb();
    ipcRenderer.on('tp:sessionsUpdated', fn);
    return () => ipcRenderer.off('tp:sessionsUpdated', fn);
  },
};

contextBridge.exposeInMainWorld('tp', api);
