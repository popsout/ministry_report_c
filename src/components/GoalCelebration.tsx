import { type CSSProperties } from 'react';
import { PartyPopper } from 'lucide-react';

export default function GoalCelebration({ hours }: { hours: number }) {
  return <section className="goal-celebration" aria-label="목표 달성 축하">
    <div className="celebration-fireworks" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map(burst => <div className={`firework firework-${burst}`} key={burst}>
        {Array.from({ length: 20 }, (_, ray) => <i key={ray} style={{ '--angle': `${ray * 18}deg`, '--spark-color': ['#d59a08', '#8b48bd', '#efb82c', '#b47adc', '#bf7b00'][ray % 5] } as CSSProperties} />)}
      </div>)}
    </div>
    <span className="celebration-icon" aria-hidden="true"><PartyPopper size={27}/></span>
    <div className="celebration-copy"><small>차곡차곡 쌓아 이룬 목표</small><h3>이번 달 목표 달성, 축하해요!</h3><p>{hours}시간을 채운 소중한 봉사 여정을 기억해요.</p></div>
  </section>;
}
