import { reportHandler } from './report';
import { createMockServiceManager } from '../../__tests__/helpers/mock-services';
import { ReportService } from '../services/report';
import type { ReportModel } from '../services/report';

describe('reportHandler', () => {
  let mockServices: ReturnType<typeof createMockServiceManager>;
  let handler: ReturnType<typeof reportHandler>;
  let mockReportService: Partial<ReportService>;

  beforeEach(() => {
    mockReportService = {
      get: () => [
        {
          company_name: 'Company 1',
          project_name: 'Project 1',
          task_name: 'Task 1',
          day: '2024-01-15',
          total_seconds: 3600,
        } as ReportModel,
      ],
    };

    mockServices = createMockServiceManager({
      report: () => mockReportService as ReportService,
    });

    handler = reportHandler(mockServices);
  });

  describe('get', () => {
    test('returns reports from service', () => {
      const result = handler.get();
      expect(result).toHaveLength(1);
      expect(result[0].company_name).toBe('Company 1');
      expect(result[0].total_seconds).toBe(3600);
    });

    test('returns empty array when service returns null', () => {
      mockReportService.get = () => null as unknown as ReportModel[];
      const result = handler.get();
      expect(result).toEqual([]);
    });

    test('throws error when report service is not initialized', () => {
      const nullServices = createMockServiceManager({
        report: () => null as unknown as ReportService,
      });
      const nullHandler = reportHandler(nullServices);
      expect(() => nullHandler.get()).toThrow('Report service not initialized.');
    });
  });
});

