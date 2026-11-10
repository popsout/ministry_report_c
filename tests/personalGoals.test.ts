import { describe, expect, it } from 'vitest';
import { emptyGoals, goalPath, goalWarning, koreaDate, parseGoals, setEvaluation, type GoalsDocument } from '../src/lib/goals';
const plan = { title: '식사 계획', targetDays: 3, startDate: '2026-11-01', action: '다음 한 끼 계획대로' };
const initial = (): GoalsDocument => ({ ...emptyGoals(), plan });
const evaluate = (d: GoalsDocument, date: string, rating: 'up' | 'stay' | 'down') => setEvaluation(d, date, rating, '2026-11-30');
describe('개인 목표의 날짜별 이동', () => {
  it('동일 날짜 반복과 수정은 한 건만 반영한다', () => {
    let d = evaluate(initial(), '2026-11-01', 'up');
    d = evaluate(d, '2026-11-01', 'up'); expect(goalPath(d).at(-1)?.position).toBe(1);
    d = evaluate(d, '2026-11-01', 'down'); expect(goalPath(d).at(-1)?.position).toBe(0); expect(Object.keys(d.evaluations)).toHaveLength(1);
  });
  it('시작점 다운 뒤 업은 1칸이며 과거 수정은 이후 경로 전체를 바꾼다', () => {
    let d = evaluate(evaluate(initial(), '2026-11-02', 'up'), '2026-11-01', 'down');
    expect(goalPath(d).map(r => r.position)).toEqual([0, 1]);
    d = evaluate(d, '2026-11-01', 'up'); expect(goalPath(d).map(r => r.position)).toEqual([1, 2]);
  });
  it('목표를 넘지 않으며 목표 이후의 다운도 순서대로 반영한다', () => {
    let d = initial(); for (let i = 1; i <= 4; i++) d = evaluate(d, `2026-11-0${i}`, 'up');
    expect(goalPath(d).map(r => r.position)).toEqual([1, 2, 3, 3]);
    d = evaluate(d, '2026-11-05', 'down'); expect(goalPath(d).at(-1)?.position).toBe(2);
  });
  it('미기록일은 그대로 두고 스테이는 위치를 유지한다', () => {
    const d = evaluate(evaluate(initial(), '2026-11-01', 'up'), '2026-11-08', 'stay');
    expect(goalPath(d).map(r => r.position)).toEqual([1, 1]);
  });
  it('한국 자정 경계를 처리하고 미래·시작일 전·잘못된 날짜를 거부한다', () => {
    expect(koreaDate(new Date('2026-11-09T15:00:00Z'))).toBe('2026-11-10');
    expect(koreaDate(new Date('2026-11-09T14:59:59Z'))).toBe('2026-11-09');
    for (const date of ['2026-12-01', '2026-10-31', '2026-11-31', '']) expect(() => evaluate(initial(), date, 'up')).toThrow();
  });
  it('손상된 저장 데이터와 범위를 벗어난 칸 수를 거부한다', () => {
    expect(() => parseGoals('broken')).toThrow();
    for (const targetDays of [0, 366, 1.5]) expect(() => parseGoals(JSON.stringify({ ...initial(), plan: { ...plan, targetDays } }))).toThrow();
  });
});
describe('중복 없는 시각 경보', () => {
  it('연속 날짜의 다운 3일과 최근 평가 7건의 다운을 구분한다', () => {
    let d = initial(); for (const day of ['01', '02', '03']) d = evaluate(d, `2026-11-${day}`, 'down');
    expect(goalWarning(d, '2026-11-03')?.level).toBe('yellow');
    expect(goalWarning(d, '2026-11-06')).toBeNull();
    const withGap = evaluate(evaluate(evaluate(initial(), '2026-11-01', 'down'), '2026-11-03', 'down'), '2026-11-04', 'down');
    expect(goalWarning(withGap, '2026-11-04')).toBeNull();
    d = evaluate(d, '2026-11-08', 'down'); expect(goalWarning(d, '2026-11-08')?.level).toBe('orange');
    for (const day of ['09', '10', '11', '12']) d = evaluate(d, `2026-11-${day}`, 'stay');
    expect(goalWarning(d, '2026-11-12')).toBeNull();
  });
});
