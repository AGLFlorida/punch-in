'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { fmtWallClock, msToHMS } from '@/lib/time';
import { TaskModel } from 'src/main/services/task';
import { ProjectModel } from 'src/main/services/project';

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

  // Separate effect for elapsed time when running
  useEffect(() => {
    if (isRunning && startTs !== null) {
      // Clean up any existing interval
      if (elapsedInterval.current) {
        clearInterval(elapsedInterval.current);
      }

      // Update elapsed time every second
      elapsedInterval.current = setInterval(() => {
        setElapsedTs(Date.now() - startTs);
      }, 1000);

      // Initial update
      setElapsedTs(Date.now() - startTs);
    } else {
      if (elapsedInterval.current) {
        clearInterval(elapsedInterval.current);
        elapsedInterval.current = null;
      }
      if (!isRunning) {
        setElapsedTs(0);
      }
    }

    return () => {
      if (elapsedInterval.current) {
        clearInterval(elapsedInterval.current);
        elapsedInterval.current = null;
      }
    };
  }, [isRunning, startTs]);

  const onStart = async () => {
    if (!currentTask.current || !currentTask.current?.project_id || (!taskName && newTask)) {
      console.error("Could not start undefined task:", JSON.stringify(currentTask.current));
      return;
    }

    // TODO this is a weird place to do this but it works for now.
    if (taskName?.trim() && taskName.trim() != currentTask.current?.name?.trim()) {
      console.info("Task names do not match. Syncing...")
      setCurrentTask({
        ...currentTask.current,
        name: taskName.trim()
      });
    }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const started: number = (typeof window !== 'undefined' && (window as any).tp && (window as any).tp.start) ? await (window as any).tp.start(currentTask.current) : -1;

    if (started >= 0) {
      setCurrentTask({
        ...currentTask.current,
        id: started
      });
      setStartTs(Date.now());
      setIsRunning(true);
    }
  };

  const onStop = async () => {
    setIsRunning(false);
    if (!currentTask.current || !currentTask.current?.project_id || (!taskName && newTask)) {
      console.error("Could not stop undefined task:", JSON.stringify(currentTask.current));
      return;
    }
    
     
    //const stopped: boolean = (typeof window !== 'undefined' && (window as any).tp && (window as any).tp.stop) ? await (window as any).tp.stop(currentTask.current) : false;
    //console.info(`Session ended: (${currentTask.current.id}) ${stopped}`);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== 'undefined' && (window as any).tp && (window as any).tp.stop) {
      await window.tp.stop(currentTask.current);
    }
  };

  const getTaskById = (id: number): TaskModel => {
    for(const i in tasks) {
      if (id === tasks[i].id) return tasks[i];
    }

    return {} as TaskModel;
  }

  const onTaskChange = (v: string) => {
    const task_id = Number(v); // TODO there needs to be a cleaner way to do this.

    const someTask = getTaskById(task_id);
    setCurrentTask(someTask);

    toggleNewTask(!!!v);
  };

  const onProjectSelect = (id: number) => {
    // TODO: UX fix, you can't change the project ID of a task (yet)
    if (currentTask.current?.id == undefined) {
      setCurrentTask({
        ...currentTask.current,
        name: currentTask.current?.name ?? "",
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
          <button onClick={onStart} disabled={!allowStart}>Start</button>
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
