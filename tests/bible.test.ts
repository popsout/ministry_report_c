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
