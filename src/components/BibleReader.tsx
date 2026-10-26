import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BookOpen, Download, LockKeyhole, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseBibleEvents, type BibleEvent } from '../lib/bible';
import BibleReadingContent from './BibleReadingContent';
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
 const eraCount=new Set(visibleEvents.map(event=>event.era_id)).size;
 return <section className="bible-reader" aria-labelledby="bible-title">
  <header className="bible-heading"><div><span className="bible-eyebrow">THE STORY, CONNECTED</span><h1 id="bible-title">히브리어 성경<br/><span>하나로 이어 읽기</span></h1><p>같은 사건을 모으고, 흩어진 기록을 시간의 흐름에 연결합니다.</p><p className="bible-independent">여호와의 증인 공식 자료를 기준으로 만든 개인 학습 도구이며, 공식 웹사이트는 아닙니다.</p></div><span className="bible-access"><ShieldCheck size={15}/>{connected?'관리자 전용':'오프라인 서가'}</span></header>
  {message && <p className="notice" role="status">{message}</p>}
  {!allowed && <div className="bible-gate panel"><LockKeyhole size={30}/><h2>{status==='loading'?'열람 권한을 확인하고 있어요':status==='offline'?'저장된 서가 열기':status==='denied'?'관리자에게만 열린 공간입니다':status==='setup'?'성경 읽기 기능을 준비하고 있어요':status==='error'?'서버 연결을 확인해 주세요':'로그인 후 이용할 수 있습니다'}</h2>
   <p>{status==='denied'?'이 계정에는 성경 읽기 권한이 없습니다.':status==='setup'?'관리자 등록과 자료 설정이 완료되면 이곳에서 읽을 수 있습니다.':status==='offline'?'마지막 온라인 관리자 확인 후 이 기기에 저장한 자료만 열 수 있습니다.':'기존 봉사 기록장 계정으로 관리자 권한을 확인합니다.'}</p>
   {status==='setup' && userId && <div className="bible-setup-next"><p>서버에 성경 읽기 설정이 아직 없습니다. 설정 SQL의 관리자 UID 자리에 아래 본인 UID를 사용하세요. SQL 실행은 Supabase 프로젝트 소유자만 할 수 있습니다.</p><code>{userId}</code><button className="text-button" onClick={async()=>{try{await navigator.clipboard.writeText(userId);setMessage('본인 UID를 복사했습니다. 설정 SQL의 __MY_ADMIN_UUID__ 자리에 넣어 주세요.');}catch{setMessage('아래 UID를 직접 선택해 복사해 주세요.');}}}>본인 UID 복사</button></div>}
   {status==='login' && <button className="primary" onClick={onLogin}>기존 계정으로 로그인</button>}
   {status==='error' && <button className="primary" onClick={()=>setRefresh(v=>v+1)}>다시 확인</button>}
   {status==='offline' && (vaults.length?<form className="entry-form vault-form" onSubmit={unlock}><label>이 기기의 서가<select aria-label="저장된 서가" value={vaultId} onChange={e=>setVaultId(e.target.value)}>{vaults.map((v,i)=><option key={v.userId} value={v.userId}>서가 {i+1} · {v.savedAt.slice(0,10)} 저장</option>)}</select></label><label>기기 잠금 암호<input name="unlockPassword" type="password" required autoComplete="off"/></label><button className="primary" disabled={saving}>{saving?'잠금 해제 중…':'서가 열기'}</button></form>:<p>이 기기에 저장된 자료가 없습니다. 온라인에서 먼저 저장해 주세요.</p>)}
  </div>}
  {allowed && <>
   <div className="bible-tools"><span><BookOpen size={15}/>{visibleEvents.length}개 사건 · {eraCount}개 시대</span>{connected?<button className="text-button" onClick={()=>{setSaveForm(v=>!v);setMessage('');}}><Download size={16}/>이 기기에 저장</button>:<button className="text-button" onClick={()=>{epoch.current++;setEvents([]);setUnlocked(false);}}><LockKeyhole size={15}/>서가 잠그기</button>}</div>
   {saveForm && connected && <form className="entry-form vault-form panel" onSubmit={saveOffline}><h2>오프라인 서가 저장</h2><p>요약과 성구 목록을 암호화합니다. 성경 본문은 포함하지 않습니다. 로그인 비밀번호와 다른 기기 잠금 암호를 사용하세요. 암호를 잊으면 온라인에서 다시 저장해야 합니다.</p><label>기기 잠금 암호 (8자 이상)<input name="vaultPassword" type="password" required minLength={8} autoComplete="new-password"/></label><label>기기 잠금 암호 확인<input name="vaultConfirm" type="password" required minLength={8} autoComplete="new-password"/></label><button className="primary" disabled={saving}>{saving?'암호화 중…':'암호화하여 저장'}</button></form>}
   <BibleReadingContent events={visibleEvents} connected={connected} navigation={{era,eventId}} onNavigate={next=>{setEra(next.era);setEventId(next.eventId);}}/>
  </>}
 </section>;
}
