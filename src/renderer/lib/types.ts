export type Session = { project: string; start: number; end: number };

export type State = {
  sessions: Session[];
  isRunning: boolean;
  currentProject: string | null;
  currentStart: number | null;
};

export type TimerCallback = () => void;