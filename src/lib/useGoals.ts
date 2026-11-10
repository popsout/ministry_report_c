import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { emptyGoals, GOALS_KEY, parseGoals, type GoalsDocument } from './goals';
export type GoalsSnapshot = { owner: string; document: GoalsDocument; revision: number; raw: string | null };
const makeSnapshot = (owner: string): GoalsSnapshot => ({ owner, document: emptyGoals(), revision: 0, raw: null });
const conflictMessage = '다른 기기나 탭에서 목표 기록이 변경됐습니다. 새로고침 후 최신 기록에서 다시 수정해 주세요.';
export function useGoals(userId: string | undefined, demo = false) {
  const owner = demo ? 'demo' : supabase ? userId || 'signed-out' : 'local';
  const [snapshot, setSnapshot] = useState<GoalsSnapshot>(() => makeSnapshot(owner));
  const [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const identity = useRef(owner), epoch = useRef(0), request = useRef(0), saving = useRef(false);
  // Invalidate pending responses immediately on an account change.
  if (identity.current !== owner) { identity.current = owner; epoch.current++; request.current++; }
  const load = useCallback(async () => {
    const generation = ++request.current, currentEpoch = epoch.current;
    if (owner === 'signed-out') return;
    try {
      let next = makeSnapshot(owner);
      if (demo) { /* Examples never touch browser or cloud records. */ }
      else if (!supabase) {
        const raw = localStorage.getItem(GOALS_KEY);
        next = { ...next, raw, document: raw ? parseGoals(raw) : emptyGoals() };
      } else {
        const { data, error } = await supabase.from('personal_goals').select('document,revision').eq('user_id', owner).maybeSingle();
        if (error) throw Error('온라인 목표 기록을 읽지 못했습니다. personal_goals 테이블 적용과 연결을 확인해 주세요. 봉사 기록은 변경하지 않았습니다.');
        if (data) next = { ...next, document: parseGoals(JSON.stringify(data.document)), revision: data.revision };
      }
      if (generation !== request.current || currentEpoch !== epoch.current || identity.current !== owner) return;
      setSnapshot(next); setLoaded(true); setError('');
    } catch (e) {
      if (generation !== request.current || currentEpoch !== epoch.current) return;
      setError(e instanceof Error ? e.message : '목표 기록을 읽지 못했습니다. 기존 데이터는 보존했습니다.'); setLoaded(false);
    }
  }, [owner, demo]);
  useEffect(() => {
    setSnapshot(makeSnapshot(owner)); setLoaded(false); setError('');
    if (owner === 'signed-out') return;
    void load();
    if (demo) return;
    const refresh = () => { if (!saving.current) void load(); };
    const storage = (event: StorageEvent) => { if (event.key === GOALS_KEY || event.key === null) refresh(); };
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('storage', storage); window.addEventListener('focus', refresh); window.addEventListener('online', refresh); document.addEventListener('visibilitychange', visible);
    const timer = supabase ? window.setInterval(refresh, 15000) : undefined;
    const channel = supabase?.channel(`goals-${owner}`).on('postgres_changes', { event: '*', schema: 'public', table: 'personal_goals', filter: `user_id=eq.${owner}` }, refresh).subscribe(state => { if (state === 'SUBSCRIBED') refresh(); });
    return () => { request.current++; window.removeEventListener('storage', storage); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', visible); window.clearInterval(timer); if (channel) void supabase!.removeChannel(channel); };
  }, [owner, demo, load]);
  async function save(document: GoalsDocument, base = snapshot) {
    if (!loaded || base.owner !== owner || identity.current !== owner || saving.current) throw Error('목표 기록을 불러온 뒤 다시 시도해 주세요.');
    const currentEpoch = epoch.current;
    parseGoals(JSON.stringify(document));
    saving.current = true; setBusy(true); request.current++;
    try {
      let next = { ...base, document };
      if (!demo && !supabase) {
        if (localStorage.getItem(GOALS_KEY) !== base.raw) throw Error(conflictMessage);
        next.raw = JSON.stringify(document);
        try { localStorage.setItem(GOALS_KEY, next.raw); } catch { throw Error('목표 기록을 저장하지 못했습니다. 입력은 유지됩니다. 브라우저 저장 공간과 권한을 확인해 주세요.'); }
      } else if (!demo && supabase) {
        const result = base.revision === 0
          ? await supabase.from('personal_goals').insert({ user_id: owner, document, revision: 1 }).select('revision')
          : await supabase.from('personal_goals').update({ document, revision: base.revision + 1 }).eq('user_id', owner).eq('revision', base.revision).select('revision');
        if (result.error || !result.data?.length) throw Error(result.error && result.error.code !== '23505' ? '온라인 목표 저장에 실패했습니다. 입력은 유지됩니다. 연결과 테이블 설정을 확인해 주세요.' : conflictMessage);
        next.revision = result.data[0].revision;
      }
      if (currentEpoch !== epoch.current || identity.current !== owner) throw Error('로그인 상태가 변경됐습니다. 다시 로그인해 기록을 확인해 주세요.');
      setSnapshot(next); setError('');
    } finally { saving.current = false; setBusy(false); }
  }
  return { snapshot: snapshot.owner === owner ? snapshot : makeSnapshot(owner), loaded: loaded && snapshot.owner === owner, busy, error, save, load, owner };
}
