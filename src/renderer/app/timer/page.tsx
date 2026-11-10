'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { fmtWallClock, msToHMS } from '@/lib/time';
import { validateTaskName, TASK_NAME_MAX_LEN } from '@/lib/validation';
import type { TaskModel } from '../../../main/services/task';
import type { ProjectModel } from '../../../main/services/project';
import { NotifyBox } from '@/components/Notify';

type ProjectNames = {
  [key: number]: string;
}

// Constants for timer auto-stop
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

// Fallback task ID for stop operation when currentTask is missing
// Using -1 as a sentinel value that passes validation (!task?.id check)
const FALLBACK_TASK_ID = -1;

// localStorage keys for persisting timer selection across navigation
const LS_TASK_ID = 'timer-selectedTaskId';
const LS_PROJECT_ID = 'timer-selectedProjectId';
const LS_TASK_NAME = 'timer-taskName';
const LS_NEW_TASK = 'timer-newTask';

type SavedTimerSelection = {
  selectedTaskId: number | '';
  selectedProjectId: number | '';
  taskName: string;
  newTask: boolean;
};

function saveTimerSelection(
  taskId: number | '',
  projectId: number | '',
  taskName: string,
  newTask: boolean,
): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_TASK_ID, String(taskId));
  localStorage.setItem(LS_PROJECT_ID, String(projectId));
  localStorage.setItem(LS_TASK_NAME, taskName);
  localStorage.setItem(LS_NEW_TASK, String(newTask));
}

function loadTimerSelection(): SavedTimerSelection | null {
  if (typeof window === 'undefined') return null;
  const taskIdRaw = localStorage.getItem(LS_TASK_ID);
  const projectIdRaw = localStorage.getItem(LS_PROJECT_ID);
  if (taskIdRaw === null && projectIdRaw === null) return null;
  return {
    selectedTaskId: taskIdRaw && taskIdRaw !== '' ? Number(taskIdRaw) : '',
    selectedProjectId: projectIdRaw && projectIdRaw !== '' ? Number(projectIdRaw) : '',
    taskName: localStorage.getItem(LS_TASK_NAME) ?? '',
    newTask: localStorage.getItem(LS_NEW_TASK) === 'true',
  };
}

type RestoredSelection = {
  selectedTaskId: number | '';
  selectedProjectId: number | '';
  taskName: string;
  newTask: boolean;
  currentTask: TaskModel | null;
};

/**
 * Compute the UI state to restore from a saved localStorage selection.
 * Validates task and project IDs against the currently loaded lists so stale
 * or deleted IDs gracefully fall back to an empty selection.
 */
function computeRestoredSelection(
  saved: SavedTimerSelection,
  tasks: TaskModel[],
  projects: ProjectModel[],
): RestoredSelection {
  const taskExists =
    saved.selectedTaskId !== '' &&
    tasks.some((task) => task.id === saved.selectedTaskId);
  const projectExists =
    saved.selectedProjectId !== '' &&
    projects.some((proj) => proj.id === saved.selectedProjectId);

  if (taskExists && !saved.newTask) {
    const restoredTask = tasks.find((task) => task.id === saved.selectedTaskId) as TaskModel;
    return {
      selectedTaskId: restoredTask.id!,
      selectedProjectId: restoredTask.project_id ?? '',
      taskName: '',
      newTask: false,
      currentTask: restoredTask,
    };
  }

  if (saved.newTask || saved.taskName !== '') {
    return {
      selectedTaskId: '',
      selectedProjectId: projectExists ? saved.selectedProjectId : '',
      taskName: saved.taskName,
      newTask: true,
      currentTask: projectExists
        ? ({ name: saved.taskName, project_id: saved.selectedProjectId as number } as TaskModel)
        : ({ name: saved.taskName } as TaskModel),
    };
  }

  return { selectedTaskId: '', selectedProjectId: '', taskName: '', newTask: false, currentTask: null };
}

export default function TimerPage() {
  const [tasks, setTasks] = useState<TaskModel[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | ''>('');
  const [newTask, toggleNewTask] = useState<boolean>(tasks.length === 0);
  const [taskName, setTaskName] = useState<string>('');
  const [taskNameError, setTaskNameError] = useState<string | null>(null);
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
  // Tracks whether the initial async load has completed so the persistence
  // effect does not overwrite localStorage before the restore has run.
  const initialLoadDone = useRef(false);

  /**
   * Apply a computed restoration result to component state.
   * Defined inside the component so it can close over the state setters.
   */
  const applyRestoredSelection = (saved: SavedTimerSelection | null, tasks: TaskModel[], projects: ProjectModel[]) => {
    if (!saved) {
      setSelectedTaskId('');
      setSelectedProjectId('');
      return;
    }
    const restored = computeRestoredSelection(saved, tasks, projects);
    setSelectedTaskId(restored.selectedTaskId);
    setSelectedProjectId(restored.selectedProjectId);
    setTaskName(restored.taskName);
    toggleNewTask(restored.newTask);
    if (restored.currentTask) setCurrentTask(restored.currentTask);
  };

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
        // Deduplicate by task ID to guard against any duplicate entries from
        // previous sessions before this bug was fixed.
        const seen = new Set<number>();
        const deduped = (t as TaskModel[]).filter((task: TaskModel) => {
          if (task.id === undefined || seen.has(task.id)) return false;
          seen.add(task.id);
          return true;
        });
        setTasks(deduped);
        
        p.forEach((p: ProjectModel) => {
          if (p.id && projectNames.current) projectNames.current[p.id] = p.name;
        })

        // Restore timer state if a session is running; fall back to localStorage
        if (typeof window !== 'undefined' && window.tp?.getState) {
          const state = await window.tp.getState();
          // Restore running timer regardless of whether task details are available
          if (state.running && state.startTs) {
            setIsRunning(true);
            setStartTs(state.startTs);
            if (state.currentTask?.id) {
              setCurrentTask(state.currentTask);
              setSelectedTaskId(state.currentTask.id);
              toggleNewTask(false);
              if (state.currentTask.project_id) {
                setSelectedProjectId(state.currentTask.project_id);
              }
            }
          } else {
            // No active timer – restore last-used project/task from localStorage
            applyRestoredSelection(loadTimerSelection(), t, p);
          }
        } else {
          // No IPC available – restore from localStorage when possible
          applyRestoredSelection(loadTimerSelection(), t, p);
        }
        initialLoadDone.current = true;

      } catch (e) {
        console.info("Error loading tasks and projects:", e)
        initialLoadDone.current = true;
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

  // Persist selection to localStorage so it survives navigation.
  // Guard with initialLoadDone so the first empty-state render does not
  // overwrite a previously saved selection before restoration has run.
  useEffect(() => {
    if (!initialLoadDone.current) return;
    saveTimerSelection(selectedTaskId, selectedProjectId, taskName, newTask);
  }, [selectedTaskId, selectedProjectId, taskName, newTask]);

  /**
   * Performs the actual stop operation for the timer.
   * Updates UI state only after successful stop, or when no sessions exist.
   *
   * @param showError - Whether to show error notifications to the user (default: true)
   * @returns Promise<boolean> - true if stop succeeded or no sessions existed, false on error
   */
  const performStop = useCallback(async (showError: boolean = true): Promise<boolean> => {
    try {
      if (typeof window !== 'undefined' && window.tp?.stop) {
        // The handler requires a TaskModel with an id, even though stop() closes ALL open sessions
        // When timer is running, currentTask.current should have a valid ID set by onStart
        // Use currentTask.current if it exists and has an ID
        if (!currentTask.current || !currentTask.current.id) {
          if (process.env.NODE_ENV === 'development') {
            console.error("Cannot stop timer: currentTask.current is missing or has no ID", currentTask.current);
          }
          // Still attempt to stop with a fallback task ID (handler requires it, but service doesn't use it)
          const fallbackTask = { id: FALLBACK_TASK_ID, name: '', project_id: -1 } as TaskModel;
          const stopped: boolean = await window.tp.stop(fallbackTask);
          if (stopped) {
            setIsRunning(false);
            setStartTs(null);
            setElapsedTs(0);
          }
          return stopped;
        }
        
        const stopped: boolean = await window.tp.stop(currentTask.current);
        
        if (stopped) {
          // Only update UI state after successful stop
          setIsRunning(false);
          setStartTs(null);
          setElapsedTs(0);
          return true;
        } else {
          // Stop returned false - no open sessions to close
          // This might mean the timer was already stopped, so update UI anyway
          console.info("Stop returned false - no open sessions found, updating UI state");
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
      const nameErr = validateTaskName(taskName);
      if (nameErr) {
        setTaskNameError(nameErr);
        return;
      }
      if (!selectedProjectId) {
        console.error("Could not start: missing project");
        return;
      }
      
      // Update currentTask with selected project and task name.
      // Do not forward the previous task id: the service-layer dedup guard in
      // TaskService.set already reuses an existing task when name+project_id
      // match, so forwarding the id here would cause sessions to be logged
      // against the wrong task when the user changes the name or project.
      setCurrentTask({
        name: taskName.trim(),
        project_id: selectedProjectId
      } as TaskModel);
    } else {
      // For existing tasks, validate currentTask
      if (!currentTask.current || !currentTask.current?.project_id) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Could not start undefined task:", JSON.stringify(currentTask.current));
        }
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
      // Switching to existing task: clear any task name validation error
      setTaskNameError(null);
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
    // Block start when there is a task name validation error
    if (taskNameError) {
      return false;
    }

    // is this a new task?
    if (newTask && taskName.trim() && currentTask.current?.project_id && currentTask.current?.project_id > -1) {
      return true;
    }

    // are we adding a session to an existing task?
    if (currentTask.current?.id && tasks.length > 0) {
      return true;
    }

    return false;
  }, [taskNameError, taskName, newTask, currentTask.current?.project_id, currentTask.current?.id, tasks.length]);

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
                  <div style={{ flex: 2, minWidth: 100, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <input
                      type="text"
                      placeholder={'enter task name'}
                      value={taskName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTaskName(val);
                        setTaskNameError(val.trim() ? validateTaskName(val) : null);
                      }}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                      disabled={!newTask}
                      aria-describedby={taskNameError ? 'task-name-error' : 'task-name-counter'}
                      aria-invalid={!!taskNameError}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75em' }}>
                      {taskNameError
                        ? <span id="task-name-error" role="alert" style={{ color: 'var(--color-danger, #c0392b)' }}>{taskNameError}</span>
                        : <span />
                      }
                      <span
                        id="task-name-counter"
                        style={{ marginLeft: 'auto', color: taskName.length > TASK_NAME_MAX_LEN ? 'var(--color-danger, #c0392b)' : 'inherit' }}
                        aria-live="polite"
                        aria-label={`${taskName.length} of ${TASK_NAME_MAX_LEN} characters used`}
                      >
                        {taskName.length}/{TASK_NAME_MAX_LEN}
                      </span>
                    </div>
                  </div>
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
