import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Target } from 'lucide-react';
import { boardProgress, emptyBoard, GOAL_KEY, parseBoard, type GoalBoard as Board, type Rating } from '../lib/goalBoard';
import { dateKey } from '../lib/domain';
import JourneyScene from './JourneyScene';
import type { useCloudJournal } from '../lib/cloudJournal';
import { encouragementPool } from '../lib/encouragement';

export default function GoalBoard({ storageKey = GOAL_KEY, preview = false, cloud, onLogin }: { storageKey?: string; preview?: boolean; cloud?: ReturnType<typeof useCloudJournal>; onLogin?: () => void }) {
  const online=!!cloud?.session && !preview;
  const [saving,setSaving]=useState(false);
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [date, setDate] = useState(() => dateKey(new Date()));
  const [encouragementIndex, setEncouragementIndex] = useState(0);
  const raw = useRef<string | null>(null);
  const blocked = useRef(false);
  useEffect(() => {
    if(online){
      setReady(!!cloud?.loaded);blocked.current=!cloud?.loaded;
      setBoard(cloud?.journal.goals || emptyBoard());
      setError(cloud?.error || '');return;
    }
    function load() {
      try { const stored = preview ? null : localStorage.getItem(storageKey); const next = stored ? parseBoard(stored) : emptyBoard(); raw.current = stored; blocked.current = false; setBoard(next); setError(''); }
      catch { blocked.current = true; setError('목표 기록을 읽지 못했습니다. 기존 데이터는 보존했습니다. 브라우저 저장 권한과 데이터를 확인해 주세요.'); }
      setReady(true);
    }
    load();
    const sync = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) load(); };
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync);
  }, [storageKey, preview, online, cloud?.loaded, cloud?.journal, cloud?.error]);
  async function save(next: Board, notice: string) {
    try {
      if (!ready || blocked.current) throw new Error('기존 목표 기록을 확인한 뒤 다시 시도해 주세요.');
      const nextRaw = JSON.stringify(next); parseBoard(nextRaw);
      if(online){setSaving(true);await cloud!.save({goals:next});setError('');setMessage(notice);return;}
      if (!preview) {
        if (localStorage.getItem(storageKey) !== raw.current) throw new Error('다른 탭에서 목표가 변경됐습니다. 새로고침한 뒤 다시 시도해 주세요.');
        localStorage.setItem(storageKey, nextRaw); raw.current = nextRaw;
      }
      setBoard(next); setError(''); setMessage(notice);
    } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했습니다. 입력 내용을 유지합니다.'); } finally {setSaving(false);}
  }
  function settings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    save({ ...board, title: String(data.get('title')).trim(), days: Number(data.get('days')) }, '목표를 저장했습니다. 기존 날짜별 평가는 유지됩니다.');
  }
  function rate(rating: Rating) {
    const parsed = new Date(date + 'T12:00:00Z');
    if (!date || isNaN(+parsed) || parsed.toISOString().slice(0, 10) !== date || date > dateKey(new Date())) { setError('오늘 또는 지난 날짜를 선택해 주세요.'); return; }
    save({ ...board, ratings: { ...board.ratings, [date]: rating } }, `${date} 평가를 ${Object.hasOwn(board.ratings, date) ? '수정' : '저장'}했습니다.`);
  }
  const { position, failures, count } = boardProgress(board);
  const messages = encouragementPool(board.ratings[date], position === board.days);
  const encouragementText = messages[(Number(date.replaceAll('-', '')) + count + position + encouragementIndex) % messages.length];
  return <div className="personal-goals">
    <div className="page-title"><div><span className="goal-eyebrow">ONE DAY, ONE STEP</span><h1>나의 목표 보드</h1><p>오늘의 선택을 기록하고, 나만의 깃발을 앞으로.</p></div><Target size={34} /></div>
    <p className="connection-banner">{preview ? '예시 화면 · 연습한 목표는 저장되지 않습니다.' : online ? (ready ? '같은 계정으로 로그인한 기기에서 목표와 날짜별 평가를 공유합니다.' : '온라인 목표를 불러오는 중입니다.') : '지금은 이 브라우저에 저장합니다. 로그인하면 다른 기기와 목표를 공유할 수 있습니다.'}{cloud && !preview && (!online ? <button onClick={onLogin}>로그인하고 동기화</button> : <button disabled={saving} onClick={()=>void cloud.load()}>온라인 목표 새로고침</button>)}</p>
    {online && <div className="goal-import"><button className="text-button" disabled={!ready || saving} onClick={()=>{
      try{
        const stored=localStorage.getItem(storageKey) || localStorage.getItem(GOAL_KEY);
        if(!stored){setMessage('이 기기에 가져올 이전 목표가 없습니다.');return;}
        const local=parseBoard(stored), remote=cloud!.journal.goals;
        void save(remote?{...remote,ratings:{...local.ratings,...remote.ratings}}:local,'기기 기록을 온라인 목표에 가져왔습니다. 원본 기기 기록은 보존했습니다.');
      }catch{setError('이 기기의 이전 기록을 읽지 못했습니다. 원본은 보존했습니다.');}
    }}>이 기기의 이전 목표 기록 가져오기</button><small>온라인 목표가 있으면 목표 설정과 겹치는 날짜의 온라인 평가를 유지하며, 없는 날짜만 추가합니다.</small></div>}
    <section className="panel goal-settings"><form onSubmit={settings} key={storageKey + String(ready) + board.title + board.days}><label>목표 이름<input name="title" maxLength={80} required defaultValue={board.title} /></label><label>수행일 수<input name="days" type="number" min={1} max={365} required defaultValue={board.days} /></label><button className="primary" disabled={!ready || saving}>목표 설정 저장</button></form><small>1~365칸 · 목표를 바꿔도 날짜별 평가는 유지됩니다.</small></section>
    <section className="panel journey-panel" aria-label="목표 진행 보드"><div className="journey-heading"><div><span className="goal-eyebrow">MY JOURNEY</span><h2>{board.title}</h2></div><strong data-testid="goal-position">{position} / {board.days}칸</strong></div>
      <div className="journey-status" role="status">{position === board.days ? '목표 도착! 꾸준한 선택이 결실을 맺었어요.' : `목표까지 ${board.days - position}칸 · ${count}일 평가`}</div>
      <JourneyScene days={board.days} position={position} />
      <p className="journey-rule">＋ 오른쪽 1칸 · 스테이 유지 · － 왼쪽 1칸<br/>START 아래로 내려가지 않으며 목표를 넘지 않습니다.</p>
    </section>
    <section className="panel encouragement-card" aria-label="오늘의 격려"><div><span className="goal-eyebrow">MAKE YOUR NEXT MEAL COUNT</span><h2>다음 한 끼, 계획대로 실천하세요</h2><p aria-live="polite">{encouragementText}</p></div><button className="text-button" onClick={()=>setEncouragementIndex(index=>index+1)}>다른 격려 보기 →</button></section>
    <div className="goal-tools"><section className="panel rating-panel"><span className="goal-eyebrow">DAILY CHECK-IN</span><h2>하루 식단 평가</h2><label>평가 날짜<input type="date" value={date} max={dateKey(new Date())} onChange={e => { setDate(e.target.value); setMessage(''); }} /></label><div className="rating-buttons" role="group" aria-label="식단 평가">{([[-1, '－', '아쉬웠어요'], [0, '스테이', '유지했어요'], [1, '＋', '잘 지켰어요']] as const).map(([value, label, detail]) => <button key={value} disabled={!ready || saving} aria-pressed={board.ratings[date] === value} onClick={() => rate(value)}><strong>{label}</strong><small>{detail}</small></button>)}</div><p>날짜마다 한 번 반영됩니다. 다시 선택하면 평가를 수정하고 진행 위치를 다시 계산합니다.</p>
      {failures > 0 && <div className={`failure-notice ${failures >= 3 ? 'firm' : ''}`} role="status"><strong>－ 평가 누적 {failures}일</strong><p>{board.ratings[date] === -1 ? encouragementText : '이전의 과식이 반복되지 않도록 다음 식사의 메뉴와 분량을 미리 정하세요.'}</p></div>}
      {error && <p className="notice" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
      <details className="rating-history"><summary>평가 기록 ({count}일)</summary>{Object.entries(board.ratings).sort(([a], [b]) => b.localeCompare(a)).map(([day, rating]) => <button key={day} onClick={() => { setDate(day); setMessage('날짜를 선택했습니다. 위에서 평가를 수정하세요.'); }}>{day}<span>{rating === 1 ? '＋' : rating === 0 ? '스테이' : '－'}</span></button>)}</details>
    </section></div>
  </div>;
}
