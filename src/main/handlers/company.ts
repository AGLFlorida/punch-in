import type { ServiceManager } from "../services/manager";
import type { IpcMainInvokeEvent } from 'electron';
import type { CompanyModel } from '../services/company';


export const companyHandler = (services: ServiceManager) => {
  const svc = services.company();

  return {
    setCompanies: (_e: IpcMainInvokeEvent, companies: CompanyModel[]) => {
      if (!svc) {
        throw new Error("Company service not initialized.")
      }

      const _c = companies//svc.toCompanyModel(companies);

      if (_c.length > 0) {
        console.info("save:", _c);
        //svc.set(_c) // TODO: break the save for now.
      }
    },
    getCompanies: (): CompanyModel[] => { 
      if (!svc) {
        throw new Error("Company service not initialized.")
      }

      return svc.get() ?? [];
    }
  }
}