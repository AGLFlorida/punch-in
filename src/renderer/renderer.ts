import { msToHMS } from '../shared/time';
import type { State } from '../types';

const els = {
  project: document.getElementById('project-select') as HTMLSelectElement,
  start: document.getElementById('start') as HTMLButtonElement,
  stop: document.getElementById('stop') as HTMLButtonElement,
  elapsed: document.getElementById('elapsed') as HTMLSpanElement,
  now: document.getElementById('now') as HTMLSpanElement,
  tabTimer: document.getElementById('tab-timer') as HTMLButtonElement,
  tabReports: document.getElementById('tab-reports') as HTMLButtonElement,
  viewTimer: document.getElementById('view-timer') as HTMLElement,
  viewReports: document.getElementById('view-reports') as HTMLElement,
  reportBody: document.querySelector('#report tbody') as HTMLElement,
  saveProjects: document.getElementById('save-projects') as HTMLButtonElement
};

let appState: State = { running: false, currentProject: '', startTs: null, projects: [] };

async function refreshState() {
  appState = await window.tp.getState();
  // fill projects
  els.project.innerHTML = '';
  for (const p of appState.projects) {
    const opt = document.createElement('option');
    opt.value = p; opt.textContent = p; els.project.appendChild(opt);
  }
  if (appState.currentProject) els.project.value = appState.currentProject;
  renderElapsed();
}

function renderElapsed() {
  const now = new Date();
  els.now.textContent = now.toLocaleString();
  if (appState.running && appState.startTs) {
    els.elapsed.textContent = msToHMS(Date.now() - appState.startTs);
  } else {
    els.elapsed.textContent = '00:00:00';
  }
}

async function renderReport() {
  const sessions = await window.tp.listSessions();
  const totals = new Map<string, number>();
  for (const s of sessions) {
    const ms = (s.end ?? Date.now()) - s.start;
    totals.set(s.project, (totals.get(s.project) || 0) + ms);
  }
  els.reportBody.innerHTML = '';
  for (const [project, ms] of totals.entries()) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${project}</td><td>${msToHMS(ms)}</td>`;
    els.reportBody.appendChild(tr);
  }
}

// Event wiring
els.start.addEventListener('click', async () => {
  const project = els.project.value || (appState.projects[0] || 'Default');
  await window.tp.start(project);
  await refreshState();
});

els.stop.addEventListener('click', async () => {
  await window.tp.stop();
  await refreshState();
  await renderReport();
});

els.saveProjects.addEventListener('click', async () => {
  const curr = (await window.tp.getState()).projects.join(', ');
  const input = window.prompt('Comma-separated project list:', curr);
  if (input != null) {
    const projects = input.split(',').map(s => s.trim()).filter(Boolean);
    await window.tp.setProjects(projects);
    await refreshState();
  }
});

els.tabTimer.addEventListener('click', () => {
  els.tabTimer.classList.add('active');
  els.tabReports.classList.remove('active');
  els.viewTimer.classList.remove('hidden');
  els.viewReports.classList.add('hidden');
});

els.tabReports.addEventListener('click', async () => {
  els.tabReports.classList.add('active');
  els.tabTimer.classList.remove('active');
  els.viewReports.classList.remove('hidden');
  els.viewTimer.classList.add('hidden');
  await renderReport();
});

// Tickers from main to keep UI responsive
window.tp.onTick(async () => {
  await refreshState();
});
window.tp.onSessionsUpdated(async () => {
  await renderReport();
});

// Local interval to show wall-clock smoothly
setInterval(renderElapsed, 1000);

// Initial load
refreshState();
renderReport();
