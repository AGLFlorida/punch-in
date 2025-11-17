import { ipcMain } from 'electron';
import { ServiceManager } from '../services/manager';

import { stateHandler } from './state';
import { projectHandler } from './project';
import { companyHandler } from './company';
import { sessionHandler } from './session';
import { taskHandler } from './task';
import { reportHandler } from './report';

const services: ServiceManager = ServiceManager.getInstance();
const sh = stateHandler(services);
const ph = projectHandler(services);
const ch = companyHandler(services);
const sessh = sessionHandler(services);
const th = taskHandler(services);
const r = reportHandler(services);

// Register handlers

// state handlers
ipcMain.handle('tp:getState', sh.getState);

// project handlers
ipcMain.handle('tp:setProjectList', ph.setProjects);
ipcMain.handle('tp:getProjectList', ph.getProjects)
ipcMain.handle('tp:removeProject', ph.delProject)

// task handlers
ipcMain.handle('tp:getTasks', th.getTasks);

// company handlers
ipcMain.handle('tp:setCompanyList', ch.setCompanies);
ipcMain.handle('tp:getCompanyList', ch.getCompanies);
ipcMain.handle('tp:removeCompany', ch.delCompany);

// work session hanlders
ipcMain.handle('tp:start', sessh.start);
ipcMain.handle('tp:stop',  sessh.stop);
ipcMain.handle('tp:getSessions', sessh.get);
ipcMain.handle('tp:getAllSessionsWithDetails', sessh.getAllWithDetails);
ipcMain.handle('tp:removeSession', sessh.removeSession);

// report handlers
ipcMain.handle('tp:getReport', r.get)
