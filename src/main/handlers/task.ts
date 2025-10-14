import { ServiceManager } from "../services/manager";
import { TaskModel } from "../services/task";

export const taskHandler = (services: ServiceManager) => {
  const svc = services.task();

  return {
    getTasks: (): TaskModel[] => {
      if (!svc) {
        throw new Error("Task service not initialized.")
      }

      return svc.get() ?? []
    }
  }
}