import { describe,it,expect } from 'vitest';
import { monthlyGoalProgress } from '../src/lib/domain';
import { parseJournal } from '../src/lib/localJournal';
describe('월별 파이오니아 목표',()=>{
 it('보조 15/30시간 목표에 따른 잔여 분과 달성률',()=>{
  expect(monthlyGoalProgress('보조 파이오니아',750,15)).toEqual({targetMinutes:900,remainingMinutes:150,percent:83.3,achieved:false});
  expect(monthlyGoalProgress('보조 파이오니아',750,30)?.percent).toBe(41.7);
 });
 it('정규는 항상 50시간, 일반은 목표 없음',()=>{
  expect(monthlyGoalProgress('정규 파이오니아',750,30)?.targetMinutes).toBe(3000);
  expect(monthlyGoalProgress('일반',750)).toBeNull();
 });
 it('기록 없으면 0%, 초과 달성하면 잔여는 0분',()=>{
  expect(monthlyGoalProgress('보조 파이오니아',0)?.percent).toBe(0);
  expect(monthlyGoalProgress('정규 파이오니아',3000)?.achieved).toBe(true);
  expect(monthlyGoalProgress('보조 파이오니아',1080)).toEqual({targetMinutes:900,remainingMinutes:0,percent:120,achieved:true});
 });
 it('목표가 없는 이전 저장 파일을 계속 읽고 허용하지 않은 목표는 거부한다',()=>{
  const settings=[{month:'2026-11-01',role:'보조 파이오니아',updated_at:''}];
  const raw=(s:unknown)=>JSON.stringify({version:1,entries:[],settings:s});
  expect(parseJournal(raw(settings)).settings).toEqual(settings);
  expect(parseJournal(raw([{...settings[0],auxiliaryGoalHours:30}])).settings[0].auxiliaryGoalHours).toBe(30);
  expect(()=>parseJournal(raw([{...settings[0],auxiliaryGoalHours:50}]))).toThrow();
 });
});
