'use client';

import Sidebar from '@/components/Sidebar';
import { useEffect, useState } from 'react';

export default function ConfigurePage() {
  const [projectsCsv, setProjectsCsv] = useState('');

  useEffect(() => {
    const load = async () => {
      const s = await window.tp.getState();
      setProjectsCsv(s.projects.join(', '));
    };
    load();
  }, []);

  const onSave = async () => {
    const list = projectsCsv
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    await window.tp.setProjectList(list);
  };

  return (
    <Sidebar>
      <div className="header">
        <h1 className="title">Configure</h1>
        <button onClick={onSave}>Save</button>
      </div>

      <div className="content">
        <label>Projects (comma-separated)</label>
        <textarea
          rows={6}
          value={projectsCsv}
          onChange={(e) => setProjectsCsv(e.target.value)}
          placeholder="project-a, project-b, project-c"
        />
        <p style={{ color: '#6b7280' }}>
          Changes affect the Timer project list and reporting.
        </p>
      </div>
    </Sidebar>
  );
}
