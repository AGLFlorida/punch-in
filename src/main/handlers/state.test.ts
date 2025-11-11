import { stateHandler } from './state';
import { createMockServiceManager } from '../../__tests__/helpers/mock-services';
import { SessionService } from '../services/session';
import type { SessionModel } from '../services/session';

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
        getOne: () => null,
      } as unknown as SessionService);

      const state = await handler.getState();
      expect(state.running).toBe(false);
      expect(state.startTs).toBeNull();
    });

    test('returns state with running true when open session exists', async () => {
      const mockSession = {
        id: 1,
        task_id: 1,
        start_time: new Date(Date.now() - 5000),
      };

      mockServices.session = () => ({
        getOne: () => mockSession as unknown as SessionModel,
      } as unknown as SessionService);

      const state = await handler.getState();
      expect(state.running).toBe(true);
    });

    test('returns empty task when no session', async () => {
      mockServices.session = () => ({
        getOne: () => null,
      } as unknown as SessionService);

      const state = await handler.getState();
      expect(state.currentTask).toEqual({});
    });
  });
});

