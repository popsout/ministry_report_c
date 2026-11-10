/** A single left-to-right journey. Its position shares the same scale as the day cells. */
export default function JourneyScene({ days, position }: { days: number; position: number }) {
  return <div className={`journey-scene ${position === days ? 'arrived' : ''}`}>
    <svg className="journey-landscape" viewBox="0 0 1000 280" preserveAspectRatio="none" aria-hidden="true">
      <path d="M90 70q5-22 27-13q18-30 38-1q32-2 29 19H90Z M540 42q5-17 25-10q16-22 32 1q23-1 22 15h-79Z" fill="white" opacity=".85"/>
      <path d="M0 188Q130 65 300 164T600 169T1000 145V280H0Z" fill="#dce7da"/>
      <path d="M0 210Q155 152 330 206T660 181T1000 196V280H0Z" fill="#b9d4b9"/>
      <path d="M0 245Q260 207 480 242T1000 229V280H0Z" fill="#93b89a"/>
    </svg>
    <span className="journey-sun" aria-hidden="true"/>
    <div className="journey-direction"><span>나의 출발</span><span>한 칸씩, 목표를 향해 <span aria-hidden="true">→</span></span><span>목표 도착</span></div>
    <div className="journey-route">
      <div className="journey-destination" aria-hidden="true"><svg viewBox="0 0 50 88"><path d="M11 82V6" stroke="#685177" strokeWidth="4" strokeLinecap="round"/><path d="M13 7h32v28H13Z" fill="#fff9ed"/><path d="M13 7h8v7h-8zm16 0h8v7h-8zm8 7h8v7h-8zm-16 0h8v7h-8zm-8 7h8v7h-8zm16 0h8v7h-8zm8 7h8v7h-8zm-16 0h8v7h-8z" fill="#79558b"/><ellipse cx="16" cy="83" rx="14" ry="4" fill="#719a7d"/></svg></div>
      <div className="journey-traveler" style={{ left: `${position / days * 100}%` }} role="img" aria-label={`깃발 캐릭터: ${position === 0 ? '왼쪽 START' : position === days ? '오른쪽 목표 도착' : `${position}칸 위치`}`}>
        <span className="traveler-caption">{position === days ? '해냈다!' : '나의 한 걸음'}</span>
        <svg viewBox="0 0 84 105" aria-hidden="true">
          <ellipse cx="40" cy="99" rx="28" ry="5" fill="#47634b" opacity=".18"/>
          <path d="M31 79l-6 16m23-16 9 15" stroke="#59436c" strokeWidth="8" strokeLinecap="round"/>
          <path d="M30 55q-10 7-14 16m33-12 15 3" fill="none" stroke="#59436c" strokeWidth="7" strokeLinecap="round"/>
          <path d="M22 54q18-13 34 0l1 25q-17 12-34 0Z" fill="#8d69a8"/>
          <circle cx="39" cy="34" r="22" fill="#fff6e6" stroke="#59436c" strokeWidth="3"/>
          <path d="M19 26q19-21 39 0" fill="#59436c"/>
          <circle cx="32" cy="35" r="2.1" fill="#59436c"/><circle cx="46" cy="35" r="2.1" fill="#59436c"/>
          <path d="M34 43q5 5 10 0" fill="none" stroke="#59436c" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="27" cy="41" r="3" fill="#eeb9aa"/><circle cx="51" cy="41" r="3" fill="#eeb9aa"/>
          <path d="M66 75V7" stroke="#59436c" strokeWidth="3" strokeLinecap="round"/><path d="M68 8h15l-5 10 5 9H68Z" fill="#dc9670"/>
          <path d="M35 60h8v8h-8Z" fill="#e8d8f3"/>
        </svg>
      </div>
      <ol className="journey-cells" aria-label="왼쪽 START부터 오른쪽 목표까지">
        {Array.from({ length: days + 1 }, (_, step) => <li key={step} data-step={step} className={`${step === 0 ? 'start-cell' : ''} ${step <= position ? 'passed' : ''} ${step === position ? 'current' : ''}`} aria-current={step === position ? 'step' : undefined} aria-label={step === 0 ? 'START' : `${step}칸${step === days ? ', 목표' : ''}`}><span className="journey-step-label">{step > 0 && step < days && (days <= 10 || step % Math.ceil(days / 6) === 0) ? step : ''}</span></li>)}
      </ol>
      <div className="journey-endpoints" aria-hidden="true"><span>START</span><span>GOAL</span></div>
    </div>
  </div>;
}
