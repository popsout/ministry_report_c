import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { emptyJournal, parseJournal, type Journal } from './localJournal';

export function useCloudJournal(onLoad:(data:Journal)=>void) {
  const [session,setSession]=useState<Session|null>(null);
  const [ready,setReady]=useState(!supabase);
  const [loaded,setLoaded]=useState(false);
  const [status,setStatus]=useState('로그인 필요');
  const [error,setError]=useState('');
  const identity=useRef<string|null>(null), authEpoch=useRef(0);
  const revision=useRef(0), generation=useRef(0), callback=useRef(onLoad);
  callback.current=onLoad;
  const user=session?.user.id;
  const load=useCallback(async()=>{
    if(!supabase || !user)return;
    const id=++generation.current, epoch=authEpoch.current;
    const {data,error}=await supabase.from('personal_journals').select('document,revision').eq('user_id',user).maybeSingle();
    if(id!==generation.current || epoch!==authEpoch.current || identity.current!==user)return;
    if(error){setError('온라인 기록을 읽지 못했습니다. 연결 상태와 Supabase의 personal_journals 테이블 설정을 확인해 주세요.');setStatus('연결 확인 필요');return;}
    try{
      const journal=data?parseJournal(JSON.stringify(data.document)):emptyJournal();
      revision.current=data?.revision || 0;callback.current(journal);setLoaded(true);setError('');
    }catch{setError('온라인 기록 형식을 읽지 못했습니다. 기존 데이터는 변경하지 않았습니다.');}
  },[user]);
  useEffect(()=>{
    if(!supabase)return;
    let active=true, events=0;
    const apply=(next:Session|null)=>{
      if(!active)return;
      const nextUser=next?.user.id || null;
      if(identity.current!==nextUser){
        identity.current=nextUser;authEpoch.current++;generation.current++;
        revision.current=0;setLoaded(false);callback.current(emptyJournal());
      }
      setSession(next);setReady(true);
    };
    const {data}=supabase.auth.onAuthStateChange((_event,next)=>{events++;apply(next);});
    supabase.auth.getSession().then(({data,error})=>{if(active && events===0){apply(data.session);if(error)setError('로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.');}});
    return()=>{active=false;generation.current++;data.subscription.unsubscribe();};
  },[]);
  useEffect(()=>{
    setLoaded(false);revision.current=0;callback.current(emptyJournal());
    if(!supabase || !user){setStatus('로그인 필요');return;}
    void load();
    const channel=supabase.channel(`journal-${user}`).on('postgres_changes',{event:'*',schema:'public',table:'personal_journals',filter:`user_id=eq.${user}`},()=>void load()).subscribe(status=>{setStatus(status==='SUBSCRIBED'?'실시간 연결됨':'온라인 · 재연결 중');if(status==='SUBSCRIBED')void load();});
    const refresh=()=>void load();const visible=()=>{if(document.visibilityState==='visible')void load();};
    window.addEventListener('focus',refresh);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',visible);
    const timer=setInterval(refresh,15000);
    return()=>{generation.current++;void supabase!.removeChannel(channel);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',visible);clearInterval(timer);};
  },[user,load]);
  async function save(document:Journal){
    if(!supabase || !user || !loaded || identity.current!==user)throw new Error('로그인과 기록 불러오기가 완료된 뒤 다시 시도해 주세요.');
    const expected=revision.current, epoch=authEpoch.current;
    const row={user_id:user,document,revision:expected+1};
    const result=expected===0?await supabase.from('personal_journals').insert(row).select('revision'):await supabase.from('personal_journals').update({document,revision:expected+1}).eq('user_id',user).eq('revision',expected).select('revision');
    if(epoch!==authEpoch.current || identity.current!==user)throw new Error('로그인 상태가 변경되어 이 화면에 저장 결과를 표시하지 않았습니다. 다시 로그인해 기록을 확인해 주세요.');
    if(result.error || !result.data?.length){
      if(result.error && result.error.code!=='23505')throw new Error('온라인 저장에 실패했습니다. 입력 내용은 유지됩니다. 연결을 확인하고 다시 시도해 주세요.');
      throw new Error('다른 기기에서 기록이 변경됐습니다. 입력 내용을 확인한 뒤 창을 닫고 새로고침해 최신 기록을 불러와 주세요.');
    }
    revision.current=result.data[0].revision;return document;
  }
  return {session,ready,loaded,status,error,save,load};
}
