import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Check, Flag, LogIn, Settings2, TrendingUp } from 'lucide-react';
import { goalPath, goalWarning, koreaDate, motivation, ratingLabels, setEvaluation, type Rating } from '../lib/goals';
import { useGoals, type GoalsSnapshot } from '../lib/useGoals';
import { supabase } from '../lib/supabase';
import FlagBear from './FlagBear';
import RestTimer from './RestTimer';
import './goals.css';
export default function GoalsDashboard({ userId, demo, onLogin, onLogout }: { userId?: string; demo: boolean; onLogin: () => void; onLogout: () => void }) {
  const store = useGoals(userId, demo), document = store.snapshot.document, plan = document.plan;
  const [today, setToday] = useState(koreaDate), [selected, setSelected] = useState(koreaDate);
  const [message, setMessage] = useState(''), [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: '나의 식단 실천', targetDays: 60, startDate: koreaDate(), action: '다음 한 끼부터, 내가 정한 식사 계획 지키기' });
  const [base, setBase] = useState<GoalsSnapshot | undefined>();
  const [motion, setMotion] = useState('idle'), [motionId, setMotionId] = useState(0);
  const board = useRef<HTMLDivElement>(null), editor = useRef<HTMLElement>(null);
  useEffect(() => { const tick = () => setToday(koreaDate()); const timer = window.setInterval(tick, 1000); window.addEventListener('focus', tick); return () => { window.clearInterval(timer); window.removeEventListener('focus', tick); }; }, []);
  useEffect(() => { if (plan && selected < plan.startDate) setSelected(plan.startDate); }, [plan, selected]);
  const path = goalPath(document, today), position = path.at(-1)?.position || 0, target = plan?.targetDays || 60;
  const complete = position === target, warning = goalWarning(document, today), signedOut = !!supabase && !userId && !demo;
  const canSave = store.loaded && !store.busy && !signedOut;
  const scrollToPosition = (value: number) => { const element = board.current; if (element) element.scrollTo({ left: value * 72 - element.clientWidth / 2 + 68, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); };
  useEffect(() => { scrollToPosition(position); }, [position, target]);
  useEffect(() => { if (editing) editor.current?.scrollIntoView({ block: 'center', behavior: 'instant' }); }, [editing]);
  function editPlan() { setDraft(plan || draft); setBase(store.snapshot); setMessage(''); setEditing(true); }
  async function savePlan(event: FormEvent) {
    event.preventDefault(); setMessage('');
    try {
      if (draft.startDate > today) throw Error('시작일은 오늘 또는 이전 날짜로 설정해 주세요.');
      const earliest = Object.keys(document.evaluations).sort()[0];
      if (earliest && draft.startDate > earliest) throw Error('기존 평가를 보존하려면 첫 평가일보다 늦게 시작할 수 없습니다.');
      const original = base || store.snapshot;
      await store.save({ ...original.document, plan: { ...draft, title: draft.title.trim(), action: draft.action.trim() } }, original);
      setEditing(false); setBase(undefined); setMessage('목표를 저장했습니다. 기존 날짜별 평가는 그대로 유지됩니다.');
    } catch (e) { setMessage(e instanceof Error ? e.message : '저장하지 못했습니다.'); }
  }
  async function evaluate(rating: Rating) {
    setMessage('');
    try {
      const next = setEvaluation(document, selected, rating, today);
      await store.save(next);
      const nextPath = goalPath(next, today), nextPosition = nextPath.at(-1)?.position || 0;
      setMotion(nextPosition === target && position < target ? 'celebrate' : rating); setMotionId(id => id + 1);
      setMessage(`${selected} ${ratingLabels[rating]} 평가를 저장했습니다. 같은 날짜는 한 번만 반영됩니다.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : '평가를 저장하지 못했습니다.'); }
  }
  const showEditor = store.loaded && (!plan || editing);
  return <div className="goals-dashboard">
    <div className="goal-page-heading"><div><span className="goal-eyebrow">ONE DAY, ONE STEP</span><h1>나를 위한 한 걸음<span>.</span></h1><p>오늘의 실천을 차곡차곡, 나만의 목표까지.</p></div><span className="goal-date">{today.replaceAll('-', '. ')}<small>한국 기준</small></span></div>
    <div className="goals-connection"><span>{demo ? '예시 모드 · 입력은 실제 기록에 저장되지 않습니다.' : !supabase ? '이 브라우저에 저장 중 · 다른 기기와 동기화되지 않습니다.' : signedOut ? '같은 계정으로 로그인하면 PC와 휴대폰의 목표를 함께 사용합니다.' : '온라인 목표 기록 · 같은 계정의 기기 간 동기화'}</span>{signedOut ? <button onClick={onLogin}><LogIn size={16}/>로그인</button> : supabase && !demo ? <><button disabled={store.busy} onClick={() => void store.load()}>새로고침</button><button disabled={store.busy} onClick={onLogout}>로그아웃</button></> : null}</div>
    <nav className="goal-shortcuts" aria-label="목표 관리 바로가기"><button onClick={() => window.document.getElementById('daily-evaluation')?.scrollIntoView({ block: 'start', behavior: 'instant' })}>오늘 평가하기 <ArrowRight size={14}/></button><button onClick={() => window.document.getElementById('rest-timer')?.scrollIntoView({ block: 'start', behavior: 'instant' })}>휴식 타이머로 이동 <ArrowRight size={14}/></button></nav>
    {store.error && <div className="goal-notice" role="alert">{store.error}<button disabled={store.busy} onClick={() => void store.load()}>다시 불러오기</button></div>}
    {!store.loaded && !store.error && !signedOut && <p role="status">목표 기록을 불러오는 중입니다.</p>}
    <div className="goal-main-grid"><div className="goal-main-column">
      <section className={`journey-panel ${complete ? 'journey-complete' : ''}`} aria-labelledby="journey-title">
        <div className="goal-section-label"><Flag size={18}/><h2 id="journey-title">식단 실천 보드</h2><span>MY JOURNEY</span></div>
        <div className="journey-heading"><div><h3>{plan?.title || '나만의 실천을 시작해요'}</h3><p>{plan?.action || '수행일 수를 정하고, 하루의 식단을 돌아보세요.'}</p></div><button className="plan-adjust" disabled={!canSave} onClick={editPlan}><Settings2 size={16}/>{plan ? '계획 조정' : '목표 설정하기'}</button></div>
        <div className="journey-progress"><div><strong data-testid="goal-position">{position}</strong><span>/ {target}칸</span></div><span>{complete ? '수행 목표 도달!' : `목표까지 ${target - position}칸`}</span></div>
        <div className="journey-overview" role="progressbar" aria-label="수행 목표 진행" aria-valuemin={0} aria-valuemax={target} aria-valuenow={position}><span style={{ width: `${position / target * 100}%` }}/></div>
        <div className="board-endpoints"><button onClick={() => scrollToPosition(0)}>START</button><span>한 번의 업, 한 칸의 전진</span><button onClick={() => scrollToPosition(target)}>목표 달성 <Flag size={13}/></button></div>
        <div className="journey-scroll" ref={board} tabIndex={0} aria-label="좌우로 이동하는 실천 보드"><div className="journey-track" style={{ width: (target + 1) * 72 + 48 }}>
          <div className="journey-line"/>
          <div className={`journey-character motion-${motion}`} style={{ left: position * 72 + 12 }} role="img" aria-label={`깃발 곰 현재 위치 ${position}칸`}><div key={motionId} className={`bear-action action-${motion}`}><FlagBear/></div><span>{complete ? '해냈다!' : position === 0 ? '여기서 시작!' : '잘 가고 있어!'}</span></div>
          <div className="journey-tiles" aria-hidden="true">{Array.from({ length: target + 1 }, (_, i) => <div key={i} className={`journey-tile ${i < position ? 'passed' : ''} ${i === position ? 'current' : ''} ${i === target ? 'finish' : ''}`}><span>{i === 0 ? 'START' : i === target ? <Flag size={20}/> : i}</span><small>{i === target ? 'GOAL' : i === position ? '현재' : ''}</small></div>)}</div>
        </div></div>
        <div className="board-navigation"><span>보드를 좌우로 밀어 모든 칸을 볼 수 있어요.</span><button onClick={() => scrollToPosition(position)}>현재 위치 보기 <ArrowRight size={14}/></button></div>
        {complete && <div className="goal-completion" role="status">깃발을 높이! 설정한 수행 목표에 도착했어요.</div>}
        <p className="goal-meaning">수행일 수는 순전진할 칸 수입니다. 스테이·다운에 따라 걸리는 날은 달라집니다. 체중 변화나 목표 체중 도달을 의미하지 않습니다.</p>
      </section>
      {showEditor && <section className="goal-plan-editor" ref={editor} aria-labelledby="plan-title"><div className="goal-section-label"><Settings2 size={18}/><h2 id="plan-title">{plan ? '계획 조정' : '첫 목표 설정'}</h2></div><form onSubmit={savePlan}>
        <label>목표 이름<input required maxLength={80} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })}/></label><div className="plan-inputs"><label>목표 수행일 수<input required type="number" aria-label="목표 수행일 수" min={1} max={365} value={draft.targetDays || ''} onChange={e => setDraft({ ...draft, targetDays: Number(e.target.value) })}/><small>1~365칸 · 나에게 맞는 길이로</small></label><label>시작일<input required type="date" min="2000-01-01" max={today} value={draft.startDate} onChange={e => setDraft({ ...draft, startDate: e.target.value })}/></label></div><label>실천할 식사 계획<textarea maxLength={500} rows={2} value={draft.action} onChange={e => setDraft({ ...draft, action: e.target.value })}/></label><p>칸 수나 계획을 바꿔도 기존 날짜별 평가는 보존됩니다.</p><div className="plan-actions">{plan && <button type="button" onClick={() => { setEditing(false); setBase(undefined); }}>취소</button>}<button className="primary" disabled={!canSave}><Check size={16}/>{store.busy ? '저장 중…' : '목표 저장'}</button></div>
      </form>{message && <p className="goal-feedback" role="status">{message}</p>}</section>}
      {warning && document.dismissedOn !== today && <section className={`goal-warning warning-${warning.level}`} aria-label="실천 흐름 알림"><strong>{warning.title}</strong><p>{warning.message}</p><div><button disabled={!canSave} onClick={editPlan}>계획 조정</button><button disabled={!canSave} onClick={() => { void store.save({ ...document, dismissedOn: today }).catch(e => setMessage(e.message)); }}>오늘 닫기</button></div></section>}
      <section id="daily-evaluation" className="daily-evaluation" aria-labelledby="evaluation-title"><div className="goal-section-label"><TrendingUp size={18}/><h2 id="evaluation-title">하루 식단 평가</h2><span>DAILY CHECK-IN</span></div><div className="evaluation-heading"><p>완벽한 하루보다, 솔직한 한 번의 기록.</p><label>평가 날짜<input type="date" aria-label="평가 날짜" min={plan?.startDate || '2000-01-01'} max={today} value={selected} onChange={e => setSelected(e.target.value)}/></label></div>
        <div className="rating-buttons" role="group" aria-label="식단 수행 평가">{(['up', 'stay', 'down'] as Rating[]).map(rating => <button className={`rating-${rating}`} aria-label={ratingLabels[rating]} key={rating} disabled={!plan || !canSave || !selected || selected > today || selected < (plan?.startDate || '')} aria-pressed={document.evaluations[selected] === rating} onClick={() => void evaluate(rating)}><strong>{rating === 'up' ? '＋' : rating === 'stay' ? '→' : '－'}</strong><span>{ratingLabels[rating]}</span><small>{rating === 'up' ? '계획대로 실천 · 한 칸 전진' : rating === 'stay' ? '현재 위치 유지' : '계획에서 벗어남 · 한 칸 후진'}</small></button>)}</div>
        <p className="daily-motivation">{motivation(document, selected)}</p><p className="evaluation-help">하루 한 건 · 다시 누르면 해당 날짜의 평가를 수정합니다. 미기록일은 실패가 아닙니다.</p>
        {message && !showEditor && <p className="goal-feedback" role="status">{message}</p>}
      </section>
      <section className="evaluation-history" aria-labelledby="history-title"><div className="goal-section-label"><Check size={18}/><h2 id="history-title">차곡차곡 쌓인 기록</h2><span>{path.length}일 평가</span></div>{path.length ? <><p>날짜를 누르면 평가를 바꿀 수 있어요. 과거 평가를 바꾸면 이후 경로도 다시 계산합니다.</p><div className="history-list">{path.slice().reverse().map(item => <button key={item.date} onClick={() => { setSelected(item.date); window.document.getElementById('evaluation-title')?.scrollIntoView({ block: 'center', behavior: 'instant' }); }}><time>{item.date}</time><span className={`history-rating rating-${item.rating}`}>{ratingLabels[item.rating]}</span><span>{item.position}칸</span><ArrowRight size={14}/></button>)}</div></> : <p className="history-empty">아직 평가가 없어요. 첫 한 걸음을 남겨보세요.</p>}</section>
    </div><aside className="goal-side-column"><RestTimer/><div className="goal-side-note"><FlagBear/><strong>속도보다 방향.</strong><p>오늘의 작은 실천 하나가<br/>내일의 나를 움직입니다.</p><span>한 끼씩, 한 걸음씩.</span></div></aside></div>
  </div>;
}
