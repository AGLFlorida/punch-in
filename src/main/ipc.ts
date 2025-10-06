import { ipcMain } from 'electron';
import { db } from './data';

type TimePunchState = {
  running: boolean;
  currentProject: string;
  startTs: number | null;
  projects: string[];
};

ipcMain.handle('tp:getState', async (): Promise<TimePunchState> => {
  const open = db.getOpenSession();
  return {
    running: !!open,
    currentProject: open?.project ?? '',
    startTs: open?.start ?? null,
    projects: db.getProjects()
  };
});

ipcMain.handle('tp:start', async (_e, project: string) => {
  if (!project) return;
  db.start(project);
});

ipcMain.handle('tp:stop', async () => {
  db.stop();
});

ipcMain.handle('tp:setProjectList', async (_e, projects: string[]) => {
  db.setProjects(projects);
});

ipcMain.handle('tp:getSessions', async () => {
  const rows = db.getSessions();

  const now = Date.now();
  return rows.map(r => ({
    ...r,
    elapsedMs: (r.end ?? now) - r.start
  }));
});
