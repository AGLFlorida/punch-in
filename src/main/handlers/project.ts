import type { ServiceManager } from "../services/manager";
import type { ProjectModel }from '../services/project'
import type { IpcMainInvokeEvent } from 'electron';

export const projectHandler = (services: ServiceManager) => {
  return {
    setProjects: async (_e: IpcMainInvokeEvent, projects: ProjectModel[]) => {
      services.project()?.set(projects);
    },
    getProjects: () => { console.log("TO BE IMPLEMENTED"); }
  }
}