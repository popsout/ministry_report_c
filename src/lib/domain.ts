export const TYPES = ['호별', '편지', '전시대'] as const;
export type ServiceType = typeof TYPES[number];
export type Role = '일반' | '보조 파이오니아' | '정규 파이오니아';
export type Entry = { id: string; user_id: string; service_date: string; service_type: ServiceType; minutes: number; note: string; updated_at: string };
export type MonthSetting = { month: string; role: Role; auxiliaryGoalHours?: 15 | 30; updated_at: string };
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

export function monthlyGoalProgress(role: Role, totalMinutes: number, auxiliaryGoalHours: 15 | 30 = 15) {
  const targetMinutes = role === '보조 파이오니아' ? auxiliaryGoalHours * 60 : role === '정규 파이오니아' ? 50 * 60 : 0;
  if (!targetMinutes) return null;
  return { targetMinutes, remainingMinutes: Math.max(0, targetMinutes - totalMinutes), percent: Math.round(totalMinutes / targetMinutes * 1000) / 10, achieved: totalMinutes >= targetMinutes };
}

export function donutProgress(minutesByType: number[], targetMinutes = 0) {
  const total = minutesByType.reduce((sum, minutes) => sum + minutes, 0);
  // Once the goal is exceeded, keep every type proportional within a full ring.
  const denominator = Math.max(targetMinutes, total);
  const portions = minutesByType.map(minutes => denominator ? minutes / denominator * 100 : 0);
  const filledPercent = denominator ? Math.min(100, total / denominator * 100) : 0;
  return { portions, filledPercent, remainingPercent: 100 - filledPercent };
}
