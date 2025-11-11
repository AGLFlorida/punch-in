import { sessionHandler } from './session';
import { createMockServiceManager } from '../../__tests__/helpers/mock-services';
import { SessionService } from '../services/session';
import { TaskService } from '../services/task';
import type { TaskModel } from '../services/task';
import type { IpcMainInvokeEvent } from 'electron';

// Mock functions
const mockStart = () => true;
const mockStop = () => true;
const mockGet = () => [];
const mockSet = () => true;
const mockGetLastTaskId = () => 123;

describe('sessionHandler', () => {
  let mockServices: ReturnType<typeof createMockServiceManager>;
  let handler: ReturnType<typeof sessionHandler>;
  let mockSessionService: Partial<SessionService>;
  let mockTaskService: Partial<TaskService>;

  beforeEach(() => {
    mockSessionService = {
      start: mockStart,
      stop: mockStop,
      get: mockGet,
    };

    mockTaskService = {
      set: mockSet,
      getLastTaskId: mockGetLastTaskId,
    };

    mockServices = createMockServiceManager({
      session: () => mockSessionService as SessionService,
      task: () => mockTaskService as TaskService,
    });

    handler = sessionHandler(mockServices);
  });

  describe('start', () => {
    test('throws error when task is missing', () => {
      expect(() => handler.start({} as IpcMainInvokeEvent, null as unknown as TaskModel)).toThrow('Missing task.');
    });

    test('throws error when session service is not initialized', () => {
      const nullServices = createMockServiceManager({
        session: () => null as unknown as SessionService,
        task: () => mockTaskService as TaskService,
      });
      const nullHandler = sessionHandler(nullServices);
      expect(() => nullHandler.start({} as IpcMainInvokeEvent, { name: 'Test' } as TaskModel)).toThrow('Session service not initialized.');
    });

    test('throws error when task service is not initialized', () => {
      const nullServices = createMockServiceManager({
        session: () => mockSessionService as SessionService,
        task: () => null as unknown as TaskService,
      });
      const nullHandler = sessionHandler(nullServices);
      expect(() => nullHandler.start({} as IpcMainInvokeEvent, { name: 'Test' } as TaskModel)).toThrow('Task service not initialized.');
    });

    test('creates new task when task has no id', () => {
      const task: TaskModel = { name: 'New Task', project_id: 1 } as TaskModel;
      let setCalled = false;
      let startCalledWith: number | null = null;

      mockTaskService.set = () => {
        setCalled = true;
        return true;
      };
      mockSessionService.start = (id: number) => {
        startCalledWith = id;
        return true;
      };

      const result = handler.start({} as IpcMainInvokeEvent, task);

      expect(setCalled).toBe(true);
      expect(startCalledWith).toBe(123);
      expect(result).toBe(123);
    });

    test('uses existing task id when task has id', () => {
      const task: TaskModel = { id: 456, name: 'Existing Task' } as TaskModel;
      let setCalled = false;
      let startCalledWith: number | null = null;

      mockTaskService.set = () => {
        setCalled = true;
        return true;
      };
      mockSessionService.start = (id: number) => {
        startCalledWith = id;
        return true;
      };

      const result = handler.start({} as IpcMainInvokeEvent, task);

      expect(setCalled).toBe(false);
      expect(startCalledWith).toBe(456);
      expect(result).toBe(456);
    });

    test('throws error when task creation fails', () => {
      mockTaskService.set = () => false;
      const task: TaskModel = { name: 'New Task', project_id: 1 } as TaskModel;

      expect(() => handler.start({} as IpcMainInvokeEvent, task)).toThrow('Could not create task.');
    });

    test('throws error when session start fails', () => {
      mockSessionService.start = () => false;
      const task: TaskModel = { id: 456, name: 'Task' } as TaskModel;

      expect(() => handler.start({} as IpcMainInvokeEvent, task)).toThrow('Could not start task: 456');
    });
  });

  describe('stop', () => {
    test('throws error when task is missing', () => {
      expect(() => handler.stop({} as IpcMainInvokeEvent, null as unknown as TaskModel)).toThrow('Missing task id.');
    });

    test('throws error when task id is missing', () => {
      expect(() => handler.stop({} as IpcMainInvokeEvent, { name: 'Test' } as TaskModel)).toThrow('Missing task id.');
    });

    test('throws error when session service is not initialized', () => {
      const nullServices = createMockServiceManager({
        session: () => null as unknown as SessionService,
        task: () => mockTaskService as TaskService,
      });
      const nullHandler = sessionHandler(nullServices);
      expect(() => nullHandler.stop({} as IpcMainInvokeEvent, { id: 1 } as TaskModel)).toThrow('Session service not initialized.');
    });

    test('stops session successfully', () => {
      const task: TaskModel = { id: 1, name: 'Task' } as TaskModel;
      let stopCalled = false;
      mockSessionService.stop = () => {
        stopCalled = true;
        return true;
      };

      const result = handler.stop({} as IpcMainInvokeEvent, task);

      expect(stopCalled).toBe(true);
      expect(result).toBe(true);
    });
  });

  describe('get', () => {
    test('returns empty array', () => {
      const result = handler.get();
      expect(result).toEqual([]);
    });
  });
});

