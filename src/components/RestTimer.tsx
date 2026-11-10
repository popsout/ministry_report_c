import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { newTimer, parseTimer, pauseTimer, remainingTime, resumeTimer, startTimer, TIMER_KEY, type RestTimerState } from '../lib/restTimer';
export default function RestTimer() {
  const [state, setState] = useState<RestTimerState>(() => { try { const raw = sessionStorage.getItem(TIMER_KEY); return raw ? parseTimer(raw) : newTimer(); } catch { return newTimer(); } });
  const [now, setNow] = useState(Date.now), [storageError, setStorageError] = useState(false);
  useEffect(() => { try { sessionStorage.setItem(TIMER_KEY, JSON.stringify(state)); setStorageError(false); } catch { setStorageError(true); } }, [state]);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick(); const timer = window.setInterval(tick, 200);
    window.addEventListener('focus', tick); document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); };
  }, []);
  const remaining = remainingTime(state, now), seconds = Math.ceil(remaining / 1000);
  const finished = state.started && remaining === 0, running = state.deadline !== null && !finished;
  const change = (next: RestTimerState) => { setNow(Date.now()); setState(next); };
  return <section id="rest-timer" className={`rest-timer ${finished ? 'timer-finished' : ''}`} aria-labelledby="rest-title">
    <div className="goal-section-label"><Timer size={18}/><h2 id="rest-title">운동 휴식 타이머</h2><span>REST & RESET</span></div>
    <p>숨을 고르고, 다음 세트를 준비하세요.</p>
    <div className="timer-presets" role="group" aria-label="바로 시작할 휴식 시간">{([90, 120, 180] as const).map(duration => <button key={duration} aria-pressed={state.duration === duration} onClick={() => change(startTimer(duration, Date.now()))}>{duration === 90 ? '1분 30초' : `${duration / 60}분`}</button>)}</div>
    <small>시간을 누르면 바로 시작하며, 진행 중인 타이머를 바꿉니다.</small>
    <div className="timer-clock" role="timer" aria-label="남은 휴식 시간">{Math.floor(seconds / 60).toString().padStart(2, '0')}<span>:</span>{(seconds % 60).toString().padStart(2, '0')}</div>
    <div className="timer-status" role="status">{finished ? '휴식 끝! 다음 세트를 시작하세요.' : running ? '충분히 쉬고, 다시 힘차게.' : state.started ? '일시정지 중' : '나만의 호흡으로 준비하세요.'}</div>
    <div className="timer-actions"><button className="primary" disabled={finished} onClick={() => change(running ? pauseTimer(state, Date.now()) : resumeTimer(state, Date.now()))}>{running ? <Pause size={17}/> : <Play size={17}/>}{running ? '일시정지' : state.started ? '재개' : '시작'}</button><button onClick={() => change(newTimer(state.duration))}><RotateCcw size={17}/>초기화</button></div>
    {storageError && <p role="alert">이 탭의 타이머를 저장하지 못했습니다. 새로고침하면 초기화됩니다.</p>}
    <p className="timer-footnote">화면에 돌아오면 종료 시각으로 남은 시간을 맞춥니다. 소리·잠금 화면 알림은 제공하지 않습니다.</p>
  </section>;
}
