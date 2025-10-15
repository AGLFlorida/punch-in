import type { ServiceManager } from "../services/manager";
import type { ProjectModel }from '../services/project'
import type { IpcMainInvokeEvent } from 'electron';

export const projectHandler = (services: ServiceManager) => {
  const svc = services.project();
  return {
    setProjects: async (_e: IpcMainInvokeEvent, projects: ProjectModel[]) => {
      if (!svc) {
        throw new Error("Project service not initialized.")
      }

      if (projects.length < 1) return false;

      //console.log('save proj:', projects);
      svc.set(projects);
    },
    getProjects: (): ProjectModel[] => { 
      if (!svc) {
        throw new Error("Project service not initialized.")
      }

      return svc.get() ?? [];
    },
    delProject: (_e: IpcMainInvokeEvent, id: number): boolean => {
      if (!svc) {
        throw new Error("Project service not initialized.")
      }

      if (!id) return false;

      return svc?.remove({id: id} as ProjectModel) ?? false;
    }
  }
}