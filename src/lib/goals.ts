export type Rating = 'up' | 'stay' | 'down';
export type GoalPlan = { title: string; targetDays: number; startDate: string; action: string };
export type GoalsDocument = { version: 1; plan: GoalPlan | null; evaluations: Record<string, Rating>; dismissedOn: string | null };
export const GOALS_KEY = 'chagok.goals.v1';
export const emptyGoals = (): GoalsDocument => ({ version: 1, plan: null, evaluations: {}, dismissedOn: null });
export const ratingLabels: Record<Rating, string> = { up: '＋ 업', stay: '스테이', down: '－ 다운' };
// Explicitly use the user's Korean calendar, independently of the device timezone.
export function koreaDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function validGoalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '2000-01-01' || value > '9999-12-31') return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
export function parseGoals(raw: string): GoalsDocument {
  let data;
  try { data = JSON.parse(raw); } catch { throw Error('목표 기록을 읽지 못했습니다. 기존 데이터는 변경하지 않았습니다.'); }
  if (data?.version !== 1 || !data.evaluations || typeof data.evaluations !== 'object' || Array.isArray(data.evaluations) || (data.dismissedOn !== null && !validGoalDate(data.dismissedOn))) throw Error('목표 기록 형식이 올바르지 않습니다. 기존 기록은 보존했습니다.');
  const plan = data.plan;
  if (plan !== null && (!plan || typeof plan.title !== 'string' || !plan.title.trim() || plan.title.length > 80 || !Number.isInteger(plan.targetDays) || plan.targetDays < 1 || plan.targetDays > 365 || !validGoalDate(plan.startDate) || typeof plan.action !== 'string' || plan.action.length > 500)) throw Error('목표 설정 형식이 올바르지 않습니다.');
  for (const [date, rating] of Object.entries(data.evaluations)) {
    if (!plan || !validGoalDate(date) || date < plan.startDate || !['up', 'stay', 'down'].includes(rating as string)) throw Error('날짜별 평가 형식이 올바르지 않습니다.');
  }
  return data;
}
export function setEvaluation(document: GoalsDocument, date: string, rating: Rating, today = koreaDate()) {
  if (!document.plan || !validGoalDate(date) || date < document.plan.startDate || date > today) throw Error('목표 시작일부터 오늘까지의 날짜를 선택해 주세요.');
  return parseGoals(JSON.stringify({ ...document, evaluations: { ...document.evaluations, [date]: rating } }));
}
export function goalPath(document: GoalsDocument, through = koreaDate()) {
  let position = 0;
  return Object.entries(document.evaluations).filter(([date]) => date <= through).sort(([a], [b]) => a.localeCompare(b)).map(([date, rating]) => {
    position = Math.min(document.plan?.targetDays ?? 0, Math.max(0, position + (rating === 'up' ? 1 : rating === 'down' ? -1 : 0)));
    return { date, rating, position };
  });
}
export const warningRules = {
  consecutiveDown: 3, recentCount: 7, recentDown: 4,
  yellow: '목표는 그대로인데 행동이 멈췄다. 지금 흐름을 끊자. 다음 한 끼부터 계획대로.',
  orange: '이대로 반복하면 목표는 멀어진다. 의지만 다잡지 말고, 지킬 수 있는 계획으로 바꿔서 오늘 실행하자.',
};
export function goalWarning(document: GoalsDocument, today = koreaDate()) {
  const path = goalPath(document, today);
  if (path.slice(-warningRules.recentCount).filter(item => item.rating === 'down').length >= warningRules.recentDown) return { level: 'orange', title: '최근 평가 7건 중 다운 4건 이상', message: warningRules.orange };
  const last = path.at(-1);
  // A streak must be current (today or yesterday), and gaps break consecutive calendar days.
  if (!last || (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${last.date}T00:00:00Z`)) > 86400000) return null;
  const tail = path.slice(-warningRules.consecutiveDown);
  if (tail.length === warningRules.consecutiveDown && tail.every((item, i) => item.rating === 'down' && (!i || Date.parse(`${item.date}T00:00:00Z`) - Date.parse(`${tail[i - 1].date}T00:00:00Z`) === 86400000))) return { level: 'yellow', title: '다운 3일 연속 · 흐름을 바꿀 때', message: warningRules.yellow };
  return null;
}
export function motivation(document: GoalsDocument, date: string) {
  const rating = document.evaluations[date];
  if (rating === 'down') return '오늘은 어긋났다. 내일까지 포기할 이유는 없다. 굶어서 만회하지 말고, 다음 식사를 제대로 하자.';
  if (rating === 'stay') return '제자리를 지켰다. 다음 한 끼에서 한 걸음 더 나아가자.';
  if (rating === 'up') {
    const path = goalPath(document, date);
    return path.at(-2)?.rating === 'up' ? '기분이 아니라 행동으로 증명하고 있다. 지금의 반복이 결과를 만든다.' : '다시 움직였다. 이 한 번이 흐름을 바꾼다. 내일도 이어가자.';
  }
  return '오늘의 선택을 돌아보고, 다음 한 끼를 계획대로.';
}
