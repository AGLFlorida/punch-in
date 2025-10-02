import type { State } from '../types';

export function msToHMS(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function elapsedNow(state: State): number {
  return (state.running && state.startTs) ? (Date.now() - state.startTs) : 0;
}