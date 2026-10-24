import { useEffect, useId, useRef, useState } from 'react';

export default function PrivacyHelp(){
  const [open,setOpen]=useState(false),[pinned,setPinned]=useState(false);
  const wrapper=useRef<HTMLDivElement>(null);
  const id=useId();
  useEffect(()=>{
    if(!open)return;
    const dismiss=(event:PointerEvent)=>{
      if(!wrapper.current?.contains(event.target as Node)){setOpen(false);setPinned(false);}
    };
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);setPinned(false);}};
    document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};
  },[open]);
  return <div className="privacy-help" ref={wrapper}
    onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>{if(!pinned)setOpen(false);}}
    onFocusCapture={()=>setOpen(true)} onBlurCapture={event=>{if(!pinned && !event.currentTarget.contains(event.relatedTarget as Node))setOpen(false);}}>
    <button type="button" className="privacy-trigger" aria-label="개인정보와 열람 권한 안내" aria-expanded={open} aria-controls={id}
      onClick={()=>{setPinned(!pinned);setOpen(!pinned);}}>?</button>
    <div id={id} className="privacy-flyout" hidden={!open} role="region" tabIndex={0} aria-label="개인정보와 열람 권한">
      <div className="privacy-card"><h2>누가 내 기록을 볼 수 있나요?</h2>
        <p className="privacy-highlight">온라인 기록은 사이트 개발자가 열람할 수 있습니다.</p>
        <h3>일반 방문자와 다른 사용자</h3><p>사이트와 예시 화면은 볼 수 있지만, 실제 봉사 기록은 로그인한 본인 계정에만 접근을 허용하도록 구성되어 있습니다.</p>
        <h3>사이트 개발자</h3><p>사이트 개발자는 관리 권한으로 가입 이메일, 봉사 날짜·시간·형태·메모, 월별 파이오니아 설정과 목표 시간을 확인할 수 있습니다.</p>
        <h3>비밀번호와 구글 계정</h3><p>현재 앱에는 비밀번호 원문을 기록하거나 조회하는 기능이 없습니다. 인증은 Supabase Auth가 처리하며, 구글 메일함이나 드라이브에 접근하는 권한은 요청하지 않습니다.</p>
        <h3>한 기기 저장·예시 화면</h3><p>한 기기 모드에서 브라우저에만 저장한 기록은 서버로 전송하지 않습니다. 예시 화면에서 입력한 내용도 온라인 기록으로 저장하지 않습니다.</p>
        <small>클릭하면 안내가 열린 상태로 유지됩니다. 바깥을 누르거나 Esc 키로 닫을 수 있습니다.</small>
      </div>
    </div>
  </div>;
}
