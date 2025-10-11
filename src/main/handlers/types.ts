type TimePunchState = {
  running: boolean;
  currentProject: string;
  startTs: number | null;
  projects: string[];
};