import { useEffect, useRef, useState } from 'react';
import { Timer } from 'lucide-react';

export default function RestTimer() {
  const [duration, setDuration] = useState(90), [remaining, setRemaining] = useState(90000), [running, setRunning] = useState(false), [done, setDone] = useState(false);
  const deadline = useRef(0);
  useEffect(() => {
    if (!running) return;
    const tick = () => { const next = Math.max(0, deadline.current - Date.now()); setRemaining(next); if (!next) { setRunning(false); setDone(true); } };
    tick(); const timer = window.setInterval(tick, 200); return () => clearInterval(timer);
  }, [running]);
  function choose(seconds: number) { setDuration(seconds); setRemaining(seconds * 1000); setRunning(false); setDone(false); }
  const seconds = Math.ceil(remaining / 1000);
  return <section className={`panel rest-timer ${done ? 'timer-done' : ''}`} aria-label="운동 휴식 타이머"><Timer size={26}/><span className="goal-eyebrow">TAKE A BREATH</span><h2>운동 휴식 타이머</h2><p>잠깐 숨을 고르고, 다음 세트를 준비하세요.</p><div className="timer-presets" role="group" aria-label="휴식 시간">{[90, 120, 180].map(value => <button key={value} aria-pressed={duration === value} onClick={() => choose(value)}>{value === 90 ? '90초' : `${value / 60}분`}</button>)}</div><div className="timer-digits" role="timer" aria-label="남은 휴식 시간">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</div><p role="status">{done ? '휴식 끝! 준비됐다면 다음 세트를 시작하세요.' : running ? '휴식 중이에요.' : '준비되면 시작하세요.'}</p><div className="timer-actions"><button className="primary" onClick={() => { if (running) { setRemaining(Math.max(0, deadline.current - Date.now())); setRunning(false); } else { const next = remaining > 0 ? remaining : duration * 1000; setRemaining(next); deadline.current = Date.now() + next; setDone(false); setRunning(true); } }}>{running ? '일시정지' : remaining < duration * 1000 && remaining > 0 ? '계속' : '시작'}</button><button className="text-button" onClick={() => choose(duration)}>초기화</button></div><small>화면을 이동하거나 새로고침하면 타이머가 초기화됩니다.</small></section>;
}
