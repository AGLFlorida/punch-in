'use client';

import { useEffect, useState, useMemo } from 'react';
import { msToHMS } from '@/lib/time';
import { aggregateByWeek } from '@/lib/reports';
import type { ReportModel } from '../../../main/services/report';
import type { WeeklyReportRow } from '@/lib/reports';

type SortColumn = 'company_name' | 'project_name' | 'task_name' | 'day' | 'total_seconds';
type SortDirection = 'asc' | 'desc';

export default function ReportsPage() {
  const [rows, setRows] = useState<ReportModel[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('day');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [wtdMode, setWtdMode] = useState<boolean>(false);
  const [showDeleted, setShowDeleted] = useState<boolean>(false);

  const load = async () => {
    try {
      const data = (typeof window !== 'undefined' && window.tp?.getReport) 
        ? await window.tp.getReport(showDeleted) 
        : [];
      setRows(data);
      //console.log(data);
      
      // Extract unique companies for filter dropdown
      const uniqueCompanies = Array.from(new Set(data.map((r: ReportModel) => r?.company_name).filter(Boolean)));
      setCompanies(uniqueCompanies as string[]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
    //console.log("CALLED LOAD")
    //window.tp.onSessionsUpdated(load);
  }, [showDeleted]);

  // Filter and sort rows
  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows;

    // Filter by company
    if (selectedCompany) {
      filtered = filtered.filter(r => r?.company_name === selectedCompany);
    }

    // Filter by date — skip when WTD mode is active so no days are silently dropped
    if (selectedDate && !wtdMode) {
      filtered = filtered.filter(r => r?.day === selectedDate);
    }

    // If WTD mode, aggregate by project and week using the shared utility
    if (wtdMode) {
      filtered = aggregateByWeek(filtered);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal = a[sortColumn as keyof typeof a];
      let bVal = b[sortColumn as keyof typeof b];

      // Handle null/undefined
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Special handling for day column in WTD mode - use week_start_date for chronological sorting
      if (sortColumn === 'day' && wtdMode) {
        const aWeekStart = (a as WeeklyReportRow).week_start_date;
        const bWeekStart = (b as WeeklyReportRow).week_start_date;
        if (aWeekStart && bWeekStart) {
          aVal = aWeekStart;
          bVal = bWeekStart;
        }
      }

      // Convert to comparable values
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [rows, selectedCompany, selectedDate, sortColumn, sortDirection, wtdMode]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <>
      <div className="header">
        <h1 className="title">Reports</h1>
        <button onClick={load}>Refresh</button>
      </div>

      <div className="content">
        {/* Filters */}
        <div className="row" style={{ marginBottom: 16, alignItems: 'center' }}>
          <button 
            onClick={() => setWtdMode(!wtdMode)}
            style={{ 
              marginRight: 16,
              backgroundColor: wtdMode ? '#111827' : '#fff',
              color: wtdMode ? '#fff' : '#1f2937',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer'
            }}
          >
            WTD
          </button>

          <label style={{ marginBottom: 0, marginRight: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              style={{ margin: 0 }}
            />
            Show deleted
          </label>

          <label style={{ marginBottom: 0, marginLeft: 16, marginRight: 8 }}>Company:</label>
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
            disabled={wtdMode}
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
              {!wtdMode && (
                <th onClick={() => handleSort('task_name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Task {sortColumn === 'task_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              )}
              <th onClick={() => handleSort('day')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                {wtdMode ? 'Week' : 'Date'} {sortColumn === 'day' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('total_seconds')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Time (HH:MM:SS) {sortColumn === 'total_seconds' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRows.map((r: ReportModel, idx: number) => (
              <tr 
                key={idx}
                style={{
                  backgroundColor: r?.is_deleted ? '#f3f4f6' : 'transparent',
                  color: r?.is_deleted ? '#dc2626' : 'inherit',
                  opacity: r?.is_deleted ? 0.7 : 1,
                }}
              >
                <td>{r?.company_name}</td>
                <td>{r?.project_name}</td>
                {!wtdMode && <td>{r?.task_name}</td>}
                <td>{r?.day}</td>
                <td>{msToHMS(r?.total_seconds * 1000)}</td>
              </tr>
            ))}
            {filteredAndSortedRows.length === 0 && (
              <tr>
                <td colSpan={wtdMode ? 4 : 5}>No sessions yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
