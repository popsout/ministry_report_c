import { expect, it } from 'vitest';
import { newTimer, parseTimer, pauseTimer, remainingTime, resumeTimer, startTimer } from '../src/lib/restTimer';
it('백그라운드로 멈춘 tick과 무관하게 종료 시각으로 시간을 계산한다', () => {
  const state = startTimer(90, 1000);
  expect(remainingTime(state, 61000)).toBe(30000);
  expect(remainingTime(state, 200000)).toBe(0);
  expect(remainingTime(parseTimer(JSON.stringify(state)), 81000)).toBe(10000);
});
it('일시정지 시간은 흐르지 않고 남은 시간부터 재개한다', () => {
  const paused = pauseTimer(startTimer(120, 1000), 31000);
  expect(remainingTime(paused, 900000)).toBe(90000);
  expect(remainingTime(resumeTimer(paused, 900000), 910000)).toBe(80000);
  expect(remainingTime(newTimer(180), 999999)).toBe(180000);
});
