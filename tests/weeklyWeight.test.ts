import { describe,it,expect } from 'vitest';
import { weightWeek,weightTrend,validateWeights } from '../src/lib/weeklyWeight';
import { emptyBoard,parseBoard } from '../src/lib/goalBoard';
describe('weekly weight records',()=>{
 it('uses Monday-Sunday weeks across month and year boundaries',()=>{
  expect(weightWeek('2026-01-01')).toBe('2025-12-29');
  expect(weightWeek('2026-01-04')).toBe('2025-12-29');
  expect(weightWeek('2026-01-05')).toBe('2026-01-05');
 });
 it('replaces the same week and compares consecutive measurements across missing weeks',()=>{
  const weights={'2026-01-05':{date:'2026-01-05',kg:90},'2026-01-19':{date:'2026-01-19',kg:88.7}};
  weights[weightWeek('2026-01-11')]={date:'2026-01-11',kg:89.5};
  const rows=weightTrend(weights);expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({kg:89.5,change:null,total:0});
  expect(rows[1]).toMatchObject({kg:88.7,change:-.8,total:-.8});
 });
 it('preserves old boards and rejects malformed weight records before writing',()=>{
  expect(parseBoard(JSON.stringify(emptyBoard()))).toEqual(emptyBoard());
  for(const record of [{date:'2026-02-30',kg:90},{date:'2026-01-01',kg:NaN},{date:'2026-01-05',kg:90.55},{date:'2026-01-05',kg:0}])expect(()=>validateWeights({'2026-01-05':record})).toThrow();
  expect(()=>validateWeights({'2026-01-05':{date:'2026-01-05',kg:90.1}})).not.toThrow();
 });
});
