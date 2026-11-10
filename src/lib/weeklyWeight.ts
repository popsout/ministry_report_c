export type WeeklyWeight = { date: string; kg: number };
export function validWeightDate(date: unknown): date is string {
 if(typeof date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
 const parsed=new Date(date+'T12:00:00Z');return !isNaN(+parsed) && parsed.toISOString().slice(0,10)===date;
}
/** Calendar week, Monday through Sunday; independent of the device's timezone. */
export function weightWeek(date: string) {
 if(!validWeightDate(date))throw new Error('측정 날짜를 확인해 주세요.');
 const day=new Date(date+'T12:00:00Z');day.setUTCDate(day.getUTCDate()-(day.getUTCDay()+6)%7);return day.toISOString().slice(0,10);
}
export function validateWeights(weights: unknown): asserts weights is Record<string,WeeklyWeight> {
 if(!weights || typeof weights!=='object' || Array.isArray(weights))throw new Error('체중 기록 형식을 읽지 못했습니다. 원본 기록은 보존했습니다.');
 for(const [week,record] of Object.entries(weights)){
  if(!record || !validWeightDate(record.date) || weightWeek(record.date)!==week || !Number.isFinite(record.kg) || record.kg<20 || record.kg>500 || Math.abs(record.kg*10-Math.round(record.kg*10))>.00001)throw new Error('체중 기록 형식을 읽지 못했습니다. 원본 기록은 보존했습니다.');
 }
}
export function weightTrend(weights: Record<string,WeeklyWeight> = {}) {
 const sorted=Object.entries(weights).sort(([a],[b])=>a.localeCompare(b));
 const rounded=(value:number)=>Math.round(value*10)/10;
 return sorted.map(([week,record],index)=>({...record,week,change:index?rounded(record.kg-sorted[index-1][1].kg):null,total:rounded(record.kg-sorted[0][1].kg)}));
}
