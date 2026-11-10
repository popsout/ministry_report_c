import { useId, useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { encouragementMessages } from '../lib/encouragement';
export default function EncouragementList(){
 const [open,setOpen]=useState(false),id=useId();
 return <section className="motivation-library" aria-label="다이어트 동기부여 문구">
  <button className="motivation-toggle" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}><Sparkles size={17} aria-hidden="true"/><span>다이어트 동기부여</span><small>{encouragementMessages.length}선</small><ChevronDown size={17} className={open?'is-open':''} aria-hidden="true"/></button>
  <div id={id} hidden={!open} className="motivation-content"><div className="motivation-scroll" tabIndex={0} role="region" aria-label="동기부여 70개 목록"><ol>{encouragementMessages.map((message,index)=><li key={message}><span aria-hidden="true">{String(index+1).padStart(2,'0')}</span><p>{message}</p></li>)}</ol></div></div>
 </section>;
}
