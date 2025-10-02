export type Session = { project: string; start: number; end: number };

export type State = {
  running: boolean;
  currentProject: string;
  startTs: number | null;
  projects: string[];
};