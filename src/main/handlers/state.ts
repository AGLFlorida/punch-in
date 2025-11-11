import { ServiceManager } from "../services/manager";
import { TaskModel } from "../services/task";
import { PunchInState } from "./types";

/**
 * Convert start_time to epoch milliseconds
 */
function getStartTimeAsMs(startTime: number | Date): number {
  return typeof startTime === 'number' ? startTime : new Date(startTime).getTime();
}

export const stateHandler = (services: ServiceManager) => {
  return {
    getState: async (): Promise<PunchInState> => {
      const sessionSvc = services.session();
      const taskSvc = services.task();
      
      if (!sessionSvc || !taskSvc) {
        return {
          running: false,
          startTs: null,
          currentTask: {} as TaskModel
        };
      }

      const sessionRow = sessionSvc.getOneRow();
      
      if (!sessionRow) {
        return {
          running: false,
          startTs: null,
          currentTask: {} as TaskModel
        };
      }

      // Get the task details using optimized lookup
      const currentTask = taskSvc.getOne(sessionRow.task_id);

      // Convert start_time to epoch milliseconds
      const startTs = getStartTimeAsMs(sessionRow.start_time);

      return {
        running: true,
        startTs: startTs,
        currentTask: currentTask
      };
    },
    setState: () => { console.log("TO BE IMPLEMENTED") }
  }
}