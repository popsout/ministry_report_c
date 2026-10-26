import {useEffect,useRef} from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Crown, ExternalLink, WifiOff } from 'lucide-react';
import { chronologyLabel, scriptureLink, type BibleEvent } from '../lib/bible';
export type ReadingNavigation={era:string|null;eventId:string};
export default function BibleReadingContent({events:visibleEvents,connected,navigation:{era,eventId},onNavigate}:{events:BibleEvent[];connected:boolean;navigation:ReadingNavigation;onNavigate:(next:ReadingNavigation)=>void}){
 const detailRef=useRef<HTMLElement>(null);
 const eras=[...new Map(visibleEvents.map(event=>[event.era_id,{id:event.era_id,title:event.era_title,order:event.era_order}])).values()];
 const eraEvents=visibleEvents.filter(event=>event.era_id===era);
 const selected=eraEvents.find(event=>event.id===eventId)||eraEvents[0];
 const selectedIndex=selected?visibleEvents.findIndex(event=>event.id===selected.id):-1;
 useEffect(()=>{if(selected && window.matchMedia('(max-width:760px)').matches){detailRef.current?.scrollIntoView({block:'start'});detailRef.current?.focus({preventScroll:true});}},[selected?.id]);
 function selectEvent(event:BibleEvent){onNavigate({era:event.era_id,eventId:event.id});}
 return <>
   <details className="bible-draft"><summary>검증 중인 요약 · 성경 본문 미수록</summary><p>편집 초안 · 성구를 연결한 요약입니다. 여호와의 증인 신세계역과 공식 자료를 기준으로 내용 검증 중입니다. 전체 검증 완료본은 아닙니다. 일부 항목은 제공 PDF 본문과 대조했으며, 절대연대·불확실한 배치는 추가 출판물 검증이 필요합니다.  신세계역 본문은 아직 수록하지 않았습니다. 추정 배치와 기간이 겹치는 기록은 안내를 함께 표시합니다.</p></details>
   {!connected && <p className="bible-offline"><WifiOff size={15}/>저장된 요약을 읽고 있습니다. 외부 성구 링크는 온라인에서 열 수 있습니다. 화면을 떠나면 서가가 잠깁니다.</p>}
   {!visibleEvents.length && <p className="empty-state">등록된 사건 자료가 없습니다.</p>}
   {!era || !selected ? <div className="era-grid">{eras.map(item=>{const rows=visibleEvents.filter(e=>e.era_id===item.id);return <button className="era-card" key={item.id} onClick={()=>selectEvent(rows[0])}><span className="era-number">{String(item.order).padStart(2,'0')}</span><h2>{item.title}</h2><p className="era-preview">{rows.slice(0,3).map(event=><span className="era-preview-title" key={event.id}>{event.title}</span>)}</p><span>{rows.length}개 사건 <ChevronRight size={16}/></span></button>;})}</div>:<>
    <button className="text-button bible-back" onClick={()=>onNavigate({era:null,eventId})}><ChevronLeft size={16}/>전체 시대 보기</button>
    <div className="bible-workspace"><nav className="bible-events panel" aria-label={`${selected.era_title} 사건`}><h2>{selected.era_title}</h2>{eraEvents.map(event=><button key={event.id} aria-current={event.id===selected.id?'step':undefined} onClick={()=>onNavigate({era,eventId:event.id})}><span/><span className="event-list-copy">{event.title}<small>{chronologyLabel(event)}</small></span></button>)}</nav>
     <article ref={detailRef} tabIndex={-1} className="bible-event panel" aria-labelledby="event-title"><span className="bible-eyebrow">{selected.era_title}</span><h2 id="event-title">{selected.title}</h2><div className="event-date"><span>{chronologyLabel(selected)}</span>{selected.chronology && <small>{!selected.chronology.reviewed?'근거 확인 대기':selected.chronology.basis_type==='scripture'?'PDF 성구 대조':selected.chronology.basis_type==='calculation'?'근거 대조·연수 계산':'출판물 대조'}</small>}</div>
      {selected.rulers.length>0 && <div className="ruler-list" aria-label="당시 나라와 통치자">{selected.rulers.map((r,i)=><div key={i}><Crown size={16}/><span><small>{r.nation}</small><strong>{r.name}</strong>{r.note && <small>{r.note}</small>}</span></div>)}</div>}
      {selected.prophets.length>0 && <p className="bible-prophets">관련 예언자 · {selected.prophets.join(' · ')}</p>}
      <div className="event-summary">{selected.summary.split(/\n\s*\n/).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
      {selected.placement_note && <aside className="placement-note"><strong>배치·연대 안내</strong><p>{selected.placement_note}</p></aside>}
      <h3>이 사건을 함께 전하는 기록</h3><div className="passage-list">{selected.passages.map((p,i)=><div key={i}><BookOpen size={17}/><div><strong>{p.reference}</strong><p>{p.note}</p></div>{connected?<a href={scriptureLink(p.reference)} target="_blank" rel="noopener noreferrer" aria-label={`${p.reference} 공식 라이브러리에서 찾기`}><ExternalLink size={16}/></a>:<WifiOff size={15}/>}</div>)}</div>
      {selected.related_books.length>0 && <p className="related-books">함께 살펴볼 책 · {selected.related_books.join(' · ')}</p>}
      {selected.chronology && <details className="chronology-source"><summary>연대의 근거와 확실성</summary>{!selected.chronology.reviewed && <p>미검증 초안 표기: {selected.chronology.label}</p>}<p>{selected.chronology.basis}</p>{selected.chronology.references.length>0 && <p>확인할 성구 · {selected.chronology.references.join(' / ')}</p>}<p>{selected.chronology.reviewed?(selected.chronology.basis_type==='scripture'?'PDF의 해당 성구를 대조했습니다. 재위년을 기원전 연도로 변환한 것까지 확인했다는 뜻은 아닙니다.':selected.chronology.basis_type==='calculation'?'공식 자료의 기준 연대와 본문 연수를 연결한 계산입니다. 출처에 같은 결과값이 직접 적혀 있다는 뜻은 아니며, 계산 과정과 적용 범위를 확인해야 합니다.':'제공 신세계역의 해당 표·부록을 대조했습니다. 출처가 표시한 추정·범위·물음표는 그대로 유지하며 사건 전체의 검증 완료를 의미하지 않습니다.'):'절대연도는 여호와의 증인 연대 체계를 따른 참고 초안이며, 최신 출판물의 해당 항목·문단과 아직 대조하지 않았습니다. 성구 자체가 그 절대연도를 직접 명시한다는 뜻은 아닙니다.'}</p></details>}
      {!!selected.source_checks?.length && <details className="chronology-source"><summary>PDF 원문 대조 기록 ({selected.source_checks.length}건)</summary>{selected.source_checks.map((check,i)=><div className="pdf-check" key={i}><strong>{check.reference}</strong><small>{check.part} · 파일 내 {check.local_page}쪽 · 전체 PDF {check.page}쪽</small><p>{check.finding}</p><p className="pdf-check-limit">확인 범위: {check.limit}</p></div>)}</details>}
      <details className="bible-sources"><summary>자료와 검토 상태</summary><p>위 성구는 사건 연결을 검토할 기본 참조입니다. 공식 라이브러리의 검색 결과로 연결되며, 저작권이 있는 본문을 복제하지 않았습니다.</p><p>{selected.review_status==='draft'?'사건 요약 전체의 검증은 진행 중입니다. 대조 기록이 없는 설명과 세부 배치는 추가 확인이 필요합니다.':'검토 자료에 근거한 사건 요약입니다.'}</p></details>
      <div className="event-pagination"><button className="text-button" disabled={selectedIndex<=0} onClick={()=>selectEvent(visibleEvents[selectedIndex-1])}><ChevronLeft size={16}/>이전 사건</button><button className="text-button" disabled={selectedIndex>=visibleEvents.length-1} onClick={()=>selectEvent(visibleEvents[selectedIndex+1])}>다음 사건<ChevronRight size={16}/></button></div>
     </article></div>
   </>}
 </>;
}
