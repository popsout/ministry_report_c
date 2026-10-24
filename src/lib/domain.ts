export const TYPES = ['호별', '편지', '전시대'] as const;
export type ServiceType = typeof TYPES[number];
export type Role = '일반' | '보조 파이오니아' | '정규 파이오니아';
export type Entry = { id: string; user_id: string; service_date: string; service_type: ServiceType; minutes: number; note: string; updated_at: string };
export type MonthSetting = { month: string; role: Role; updated_at: string };
export const pad = (v: number) => String(v).padStart(2, '0');
export function dateKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function monthKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`; }
export function formatTime(minutes: number) { const h = Math.floor(minutes / 60), m = minutes % 60; return [h ? `${h}시간` : '', m ? `${m}분` : ''].filter(Boolean).join(' ') || '0시간'; }
export function summarize(entries: Entry[]) {
  const total = entries.reduce((sum, e) => sum + e.minutes, 0);
  return { total, count: entries.length, types: TYPES.map(type => {
    const list = entries.filter(e => e.service_type === type);
    const minutes = list.reduce((sum, e) => sum + e.minutes, 0);
    return { type, minutes, count: list.length, percent: total ? minutes / total * 100 : 0 };
  }) };
}
export function calendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first); start.setDate(1 - first.getDay());
  const count = Math.ceil((first.getDay() + new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()) / 7) * 7;
  return Array.from({length: count}, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}
