'use client';

import Sidebar from '@/components/Sidebar';
import { useEffect, useMemo, useState } from 'react';
import { fmtWallClock, msToHMS } from '@/lib/time';

export default function TimerPage() {
  const [state, setState] = useState<TimePunchState>({
    running: false,
    currentProject: '',
    startTs: null,
    projects: [],
    companies: []
  });

  const [nowTs, setNowTs] = useState<number>(Date.now());

  // Initial load + event hooks
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const s = await window.tp.getState();
      if (mounted) setState(s);
    };
    load();

    const onTick = async () => {
      setNowTs(Date.now());
      const s = await window.tp.getState();
      setState(s);
    };

    const onSessionsUpdated = async () => {
      const s = await window.tp.getState();
      setState(s);
    };

    window.tp.onTick(onTick);
    window.tp.onSessionsUpdated(onSessionsUpdated);

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
      setState(await window.tp.getState());
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
    const proj = state.currentProject || state.projects[0] || '';
    if (!proj) return;
    await window.tp.start(proj);
    const s = await window.tp.getState();
    setState(s);
  };

  const onStop = async () => {
    await window.tp.stop();
    const s = await window.tp.getState();
    setState(s);
  };

  const onProjectChange = async (v: string) => {
    // keep in state only; backend reads `start(project)` arg
    setState(prev => ({ ...prev, currentProject: v }));
  };

  return (
    <Sidebar>
      <div className="header">
        <h1 className="title">Timer</h1>
        <div>{fmtWallClock(nowTs)}</div>
      </div>

      <div className="content">
        <label>Project</label>
        <select
          value={state.currentProject || ''}
          onChange={(e) => onProjectChange(e.target.value)}
        >
          <option value="" disabled>Select a project</option>
          {state.projects.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <div className="row">
          <button onClick={onStart} disabled={!state.currentProject && state.projects.length === 0}>Start</button>
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
