import type { ServiceManager } from "../services/manager";
import type { IpcMainInvokeEvent } from 'electron';
import type { CompanyModel } from '../services/company';


export const companyHandler = (services: ServiceManager) => {
  const svc = services.company();

  return {
    setCompanies: (_e: IpcMainInvokeEvent, companies: CompanyModel[]): boolean => {
      if (!svc) {
        throw new Error("Company service not initialized.")
      }

      const _c = companies//svc.toCompanyModel(companies);

      if (_c.length > 0) {
        //console.info("save:", _c);
        return svc.set(_c)
      }

      return false;
    },
    getCompanies: (): CompanyModel[] => { 
      if (!svc) {
        throw new Error("Company service not initialized.")
      }

      return svc.get() ?? [];
    },
    delCompany: (_e: IpcMainInvokeEvent, id: number): boolean => {
      if (!svc) {
        throw new Error("Company service not initialized.")
      }

      if (!id) return false;

      return svc.remove({id: id} as CompanyModel) ?? false;
    }
  }
}