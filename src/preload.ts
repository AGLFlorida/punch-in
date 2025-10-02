import { contextBridge, ipcRenderer } from 'electron';
import type {State } from './types';

const api = {
  getState: (): Promise<State> => ipcRenderer.invoke('state:get'),
  start: (project: string): Promise<boolean> => ipcRenderer.invoke('timer:start', project),
  stop: (): Promise<boolean> => ipcRenderer.invoke('timer:stop'),
  setProjects: (projects: string[]): Promise<boolean> => ipcRenderer.invoke('projects:set', projects),
  listSessions: (): Promise<Array<{ project: string; start: number; end: number }>> => ipcRenderer.invoke('sessions:list'),
  onTick: (cb: () => void) => ipcRenderer.on('tick', cb),
  onSessionsUpdated: (cb: () => void) => ipcRenderer.on('sessions:updated', cb)
};

declare global {
  interface Window { tp: typeof api; }
}

contextBridge.exposeInMainWorld('tp', api);
