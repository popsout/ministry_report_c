import { validateWeights, type WeeklyWeight } from './weeklyWeight';
export type Rating = -1 | 0 | 1;
export type GoalBoard = { version: 1; title: string; days: number; ratings: Record<string, Rating>; weights?: Record<string, WeeklyWeight> };
export const GOAL_KEY = 'chagok.goals.v1';
export const emptyBoard = (): GoalBoard => ({ version: 1, title: '건강한 하루를 차곡차곡', days: 30, ratings: {} });
export function parseBoard(raw: string): GoalBoard {
  const value = JSON.parse(raw);
  if (value?.version !== 1 || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 80 || !Number.isInteger(value.days) || value.days < 1 || value.days > 365 || !value.ratings || typeof value.ratings !== 'object' || Array.isArray(value.ratings)) throw new Error('목표 저장 형식을 확인해 주세요. 기존 데이터는 보존했습니다.');
  for (const [date, rating] of Object.entries(value.ratings)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || ![date].every(d => { const parsed = new Date(d + 'T12:00:00Z'); return !isNaN(+parsed) && parsed.toISOString().slice(0, 10) === d; }) || ![-1, 0, 1].includes(rating as number)) throw new Error('목표 평가 기록을 읽지 못했습니다. 기존 데이터는 보존했습니다.');
  }
  if(value.weights!==undefined)validateWeights(value.weights);
  return value;
}
export function boardProgress(board: GoalBoard) {
  const history = Object.entries(board.ratings).sort(([a], [b]) => a.localeCompare(b));
  const position = history.reduce((position, [, rating]) => Math.max(0, Math.min(board.days, position + rating)), 0);
  const failures = history.filter(([, rating]) => rating === -1).length;
  return { position, failures, count: history.length };
}
