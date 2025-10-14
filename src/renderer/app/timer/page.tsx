'use client';

import Sidebar from '@/components/Sidebar';
import { useEffect, useMemo, useState, useRef } from 'react';
import { fmtWallClock, msToHMS } from '@/lib/time';
import { TaskModel } from 'src/main/services/task';
import { ProjectModel } from 'src/main/services/project';

// TODO the running timer doesn't always refresh properly, making it look like we are skipping seconds.

export default function TimerPage() {
  const [tasks, setTasks] = useState<TaskModel[]>([]);
  const [newTask, toggleNewTask] = useState<boolean>(tasks.length === 0);
  const [taskName, setTaskName] = useState<string>();
  const [projects, setProjects] = useState<ProjectModel[]>([]);
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [startTs, setStartTs] = useState<number | null>(null);

  const currentTask = useRef<TaskModel>(null);
  const setCurrentTask = (t: TaskModel) => {
    currentTask.current = t;
  }

  // TODO: what about timezones?

  // Initial load + event hooks
  useEffect(() => {
    const load = async () => {
      const t = await window.tp.getTasks();
      const p = await window.tp.getProjectList();
      setTasks(t);
      setProjects(p);
    };
    load();

    const local = setInterval(() => setNowTs(Date.now()), 1000);

    return () => {
      clearInterval(local);
    };
  }, []);

  const elapsed = useMemo(() => {
    if (isRunning && startTs != null) {
      return nowTs - startTs;
    }
    return 0;
  }, [isRunning, startTs, nowTs]);

  const onStart = async () => {
    if (!currentTask.current || !currentTask.current?.project_id || !taskName) {
      console.error("Could not start undefined task:", JSON.stringify(currentTask.current));
      return;
    }

    // TODO this is a weird place to do this but it works for now.
    if (taskName.trim() != currentTask.current?.name?.trim()) {
      console.info("Task names do not match. Syncing...")
      setCurrentTask({
        ...currentTask.current,
        name: taskName.trim()
      });
    }

    const started: number = await window.tp.start(currentTask.current);
    
    if (started >= 0) {
      setCurrentTask({
        ...currentTask.current,
        id: started
      });
      setStartTs(nowTs);
      setIsRunning(true);
    }
  };

  const onStop = async () => {
    if (!currentTask.current || !currentTask.current?.project_id || !taskName) {
      console.error("Could not start undefined task:", JSON.stringify(currentTask));
      return;
    }
    
    const stopped: boolean = await window.tp.stop(currentTask.current);

    setIsRunning(stopped);
  };

  const onTaskChange = (v: string) => {
    toggleNewTask(!!!v);
    console.log("ON TASK CHANGE:", v);
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

  return (
    <Sidebar>
      <div className="header">
        <h1 className="title">Timer</h1>
        <div>{fmtWallClock(nowTs)}</div>
      </div>

      <div className="content">
        <section>
          <label>Task</label>
          <div style={{ display: 'grid', gap: 8 }}>
            <div className="row" style={{ alignItems: 'center' }}>
              <select
                value={currentTask.current?.name || ''}
                onChange={(e) => onTaskChange(e.target.value)}
                style={{ flex: 2, minWidth: 100 }}
              >
                <option value="">Select a task</option>
                {tasks.length > 0 && tasks.map(t => (
                  <option key={t.id} value={t.id}>({t?.project_id}) {t.name}</option>
                ))}
              </select>
              <div style={{ padding: 2}}>- OR -</div>
              { newTask && 
                <input
                  type="text"
                  placeholder={"enter task name"}
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  style={{ flex: 2, minWidth: 100 }}
                  disabled={!newTask}
                />
              }
            </div>
          </div>
        </section>

        { newTask && 
          <section>
            <label>Project</label>
            <select 
              onChange={(e) => onProjectSelect(Number(e.target.value))}
              disabled={!newTask}
            >
              <option value="">Select a project</option>
              {projects.length > 0 && projects.map(p => (
                <option key={p.id} value={p.id} selected={(p.id == currentTask.current?.project_id)}>{p.name}</option>
              ))}
            </select>
          </section>}

        <div className="row">
          <button onClick={onStart} disabled={!allowStart}>Start</button>
          <button className="danger" onClick={onStop} disabled={!isRunning}>Stop</button>
        </div>

        <div className="stats">
          <div><span className="label">Elapsed:</span> {msToHMS(elapsed)}</div>
          <div><span className="label">Status:</span> {isRunning ? 'Running' : 'Idle'}</div>
        </div>
      </div>
    </Sidebar>
  );
}
