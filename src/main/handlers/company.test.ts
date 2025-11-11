import { companyHandler } from './company';
import { createMockServiceManager } from '../../__tests__/helpers/mock-services';
import { CompanyService } from '../services/company';
import type { CompanyModel } from '../services/company';
import type { IpcMainInvokeEvent } from 'electron';

describe('companyHandler', () => {
  let mockServices: ReturnType<typeof createMockServiceManager>;
  let handler: ReturnType<typeof companyHandler>;
  let mockCompanyService: Partial<CompanyService>;

  beforeEach(() => {
    mockCompanyService = {
      get: () => [
        { id: 1, name: 'Company 1' } as CompanyModel,
        { id: 2, name: 'Company 2' } as CompanyModel,
      ],
      set: () => true,
      remove: () => true,
    };

    mockServices = createMockServiceManager({
      company: () => mockCompanyService as CompanyService,
    });

    handler = companyHandler(mockServices);
  });

  describe('getCompanies', () => {
    test('returns companies from service', () => {
      const result = handler.getCompanies();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Company 1');
    });

    test('returns empty array when service returns null', () => {
      mockCompanyService.get = () => null as unknown as CompanyModel[];
      const result = handler.getCompanies();
      expect(result).toEqual([]);
    });

    test('throws error when company service is not initialized', () => {
      const nullServices = createMockServiceManager({
        company: () => null as unknown as CompanyService,
      });
      const nullHandler = companyHandler(nullServices);
      expect(() => nullHandler.getCompanies()).toThrow('Company service not initialized.');
    });
  });

  describe('setCompanies', () => {
    test('sets companies when list is not empty', () => {
      const companies: CompanyModel[] = [
        { name: 'New Company' } as CompanyModel,
      ];
      let setCalledWith: CompanyModel[] | null = null;
      mockCompanyService.set = (list: CompanyModel[]) => {
        setCalledWith = list;
        return true;
      };

      const result = handler.setCompanies({} as IpcMainInvokeEvent, companies);

      expect(setCalledWith).toEqual(companies);
      expect(result).toBe(true);
    });

    test('returns false when list is empty', () => {
      let setCalled = false;
      mockCompanyService.set = () => {
        setCalled = true;
        return true;
      };

      const result = handler.setCompanies({} as IpcMainInvokeEvent, []);
      expect(result).toBe(false);
      expect(setCalled).toBe(false);
    });

    test('throws error when company service is not initialized', () => {
      const nullServices = createMockServiceManager({
        company: () => null as unknown as CompanyService,
      });
      const nullHandler = companyHandler(nullServices);
      expect(() => nullHandler.setCompanies({} as IpcMainInvokeEvent, [{ name: 'Test' } as CompanyModel])).toThrow('Company service not initialized.');
    });
  });

  describe('delCompany', () => {
    test('removes company when id is provided', () => {
      let removeCalledWith: CompanyModel | null = null;
      mockCompanyService.remove = (c: CompanyModel) => {
        removeCalledWith = c;
        return true;
      };

      const result = handler.delCompany({} as IpcMainInvokeEvent, 1);
      expect(removeCalledWith).toEqual({ id: 1 } as CompanyModel);
      expect(result).toBe(true);
    });

    test('returns false when id is missing', () => {
      let removeCalled = false;
      mockCompanyService.remove = () => {
        removeCalled = true;
        return true;
      };

      const result = handler.delCompany({} as IpcMainInvokeEvent, 0);
      expect(result).toBe(false);
      expect(removeCalled).toBe(false);
    });

    test('returns false when service returns null', () => {
      mockCompanyService.remove = () => null as unknown as boolean;
      const result = handler.delCompany({} as IpcMainInvokeEvent, 1);
      expect(result).toBe(false);
    });

    test('throws error when company service is not initialized', () => {
      const nullServices = createMockServiceManager({
        company: () => null as unknown as CompanyService,
      });
      const nullHandler = companyHandler(nullServices);
      expect(() => nullHandler.delCompany({} as IpcMainInvokeEvent, 1)).toThrow('Company service not initialized.');
    });
  });
});

