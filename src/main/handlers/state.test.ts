import { stateHandler } from './state';
import { createMockServiceManager } from '../../__tests__/helpers/mock-services';
import { SessionService } from '../services/session';
import { TaskService } from '../services/task';
import type { TaskModel } from '../services/task';

describe('stateHandler', () => {
  let mockServices: ReturnType<typeof createMockServiceManager>;
  let handler: ReturnType<typeof stateHandler>;

  beforeEach(() => {
    mockServices = createMockServiceManager();
    handler = stateHandler(mockServices);
  });

  describe('getState', () => {
    test('returns state with running false when no open session', async () => {
      mockServices.session = () => ({
        getOneRow: () => null,
      } as unknown as SessionService);
      mockServices.task = () => ({
        getOne: () => ({} as TaskModel),
      } as unknown as TaskService);

      const state = await handler.getState();
      expect(state.running).toBe(false);
      expect(state.startTs).toBeNull();
      expect(state.currentTask).toEqual({});
    });

    test('returns state with running true when open session exists', async () => {
      const mockSessionRow = {
        id: 1,
        task_id: 1,
        start_time: Date.now() - 5000,
        end_time: null,
      };

      const mockTask: TaskModel = {
        id: 1,
        name: 'Test Task',
        project_id: 1,
      };

      mockServices.session = () => ({
        getOneRow: () => mockSessionRow,
      } as unknown as SessionService);
      mockServices.task = () => ({
        getOne: (id: number) => (id === 1 ? mockTask : ({} as TaskModel)),
      } as unknown as TaskService);

      const state = await handler.getState();
      expect(state.running).toBe(true);
      expect(state.startTs).toBe(mockSessionRow.start_time);
      expect(state.currentTask.id).toBe(1);
      expect(state.currentTask.name).toBe('Test Task');
    });

    test('returns empty task when no session', async () => {
      mockServices.session = () => ({
        getOneRow: () => null,
      } as unknown as SessionService);
      mockServices.task = () => ({
        getOne: () => ({} as TaskModel),
      } as unknown as TaskService);

      const state = await handler.getState();
      expect(state.currentTask).toEqual({});
    });

    test('returns empty task when task not found', async () => {
      const mockSessionRow = {
        id: 1,
        task_id: 999,
        start_time: Date.now() - 5000,
        end_time: null,
      };

      mockServices.session = () => ({
        getOneRow: () => mockSessionRow,
      } as unknown as SessionService);
      mockServices.task = () => ({
        getOne: () => ({} as TaskModel),
      } as unknown as TaskService);

      const state = await handler.getState();
      expect(state.running).toBe(true);
      expect(state.startTs).toBe(mockSessionRow.start_time);
      expect(state.currentTask).toEqual({});
    });
  });
});

