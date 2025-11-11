import type { ServiceManager } from "../services/manager";
import type { IpcMainInvokeEvent } from 'electron';
import { TaskModel } from "../services/task";

// Lazy import to avoid issues in test environment
function invalidateTrayCache() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { invalidateTrayCache: invalidate } = require("../tray");
    invalidate();
  } catch {
    // Ignore if tray module is not available (e.g., in tests)
  }
}

export const sessionHandler = (services: ServiceManager) => {
  const svc = services.session();
  const taskSvc = services.task();

  return {
    start:  (_e: IpcMainInvokeEvent, task: TaskModel): number => {
      if (!task) {
        throw new Error("Missing task.")
      }

      if (!svc) {
        throw new Error("Session service not initialized.")
      }

      if (!taskSvc) {
        throw new Error("Task service not initialized.")
      }

      let task_id: number | undefined
      if (!task.id || task.id < 0) {
        const t: boolean = !!taskSvc?.set([task]);
        task_id = taskSvc?.getLastTaskId();
        if (!t || !task_id) {
          throw new Error("Could not create task.")
        }
      } else {
        task_id = task.id;
      }

      if (!svc.start(task_id)) {
        throw new Error(`Could not start task: ${task_id}`)
      }
    
      // Invalidate tray cache so it updates immediately
      invalidateTrayCache();

      return task_id;
    },
    stop: (_e: IpcMainInvokeEvent, task: TaskModel): boolean => {
      if (!task || !task?.id) {
        throw new Error("Missing task id.")
      }

      if (!svc) {
        throw new Error("Session service not initialized.")
      }

      const result = svc.stop();
      
      // Invalidate tray cache so it updates immediately
      invalidateTrayCache();

      return result;
    },
    get: () => {
      const rows = services.session()?.get();

      const now = Date.now();

      console.log(rows, now, "TO BE IMPLEMENTED");

      return [];
      // return rows.map(r => ({
      //   ...r,
      //   elapsedMs: (r.endTime ?? now) - r.startTime
      // }));
    }
  }
}
