export const TIMER_KEY = 'chagok.rest-timer.v1';
export type RestTimerState = { version: 1; duration: number; remaining: number; deadline: number | null; started: boolean };
export const newTimer = (duration = 90): RestTimerState => ({ version: 1, duration, remaining: duration * 1000, deadline: null, started: false });
export const remainingTime = (state: RestTimerState, now: number) => state.deadline === null ? state.remaining : Math.max(0, state.deadline - now);
export const startTimer = (duration: number, now: number): RestTimerState => ({ ...newTimer(duration), deadline: now + duration * 1000, started: true });
export const pauseTimer = (state: RestTimerState, now: number): RestTimerState => ({ ...state, remaining: remainingTime(state, now), deadline: null });
export const resumeTimer = (state: RestTimerState, now: number): RestTimerState => state.remaining > 0 ? { ...state, started: true, deadline: now + state.remaining } : state;
export function parseTimer(raw: string): RestTimerState {
  const s = JSON.parse(raw);
  if (s?.version !== 1 || ![90, 120, 180].includes(s.duration) || !Number.isFinite(s.remaining) || s.remaining < 0 || s.remaining > s.duration * 1000 || (s.deadline !== null && (!Number.isFinite(s.deadline) || s.deadline < 0)) || typeof s.started !== 'boolean') throw Error('invalid timer');
  return s;
}
