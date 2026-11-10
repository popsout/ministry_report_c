import { describe, expect, it } from 'vitest';
import { boardProgress, emptyBoard, parseBoard } from '../src/lib/goalBoard';
describe('personal goal board', () => {
 it('replaces a date without duplicate movement and replays edited history', () => {
  const board = { ...emptyBoard(), ratings: { '2026-01-01': 1 as const, '2026-01-02': 1 as const } };
  expect(boardProgress(board).position).toBe(2);
  board.ratings['2026-01-01'] = 1;
  expect(boardProgress(board).count).toBe(2);
  expect(boardProgress({ ...board, ratings: { ...board.ratings, '2026-01-01': -1 } }).position).toBe(1);
 });
 it('keeps movement bounded in chronological order including stay', () => {
  expect(boardProgress({ ...emptyBoard(), days: 1, ratings: { '2026-01-04': -1, '2026-01-03': 0, '2026-01-02': 1, '2026-01-01': 1 } })).toEqual({ position: 0, failures: 1, count: 4 });
 });
 it('rejects invalid persisted dates, ratings and board size', () => {
  for (const change of [{ days: 0 }, { days: 366 }, { ratings: { '2026-02-30': 1 } }, { ratings: { '2026-01-01': 2 } }]) expect(() => parseBoard(JSON.stringify({ ...emptyBoard(), ...change }))).toThrow();
  expect(parseBoard(JSON.stringify(emptyBoard()))).toEqual(emptyBoard());
 });
});
