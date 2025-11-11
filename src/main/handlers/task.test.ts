import { taskHandler } from './task';
import { createMockServiceManager } from '../../__tests__/helpers/mock-services';
import { TaskService } from '../services/task';
import type { TaskModel } from '../services/task';

describe('taskHandler', () => {
  let mockServices: ReturnType<typeof createMockServiceManager>;
  let handler: ReturnType<typeof taskHandler>;
  let mockTaskService: Partial<TaskService>;

  beforeEach(() => {
    mockTaskService = {
      get: () => [
        { id: 1, name: 'Task 1', project_id: 1 } as TaskModel,
        { id: 2, name: 'Task 2', project_id: 1 } as TaskModel,
      ],
    };

    mockServices = createMockServiceManager({
      task: () => mockTaskService as TaskService,
    });

    handler = taskHandler(mockServices);
  });

  describe('getTasks', () => {
    test('returns tasks from service', () => {
      const result = handler.getTasks();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Task 1');
      expect(result[1].name).toBe('Task 2');
    });

    test('returns empty array when service returns null', () => {
      mockTaskService.get = () => null as unknown as TaskModel[];
      const result = handler.getTasks();
      expect(result).toEqual([]);
    });

    test('throws error when task service is not initialized', () => {
      const nullServices = createMockServiceManager({
        task: () => null as unknown as TaskService,
      });
      const nullHandler = taskHandler(nullServices);
      expect(() => nullHandler.getTasks()).toThrow('Task service not initialized.');
    });
  });
});

