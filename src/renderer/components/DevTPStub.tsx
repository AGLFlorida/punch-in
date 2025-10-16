"use client";

import { useEffect, useRef } from 'react';
import { CompanyModel } from 'src/main/services/company';
import { ProjectModel } from 'src/main/services/project';
import { TaskModel } from 'src/main/services/task';
import { SessionModel } from 'src/main/services/session';

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
    if ((window as any).tp) return; // don't override real API

    function now(): Date { 
      const dt = new Date(Date.now()); // Mimic the unix epoch to Date object conversion done by the DB insert.
      return dt; 
    }

    const stub = {
      // state-ish
      getState: async () => ({ running: false }),

      // projects / companies
      setProjectList: async (list: any[]) => {
        projects.length = 0;
        list.forEach(p => {
          if (!p.id) p.id = ++nextId;
          projects.push({...p});
        });
        return true;
      },
      getProjectList: async () => projects.slice(),
      removeProject: async (id: number) => { const i = projects.findIndex(p => p.id === id); if (i>=0) projects.splice(i,1); return true },

      setCompanyList: async (list: any[]) => {
        companies.length = 0;
        list.forEach(c => {
          if (!c.id) c.id = ++nextId;
          companies.push({...c});
        });
        return true;
      },
      getCompanyList: async () => companies.slice(),
      removeCompany: async (id: number) => { const i = companies.findIndex(c => c.id===id); if (i>=0) companies.splice(i,1); return true },

      // tasks & sessions
      getTasks: async () => tasks.slice(),
      getSessions: async () => sessions.slice(),

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

      stop: async (_task: any) => {
        // close latest open session
        const open = sessions.find(s => s.end_time == null);
        if (open) open.end_time = now();
        sessionsUpdated.current.forEach(cb => cb());
        return true;
      },

      // simple report
      getReport: async () => {
        return sessions.map(s => ({ id: s.id, task: tasks.find(t=>t.id===s.task.id)?.name ?? 'task', start: s.start_time, end: s.end_time }));
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

  (window as any).tp = stub;
  // Mark that the stub is active so UI can show a visual badge in dev.
  try { (window as any).__TP_STUB_ACTIVE = true; } catch (e) { }

    // start a small tick that calls registered onTick callbacks
    const t = setInterval(() => {
      tickers.current.forEach(cb => cb());
    }, 1000);

    return () => clearInterval(t);
  }, []);

  return null;
}
