'use client';

import { useEffect, useState, useMemo } from 'react';
import { msToHMS } from '@/lib/time';
import type { ReportModel } from '../../../main/services/report';

type SortColumn = 'company_name' | 'project_name' | 'task_name' | 'day' | 'total_seconds';
type SortDirection = 'asc' | 'desc';

export default function ReportsPage() {
  const [rows, setRows] = useState<ReportModel[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('day');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const load = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (typeof window !== 'undefined' && (window as any).tp && (window as any).tp.getReport) ? await (window as any).tp.getReport() : [];
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
      filtered = filtered.filter(r => r?.day === selectedDate);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

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

  return (
    <>
      <div className="header">
        <h1 className="title">Reports</h1>
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
              <th onClick={() => handleSort('day')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Date {sortColumn === 'day' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('total_seconds')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Time (HH:MM:SS) {sortColumn === 'total_seconds' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRows.map((r: ReportModel, idx: number) => (
              <tr key={idx}>
                <td>{r?.company_name}</td>
                <td>{r?.project_name}</td>
                <td>{r?.task_name}</td>
                <td>{r?.day}</td>
                <td>{msToHMS(r?.total_seconds * 1000)}</td>
              </tr>
            ))}
            {filteredAndSortedRows.length === 0 && (
              <tr>
                <td colSpan={5}>No sessions yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
