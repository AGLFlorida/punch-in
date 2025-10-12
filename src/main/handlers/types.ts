type PunchInState = {
  running: boolean;
  currentProject: string;
  startTs: number | null;
  projects: string[];
};