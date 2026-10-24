import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const colors = ['#f8bd22', '#ffdf70', '#b873e6', '#8650c2', '#e6a20a', '#edbaff'];
type Spark = { x:number; y:number; px:number; py:number; vx:number; vy:number; life:number; maxLife:number; color:string; size:number };

export default function FullscreenFireworks({ onStop }: { onStop: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width=0, height=0, frame=0, previous=0, elapsed=0;
    let sparks:Spark[]=[];
    function burst(x:number,y:number) {
      const speed=Math.min(width,height)*.27+80;
      for(let i=0;i<100;i++) {
        const angle=Math.PI*2*i/100+Math.random()*.1;
        const velocity=speed*(.35+Math.random()*.65);
        const life=1.3+Math.random()*1.1;
        sparks.push({x,y,px:x,py:y,vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity,life,maxLife:life,color:colors[i%colors.length],size:1.6+Math.random()*2});
      }
    }
    function resize() {
      width=window.innerWidth;height=window.innerHeight;
      const ratio=Math.min(window.devicePixelRatio||1,1.5);
      canvas!.width=width*ratio;canvas!.height=height*ratio;
      ctx!.setTransform(ratio,0,0,ratio,0,0);
      sparks=[];previous=0;elapsed=0;
      if(motion.matches) {
        ctx!.clearRect(0,0,width,height);
        for(let i=0;i<90;i++) {
          ctx!.fillStyle=colors[i%colors.length];
          ctx!.fillRect(Math.random()*width,Math.random()*height,3,6);
        }
      } else {
        for(let i=0;i<4;i++)burst(width*(.15+i*.23),height*(.25+Math.random()*.4));
      }
    }
    function draw(time:number) {
      const dt=previous?Math.min((time-previous)/1000,.04):.016;
      previous=time;
      if(!motion.matches) {
        ctx!.clearRect(0,0,width,height);
        elapsed+=dt;
        if(elapsed>.24){elapsed=0;burst(width*(.08+Math.random()*.84),height*(.12+Math.random()*.68));}
        sparks=sparks.filter(spark=>spark.life>0);
        for(const spark of sparks) {
          spark.life-=dt;spark.px=spark.x;spark.py=spark.y;
          spark.vx*=Math.exp(-dt*.8);spark.vy+=75*dt;
          spark.x+=spark.vx*dt;spark.y+=spark.vy*dt;
          ctx!.globalAlpha=Math.max(0,Math.min(1,spark.life/.65));
          ctx!.strokeStyle=spark.color;ctx!.lineWidth=spark.size;ctx!.lineCap='round';
          ctx!.beginPath();ctx!.moveTo(spark.px,spark.py);ctx!.lineTo(spark.x,spark.y);ctx!.stroke();
          ctx!.fillStyle=spark.color;ctx!.beginPath();ctx!.arc(spark.x,spark.y,spark.size*.65,0,Math.PI*2);ctx!.fill();
        }
        ctx!.globalAlpha=1;
      }
      frame=requestAnimationFrame(draw);
    }
    function motionChanged(){cancelAnimationFrame(frame);resize();if(!motion.matches)frame=requestAnimationFrame(draw);}
    resize();if(!motion.matches)frame=requestAnimationFrame(draw);
    window.addEventListener('resize',resize);motion.addEventListener('change',motionChanged);
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',resize);motion.removeEventListener('change',motionChanged);};
  }, []);
  return createPortal(<div className="fullscreen-fireworks" role="region" aria-label="전체 화면 축하 폭죽">
    <canvas ref={canvasRef} aria-hidden="true"/>
    <button className="fireworks-stop" aria-label="전체 화면 폭죽 멈추기" onClick={onStop}><X size={22}/><span>폭죽 멈추기</span></button>
  </div>,document.body);
}
