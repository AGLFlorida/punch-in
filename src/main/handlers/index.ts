import { ipcMain } from 'electron';
import { ServiceManager } from '../services/manager';

import { stateHandler } from './state';
import { projectHandler } from './project';
import { companyHandler } from './company';
import { sessionHandler } from './session';

const services: ServiceManager = ServiceManager.getInstance();
const sh = stateHandler(services);
const ph = projectHandler(services);
const ch = companyHandler(services);
const sessh = sessionHandler(services);

// Register handlers

// state handlers
ipcMain.handle('tp:getState', sh.getState);

// project handlers
ipcMain.handle('tp:setProjectList', ph.setProjects);

// company handlers
ipcMain.handle('tp:setCompanyList', ch.setCompanies);

// work session hanlders
ipcMain.handle('tp:start', sessh.start);
ipcMain.handle('tp:stop',  sessh.stop);
ipcMain.handle('tp:getSessions', sessh.get);
