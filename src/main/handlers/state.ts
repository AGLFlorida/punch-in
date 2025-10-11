import { ServiceManager } from "../services/manager";

export const stateHandler = (services: ServiceManager) => {
  return {
    getState: async (): Promise<TimePunchState> => {const open = services.session()?.getOne();
      return {
        running: !!open,
        currentProject: open?.task_id.toString() ?? '', // TODO: this is actually a number
        startTs: null, //open?.startTime ?? null,
        projects: [] //services.project().get()
      }
    },
    setState: () => { console.log("TO BE IMPLEMENTED") }
  }
}