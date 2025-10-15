import type { ServiceManager } from "../services/manager";
import type { IpcMainInvokeEvent } from 'electron';
import { ReportModel } from "../services/report";

export const reportHandler = (services: ServiceManager) => {
  const svc = services.report();
  return {
    get: (_e: IpcMainInvokeEvent): ReportModel[] => { 
      if (!svc) {
        throw new Error("Report service not initialized.")
      }

      const rpt = svc.get();

      //console.log("DATA", rpt);

      return rpt ?? [];
    },
  }
}