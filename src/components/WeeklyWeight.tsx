import { useState, type FormEvent } from 'react';
import { dateKey } from '../lib/domain';
import type { GoalBoard } from '../lib/goalBoard';
import { validWeightDate, weightTrend, weightWeek } from '../lib/weeklyWeight';
const delta=(value:number|null)=>value===null?'—':`${value>0?'＋':value<0?'−':'±'}${Math.abs(value).toFixed(1)} kg`;
export default function WeeklyWeight({board,disabled,onSave}:{board:GoalBoard;disabled:boolean;onSave:(board:GoalBoard,notice:string)=>Promise<boolean>}){
 const [date,setDate]=useState(()=>dateKey(new Date())),[kg,setKg]=useState(''),[notice,setNotice]=useState('');
 const week=validWeightDate(date)?weightWeek(date):'';
 const existing=board.weights?.[week],rows=weightTrend(board.weights),latest=rows.at(-1);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const value=Number(kg);
  if(!validWeightDate(date) || date>dateKey(new Date()) || !kg.trim() || !Number.isFinite(value) || value<20 || value>500 || Math.abs(value*10-Math.round(value*10))>.00001){setNotice('오늘 또는 지난 날짜와 20~500 kg 사이의 체중을 소수 첫째 자리까지 입력해 주세요.');return;}
  const ok=await onSave({...board,weights:{...board.weights,[weightWeek(date)]:{date,kg:value}}},`${date} 체중을 ${existing?'수정':'저장'}했습니다.`);
  setNotice(ok?`${date} · ${value.toFixed(1)} kg ${existing?'수정':'저장'} 완료`:'체중을 저장하지 못했습니다. 입력은 유지됩니다. 연결 상태와 화면의 오류를 확인해 주세요.');
 }
 return <section className="panel weekly-weight" aria-label="주간 체중 기록"><span className="goal-eyebrow">WEEKLY WEIGH-IN</span><h2>일주일에 한 번, 체중 기록</h2><p>매주 비슷한 요일, 아침 기상 후 화장실에 다녀온 뒤 같은 조건에서 측정해 보세요.</p>
 <form onSubmit={submit}><label>측정 날짜<input type="date" value={date} max={dateKey(new Date())} required onChange={e=>{setDate(e.target.value);setKg('');setNotice('');}}/></label><label>체중 (kg)<input name="weight" type="number" min={20} max={500} step="0.1" inputMode="decimal" required value={kg} placeholder={existing?existing.kg.toFixed(1):'예: 90.0'} onChange={e=>setKg(e.target.value)}/></label><button className="primary" disabled={disabled}>{existing?'이번 주 체중 수정':'체중 저장'}</button></form>
 <small>월요일~일요일을 한 주로 계산합니다. 같은 주에 다시 저장하면 기존 측정값을 수정합니다.{existing && ` 선택한 주의 기록: ${existing.date} · ${existing.kg.toFixed(1)} kg`}</small>
 {notice && <p role="status">{notice}</p>}
 {latest && <div className="weight-summary"><span>최근 체중 <strong>{latest.kg.toFixed(1)} kg</strong></span><span>첫 기록 대비 <strong>{delta(latest.total)}</strong></span><span>측정 기록 <strong>{rows.length}주</strong></span></div>}
 <div className="weight-table-scroll"><table><caption>주간 체중 트렌드</caption><thead><tr><th scope="col">측정일</th><th scope="col">체중</th><th scope="col">이전 측정 대비</th><th scope="col">첫 기록 대비</th></tr></thead><tbody>{rows.length?[...rows].reverse().map(row=><tr key={row.week}><th scope="row">{row.date}</th><td>{row.kg.toFixed(1)} kg</td><td>{delta(row.change)}</td><td>{delta(row.total)}</td></tr>):<tr><td colSpan={4}>아직 기록이 없습니다. 첫 체중을 저장하면 변화 추이를 표시합니다.</td></tr>}</tbody></table></div><small>기록이 없는 주는 건너뜁니다. 변화량은 직전 측정값과 비교하며, 체중 기록은 깃발 위치에 영향을 주지 않습니다.</small></section>;
}
