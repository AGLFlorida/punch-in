import type { ServiceManager } from "../services/manager";
import type { IpcMainInvokeEvent } from 'electron';
import type { CompanyRow } from '../services/company';

export const companyHandler = (services: ServiceManager) => {
  return {
    setCompanies: async (_e: IpcMainInvokeEvent, companies: string[]) => {
      const _c = services.company()?.toCompanyRow(companies) as CompanyRow[];
      if (_c.length > 0) {
        services.company()?.set(_c)
      }
    },
    getCompanies: () => { console.log("TO BE IMPLEMENTED"); }
  }
}