import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Crown, Download, ExternalLink, LockKeyhole, ShieldCheck, WifiOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseBibleEvents, scriptureLink, type BibleEvent } from '../lib/bible';
import { deleteBibleVault, listBibleVaults, saveBibleVault, unlockBibleVault, type Vault } from '../lib/bibleVault';

type Status='loading'|'login'|'setup'|'denied'|'ready'|'offline'|'error';
export default function BibleReader({userId,authReady,onLogin}:{userId?:string;authReady:boolean;onLogin:()=>void}){
 const [connected,setConnected]=useState(navigator.onLine),[refresh,setRefresh]=useState(0);
 const [status,setStatus]=useState<Status>('loading'),[events,setEvents]=useState<BibleEvent[]>([]),[owner,setOwner]=useState<string>();
 const [vaults,setVaults]=useState<Vault[]>([]),[vaultId,setVaultId]=useState(''),[unlocked,setUnlocked]=useState(false);
 const [era,setEra]=useState<string|null>(null),[eventId,setEventId]=useState(''),[saving,setSaving]=useState(false),[saveForm,setSaveForm]=useState(false),[message,setMessage]=useState('');
 const epoch=useRef(0),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;epoch.current++;};},[]);
 useEffect(()=>{
  const online=()=>{setConnected(navigator.onLine);setRefresh(v=>v+1);};
  const visible=()=>{epoch.current++;setEvents([]);setUnlocked(false);setMessage('');setSaveForm(false);setRefresh(v=>v+1);};
  window.addEventListener('online',online);window.addEventListener('offline',online);document.addEventListener('visibilitychange',visible);window.addEventListener('focus',online);
  return()=>{window.removeEventListener('online',online);window.removeEventListener('offline',online);document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',online);};
 },[]);
 useEffect(()=>{
  const generation=++epoch.current;let active=true;
  setEvents([]);setUnlocked(false);setOwner(undefined);setMessage('');setSaveForm(false);
  const current=()=>active && generation===epoch.current && !document.hidden;
  void listBibleVaults().then(rows=>{if(active){setVaults(rows);setVaultId(old=>rows.some(v=>v.userId===old)?old:rows[0]?.userId||'');}}).catch(()=>{if(active)setVaults([]);});
  if(!connected){setStatus('offline');return()=>{active=false;};}
  if(!authReady){setStatus('loading');return()=>{active=false;};}
  if(!supabase){setStatus('setup');return()=>{active=false;};}
  if(!userId){setStatus('login');return()=>{active=false;};}
  setStatus('loading');
  void(async()=>{
   try{
    const permission=await supabase.rpc('is_bible_admin');
    if(!current())return;
    if(permission.error){setStatus(permission.error.code==='PGRST202'?'setup':'error');return;}
    if(permission.data!==true){setStatus('denied');await deleteBibleVault(userId);if(current())setVaults(rows=>rows.filter(v=>v.userId!==userId));return;}
    const rows:unknown[]=[];
    for(let offset=0;;offset+=1000){
     const result=await supabase.from('bible_reading_events').select('*').order('era_order').order('event_order').range(offset,offset+999);
     if(!current())return;
     if(result.error){setStatus('error');return;}
     rows.push(...result.data);if(result.data.length<1000)break;
    }
    if(current()){setEvents(parseBibleEvents(rows));setOwner(userId);setStatus('ready');}
   }catch{if(current())setStatus('error');}
  })();
  return()=>{active=false;epoch.current++;};
 },[userId,authReady,connected,refresh]);
 async function saveOffline(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!userId || owner!==userId || status!=='ready')return;
  const form=e.currentTarget,fields=new FormData(form),password=String(fields.get('vaultPassword'));
  if(password!==fields.get('vaultConfirm')){setMessage('두 잠금 암호가 다릅니다.');return;}
  const generation=epoch.current;form.reset();setSaving(true);setMessage('');
  try{
   // Recheck server authority immediately before creating a new offline copy.
   const permission=await supabase!.rpc('is_bible_admin');
   if(permission.error || permission.data!==true)throw Error('관리자 권한을 다시 확인해 주세요.');
   if(generation!==epoch.current)return;
   const vault=await saveBibleVault(userId,password,events);
   if(generation!==epoch.current){await deleteBibleVault(userId);return;}
   setVaults(rows=>[...rows.filter(v=>v.userId!==userId),vault]);setSaveForm(false);setMessage('이 기기에 암호화 저장했습니다. 저장한 요약·성구 목록은 오프라인에서 읽을 수 있습니다.');
   if('storage' in navigator)void navigator.storage.persist?.().catch(()=>{});
  }catch(error){if(alive.current && generation===epoch.current)setMessage(error instanceof Error?error.message:'저장하지 못했습니다.');}
  finally{if(alive.current)setSaving(false);}
 }
 async function unlock(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const vault=vaults.find(v=>v.userId===vaultId);if(!vault || connected)return;
  const form=e.currentTarget,password=String(new FormData(form).get('unlockPassword'));form.reset();setSaving(true);setMessage('');const generation=epoch.current;
  try{const rows=await unlockBibleVault(vault,password);if(generation===epoch.current){setEvents(rows);setOwner(vault.userId);setUnlocked(true);}}
  catch(error){if(generation===epoch.current)setMessage(error instanceof Error?error.message:'잠금 해제에 실패했습니다.');}
  finally{if(alive.current)setSaving(false);}
 }
 const allowed=connected?status==='ready' && owner===userId:status==='offline' && unlocked;
 const visibleEvents=allowed?events:[];
 const eras=[...new Map(visibleEvents.map(event=>[event.era_id,{id:event.era_id,title:event.era_title,order:event.era_order}])).values()];
 const eraEvents=visibleEvents.filter(event=>event.era_id===era);
 const selected=eraEvents.find(event=>event.id===eventId)||eraEvents[0];
 const selectedIndex=selected?visibleEvents.findIndex(event=>event.id===selected.id):-1;
 function selectEvent(event:BibleEvent){setEra(event.era_id);setEventId(event.id);}
 return <section className="bible-reader" aria-labelledby="bible-title">
  <header className="bible-heading"><div><span className="bible-eyebrow">THE STORY, CONNECTED</span><h1 id="bible-title">히브리어 성경<br/><span>하나로 이어 읽기</span></h1><p>같은 사건을 모으고, 흩어진 기록을 시간의 흐름에 연결합니다.</p></div><span className="bible-access"><ShieldCheck size={15}/>{connected?'관리자 전용':'오프라인 서가'}</span></header>
  {message && <p className="notice" role="status">{message}</p>}
  {!allowed && <div className="bible-gate panel"><LockKeyhole size={30}/><h2>{status==='loading'?'열람 권한을 확인하고 있어요':status==='offline'?'저장된 서가 열기':status==='denied'?'관리자에게만 열린 공간입니다':status==='setup'?'성경 읽기 기능을 준비하고 있어요':status==='error'?'서버 연결을 확인해 주세요':'로그인 후 이용할 수 있습니다'}</h2>
   <p>{status==='denied'?'이 계정에는 성경 읽기 권한이 없습니다.':status==='setup'?'관리자 등록과 자료 설정이 완료되면 이곳에서 읽을 수 있습니다.':status==='offline'?'마지막 온라인 관리자 확인 후 이 기기에 저장한 자료만 열 수 있습니다.':'기존 봉사 기록장 계정으로 관리자 권한을 확인합니다.'}</p>
   {status==='login' && <button className="primary" onClick={onLogin}>기존 계정으로 로그인</button>}
   {status==='error' && <button className="primary" onClick={()=>setRefresh(v=>v+1)}>다시 확인</button>}
   {status==='offline' && (vaults.length?<form className="entry-form vault-form" onSubmit={unlock}><label>이 기기의 서가<select aria-label="저장된 서가" value={vaultId} onChange={e=>setVaultId(e.target.value)}>{vaults.map((v,i)=><option key={v.userId} value={v.userId}>서가 {i+1} · {v.savedAt.slice(0,10)} 저장</option>)}</select></label><label>기기 잠금 암호<input name="unlockPassword" type="password" required autoComplete="off"/></label><button className="primary" disabled={saving}>{saving?'잠금 해제 중…':'서가 열기'}</button></form>:<p>이 기기에 저장된 자료가 없습니다. 온라인에서 먼저 저장해 주세요.</p>)}
  </div>}
  {allowed && <>
   <div className="bible-tools"><span><BookOpen size={15}/>{visibleEvents.length}개 사건 · {eras.length}개 시대</span>{connected?<button className="text-button" onClick={()=>{setSaveForm(v=>!v);setMessage('');}}><Download size={16}/>이 기기에 저장</button>:<button className="text-button" onClick={()=>{epoch.current++;setEvents([]);setUnlocked(false);}}><LockKeyhole size={15}/>서가 잠그기</button>}</div>
   {saveForm && connected && <form className="entry-form vault-form panel" onSubmit={saveOffline}><h2>오프라인 서가 저장</h2><p>요약과 성구 목록을 암호화합니다. 성경 본문은 포함하지 않습니다. 로그인 비밀번호와 다른 기기 잠금 암호를 사용하세요. 암호를 잊으면 온라인에서 다시 저장해야 합니다.</p><label>기기 잠금 암호 (8자 이상)<input name="vaultPassword" type="password" required minLength={8} autoComplete="new-password"/></label><label>기기 잠금 암호 확인<input name="vaultConfirm" type="password" required minLength={8} autoComplete="new-password"/></label><button className="primary" disabled={saving}>{saving?'암호화 중…':'암호화하여 저장'}</button></form>}
   <p className="bible-draft">편집 초안 · 성구를 연결한 요약입니다. 출판물의 연대 근거는 검토 중이며, 신세계역 본문은 아직 수록하지 않았습니다. 요엘 등 배치가 미정인 책은 연대 검토 후 연결합니다.</p>
   {!connected && <p className="bible-offline"><WifiOff size={15}/>저장된 요약을 읽고 있습니다. 외부 성구 링크는 온라인에서 열 수 있습니다. 화면을 떠나면 서가가 잠깁니다.</p>}
   {!visibleEvents.length && <p className="empty-state">등록된 사건 자료가 없습니다.</p>}
   {!era || !selected ? <div className="era-grid">{eras.map(item=>{const rows=visibleEvents.filter(e=>e.era_id===item.id);return <button className="era-card" key={item.id} onClick={()=>selectEvent(rows[0])}><span className="era-number">{String(item.order).padStart(2,'0')}</span><h2>{item.title}</h2><p>{rows.slice(0,3).map(e=>e.title).join(' · ')}</p><span>{rows.length}개 사건 <ChevronRight size={16}/></span></button>;})}</div>:<>
    <button className="text-button bible-back" onClick={()=>setEra(null)}><ChevronLeft size={16}/>전체 시대 보기</button>
    <div className="bible-workspace"><nav className="bible-events panel" aria-label={`${selected.era_title} 사건`}><h2>{selected.era_title}</h2>{eraEvents.map(event=><button key={event.id} aria-current={event.id===selected.id?'step':undefined} onClick={()=>setEventId(event.id)}><span/>{event.title}</button>)}</nav>
     <article className="bible-event panel" aria-labelledby="event-title"><span className="bible-eyebrow">{selected.era_title}</span><h2 id="event-title">{selected.title}</h2>
      {selected.rulers.length>0 && <div className="ruler-list" aria-label="당시 나라와 통치자">{selected.rulers.map((r,i)=><div key={i}><Crown size={16}/><span><small>{r.nation}</small><strong>{r.name}</strong>{r.note && <small>{r.note}</small>}</span></div>)}</div>}
      {selected.prophets.length>0 && <p className="bible-prophets">관련 예언자 · {selected.prophets.join(' · ')}</p>}
      <p className="event-summary">{selected.summary}</p>
      {selected.placement_note && <aside className="placement-note"><strong>배치·연대 안내</strong><p>{selected.placement_note}</p></aside>}
      <h3>이 사건을 함께 전하는 기록</h3><div className="passage-list">{selected.passages.map((p,i)=><div key={i}><BookOpen size={17}/><div><strong>{p.reference}</strong><p>{p.note}</p></div>{connected?<a href={scriptureLink(p.reference)} target="_blank" rel="noopener noreferrer" aria-label={`${p.reference} 공식 라이브러리에서 찾기`}><ExternalLink size={16}/></a>:<WifiOff size={15}/>}</div>)}</div>
      {selected.related_books.length>0 && <p className="related-books">함께 살펴볼 책 · {selected.related_books.join(' · ')}</p>}
      <details className="bible-sources"><summary>자료와 검토 상태</summary><p>위 성구는 사건 연결을 검토할 기본 참조입니다. 공식 라이브러리의 검색 결과로 연결되며, 저작권이 있는 본문을 복제하지 않았습니다.</p><p>{selected.review_status==='draft'?'출판물 대조 전 초안입니다. 구체적 연도·논쟁적인 배치는 확정하지 않았습니다.':'검토 자료에 근거한 사건 요약입니다.'}</p></details>
      <div className="event-pagination"><button className="text-button" disabled={selectedIndex<=0} onClick={()=>selectEvent(visibleEvents[selectedIndex-1])}><ChevronLeft size={16}/>이전 사건</button><button className="text-button" disabled={selectedIndex>=visibleEvents.length-1} onClick={()=>selectEvent(visibleEvents[selectedIndex+1])}>다음 사건<ChevronRight size={16}/></button></div>
     </article></div>
   </>}
  </>}
 </section>;
}
