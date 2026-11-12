"use client";

import { useEffect, useRef } from 'react';
import type { CompanyModel } from '../../main/services/company';
import type { ProjectModel } from '../../main/services/project';
import type { TaskModel } from '../../main/services/task';
import type { SessionModel } from '../../main/services/session';
import type { ReportModel } from '../../main/services/report';

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
      getAllSessionsWithDetails: async () => {
        const now = Date.now();
        return sessions.map(s => {
          const project = projects.find(p => p.id === s.task?.project_id);
          const company = companies.find(c => c.id === project?.company_id);
          const sr = s as unknown as { id: number; start_time: Date; end_time: Date | null; break_ms?: number };
          const startMs = sr.start_time instanceof Date ? sr.start_time.getTime() : (sr.start_time as unknown as number);
          const endMs = sr.end_time instanceof Date ? sr.end_time.getTime() : (sr.end_time != null ? (sr.end_time as unknown as number) : null);
          const rawDuration = endMs !== null ? (endMs - startMs) : (now - startMs);
          const breakMs = sr.break_ms ?? 0;
          return {
            id: sr.id,
            company_name: company?.name ?? 'Unknown Company',
            project_name: project?.name ?? 'Unknown Project',
            task_name: s.task?.name ?? 'Unknown Task',
            start_time: startMs,
            end_time: endMs,
            duration_ms: Math.max(0, rawDuration - breakMs),
          };
        });
      },

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

      getLastClosedSession: async () => {
        const closed = sessions
          .filter(s => {
            const r = s as unknown as { end_time: Date | null };
            return r.end_time !== null && r.end_time !== undefined;
          })
          .sort((a, b) => {
            const ra = a as unknown as { id: number };
            const rb = b as unknown as { id: number };
            return rb.id - ra.id;
          });
        if (closed.length === 0) return null;
        const s = closed[0] as unknown as { id: number; task_id: number; start_time: Date; end_time: Date };
        return {
          id: s.id,
          task_id: s.task_id,
          start_time: s.start_time instanceof Date ? s.start_time.getTime() : s.start_time,
          end_time: s.end_time instanceof Date ? s.end_time.getTime() : s.end_time,
        };
      },

      addBreakTime: async (id: number, breakMs: number): Promise<boolean> => {
        const session = sessions.find(s => {
          const rowData = s as unknown as { id: number };
          return rowData.id === id;
        });
        if (!session) return false;
        const sessionRow = session as unknown as { end_time: Date | null; break_ms?: number };
        // Only update open sessions
        if (sessionRow.end_time !== null) return false;
        if (breakMs <= 0) return false;
        sessionRow.break_ms = (sessionRow.break_ms ?? 0) + breakMs;
        return true;
      },

      updateSessionEndTime: async (id: number, endTime: number): Promise<boolean> => {
        const session = sessions.find(s => {
          const rowData = s as unknown as { id: number };
          return rowData.id === id;
        });
        if (!session) return false;
        const sessionRow = session as unknown as { start_time: Date; end_time: Date | null };
        const startMs = sessionRow.start_time instanceof Date ? sessionRow.start_time.getTime() : (sessionRow.start_time as unknown as number);
        if (sessionRow.end_time === null) return false;
        if (endTime <= startMs) return false;
        if (endTime > Date.now()) return false;
        sessionRow.end_time = new Date(endTime);
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
