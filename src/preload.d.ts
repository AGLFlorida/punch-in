export {};

type TPApi = {
  getState(): Promise<any>;
  start(project: string): Promise<boolean>;
  stop(): Promise<boolean>;
  setProjects(projects: string[]): Promise<boolean>;
  listSessions(): Promise<Array<{ project: string; start: number; end: number }>>;
  onTick(cb: () => void): void;
  onSessionsUpdated(cb: () => void): void;
};

declare global {
  interface Window {
    tp: TPApi;
  }
}