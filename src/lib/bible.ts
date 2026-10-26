export type BibleEvent = {
 id:string; era_id:string; era_title:string; era_order:number; event_order:number;
 title:string; summary:string; rulers:{nation:string; name:string; note?:string}[];
 prophets:string[]; passages:{reference:string; note:string}[]; related_books:string[];
 placement_note:string; review_status:'draft'|'reviewed';
};
export function parseBibleEvents(value:unknown):BibleEvent[] {
 if(!Array.isArray(value) || value.length>1000)throw Error('자료 형식을 확인하지 못했습니다.');
 for(const row of value){
  if(!row || !['id','era_id','era_title','title','summary','placement_note'].every(k=>typeof row[k]==='string') || !Number.isInteger(row.era_order) || !Number.isInteger(row.event_order) || !['draft','reviewed'].includes(row.review_status)
   || !Array.isArray(row.rulers) || !row.rulers.every((r:Record<string,unknown>)=>r && typeof r.nation==='string' && typeof r.name==='string' && (r.note===undefined || typeof r.note==='string'))
   || !Array.isArray(row.passages) || !row.passages.every((p:Record<string,unknown>)=>p && typeof p.reference==='string' && typeof p.note==='string')
   || !Array.isArray(row.prophets) || !row.prophets.every((s:unknown)=>typeof s==='string') || !Array.isArray(row.related_books) || !row.related_books.every((s:unknown)=>typeof s==='string'))throw Error('자료 형식을 확인하지 못했습니다.');
 }
 if(new Set(value.map(row=>row.id)).size!==value.length)throw Error('자료가 중복되어 있습니다.');
 return [...value].sort((a,b)=>a.era_order-b.era_order || a.event_order-b.event_order);
}
export function scriptureLink(reference:string){return `https://wol.jw.org/ko/wol/s/r8/lp-ko?q=${encodeURIComponent(reference)}`;}
