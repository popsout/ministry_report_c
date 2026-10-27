import {expect,it} from 'vitest';
import {chronologyLabel,parseBibleEvents,scriptureLink} from '../src/lib/bible';
it('손상된 서가 자료와 중복 사건을 거부한다',()=>{
 expect(()=>parseBibleEvents({})).toThrow();
 const event={id:'a',era_id:'era',era_title:'시대',era_order:1,event_order:1,title:'사건',summary:'요약',placement_note:'',review_status:'draft',rulers:[],passages:[],prophets:[],related_books:[]};
 expect(parseBibleEvents([event])).toHaveLength(1);expect(()=>parseBibleEvents([event,event])).toThrow();
 expect(()=>parseBibleEvents([{...event,rulers:[{nation:3}]}])).toThrow();
 expect(scriptureLink('열왕기상 8장')).toContain(encodeURIComponent('열왕기상 8장'));
});
it('연대 미등록과 시대 미상을 구분하고 잘못된 연대 형식을 거부한다',()=>{
 const row={id:'a',era_id:'era',era_title:'시대',era_order:1,event_order:1,title:'사건',summary:'요약',placement_note:'',review_status:'draft',rulers:[],passages:[],prophets:[],related_books:[]};
 expect(chronologyLabel(parseBibleEvents([row])[0])).toBe('연대 미등록');
 const chronology={label:'시대 미상',precision:'unknown',basis:'시대를 판단할 근거 부족',references:[],reviewed:false};
 expect(chronologyLabel(parseBibleEvents([{...row,chronology}])[0])).toBe('시대 미상');
 expect(()=>parseBibleEvents([{...row,chronology:{...chronology,precision:'certain'}}])).toThrow('연대 자료');
 expect(()=>parseBibleEvents([{...row,chronology:{...chronology,reviewed:'yes'}}])).toThrow('연대 자료');
});
it('미검증 숫자는 주 표시에서 보류하고 원문 대조한 재위년은 표시한다',()=>{
 const row={id:'x',era_id:'x',era_title:'시대',era_order:1,event_order:1,title:'사건',summary:'요약',placement_note:'',review_status:'draft',rulers:[],passages:[],prophets:[],related_books:[],chronology:{label:'기원전 1000년',precision:'dated',basis:'초안',references:[],reviewed:false}};
 expect(chronologyLabel(parseBibleEvents([row])[0])).toBe('연대 검증 중');
 expect(chronologyLabel(parseBibleEvents([{...row,chronology:{...row.chronology,label:'왕 제4년',precision:'relative',basis_type:'scripture',reviewed:true}}])[0])).toBe('왕 제4년');
 expect(()=>parseBibleEvents([{...row,source_checks:[{page:-1}]}])).toThrow('출처 대조');
});
it('출판물의 직접 표기와 본문 연수 계산을 구분해 저장한다',()=>{
 const row={id:'x',era_id:'x',era_title:'시대',era_order:1,event_order:1,title:'사건',summary:'요약',placement_note:'',review_status:'draft',rulers:[],passages:[],prophets:[],related_books:[],chronology:{label:'연수 계산 결과',precision:'approximate',basis:'기준 연도에서 성구의 연수를 계산',references:['근거'],reviewed:true,basis_type:'calculation'}};
 expect(parseBibleEvents([row])[0].chronology?.basis_type).toBe('calculation');
 expect(()=>parseBibleEvents([{...row,chronology:{...row.chronology,basis_type:'model-memory'}}])).toThrow('연대 자료');
});
it('공식 출판물 링크만 허용하고 이전 성구 자료도 그대로 읽는다',()=>{
 const row={id:'a',era_id:'era',era_title:'시대',era_order:1,event_order:1,title:'사건',summary:'요약',placement_note:'',review_status:'draft',rulers:[],passages:[{reference:'공식 해설',note:'근거',url:'https://wol.jw.org/ko/wol/d/r8/lp-ko/1200002861#p5'}],prophets:[],related_books:[]};
 expect(parseBibleEvents([row])[0].passages[0].url).toBe(row.passages[0].url);
 for(const url of ['javascript:alert(1)','https://example.com/','https://wol.jw.org.evil.test/ko/wol/d/r8/lp-ko/1','https://user:secret@wol.jw.org/ko/wol/d/r8/lp-ko/1','//wol.jw.org/ko/wol/d/r8/lp-ko/1'])expect(()=>parseBibleEvents([{...row,passages:[{...row.passages[0],url}]}])).toThrow('자료 형식');
 expect(parseBibleEvents([{...row,passages:[{reference:'창세기 1장',note:'이전 자료'}]}])[0].passages[0].url).toBeUndefined();
});
