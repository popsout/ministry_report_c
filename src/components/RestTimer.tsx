import { useEffect, useRef, useState } from 'react';
import { Timer } from 'lucide-react';
const KEY = 'chagok.rest-timer.v1';
type TimerState = { duration: number; remaining: number; deadline: number | null; done: boolean };
const initial = (): TimerState => ({duration:90,remaining:90000,deadline:null,done:false});
function read(): TimerState {
 try { const v=JSON.parse(localStorage.getItem(KEY)||'null'); if(v && [90,120,180].includes(v.duration) && Number.isFinite(v.remaining) && v.remaining>=0 && v.remaining<=180000 && (v.deadline===null || Number.isFinite(v.deadline)) && typeof v.done==='boolean')return v; } catch {}
 return initial();
}
export default function RestTimer() {
 const [state,setState]=useState(read), [now,setNow]=useState(Date.now), [notice,setNotice]=useState('');
 const [permission,setPermission]=useState(()=>typeof Notification==='undefined'?'unsupported':Notification.permission);
 const audio=useRef<AudioContext|null>(null);
 const {duration,deadline,done}=state, running=deadline!==null;
 const remaining=running?Math.max(0,deadline-now):state.remaining;
 function save(next:TimerState){try{localStorage.setItem(KEY,JSON.stringify(next));}catch{setNotice('브라우저 저장이 차단되어 새로고침 후 복원할 수 없습니다.');}setState(next);setNow(Date.now());}
 function unlock(){try{audio.current??=new AudioContext();void audio.current.resume().catch(()=>{});}catch{}}
 function beep(){try{const ctx=audio.current;if(!ctx || ctx.state!=='running')return;for(let i=0;i<4;i++){const osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime+i*.4;osc.frequency.setValueAtTime(i%2===0?1046:1318,t);gain.gain.setValueAtTime(.15,t);gain.gain.exponentialRampToValueAtTime(.001,t+.25);osc.connect(gain).connect(ctx.destination);osc.start(t);osc.stop(t+.3);}}catch{}}
 async function notify(){
  if(typeof Notification==='undefined' || Notification.permission!=='granted')return;
  try{const registration='serviceWorker' in navigator?await navigator.serviceWorker.getRegistration():undefined;
   if(registration)await registration.showNotification('차곡 · 휴식 끝!',{body:'다음 세트를 시작할 시간이에요.',tag:'chagok-rest',icon:new URL('icons/chagok-192.png',document.baseURI).href});
   else new Notification('차곡 · 휴식 끝!',{body:'다음 세트를 시작할 시간이에요.',tag:'chagok-rest'});
  }catch{setNotice('이 브라우저에서 시스템 알림을 표시하지 못했습니다. 화면에서 완료를 확인해 주세요.');}
 }
 useEffect(()=>{
  const sync=()=>{setState(read());setNow(Date.now());};
  const storage=(e:StorageEvent)=>{if(e.key===KEY || e.key===null)sync();};
  window.addEventListener('storage',storage);window.addEventListener('focus',sync);
  return()=>{window.removeEventListener('storage',storage);window.removeEventListener('focus',sync);};
 },[]);
 useEffect(()=>{
  if(deadline===null)return;
  function tick(){
   const current=Date.now();setNow(current);
   if(current>=deadline!){
    try { if(localStorage.getItem(KEY)){const stored=read();if(stored.deadline!==deadline){setState(stored);return;}} } catch {}
    save({...state,deadline:null,remaining:0,done:true});beep();void notify();
   }
  }
  tick();const id=window.setInterval(tick,200);
  document.addEventListener('visibilitychange',tick);
  return()=>{clearInterval(id);document.removeEventListener('visibilitychange',tick);};
 },[deadline]);
 function choose(seconds:number){save({duration:seconds,remaining:seconds*1000,deadline:null,done:false});}
 const seconds=Math.ceil(remaining/1000);
 return <section className={`panel rest-timer ${done?'timer-done':''}`} aria-label="운동 휴식 타이머"><Timer size={26}/><span className="goal-eyebrow">TAKE A BREATH</span><h2>운동 휴식 타이머</h2><p>잠깐 숨을 고르고, 다음 세트를 준비하세요.</p><div className="timer-presets" role="group" aria-label="휴식 시간">{[90,120,180].map(value=><button key={value} aria-pressed={duration===value} onClick={()=>choose(value)}>{value===90?'90초':`${value/60}분`}</button>)}</div><div className="timer-digits" role="timer" aria-label="남은 휴식 시간">{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</div><p role="status">{done?'휴식 끝! 준비됐다면 다음 세트를 시작하세요.':running?'휴식 중이에요.':'준비되면 시작하세요.'}</p><div className="timer-actions"><button className="primary" onClick={()=>{unlock();if(running)save({...state,deadline:null,remaining:Math.max(0,deadline-Date.now())});else {const next=remaining>0?remaining:duration*1000;save({...state,remaining:next,deadline:Date.now()+next,done:false});}}}>{running?'일시정지':remaining<duration*1000&&remaining>0?'계속':'시작'}</button><button className="text-button" onClick={()=>choose(duration)}>초기화</button></div>
 <button className="text-button" disabled={permission==='unsupported'||permission==='granted'} onClick={async()=>{unlock();try{const result=await Notification.requestPermission();setPermission(result);if(result==='denied')setNotice('브라우저 또는 휴대폰 설정에서 차곡의 알림을 허용해 주세요.');}catch{setNotice('이 브라우저에서 알림 권한을 요청할 수 없습니다.');}}}>{permission==='granted'?'완료 알림 허용됨':permission==='unsupported'?'이 브라우저는 시스템 알림을 지원하지 않습니다':'완료 알림 켜기'}</button>
 <p className="timer-help">화면 이동·새로고침 후에도 타이머가 유지됩니다. 시작 버튼을 누르면 완료 소리를 준비합니다.</p><small>카톡 사용·화면 잠금 중에도 종료 시각은 유지됩니다. 다만 휴대폰이 브라우저 실행을 멈추면 소리·알림은 복귀 후 울릴 수 있습니다. 앱을 완전히 종료한 상태의 정시 알람은 지원하지 않습니다.</small>{notice&&<p role="status">{notice}</p>}</section>;
}
