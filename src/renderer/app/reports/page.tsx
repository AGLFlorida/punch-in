'use client';

import Sidebar from '@/components/Sidebar';
import { useEffect, useState } from 'react';
import { msToHMS, fmtWallClock } from '@/lib/time';
import { SessionRow } from 'src/main/services/data';

export default function ReportsPage() {
  const [rows, setRows] = useState<SessionRow[]>([]);

  const load = async () => {
    //const data = await window.tp.getSessions();
    const data: SessionRow[]  = [];
    setRows(data);
  };

  useEffect(() => {
    load();
    window.tp.onSessionsUpdated(load);
  }, []);

  return (
    <Sidebar>
      <div className="header">
        <h1 className="title">Reports</h1>
        <button onClick={load}>Refresh</button>
      </div>

      <div className="content">
        <table className="table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Start</th>
              <th>End</th>
              <th>Elapsed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.project}</td>
                <td>{fmtWallClock(r.start)}</td>
                <td>{r.end ? fmtWallClock(r.end) : '—'}</td>
                <td>{msToHMS(0)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4}>No sessions yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Sidebar>
  );
}
