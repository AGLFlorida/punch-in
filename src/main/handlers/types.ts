// TODO: this is gross but it needs to be synced with <root>/preload.d.ts/PunchInState
import { TaskModel } from "../services/task";
export interface PunchInState {
  running: boolean;
  currentTask: TaskModel;
  startTs: number | null; // epoch ms
}