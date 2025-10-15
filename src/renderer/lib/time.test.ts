import { msToHMS, elapsedNow } from './time';
import type { State } from './types';

test('msToHMS formats correctly', () => {
  expect(msToHMS(0)).toBe('00:00:00');
  expect(msToHMS(999)).toBe('00:00:00');
  expect(msToHMS(1000)).toBe('00:00:01');
  expect(msToHMS(61_000)).toBe('00:01:01');
  expect(msToHMS(3_600_000)).toBe('01:00:00');
  expect(msToHMS(3661_000)).toBe('01:01:01');
});

test('elapsedNow returns correct timing', () => {
  const fakeState: State = {
    running: true,
    currentProject: 'underTest',
    startTs: 1759422714624,
    projects: []
  }
  expect(elapsedNow(fakeState)).toBeGreaterThan(0);
})