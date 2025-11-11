import { ServiceManager } from "../services/manager";
import { TaskModel } from "../services/task";
import { PunchInState } from "./types";

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

      const openSession = sessionSvc.getOne();
      
      if (!openSession) {
        return {
          running: false,
          startTs: null,
          currentTask: {} as TaskModel
        };
      }

      // Get task_id from the session row (it's stored as task_id in the raw row)
      const sessionRow = openSession as unknown as { task_id: number; start_time: number };
      const taskId = sessionRow.task_id;
      
      // Get the task details
      const tasks = taskSvc.get();
      const currentTask = tasks.find(t => t.id === taskId) || {} as TaskModel;

      // Convert start_time to epoch milliseconds
      const startTs = typeof sessionRow.start_time === 'number' 
        ? sessionRow.start_time 
        : new Date(sessionRow.start_time).getTime();

      return {
        running: true,
        startTs: startTs,
        currentTask: currentTask
      };
    },
    setState: () => { console.log("TO BE IMPLEMENTED") }
  }
}