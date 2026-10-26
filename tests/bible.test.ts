import {expect,it} from 'vitest';
import {parseBibleEvents,scriptureLink} from '../src/lib/bible';
it('손상된 서가 자료와 중복 사건을 거부한다',()=>{
 expect(()=>parseBibleEvents({})).toThrow();
 const event={id:'a',era_id:'era',era_title:'시대',era_order:1,event_order:1,title:'사건',summary:'요약',placement_note:'',review_status:'draft',rulers:[],passages:[],prophets:[],related_books:[]};
 expect(parseBibleEvents([event])).toHaveLength(1);expect(()=>parseBibleEvents([event,event])).toThrow();
 expect(()=>parseBibleEvents([{...event,rulers:[{nation:3}]}])).toThrow();
 expect(scriptureLink('열왕기상 8장')).toContain(encodeURIComponent('열왕기상 8장'));
});
