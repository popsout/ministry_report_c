import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, DoorOpen, LayoutDashboard, Leaf, Mail, Plus, RefreshCw, Store, Trash2, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useCloudJournal } from './lib/cloudJournal';
import { JOURNAL_KEY, readJournal, writeJournal } from './lib/localJournal';
import { calendarDays, donutProgress, monthlyGoalProgress, dateKey, formatTime, monthKey, summarize, TYPES, type Entry, type MonthSetting, type Role } from './lib/domain';

const today = new Date();
const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];
const ICONS = [DoorOpen, Mail, Store];
const ROLES: Role[] = ['일반', '보조 파이오니아', '정규 파이오니아'];
function demoEntries(): Entry[] {
  return [ [2,'호별',120], [4,'편지',45], [7,'호별',150], [10,'전시대',120], [13,'호별',90], [16,'편지',45], [19,'호별',120], [22,'전시대',60] ].map(([day, type, mins],i) => ({id:`demo-${i}`, user_id:'demo', service_date: dateKey(new Date(today.getFullYear(),today.getMonth(),Number(day))), service_type:type as Entry['service_type'], minutes:Number(mins), note:'', updated_at:''}));
}
export default function App() {
  const demo = new URLSearchParams(window.location.search).get('preview') === '1';
  const [initial] = useState(readJournal);
  const rawRef = useRef(initial.raw);
  const [entries,setEntries] = useState<Entry[]>(demo ? demoEntries : supabase ? [] : initial.data.entries);
  const [settings,setSettings] = useState<MonthSetting[]>(demo ? [{month:monthKey(today),role:'보조 파이오니아',updated_at:''}] : supabase ? [] : initial.data.settings);
  const [month,setMonth] = useState(new Date(today.getFullYear(),today.getMonth(),1));
  const [selected,setSelected] = useState(dateKey(today));
  const [scope,setScope] = useState<'month'|'all'>('month');
  const [modal,setModal] = useState<'auth'|'day'|'entry'|null>(null);
  const [editing,setEditing] = useState<Entry|null>(null);
  const entryFromDay = useRef(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice] = useState(demo ? '' : initial.error);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cloud=useCloudJournal(data=>{if(supabase){setEntries(data.entries);setSettings(data.settings);}});
  const online=!!supabase;
  useEffect(()=>{
    if(!online)return;
    setModal(null);setEditing(null);setNotice('');entryFromDay.current=false;
  },[online,cloud.session?.user.id]);
  async function logout(){
    if(!supabase)return;
    const {error}=await supabase.auth.signOut({scope:'local'});
    if(error)setNotice('로그아웃하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.');
  }
  async function persist(nextEntries: Entry[], nextSettings: MonthSetting[]) {
    try {
      if(online){setBusy(true);await cloud.save({version:1,entries:nextEntries,settings:nextSettings});}
      else if(!demo) {
        if(initial.error)throw new Error(initial.error);
        rawRef.current=writeJournal({version:1,entries:nextEntries,settings:nextSettings},rawRef.current);
      }
      setEntries(nextEntries);setSettings(nextSettings);return true;
    } catch(error){setNotice(error instanceof Error ? error.message : '저장하지 못했습니다.');return false;}finally{setBusy(false);}
  }
  useEffect(()=>{
    if(demo || online)return;
    const refresh=(event: StorageEvent)=>{
      if(event.key!==JOURNAL_KEY && event.key!==null)return;
      const next=readJournal();
      if(next.error){setNotice(next.error);return;}
      rawRef.current=next.raw;setEntries(next.data.entries);setSettings(next.data.settings);
    };
    window.addEventListener('storage',refresh);
    return ()=>window.removeEventListener('storage',refresh);
  },[demo,online]);
  useEffect(()=>{const el=dialogRef.current;if(modal && el && !el.open)el.showModal();else if(modal && el?.open)el.querySelector<HTMLElement>('button:not(:disabled),input')?.focus();else if(!modal && el?.open)el.close();},[modal]);
  const monthEntries = entries.filter(e=>e.service_date.startsWith(monthKey(month).slice(0,7)));
  const stats = summarize(scope==='month'?monthEntries:entries);
  const monthly = summarize(monthEntries);
  const activeDays = new Set(monthEntries.map(e=>e.service_date)).size;
  const setting = settings.find(s=>s.month===monthKey(month));
  const role = setting?.role || '일반';
  const auxiliaryGoalHours = setting?.auxiliaryGoalHours ?? 15;
  const goal = monthlyGoalProgress(role,monthly.total,auxiliaryGoalHours);
  const daily = entries.filter(e=>e.service_date===selected);
  function shiftMonth(amount:number){const next=new Date(month.getFullYear(),month.getMonth()+amount,1);setMonth(next);setSelected(dateKey(next));}
  function openEntry(entry:Entry|null=null){if(online && !cloud.session){setModal('auth');return;}entryFromDay.current=modal==='day';setEditing(entry);setModal('entry');setNotice('');}
  async function updateRole(next:Role){
    if(online && !cloud.session){setModal('auth');return;}
    const key=monthKey(month);setNotice('');
    persist(entries,[...settings.filter(s=>s.month!==key),{...setting,month:key,role:next,updated_at:new Date().toISOString()}]);
  }
  async function updateGoal(hours:15|30){
    if(hours===auxiliaryGoalHours)return;
    if(!window.confirm(`${month.getFullYear()}년 ${month.getMonth()+1}월 보조 파이오니아 목표를 ${auxiliaryGoalHours}시간에서 ${hours}시간으로 변경할까요?`))return;
    const key=monthKey(month);setNotice('');
    persist(entries,[...settings.filter(s=>s.month!==key),{...setting,month:key,role,auxiliaryGoalHours:hours,updated_at:new Date().toISOString()}]);
  }
  async function saveEntry(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=new FormData(event.currentTarget);
    const minutes=Number(form.get('hours'))*60+Number(form.get('minutes'));
    if(minutes===0){setNotice('봉사 시간을 15분 이상 선택해 주세요.');return;}
    const payload={service_date:String(form.get('date')),service_type:String(form.get('type')) as Entry['service_type'],minutes,note:String(form.get('note')).trim()};
    setNotice('');
    if(editing && entries.find(e=>e.id===editing.id)?.updated_at!==editing.updated_at){setNotice('다른 탭에서 이 기록이 변경됐습니다. 창을 닫고 최신 기록을 다시 열어 주세요.');return;}
    const next=[...entries.filter(e=>e.id!==editing?.id),{...payload,id:editing?.id || crypto.randomUUID(),user_id:'local',updated_at:new Date().toISOString()}];
    if(await persist(next,settings)){
      setSelected(payload.service_date);setMonth(new Date(`${payload.service_date.slice(0,7)}-01T12:00:00`));setModal(entryFromDay.current?'day':null);
    }
  }
  async function deleteEntry(){
    if(!editing || !window.confirm('이 봉사 기록을 삭제할까요?'))return;
    if(entries.find(e=>e.id===editing.id)?.updated_at!==editing.updated_at){setNotice('다른 탭에서 이 기록이 변경됐습니다. 최신 기록을 다시 열어 주세요.');return;}
    if(await persist(entries.filter(e=>e.id!==editing.id),settings))setModal(entryFromDay.current?'day':null);
  }
  async function resetEntries(scope:'day'|'month'){
    const prefix=monthKey(month).slice(0,7);
    const matches=(entry:Entry)=>scope==='day' ? entry.service_date===selected : entry.service_date.startsWith(prefix);
    const count=entries.filter(matches).length;
    if(!count)return;
    const label=scope==='day' ? `${selected.slice(0,4)}년 ${Number(selected.slice(5,7))}월 ${Number(selected.slice(8))}일` : `${month.getFullYear()}년 ${month.getMonth()+1}월`;
    if(!window.confirm(`${label}의 봉사 기록 ${count}건을 모두 삭제할까요?\n삭제한 기록은 되돌릴 수 없습니다. 월별 파이오니아 설정은 유지됩니다.`))return;
    setNotice('');persist(entries.filter(entry=>!matches(entry)),settings);
  }
  let barEnd=0;
  const goalBarGradient=`linear-gradient(to right, ${monthly.types.map((item,i)=>{const start=barEnd;barEnd+=item.percent;return `${COLORS[i]} ${start}% ${barEnd}%`;}).join(',')})`;
  const chartGoal=scope==='month' ? goal : null;
  const chart=donutProgress(stats.types.map(item=>item.minutes),chartGoal?.targetMinutes);
  let end=0;
  const stops=chart.portions.map((portion,i)=>{const start=end;end=Math.min(100,end+portion);return `${COLORS[i]} ${start}% ${end}%`;});
  stops.push(`var(--tint-strong) ${chart.filledPercent}% 100%`);
  const chartLabel=(chartGoal ? `목표 ${formatTime(chartGoal.targetMinutes)}, ${formatTime(stats.total)} 봉사, ${chartGoal.percent}% 달성, 남은 시간 ${formatTime(chartGoal.remainingMinutes)}. ` : '')+stats.types.map(t=>`${t.type} ${formatTime(t.minutes)}`).join(', ');
  return <div className={`app theme-${role==='일반'?'normal':role==='보조 파이오니아'?'aux':'regular'}`}>
    <aside className="sidebar"><a className="brand" href="#"><span className="brand-mark"><Leaf size={22}/></span>차곡<span className="brand-dot">.</span></a><span className="brand-caption">나의 작은 기록, 소중한 시간</span><div className="nav-label">MY WORKSPACE</div><a className="nav-item active" href="#calendar"><LayoutDashboard size={19}/>나의 봉사 기록</a><div className="sidebar-bottom"><div className="sidebar-note"><BookOpen size={22}/><p>하루의 봉사를<br/>차곡차곡 담아보세요.</p><span>작은 기록이 모여<br/>의미 있는 여정이 됩니다.</span></div><div className="profile"><span className="avatar">나</span><div><strong>나의 기록장</strong><small>{demo?'예시 화면':online?'온라인 기록장':'이 브라우저에 저장'}</small></div><Check size={18}/></div></div></aside>
    <main><header className="topbar"><span className="breadcrumb">나의 공간 <span>/</span> 봉사 기록</span><span className="sync"><span className="status-dot online"/>{demo?'예시 데이터':online?cloud.status:'이 브라우저에 저장'}</span></header>
    <div className="content"><div className="page-title"><div><h1 className="journal-title">My Ministry Journal</h1><p>소중한 시간을 기록하고, 나의 봉사를 돌아보세요.</p></div><button className="primary" disabled={busy || (online && cloud.session!==null && !cloud.loaded)} onClick={()=>openEntry()}><Plus size={18}/>봉사 기록하기</button></div>
    <div className="connection-banner"><BookOpen size={19}/><span>{demo?'예시 화면입니다. 연습한 내용은 새로고침하면 사라지며 실제 기록과 섞이지 않습니다.':online?(cloud.session?'같은 계정으로 로그인한 PC와 휴대폰에서 기록을 공유합니다.':'이메일로 로그인하면 PC와 휴대폰에서 같은 기록을 사용할 수 있어요.'):'기록은 현재 기기의 이 브라우저에 저장됩니다. 브라우저 데이터를 지우면 기록도 삭제됩니다.'}</span>{online && !cloud.session && <button onClick={()=>setModal('auth')}>로그인</button>}{online && cloud.session && <><button onClick={()=>void cloud.load()}>새로고침</button><button disabled={busy} onClick={()=>void logout()}>로그아웃</button></>}<a className="preview-link" href={demo?window.location.pathname:'?preview=1'}>{demo?'내 기록으로':'예시 화면 보기'}<ArrowUpRight size={15}/></a></div>
    {online && cloud.error && <p className="notice" role="alert">{cloud.error}</p>}
    {notice && !modal && <div role="alert" className="notice">{notice}</div>}
    <section className="month-toolbar"><div className="month-switch"><h2>{month.getFullYear()}년 {month.getMonth()+1}월</h2><button className="icon-button" aria-label="이전 달" onClick={()=>shiftMonth(-1)}><ChevronLeft size={18}/></button><button className="icon-button" aria-label="다음 달" onClick={()=>shiftMonth(1)}><ChevronRight size={18}/></button><button className="today-button" onClick={()=>{setMonth(new Date(today.getFullYear(),today.getMonth(),1));setSelected(dateKey(today));}}>이번 달</button></div><label className="role-select"><span className="role-dot"/><select aria-label="이 달의 파이오니아 신분" disabled={busy || (online && !cloud.loaded)} value={role} onChange={e=>void updateRole(e.target.value as Role)}>{ROLES.map(r=><option key={r}>{r}</option>)}</select></label></section>
    <section className="summary-grid"><div className="summary-card"><span className="summary-icon purple"><Clock3 size={21}/></span><span className="card-label">이번 달 총 봉사시간</span><strong className="summary-time"><span>{Math.floor(monthly.total/60)}<small>시간</small></span>{monthly.total%60>0&&<span>{monthly.total%60}<small>분</small></span>}</strong><span className="card-foot">한 번의 봉사도 소중하게</span></div><div className="summary-card"><span className="summary-icon peach"><CalendarDays size={21}/></span><span className="card-label">봉사한 날</span><strong>{activeDays}<small>일</small></strong><span className="card-foot">이번 달, 봉사에 참여한 날짜</span></div><div className="summary-card"><span className="summary-icon green"><BookOpen size={21}/></span><span className="card-label">봉사 기록 횟수</span><strong>{monthly.count}<small>회</small></strong><span className="card-foot">봉사 형태별 기록 1건 = 1회</span></div></section>
    <div className="workspace"><section className="panel calendar-panel" id="calendar"><div className="panel-heading"><div className="heading-actions"><h3>봉사 캘린더</h3>{role==='보조 파이오니아' && <div className="goal-options" role="group" aria-label="보조 파이오니아 월 목표">{([15,30] as const).map(hours=><button key={hours} className="goal-option" disabled={busy} aria-pressed={auxiliaryGoalHours===hours} onClick={()=>updateGoal(hours)}>{hours}시간</button>)}</div>}{role==='정규 파이오니아' && <span className="goal-fixed">50시간</span>}<button className="reset-button" disabled={busy || !monthEntries.length} onClick={()=>resetEntries('month')}>월간 초기화</button></div><span className="subtle"><span className="mini-dot"/>날짜를 눌러 기록을 확인하세요</span></div><div className="calendar-theme-strip"><Leaf size={15}/>{role==='일반'?'나만의 속도로, 꾸준히 쌓아가는 시간':`${role}로 함께하는 ${month.getMonth()+1}월`}<span>{role}</span></div>{goal && <section className="goal-summary" aria-label="이번 달 목표 달성 현황"><div className="goal-metrics"><div><small>이번 달 목표</small><strong>{formatTime(goal.targetMinutes)}</strong></div><div><small>남은 봉사시간</small><strong>{formatTime(goal.remainingMinutes)}</strong></div><div><small>달성률</small><strong>{goal.percent}%</strong></div></div><div className="goal-progress" role="progressbar" aria-label="이번 달 목표 달성률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,goal.percent)} aria-valuetext={`${goal.percent}% 달성`}><span style={{width:`${Math.min(100,goal.percent)}%`,background:goalBarGradient}}/></div><p>{goal.achieved?'이번 달 목표를 달성했어요!':`${formatTime(monthly.total)} 기록 · 목표까지 ${formatTime(goal.remainingMinutes)} 남았어요.`}</p></section>}<div className="weekdays">{'일 월 화 수 목 금 토'.split(' ').map((d,i)=><span className={i===0?'sunday':''} key={d}>{d}</span>)}</div><div className="calendar-grid">{calendarDays(month).map(day=>{const key=dateKey(day);const dayEntries=entries.filter(e=>e.service_date===key);const mins=dayEntries.reduce((s,e)=>s+e.minutes,0);return <button key={key} className={`day ${day.getMonth()!==month.getMonth()?'outside':''} ${key===selected?'selected':''} ${key===dateKey(today)?'is-today':''}`} aria-label={`${key}, ${formatTime(mins)}${dayEntries.length ? ', ' + TYPES.filter(t=>dayEntries.some(e=>e.service_type===t)).join(', ') : ''}`} aria-pressed={key===selected} onClick={()=>{setSelected(key);setNotice('');setModal('day');if(day.getMonth()!==month.getMonth())setMonth(new Date(day.getFullYear(),day.getMonth(),1));}}><span className={`day-number ${day.getDay()===0?'sunday':''}`}>{day.getDate()}</span>{mins>0&&<><span className="day-time">{formatTime(mins)}</span><span className="day-dots" aria-hidden="true">{TYPES.filter(t=>dayEntries.some(e=>e.service_type===t)).map(t=><i key={t} data-service-type={t} title={`${t} 봉사`} style={{color:COLORS[TYPES.indexOf(t)]}}/>)}</span></>}</button>;})}</div><div className="calendar-footer"><div className="calendar-service-legend" aria-label="봉사 종류 색상 안내">{TYPES.map((type,i)=><span key={type}><i aria-hidden="true" style={{color:COLORS[i]}}/>{type}</span>)}</div><span>총 {activeDays}일의 소중한 기록</span></div></section>
    <section className="panel stats-panel"><div className="panel-heading"><h3>{chartGoal?'목표 달성과 봉사 구성':'봉사 형태별 비율'}</h3><ArrowUpRight size={17} className="muted"/></div><div className="scope-control"><button className={scope==='month'?'chosen':''} onClick={()=>setScope('month')}>이번 달</button><button className={scope==='all'?'chosen':''} onClick={()=>setScope('all')}>전체 기록</button></div><p className="ratio-caption"><Clock3 size={13}/>{chartGoal?`원 한 바퀴 = 목표 ${formatTime(chartGoal.targetMinutes)}`:'봉사 시간 기준으로 계산해요'}</p><div className="donut" role="img" aria-label={chartLabel} style={{background:`conic-gradient(${stops.join(',')})`}}><div><small>{chartGoal?`목표 ${formatTime(chartGoal.targetMinutes)}`:'총 봉사시간'}</small><strong>{Math.floor(stats.total/60)}<span>시간</span></strong><small>{chartGoal?`${stats.total%60 ? `${stats.total%60}분 · ` : ''}${chartGoal.percent}% 달성`:(stats.total%60?`${stats.total%60}분`:'차곡차곡 쌓인 시간')}</small></div></div>{chartGoal && <div className="donut-status">{chartGoal.achieved?(stats.total>chartGoal.targetMinutes?`목표 달성 · ${formatTime(stats.total-chartGoal.targetMinutes)} 초과`:'목표 달성!'):`남은 시간 ${formatTime(chartGoal.remainingMinutes)}`}<span><i/>아직 채우지 않은 목표 시간</span></div>}<div className="legend"><p className="legend-heading">봉사 시간 구성비</p>{stats.types.map((item,i)=><div className="legend-row" key={item.type}><span className="legend-dot" style={{background:COLORS[i]}}/><div><strong>{item.type}</strong><small>{formatTime(item.minutes)} · {item.count}회</small></div><b>{item.percent.toFixed(1)}<small>%</small></b></div>)}</div><div className="count-total"><span>총 봉사 기록 횟수</span><strong>{stats.count}회</strong></div></section></div>
    <footer className="page-footer"><span><Leaf size={13}/>차곡, 나의 봉사 여정</span><span>작은 시간도 소중하게 기록해요.</span></footer></div></main>
    <dialog aria-labelledby="record-dialog-title" ref={dialogRef} onCancel={e=>{if(busy){e.preventDefault();return;}setModal(null);}} onClose={()=>setModal(null)}><div className="dialog-header"><div className="heading-actions">{modal==='entry' && entryFromDay.current && <button className="icon-button" aria-label="날짜 기록으로 돌아가기" onClick={()=>{setModal('day');setNotice('');}}><ChevronLeft size={19}/></button>}<h2 id="record-dialog-title">{modal==='auth'?'온라인 기록장 로그인':modal==='day'?`${Number(selected.slice(5,7))}월 ${Number(selected.slice(8))}일의 기록`:(editing?'봉사 기록 수정':'봉사 기록하기')}</h2>{modal==='day' && <button className="reset-button" disabled={busy || !daily.length} onClick={()=>resetEntries('day')}>일간 초기화</button>}</div><button className="icon-button" aria-label="닫기" disabled={busy} onClick={()=>setModal(null)}><X size={21}/></button></div>
    {modal==='auth' && <EmailAuth onDone={()=>setModal(null)}/>}
    {modal==='day' && (!online || cloud.session) && <div className="day-detail"><div className="day-toolbar"><span>총 {formatTime(daily.reduce((sum,e)=>sum+e.minutes,0))} · {daily.length}회</span><button className="text-button" onClick={()=>openEntry()}><Plus size={16}/>기록 추가</button></div>{daily.length?daily.map(e=>{const Icon=ICONS[TYPES.indexOf(e.service_type)];return <button className="entry-row" key={e.id} onClick={()=>openEntry(e)}><span className="entry-icon" style={{color:COLORS[TYPES.indexOf(e.service_type)]}}><Icon size={19}/></span><div><strong>{e.service_type} 봉사</strong><small>{e.note || '소중한 봉사의 기록'}</small></div><b>{formatTime(e.minutes)}</b><ChevronRight size={17}/></button>;}):<div className="empty-state"><CalendarDays size={24}/><span>아직 기록이 없는 날이에요.</span><button className="text-button" onClick={()=>openEntry()}>첫 기록 남기기<ArrowUpRight size={14}/></button></div>}{notice && <p className="notice" role="alert">{notice}</p>}</div>}
    {modal==='entry' && (!online || cloud.session) && <form key={editing?.id||'new'} onSubmit={saveEntry} className="entry-form">{demo&&<p className="demo-note">미리보기 모드 · 입력 내용은 온라인에 저장되지 않아요.</p>}<label>봉사한 날짜<input required type="date" name="date" defaultValue={editing?.service_date||selected}/></label><fieldset><legend>봉사 형태</legend><div className="type-options">{TYPES.map((t,i)=>{const Icon=ICONS[i];return <label key={t}><input type="radio" name="type" value={t} defaultChecked={editing?editing.service_type===t:i===0}/><span><Icon size={19}/>{t}</span></label>;})}</div></fieldset><fieldset><legend>봉사 시간</legend><div className="time-selects"><label><select name="hours" aria-label="시간" defaultValue={editing?Math.floor(editing.minutes/60):2}><option value="0">시간 없음 (분만)</option>{Array.from({length:8},(_,i)=><option value={i+1} key={i}>{i+1}시간</option>)}</select></label><label><select name="minutes" aria-label="분" defaultValue={editing?editing.minutes%60:0}>{[0,15,30,45].map(n=><option value={n} key={n}>{n}분</option>)}</select></label></div></fieldset><label>메모 <small>선택 사항</small><textarea name="note" maxLength={500} rows={3} placeholder="짧은 메모를 남겨보세요." defaultValue={editing?.note}/></label>{notice&&<p className="notice" role="alert">{notice}</p>}<div className="form-actions">{editing&&<button type="button" className="delete-button" disabled={busy} onClick={()=>void deleteEntry()}><Trash2 size={17}/>삭제</button>}<button className="primary" disabled={busy}>{busy?<RefreshCw size={17}/>:<Check size={17}/>}기록 저장</button></div></form>}
    </dialog>
  </div>;
}

function EmailAuth({onDone}:{onDone:()=>void}){
  const [signup,setSignup]=useState(false),[waiting,setWaiting]=useState(false),[message,setMessage]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!supabase)return;setWaiting(true);setMessage('');
    const form=new FormData(event.currentTarget);const email=String(form.get('email'));const password=String(form.get('password'));
    if(signup && password!==String(form.get('passwordConfirm'))){setMessage('두 비밀번호가 일치하지 않습니다.');setWaiting(false);return;}
    try{
      const {data,error}=signup?await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+window.location.pathname}}):await supabase.auth.signInWithPassword({email,password});
      if(error)setMessage(signup?'계정을 만들지 못했습니다. 이메일과 비밀번호를 확인한 뒤 다시 시도해 주세요.':'로그인하지 못했습니다. 이메일 인증과 비밀번호를 확인해 주세요.');
      else if(data.session)onDone();else setMessage('인증 메일을 확인한 후 이 화면으로 돌아와 로그인해 주세요.');
    }catch{setMessage('서버에 접속하지 못했습니다. 네트워크를 확인해 주세요.');}finally{setWaiting(false);}
  }
  return <form className="entry-form" onSubmit={submit}><p className="auth-description">이 앱 전용 계정을 사용합니다. Gmail 주소도 가능해요.<br/><strong>구글 비밀번호 대신, 이 앱만의 새 비밀번호를 사용하세요.</strong></p><label>이메일<input name="email" type="email" required autoComplete="email"/></label><label>{signup?'새 앱 전용 비밀번호 (12자 이상)':'앱 전용 비밀번호'}<input name="password" type="password" required minLength={signup?12:8} autoComplete={signup?'new-password':'current-password'}/></label>{signup && <label>새 비밀번호 확인<input name="passwordConfirm" type="password" required minLength={12} autoComplete="new-password"/></label>}{message&&<p className="notice" role="status">{message}</p>}<button className="primary" disabled={waiting}>{waiting?'처리 중…':signup?'내 기록장 계정 만들기':'로그인'}</button><button type="button" className="text-button" onClick={()=>{setSignup(!signup);setMessage('');}}>{signup?'이미 계정이 있어요':'처음이라면 계정 만들기'}</button></form>;
}
