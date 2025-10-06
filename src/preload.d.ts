export {};

declare global {
  interface TimePunchState {
    running: boolean;
    currentProject: string;
    startTs: number | null; // epoch ms
    projects: string[];
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
    setProjectList(projects: string[]): Promise<void>;

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
