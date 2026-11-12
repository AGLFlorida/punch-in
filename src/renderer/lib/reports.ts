import type { ReportModel } from '../../main/services/report';

export interface WeeklyReportRow extends ReportModel {
  week_range: string;
  /** ISO date string (YYYY-MM-DD) of the Monday that starts the week — used for sorting */
  week_start_date: string;
}

/**
 * Parse a YYYY-MM-DD date string in **local** time.
 *
 * `new Date('YYYY-MM-DD')` treats the input as UTC midnight, which shifts
 * the date back by one day in timezones behind UTC (e.g. US timezones).
 * Splitting and constructing with numeric arguments uses local time instead.
 */
export function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Return the ISO date string (YYYY-MM-DD) for the Monday that starts the
 * calendar week containing `date` (Mon–Sun weeks).
 */
export function getMondayOfWeek(date: Date): string {
  const dayOfWeek = date.getDay(); // 0=Sun … 6=Sat
  const monday = new Date(date);
  monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Aggregate daily report rows into weekly totals (Mon–Sun weeks).
 *
 * Rows are grouped by `(company_name, project_name, week_start)`.
 * The returned rows replace `day` with a human-readable week range string
 * and expose `week_start_date` for chronological sorting.
 */
export function aggregateByWeek(rows: ReportModel[]): WeeklyReportRow[] {
  const weeklyData = new Map<string, WeeklyReportRow>();

  for (const r of rows) {
    // Guard all three grouping fields so the key is unambiguous
    if (!r?.day || !r?.project_name || !r?.company_name) continue;

    const date = parseDateLocal(r.day);
    const mondayStr = getMondayOfWeek(date);

    // Reuse the parsed Monday date — avoids a redundant parseDateLocal call
    const mondayDate = parseDateLocal(mondayStr);

    // Derive Sunday from Monday
    const sunday = new Date(mondayDate);
    sunday.setDate(mondayDate.getDate() + 6);

    const weekRange = `${mondayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    // Use a null-byte separator so company/project names containing '-' never collide
    const weekKey = `${r.company_name}\0${r.project_name}\0${mondayStr}`;

    if (weeklyData.has(weekKey)) {
      const existing = weeklyData.get(weekKey)!;
      existing.total_seconds += r.total_seconds || 0;
      // If any session within the week is deleted, mark the aggregate as deleted
      if (r.is_deleted) existing.is_deleted = true;
    } else {
      weeklyData.set(weekKey, {
        ...r,
        task_name: '', // Not shown in WTD mode
        day: weekRange,
        week_range: weekRange,
        week_start_date: mondayStr,
        total_seconds: r.total_seconds || 0,
      });
    }
  }

  return Array.from(weeklyData.values());
}
