'use client';

import { useEffect, useState, useMemo } from 'react';
import { msToHMS } from '@/lib/time';
import { TrashIcon } from '@/components/CustomImage';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { NotifyBox } from '@/components/Notify';

/**
 * Session detail model for the Sessions page UI.
 * This is a flattened view of session data with company/project/task names included.
 * Note: This differs from SessionModel in services which uses nested task objects.
 */
type SessionDetailModel = {
  id: number;
  company_name: string;
  project_name: string;
  task_name: string;
  start_time: number; // epoch milliseconds
  end_time: number | null; // epoch milliseconds
  duration_ms: number;
};

type SortColumn = 'company_name' | 'project_name' | 'task_name' | 'start_time' | 'end_time' | 'duration_ms';
type SortDirection = 'asc' | 'desc';

export default function SessionsPage() {
  const [rows, setRows] = useState<SessionDetailModel[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('start_time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; sessionId: number | null; sessionInfo: string }>({
    isOpen: false,
    sessionId: null,
    sessionInfo: '',
  });
  const [error, setError] = useState<{ title: string; body?: string } | null>(null);

  const load = async () => {
    try {
      const data = (typeof window !== 'undefined' && window.tp?.getAllSessionsWithDetails) 
        ? await window.tp.getAllSessionsWithDetails() 
        : [];
      setRows(data);
      
      // Extract unique companies for filter dropdown
      const uniqueCompanies = Array.from(new Set(data.map((r: SessionDetailModel) => r?.company_name).filter(Boolean)));
      setCompanies(uniqueCompanies as string[]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Filter and sort rows
  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows;

    // Filter by company
    if (selectedCompany) {
      filtered = filtered.filter(r => r?.company_name === selectedCompany);
    }

    // Filter by date
    if (selectedDate) {
      filtered = filtered.filter(r => {
        const startDate = new Date(r.start_time).toISOString().split('T')[0];
        return startDate === selectedDate;
      });
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal: string | number | null = a[sortColumn as keyof typeof a];
      let bVal: string | number | null = b[sortColumn as keyof typeof b];

      // Handle null/undefined
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Convert to comparable values
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [rows, selectedCompany, selectedDate, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleDeleteClick = (session: SessionDetailModel) => {
    const startDate = formatDateTime(session.start_time);
    const sessionInfo = `${session.task_name} (${startDate})`;
    setConfirmDialog({
      isOpen: true,
      sessionId: session.id,
      sessionInfo,
    });
  };

  const handleConfirmDelete = async () => {
    if (confirmDialog.sessionId === null) return;

    try {
      if (typeof window !== 'undefined' && window.tp?.removeSession) {
        const success = await window.tp.removeSession(confirmDialog.sessionId);
        if (success) {
          setConfirmDialog({ isOpen: false, sessionId: null, sessionInfo: '' });
          await load(); // Refresh the list
        } else {
          setError({
            title: "Failed to Delete Session",
            body: "The session could not be deleted. Please try again."
          });
        }
      }
    } catch (e) {
      console.error('Failed to delete session:', e);
      setError({
        title: "Failed to Delete Session",
        body: e instanceof Error ? e.message : "An error occurred while deleting the session. Please try again."
      });
    }
  };

  const handleCancelDelete = () => {
    setConfirmDialog({ isOpen: false, sessionId: null, sessionInfo: '' });
  };

  const formatDateTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    return `${dateStr} ${timeStr}`;
  };

  return (
    <>
      {error && (
        <NotifyBox 
          opts={error} 
          close={() => setError(null)} 
        />
      )}
      <ConfirmDialog
        title="Delete Session"
        message={`Are you sure you want to delete this session?\n\n${confirmDialog.sessionInfo}`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isOpen={confirmDialog.isOpen}
      />
      <div className="header">
        <h1 className="title">Sessions</h1>
        <button onClick={load}>Refresh</button>
      </div>

      <div className="content">
        {/* Filters */}
        <div className="row" style={{ marginBottom: 16, alignItems: 'center' }}>
          <label style={{ marginBottom: 0, marginRight: 8 }}>Company:</label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            style={{ width: 'auto', minWidth: 200 }}
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label style={{ marginBottom: 0, marginLeft: 16, marginRight: 8 }}>Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ width: 'auto' }}
          />
        </div>

        <table className="table">
          <thead>
            <tr>
              <th onClick={() => handleSort('company_name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Company {sortColumn === 'company_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('project_name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Project {sortColumn === 'project_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('task_name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Task {sortColumn === 'task_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('start_time')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Start Time {sortColumn === 'start_time' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('end_time')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                End Time {sortColumn === 'end_time' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('duration_ms')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Duration {sortColumn === 'duration_ms' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ width: 50 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRows.map((r: SessionDetailModel) => (
              <tr key={r.id}>
                <td>{r?.company_name}</td>
                <td>{r?.project_name}</td>
                <td>{r?.task_name}</td>
                <td>{formatDateTime(r.start_time)}</td>
                <td>{r.end_time ? formatDateTime(r.end_time) : '—'}</td>
                <td>{msToHMS(r.duration_ms)}</td>
                <td>
                  <button
                    onClick={() => handleDeleteClick(r)}
                    aria-label="Delete session"
                    title="Delete session"
                    style={{ padding: 8, background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}
            {filteredAndSortedRows.length === 0 && (
              <tr>
                <td colSpan={7}>No sessions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

