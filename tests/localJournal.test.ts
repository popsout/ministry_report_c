import { describe,it,expect } from 'vitest';
import { parseJournal } from '../src/lib/localJournal';
const record={id:'a',user_id:'local',service_date:'2028-02-29',service_type:'호별',minutes:75,note:'',updated_at:'2026-10-24'};
const raw=(entry=record)=>JSON.stringify({version:1,entries:[entry],settings:[]});
describe('저장 형식 검증',()=>{
 it('윤년 날짜와 15분 단위를 읽는다',()=>{expect(parseJournal(raw()).entries[0].minutes).toBe(75);});
 it('손상된 JSON과 알 수 없는 버전을 거부한다',()=>{expect(()=>parseJournal('bad')).toThrow();expect(()=>parseJournal('{"version":2}')).toThrow();});
 it('잘못된 날짜·봉사시간을 거부한다',()=>{expect(()=>parseJournal(raw({...record,service_date:'2026-02-29'}))).toThrow();expect(()=>parseJournal(raw({...record,minutes:14}))).toThrow();});
});
