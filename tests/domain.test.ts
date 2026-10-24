import { describe, expect, it } from 'vitest';
import { calendarDays, dateKey, monthKey, summarize, formatTime, type Entry } from '../src/lib/domain';
const entry=(type:Entry['service_type'],minutes:number,date='2026-10-05'):Entry=>({id:crypto.randomUUID(),user_id:'test',service_date:date,service_type:type,minutes,note:'',updated_at:''});
describe('봉사시간과 횟수 통계',()=>{
 it('횟수가 아닌 시간 기준으로 비율을 계산한다',()=>{const s=summarize([entry('호별',360),entry('편지',90),entry('편지',90),entry('전시대',60)]);expect(s.total).toBe(600);expect(s.count).toBe(4);expect(s.types.map(t=>t.percent)).toEqual([60,30,10]);expect(s.types.map(t=>t.count)).toEqual([1,2,1]);});
 it('기록이 없으면 NaN 없이 0을 표시한다',()=>{expect(summarize([]).types.every(t=>t.percent===0)).toBe(true);expect(formatTime(0)).toBe('0시간');});
 it('같은 날 여러 형태와 15분 단위를 합산한다',()=>{const s=summarize([entry('호별',90),entry('편지',15)]);expect(s.total).toBe(105);expect(s.count).toBe(2);expect(formatTime(s.total)).toBe('1시간 45분');});
});
describe('월별 캘린더',()=>{
 it('연도와 월을 구분하고 지역 날짜를 보존한다',()=>{expect(monthKey(new Date(2027,0,31))).toBe('2027-01-01');expect(dateKey(new Date(2026,9,5))).toBe('2026-10-05');});
 it('윤년의 2월 29일과 일요일 시작 주를 표시한다',()=>{const days=calendarDays(new Date(2028,1,1));expect(days[0].getDay()).toBe(0);expect(days.length%7).toBe(0);expect(days.filter(d=>d.getMonth()===1)).toHaveLength(29);expect(days.some(d=>dateKey(d)==='2028-02-29')).toBe(true);});
 it('연도 경계를 넘어 날짜를 올바르게 표시한다',()=>{const days=calendarDays(new Date(2026,0,1));expect(dateKey(days[0])).toBe('2025-12-28');expect(days.filter(d=>d.getMonth()===0)).toHaveLength(31);});
});
