import { ServiceManager } from "../services/manager";
import { TaskModel } from "../services/task";
import { PunchInState } from "./types";

export const stateHandler = (services: ServiceManager) => {
  return {
    getState: async (): Promise<PunchInState> => {
      const open = services.session()?.getOne();
      return {
        running: !!open,
        startTs: null, //open?.startTime ?? null,
        currentTask: {} as TaskModel
      }
    },
    setState: () => { console.log("TO BE IMPLEMENTED") }
  }
}