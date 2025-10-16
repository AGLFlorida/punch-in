"use client";

import { useEffect, useRef } from 'react';
import { CompanyModel } from 'src/main/services/company';
import { ProjectModel } from 'src/main/services/project';
import { TaskModel } from 'src/main/services/task';
import { SessionModel } from 'src/main/services/session';
import { ReportModel } from 'src/main/services/report';

// TODO this could be tied more closely to the actual functionality but this bridges us for now.

// Persistent demo data for dev:ui stub
let nextId = 1;
const companies: CompanyModel[] = [];
const projects: ProjectModel[] = [];
const tasks: TaskModel[] = [];
const sessions: SessionModel[] = [];

// Simple in-memory stub of the main process API exposed at window.tp.
// Activates only when no window.tp is present (so it won't override the
// real preload when running inside Electron).
export default function DevTPStub() {
  const tickers = useRef(new Set<() => void>());
  const sessionsUpdated = useRef(new Set<() => void>());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).tp) return; // don't override real API

    function now(): Date { 
      const dt = new Date(Date.now()); // Mimic the unix epoch to Date object conversion done by the DB insert.
      return dt; 
    }

    const stub = {
      // state-ish
      getState: async () => ({ running: false }),

      // projects / companies
      setProjectList: async (list: ProjectModel[]) => {
        projects.length = 0;
        list.forEach(p => {
          if (!p.id) p.id = ++nextId;
          projects.push({...p});
        });
        return true;
      },
      getProjectList: async (): Promise<ProjectModel[]> => projects.slice(),
      removeProject: async (id: number) => { const i = projects.findIndex(p => p.id === id); if (i>=0) projects.splice(i,1); return true },

      setCompanyList: async (list: CompanyModel[]) => {
        companies.length = 0;
        list.forEach(c => {
          if (!c.id) c.id = ++nextId;
          companies.push({...c});
        });
        return true;
      },
      getCompanyList: async (): Promise<CompanyModel[]> => companies.slice(),
      removeCompany: async (id: number) => { const i = companies.findIndex(c => c.id===id); if (i>=0) companies.splice(i,1); return true },

      // tasks & sessions
      getTasks: async (): Promise<TaskModel[]> => tasks.slice(),
      getSessions: async (): Promise<SessionModel[]> => sessions.slice(),

      // start returns a task id (matching main process contract when creating a task)
      start: async (task: TaskModel) => {
        if (!task) throw new Error('missing task');
        if (!task.id || task.id < 0) {
          const newTask = { id: ++nextId, name: task.name || 'New Task', project_id: task.project_id || -1 };
          tasks.push(newTask);
          task.id = newTask.id;
        }
        // create a session entry (not used heavily by UI but useful)
        sessions.push({ id: ++nextId, task: task, start_time: now(), end_time: undefined });
        // notify
        sessionsUpdated.current.forEach(cb => cb());
        return task.id;
      },

      stop: async (_task: TaskModel) => {
        // close latest open session
        console.log(`Closing mock task: ${JSON.stringify(_task)}`)
        const open = sessions.find(s => s.end_time == null);
        if (open) open.end_time = now();
        sessionsUpdated.current.forEach(cb => cb());
        return true;
      },

      // simple report
      getReport: async (): Promise<ReportModel[]> => {
        if (sessions.length < 1) return [];

        // Group sessions by company+project+task+day
        const aggregated: { [key: string]: ReportModel } = {};
        
        sessions.forEach(s => {
          const project = projects.find(p => p.id === s.task?.project_id);
          const company = companies.find(c => c.id === project?.company_id);
          const day = s.start_time?.toISOString().slice(0, 10) ?? '';
          const key = [
            company?.name ?? 'Unknown Company',
            project?.name ?? 'Unknown Project',
            s.task?.name ?? 'Unknown Task',
            day
          ].join('|');
          
          if (!aggregated[key]) {
            aggregated[key] = {
              company_name: company?.name ?? 'Unknown Company',
              project_name: project?.name ?? 'Unknown Project',
              task_name: s.task?.name ?? 'Unknown Task',
              day: day,
              total_seconds: 0
            };
          }

          // Add this session's duration to the aggregate
          if (s.end_time && s.start_time) {
            aggregated[key].total_seconds += Math.floor(
              (s.end_time.getTime() - s.start_time.getTime()) / 1000
            );
          }
        });

        return Object.values(aggregated);
      },

      // events
      onTick: (cb: () => void) => {
        tickers.current.add(cb);
        return () => tickers.current.delete(cb);
      },
      onSessionsUpdated: (cb: () => void) => {
        sessionsUpdated.current.add(cb);
        return () => sessionsUpdated.current.delete(cb);
      }
    };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).tp = stub;

  // Mark that the stub is active so UI can show a visual badge in dev.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  try { (window as any).__TP_STUB_ACTIVE = true; } catch (e) {
    console.error('Error initializing UI stub:', e)
  }

    // start a small tick that calls registered onTick callbacks
    const t = setInterval(() => {
      tickers.current.forEach(cb => cb());
    }, 1000);

    return () => clearInterval(t);
  }, []);

  return null;
}
