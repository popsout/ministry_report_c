import {describe,it,expect} from 'vitest';
import {donutProgress} from '../src/lib/domain';
describe('목표 용량 도넛',()=>{
 it('15시간 목표의 6시간 기록은 40%만 채운다',()=>{
  const d=donutProgress([180,120,60],900);expect(d.filledPercent).toBe(40);expect(d.remainingPercent).toBe(60);
  expect(d.portions[0]).toBe(20);expect(d.portions[1]).toBeCloseTo(13.33333);expect(d.portions[2]).toBeCloseTo(6.66667);
 });
 it('목표를 늘리면 같은 기록이 차지하는 면적이 줄어든다',()=>{
  expect(donutProgress([180,120,60],1800).filledPercent).toBe(20);
  expect(donutProgress([180,120,60],3000).filledPercent).toBe(12);
 });
 it('초과 기록은 비중을 유지하며 원을 가득 채운다',()=>{
  const d=donutProgress([600,300,300],900);expect(d.portions).toEqual([50,25,25]);expect(d.remainingPercent).toBe(0);
 });
 it('목표가 없을 때는 구성비, 기록이 없을 때는 빈 원',()=>{
  expect(donutProgress([180,120,60]).filledPercent).toBe(100);
  expect(donutProgress([0,0,0],900)).toEqual({portions:[0,0,0],filledPercent:0,remainingPercent:100});
  expect(donutProgress([0,0,0]).remainingPercent).toBe(100);
 });
});
