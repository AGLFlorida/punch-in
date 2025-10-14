import type { ServiceManager } from "../services/manager";
import type { IpcMainInvokeEvent } from 'electron';
import { TaskModel } from "../services/task";

export const sessionHandler = (services: ServiceManager) => {
  const svc = services.session();
  const taskSvc = services.task();

  return {
    start:  (_e: IpcMainInvokeEvent, task: TaskModel): number => {
      if (!!!task) {
        throw new Error("Missing task.")
      }

      if (!!!svc) {
        throw new Error("Session service not initialized.")
      }

      const t: boolean = !!taskSvc?.set([task]);
      const task_id: number | undefined = taskSvc?.getLastTaskId();
      if (!!!t || !!!task_id) {
        throw new Error("Could not create task.")
      }

      if (!!!svc.start(task_id)) {
        throw new Error(`Could not start task: ${task_id}`)
      }

      return task_id;
    },
    stop: (_e: IpcMainInvokeEvent, task: TaskModel): boolean => {
      if (!!!task || !task?.id) {
        throw new Error("Missing task id.")
      }

      if (!!!svc) {
        throw new Error("Session service not initialized.")
      }

      return svc.stop();
    },
    get: () => {
      const rows = services.session()?.get();

      const now = Date.now();

      return [];
      // return rows.map(r => ({
      //   ...r,
      //   elapsedMs: (r.endTime ?? now) - r.startTime
      // }));
    }
  }
}
