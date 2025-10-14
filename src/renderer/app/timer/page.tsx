'use client';

import Sidebar from '@/components/Sidebar';
import { useEffect, useMemo, useState } from 'react';
import { fmtWallClock, msToHMS } from '@/lib/time';
import { TaskModel } from 'src/main/services/task';
import { ProjectModel } from 'src/main/services/project';

export default function TimerPage() {
  const [state, setState] = useState<PunchInState>({
    running: false,
    currentTask: {} as TaskModel,
    startTs: null
  });

  const [tasks, setTasks] = useState<TaskModel[]>([]);
  const [newTask, toggleNewTask] = useState<boolean>(tasks.length === 0);
  const [taskName, setTaskName] = useState<string>();
  const [projects, setProjects] = useState<ProjectModel[]>([]);
  const [currentTask, setCurrentTask] = useState<TaskModel>()
  const [nowTs, setNowTs] = useState<number>(Date.now());

  // Initial load + event hooks
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      //const s = await window.tp.getState();
      const t = await window.tp.getTasks();
      const p = await window.tp.getProjectList();
      if (mounted) { 
        //setState(s);
        setTasks(t);
        setProjects(p);
      }
    };
    load();

    // const onTick = async () => {
    //   setNowTs(Date.now());
    //   const s = await window.tp.getState();
    //   setState(s);
    // };

    // const onSessionsUpdated = async () => {
    //   const s = await window.tp.getState();
    //   setState(s);
    // };

    // window.tp.onTick(onTick);
    // window.tp.onSessionsUpdated(onSessionsUpdated);

    const local = setInterval(() => setNowTs(Date.now()), 1000);

    return () => {
      mounted = false;
      clearInterval(local);
    };
  }, []);

  useEffect(() => {
    const unsubscribeTick = window.tp.onTick(() => {
      setNowTs(Date.now());
    });

    const unsubscribeUpdated = window.tp.onSessionsUpdated(async () => {
      //setState(await window.tp.getState());
    });

    return () => {
      unsubscribeTick?.();
      unsubscribeUpdated?.();
    };
  }, []);

  const elapsed = useMemo(() => {
    if (state.running && state.startTs != null) {
      return nowTs - state.startTs;
    }
    return 0;
  }, [state.running, state.startTs, nowTs]);

  const onStart = async () => {
    // const proj = state.currentProject || state.projects[0] || '';
    // if (!proj) return;
    await window.tp.start("");
    // const s = await window.tp.getState();
    // setState(s);
  };

  const onStop = async () => {
    await window.tp.stop();
    // const s = await window.tp.getState();
    // setState(s);
  };

  const onTaskChange = async (v: string) => {
    toggleNewTask(!!!v);
    setState(prev => ({ ...prev, currentTaskXXXXX: v }));
  };

  const onProjectSelect = (id: number) => {
    // TODO: UX fix, you can't change the project ID of a task (yet)
    if (currentTask?.id == undefined) {
      setCurrentTask(prev => ({
        ...prev,
        name: prev?.name ?? "",
        project_id: id
      }));
    }
  }

  useEffect(() => {
    console.log("current task:", JSON.stringify(currentTask));
  }, [currentTask])

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
                value={state.currentTask?.name || ''}
                onChange={(e) => onTaskChange(e.target.value)}
                style={{ flex: 2, minWidth: 100 }}
              >
                <option value="" disabled>Select a task</option>
                {tasks.length > 0 && tasks.map(t => (
                  <option key={t.id} value={t.id}>{t?.project_id}: {t.name}</option>
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
                <option key={p.id} value={p.id} selected={(p.id == currentTask?.project_id)}>{p.name}</option>
              ))}
            </select>
          </section>}

        <div className="row">
          <button onClick={onStart} disabled={!state.currentTask?.id && tasks.length === 0}>Start</button>
          <button className="danger" onClick={onStop} disabled={!state.running}>Stop</button>
        </div>

        <div className="stats">
          <div><span className="label">Elapsed:</span> {msToHMS(elapsed)}</div>
          <div><span className="label">Now:</span> {fmtWallClock(nowTs)}</div>
          <div><span className="label">Status:</span> {state.running ? 'Running' : 'Idle'}</div>
        </div>
      </div>
    </Sidebar>
  );
}
