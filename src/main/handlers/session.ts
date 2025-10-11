import type { ServiceManager } from "../services/manager";
import type { IpcMainInvokeEvent } from 'electron';

export const sessionHandler = (services: ServiceManager) => {
  return {
    start:  async (_e: IpcMainInvokeEvent, project: string) => {
      if (!project) return;
      console.log("start session")
      //db.start(project);
    },
    stop: async () => {
      //db.stop();
      console.log("end session")
    },
    get: async () => {
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
