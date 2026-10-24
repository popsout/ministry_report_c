import { TYPES, type Entry, type MonthSetting } from './domain';
export const JOURNAL_KEY = 'chagok.journal.v1';
export type Journal = { version: 1; entries: Entry[]; settings: MonthSetting[] };
export const emptyJournal = (): Journal => ({ version: 1, entries: [], settings: [] });
function validDate(v: unknown): v is string {
  if(typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
  const date=new Date(`${v}T12:00:00Z`);
  return !isNaN(date.valueOf()) && date.toISOString().slice(0,10)===v;
}
export function parseJournal(raw: string): Journal {
  const data=JSON.parse(raw);
  if(data?.version!==1 || !Array.isArray(data.entries) || !Array.isArray(data.settings))throw new Error('invalid');
  if(!data.entries.every((e: Entry)=>e && typeof e.id==='string' && typeof e.user_id==='string' && validDate(e.service_date) && TYPES.includes(e.service_type) && Number.isInteger(e.minutes) && e.minutes>=15 && e.minutes<=525 && e.minutes%15===0 && typeof e.note==='string' && e.note.length<=500 && typeof e.updated_at==='string'))throw new Error('invalid');
  if(!data.settings.every((s: MonthSetting)=>s && validDate(s.month) && s.month.endsWith('-01') && ['일반','보조 파이오니아','정규 파이오니아'].includes(s.role) && typeof s.updated_at==='string'))throw new Error('invalid');
  return data;
}
export function readJournal() {
  try {
    const raw=localStorage.getItem(JOURNAL_KEY);
    return { data:raw ? parseJournal(raw) : emptyJournal(), raw, error:'' };
  } catch {
    return {data:emptyJournal(),raw:null,error:'이 브라우저의 저장 기록을 읽지 못했습니다. 기존 데이터는 변경하지 않았습니다. 브라우저 저장 권한을 확인해 주세요.'};
  }
}
export function writeJournal(data: Journal, expectedRaw: string|null): string {
  try {
    if(localStorage.getItem(JOURNAL_KEY)!==expectedRaw)throw new Error('conflict');
    const raw=JSON.stringify(data); parseJournal(raw);
    localStorage.setItem(JOURNAL_KEY,raw);return raw;
  }catch(error){
    if(error instanceof Error && error.message==='conflict')throw new Error('다른 탭에서 기록이 변경됐습니다. 새로고침한 뒤 다시 시도해 주세요.');
    throw new Error('기록을 저장하지 못했습니다. 브라우저 저장 공간이나 저장 권한을 확인해 주세요. 입력 내용은 그대로 남아 있습니다.');
  }
}
