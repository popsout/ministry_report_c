// A private, offline review artifact. This entry is never imported by the deployed app.
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BookOpen,ChevronLeft} from 'lucide-react';
import BibleReadingContent,{type ReadingNavigation} from '../src/components/BibleReadingContent';
import {parseBibleEvents} from '../src/lib/bible';
import '../src/styles.css';
declare const __BIBLE_REVIEW_EVENTS__:unknown;
const events=parseBibleEvents(__BIBLE_REVIEW_EVENTS__);
function Review(){
 const [navigation,setNavigation]=useState<ReadingNavigation>({era:null,eventId:''});
 function navigate(next:ReadingNavigation){setNavigation(next);window.scrollTo({top:0});}
 return <div className="app theme-aux"><main style={{marginLeft:0}}><div className="content"><section className="bible-reader">
  <div className="review-banner"><BookOpen size={18}/><span>개인 검토용 미리보기 · 실제 서버에 연결되지 않습니다. 사건 요약은 검증 진행 중입니다.</span></div>
  <header className="bible-heading"><div><span className="bible-eyebrow">THE STORY, CONNECTED</span><h1>히브리어 성경<br/><span>하나로 이어 읽기</span></h1><p>같은 사건을 모으고, 흩어진 기록을 시간의 흐름에 연결합니다.</p><p className="bible-independent">제공하신 신세계역과 여호와의 증인 공식 자료를 기준으로 만든 개인 학습 도구입니다. 공식 웹사이트는 아닙니다.</p></div><span className="bible-access">개인 미리보기</span></header>
  <div className="bible-tools"><span><BookOpen size={15}/>{events.length}개 사건 · 8개 시대</span>{navigation.era && <button className="text-button" onClick={()=>navigate({era:null,eventId:''})}><ChevronLeft size={16}/>처음으로</button>}</div>
  <BibleReadingContent events={events} connected={true} navigation={navigation} onNavigate={navigate}/>
 </section></div></main></div>;
}
createRoot(document.getElementById('root')!).render(<Review/>);
