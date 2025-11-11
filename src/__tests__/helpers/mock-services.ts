import type { ServiceManager } from '../../main/services/manager';
import type { CompanyService } from '../../main/services/company';
import type { ProjectService } from '../../main/services/project';
import type { TaskService } from '../../main/services/task';
import type { SessionService } from '../../main/services/session';
import type { ReportService } from '../../main/services/report';

/**
 * Creates a mock ServiceManager for testing handlers
 */
export function createMockServiceManager(overrides?: Partial<ServiceManager>): ServiceManager {
  return {
    project: () => ({} as ProjectService),
    session: () => ({} as SessionService),
    company: () => ({} as CompanyService),
    task: () => ({} as TaskService),
    report: () => ({} as ReportService),
    closeDB: () => {},
    ...overrides,
  } as ServiceManager;
}

