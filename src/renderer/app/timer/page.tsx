'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { fmtWallClock, msToHMS } from '@/lib/time';
import { TaskModel } from 'src/main/services/task';
import { ProjectModel } from 'src/main/services/project';
import { NotifyBox } from '@/components/Notify';

type ProjectNames = {
  [key: number]: string;
}

export default function TimerPage() {
  const [tasks, setTasks] = useState<TaskModel[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | ''>('');
  const [newTask, toggleNewTask] = useState<boolean>(tasks.length === 0);
  const [taskName, setTaskName] = useState<string>('');
  const [projects, setProjects] = useState<ProjectModel[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [startTs, setStartTs] = useState<number | null>(null);
  const elapsedInterval = useRef<NodeJS.Timeout | null>(null);
  const [elapsedTs, setElapsedTs] = useState<number>(0);
  const [wallClock, setWallClock] = useState<string>('');
  const [error, setError] = useState<{ title: string; body?: string } | null>(null);
  const lastAutoStopCheck = useRef<number>(0);
  
  const projectNames = useRef<ProjectNames>({});
  const currentTask = useRef<TaskModel>(null);
  const setCurrentTask = (t: TaskModel) => {
    currentTask.current = t;
  }

  // const getProjectName = (id: number): string => {
  //   const proj: ProjectModel[] = projects.filter((p: ProjectModel) => p.id === id);
  //   console.log("called get project name.")
  //   return proj[0].name;
  // }

  // TODO: what about timezones? Do I need to change the DB datatype? Do I care?

  // Initial load + event hooks
  useEffect(() => {
    const load = async () => {

      try {
        // Guard against missing preload (window.tp) when running renderer standalone
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = (typeof window !== 'undefined' && (window as any).tp && (window as any).tp.getTasks) ? await (window as any).tp.getTasks() : [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = (typeof window !== 'undefined' && (window as any).tp && (window as any).tp.getProjectList) ? await (window as any).tp.getProjectList() : [];
  setProjects(p);
  setTasks(t);
        
        p.forEach((p: ProjectModel) => {
          if (p.id && projectNames.current) projectNames.current[p.id] = p.name;
        })

        // Restore timer state if a session is running
        if (typeof window !== 'undefined' && window.tp?.getState) {
          const state = await window.tp.getState();
          if (state.running && state.startTs && state.currentTask?.id) {
            setIsRunning(true);
            setStartTs(state.startTs);
            setCurrentTask(state.currentTask);
            setSelectedTaskId(state.currentTask.id);
            if (state.currentTask.project_id) {
              setSelectedProjectId(state.currentTask.project_id);
            }
          } else {
            // Do not preselect any option after loading; leave selects empty
            setSelectedTaskId('');
            setSelectedProjectId('');
          }
        } else {
          // Do not preselect any option after loading; leave selects empty
          setSelectedTaskId('');
          setSelectedProjectId('');
        }
       
      } catch (e) {
        console.info("Error loading tasks and projects:", e)
      }
    };
    load();

    // Initialize and update wall clock
    const updateWallClock = () => {
      const now = new Date();
      // Show date and time but omit seconds
      const formatted = fmtWallClock(now.getTime()).replace(/:\d\d$/, '');
      setWallClock(formatted);
    };

    // Initial update
    updateWallClock();

    // Update wall clock every minute
    const wallClockInterval = setInterval(updateWallClock, 60000);

    return () => {
      clearInterval(wallClockInterval);
    };
  }, []);

  // Internal function to perform the actual stop operation
  // Memoized with useCallback to avoid stale closures in useEffect
  const performStop = useCallback(async (showError: boolean = true): Promise<boolean> => {
    try {
      if (typeof window !== 'undefined' && window.tp?.stop) {
        // Note: stop() closes ALL open sessions, so we don't need currentTask.current
        // Pass an empty task object since the handler requires a TaskModel but doesn't use it
        const stopped: boolean = await window.tp.stop({} as TaskModel);
        
        if (stopped) {
          // Only update UI state after successful stop
          setIsRunning(false);
          setStartTs(null);
          setElapsedTs(0);
          return true;
        } else {
          // Stop returned false - no open sessions to close
          // This might mean the timer was already stopped, so update UI anyway
          setIsRunning(false);
          setStartTs(null);
          setElapsedTs(0);
          return true;
        }
      } else {
        // No IPC available - can't actually stop, but update UI optimistically
        setIsRunning(false);
        setStartTs(null);
        setElapsedTs(0);
        return true;
      }
    } catch (e) {
      // Stop failed - keep timer running and show error
      console.error("Failed to stop timer:", e);
      if (showError) {
        setError({
          title: "Failed to Stop Timer",
          body: e instanceof Error ? e.message : "An error occurred while stopping the timer. Please try again."
        });
      }
      // Don't update isRunning - keep it as true since stop failed
      return false;
    }
  }, []); // Empty deps - only uses stable state setters

  // Separate effect for elapsed time when running
  useEffect(() => {
    if (isRunning && startTs !== null) {
      // Clean up any existing interval
      if (elapsedInterval.current) {
        clearInterval(elapsedInterval.current);
      }

      // Update elapsed time every second
      elapsedInterval.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTs;
        setElapsedTs(elapsed);

        // Check for 24-hour auto-stop (check every minute to avoid excessive checks)
        const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
        const ONE_MINUTE_MS = 60 * 1000;
        const timeSinceLastCheck = now - lastAutoStopCheck.current;
        
        if (elapsed >= TWENTY_FOUR_HOURS_MS && timeSinceLastCheck >= ONE_MINUTE_MS) {
          lastAutoStopCheck.current = now;
          // Auto-stop timer that's been running for 24+ hours
          // Don't show error notification for auto-stop (silent failure is acceptable)
          console.warn("Timer has been running for 24+ hours, auto-stopping");
          performStop(false).catch(err => {
            console.error("Failed to auto-stop timer:", err);
          });
        }
      }, 1000);

      // Initial update
      const initialElapsed = Date.now() - startTs;
      setElapsedTs(initialElapsed);
      lastAutoStopCheck.current = Date.now();

      // Check immediately if already past 24 hours
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      if (initialElapsed >= TWENTY_FOUR_HOURS_MS) {
        console.warn("Timer has been running for 24+ hours, auto-stopping");
        // Don't show error notification for auto-stop (silent failure is acceptable)
        performStop(false).catch(err => {
          console.error("Failed to auto-stop timer:", err);
        });
      }
    } else {
      if (elapsedInterval.current) {
        clearInterval(elapsedInterval.current);
        elapsedInterval.current = null;
      }
      if (!isRunning) {
        setElapsedTs(0);
        lastAutoStopCheck.current = 0;
      }
    }

    return () => {
      if (elapsedInterval.current) {
        clearInterval(elapsedInterval.current);
        elapsedInterval.current = null;
      }
    };
  }, [isRunning, startTs, performStop]);

  const onStart = async () => {
    // For new tasks, ensure we use the selected project and task name
    if (newTask) {
      if (!selectedProjectId || !taskName?.trim()) {
        console.error("Could not start: missing project or task name");
        return;
      }
      
      // Update currentTask with selected project and task name
      setCurrentTask({
        name: taskName.trim(),
        project_id: selectedProjectId
      } as TaskModel);
    } else {
      // For existing tasks, validate currentTask
      if (!currentTask.current || !currentTask.current?.project_id) {
        console.error("Could not start undefined task:", JSON.stringify(currentTask.current));
        return;
      }
    }

    // Ensure currentTask has the latest task name if it was edited
    if (taskName?.trim() && taskName.trim() != currentTask.current?.name?.trim()) {
      console.info("Task names do not match. Syncing...")
      setCurrentTask({
        ...currentTask.current,
        name: taskName.trim()
      });
    }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const started: number = (typeof window !== 'undefined' && (window as any).tp && (window as any).tp.start) ? await (window as any).tp.start(currentTask.current) : -1;

    if (started >= 0 && currentTask.current) {
      setCurrentTask({
        ...currentTask.current,
        id: started,
        name: currentTask.current.name ?? taskName ?? ''
      });
      setStartTs(Date.now());
      setIsRunning(true);
    }
  };

  const onStop = async () => {
    await performStop(true);
  };

  const getTaskById = (id: number): TaskModel => {
    for(const i in tasks) {
      if (id === tasks[i].id) return tasks[i];
    }

    return {} as TaskModel;
  }

  const onTaskChange = (v: string) => {
    const task_id = Number(v); // TODO there needs to be a cleaner way to do this.

    const isNewTask = !!!v;
    
    if (isNewTask) {
      // Switching to new task mode: reset currentTask and keep selectedProjectId
      // (user can change it via project selector)
      setCurrentTask({
        name: taskName,
        project_id: selectedProjectId || undefined
      } as TaskModel);
      toggleNewTask(true);
    } else {
      // Selecting an existing task: load the task and update selectedProjectId to match
      const someTask = getTaskById(task_id);
      setCurrentTask(someTask);
      if (someTask?.project_id) {
        setSelectedProjectId(someTask.project_id);
      }
      toggleNewTask(false);
    }
  };

  const onProjectSelect = (id: number) => {
    // Always allow updating project_id when creating a new task
    // (when newTask is true or when there's no existing task id)
    if (newTask || !currentTask.current?.id) {
      setCurrentTask({
        ...currentTask.current,
        name: currentTask.current?.name ?? taskName ?? "",
        project_id: id
      });
    }
  }

  const allowStart = useMemo((): boolean => {
    // is this a new task?
    if (newTask && currentTask.current?.project_id && currentTask.current?.project_id > -1) {
      return true;
    }

    // are we adding a session to an existing task?
    if (currentTask.current?.id && tasks.length > 0) {
      return true;
    }

    return false;
  }, [newTask, currentTask.current?.project_id, currentTask.current?.id, tasks.length]);

  // useEffect(() => {
  //   console.log("current task:", JSON.stringify(currentTask));
  // }, [currentTask])

  // const isSelected = useMemo((): boolean => {
  //   //t.id === currentTask.current?.id
  //   //console.log(JSON.stringify(currentTask));
  //   return false;
  // }, [currentTask.current]) // TODO not sure this is needed.

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      {error && (
        <NotifyBox 
          opts={error} 
          close={() => setError(null)} 
        />
      )}
      <div className="header">
        <h1 className="title">Timer</h1>
        <div style={{ padding: '10px 14px' }}>{mounted ? wallClock : null}</div>
      </div>

      <div className="content">
        <section>
          <label>Task</label>
          <div style={{ display: 'grid', gap: 8 }}>
            <div className="row" style={{ alignItems: 'center' }}>
              <select
                value={selectedTaskId}
                onChange={(e) => { setSelectedTaskId(e.target.value === '' ? '' : Number(e.target.value)); onTaskChange(e.target.value); }}
                style={{ flex: 2, minWidth: 100 }}
              >
                <option value="">Select a task</option>
                {tasks.length > 0 && tasks.map((t, idx) => (
                  <option key={t.id !== undefined ? `${t.id}-${t.name}` : `task-${idx}`} value={t.id}>({(t?.project_id ? projectNames.current[t.project_id] : "No Project") + ") " + t.name}</option>
                ))}
              </select>
              { newTask &&
                <> 
                  <div style={{ padding: 2}}>- OR -</div>
                  <input
                    type="text"
                    placeholder={"enter task name"}
                    value={taskName ?? ''}
                    onChange={(e) => setTaskName(e.target.value)}
                    style={{ flex: 2, minWidth: 100 }}
                    disabled={!newTask}
                  />
                </>
              }
            </div>
          </div>
        </section>

        { newTask && 
          <section>
            <label>Project</label>
            <select 
              value={selectedProjectId}
              onChange={(e) => { setSelectedProjectId(e.target.value === '' ? '' : Number(e.target.value)); onProjectSelect(Number(e.target.value)); }}
              disabled={!newTask}
            >
              <option value="">Select a project</option>
              {projects.length > 0 && projects.map((p, idx) => (
                <option key={p.id !== undefined ? `${p.id}-${p.name}` : `proj-${idx}`} value={p.id}>{p.name}</option>
              ))}
            </select>
          </section>}

        <div className="row">
          <button onClick={onStart} disabled={!allowStart || isRunning}>Start</button>
          <button className="danger" onClick={onStop} disabled={!isRunning}>Stop</button>
        </div>

        <div className="stats">
          <div><span className="label">Elapsed:</span> {msToHMS(elapsedTs)}</div>
          <div><span className="label">Status:</span> {isRunning ? 'Running' : 'Idle'}</div>
        </div>
      </div>
    </>
  );
}
