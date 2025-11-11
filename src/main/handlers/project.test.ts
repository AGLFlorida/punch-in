import { projectHandler } from './project';
import { createMockServiceManager } from '../../__tests__/helpers/mock-services';
import { ProjectService } from '../services/project';
import type { ProjectModel } from '../services/project';
import type { IpcMainInvokeEvent } from 'electron';

describe('projectHandler', () => {
  let mockServices: ReturnType<typeof createMockServiceManager>;
  let handler: ReturnType<typeof projectHandler>;
  let mockProjectService: Partial<ProjectService>;

  beforeEach(() => {
    mockProjectService = {
      get: () => [
        { id: 1, name: 'Project 1', company_id: 1 } as ProjectModel,
        { id: 2, name: 'Project 2', company_id: 1 } as ProjectModel,
      ],
      set: () => true,
      remove: () => true,
    };

    mockServices = createMockServiceManager({
      project: () => mockProjectService as ProjectService,
    });

    handler = projectHandler(mockServices);
  });

  describe('getProjects', () => {
    test('returns projects from service', () => {
      const result = handler.getProjects();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Project 1');
    });

    test('returns empty array when service returns null', () => {
      mockProjectService.get = () => null as unknown as ProjectModel[];
      const result = handler.getProjects();
      expect(result).toEqual([]);
    });

    test('throws error when project service is not initialized', () => {
      const nullServices = createMockServiceManager({
        project: () => null as unknown as ProjectService,
      });
      const nullHandler = projectHandler(nullServices);
      expect(() => nullHandler.getProjects()).toThrow('Project service not initialized.');
    });
  });

  describe('setProjects', () => {
    test('sets projects when list is not empty', async () => {
      const projects: ProjectModel[] = [
        { name: 'New Project', company_id: 1 } as ProjectModel,
      ];
      let setCalledWith: ProjectModel[] | null = null;
      mockProjectService.set = (list: ProjectModel[]) => {
        setCalledWith = list;
        return true;
      };

      await handler.setProjects({} as IpcMainInvokeEvent, projects);

      expect(setCalledWith).toEqual(projects);
    });

    test('returns false when list is empty', async () => {
      let setCalled = false;
      mockProjectService.set = () => {
        setCalled = true;
        return true;
      };

      const result = await handler.setProjects({} as IpcMainInvokeEvent, []);
      expect(result).toBe(false);
      expect(setCalled).toBe(false);
    });

    test('throws error when project service is not initialized', async () => {
      const nullServices = createMockServiceManager({
        project: () => null as unknown as ProjectService,
      });
      const nullHandler = projectHandler(nullServices);
      await expect(nullHandler.setProjects({} as IpcMainInvokeEvent, [{ name: 'Test', company_id: 1 } as ProjectModel])).rejects.toThrow('Project service not initialized.');
    });
  });

  describe('delProject', () => {
    test('removes project when id is provided', () => {
      let removeCalledWith: ProjectModel | null = null;
      mockProjectService.remove = (p: ProjectModel) => {
        removeCalledWith = p;
        return true;
      };

      const result = handler.delProject({} as IpcMainInvokeEvent, 1);
      expect(removeCalledWith).toEqual({ id: 1 } as ProjectModel);
      expect(result).toBe(true);
    });

    test('returns false when id is missing', () => {
      let removeCalled = false;
      mockProjectService.remove = () => {
        removeCalled = true;
        return true;
      };

      const result = handler.delProject({} as IpcMainInvokeEvent, 0);
      expect(result).toBe(false);
      expect(removeCalled).toBe(false);
    });

    test('returns false when service returns null', () => {
      mockProjectService.remove = () => null as unknown as boolean;
      const result = handler.delProject({} as IpcMainInvokeEvent, 1);
      expect(result).toBe(false);
    });

    test('throws error when project service is not initialized', () => {
      const nullServices = createMockServiceManager({
        project: () => null as unknown as ProjectService,
      });
      const nullHandler = projectHandler(nullServices);
      expect(() => nullHandler.delProject({} as IpcMainInvokeEvent, 1)).toThrow('Project service not initialized.');
    });
  });
});

