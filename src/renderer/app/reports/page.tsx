'use client';

import Sidebar from '@/components/Sidebar';
import { useEffect, useState } from 'react';
//import { msToHMS } from '@/lib/time';
import type { ReportModel } from '../../../main/services/report';

/*

export interface ReportModel {
  Comany: string
  Project: string;
  Task: string
  TimeSpent: number;
}

*/

export default function ReportsPage() {
  const [rows, setRows] = useState<ReportModel[]>([]);

  const load = async () => {
    try {
      const data = (typeof window !== 'undefined' && (window as any).tp && (window as any).tp.getReport) ? await (window as any).tp.getReport() : [];
      setRows(data);
      //console.log(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
    //console.log("CALLED LOAD")
    //window.tp.onSessionsUpdated(load);
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
              <th>Company</th>
              <th>Project</th>
              <th>Task</th>
              <th>Date</th>
              <th>Time (HH:MM:SS)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: ReportModel, idx: number) => (
              <tr key={idx}>
                <td>{r?.company_name}</td>
                <td>{r?.project_name}</td>
                <td>{r?.task_name}</td>
                <td>{r?.day}</td>
                <td>00:00:{r?.total_seconds}</td>
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
