import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const colors = ['#ed2955', '#1686ed', '#08a97b', '#dc9900', '#9845df', '#e832ac'];
type Point = { x:number; y:number };
type Spark = Point & { vx:number; vy:number; life:number; color:string; size:number; trail:Point[] };
type Rocket = { start:Point; target:Point; age:number; duration:number; trail:Point[] };

export default function FullscreenFireworks({ onStop }: { onStop: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width=0, height=0, frame=0, previous=0, elapsed=0, launches=0;
    let sparks:Spark[]=[], rockets:Rocket[]=[];
    function launch() {
      const targetX=width*(.15+Math.random()*.7);
      launches++;
      rockets.push({start:{x:Math.max(20,Math.min(width-20,targetX+(Math.random()-.5)*width*.3)),y:height+12},target:{x:targetX,y:height*(.16+Math.random()*.38)},age:0,duration:1.05+Math.random()*.35,trail:[]});
    }
    function burst(rocket:Rocket) {
      const speed=Math.min(width*.48,height*.31,320);
      // Coherent radial shells and long trails give each explosion a clear shape.
      for(let i=0;i<132;i++) {
        const angle=Math.PI*2*(i%66)/66+(i<66?0:.035);
        const velocity=speed*(i<66?.88+Math.random()*.12:.48+Math.random()*.12);
        const life=1.8+Math.random()*.65;
        sparks.push({...rocket.target,vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity,life,color:colors[Math.floor((i%66)/4)%colors.length],size:i<66?2.5:1.8,trail:[{...rocket.target}]});
      }
    }
    function line(trail:Point[],color:string,width:number,opacity:number) {
      for(let i=1;i<trail.length;i++) {
        ctx!.globalAlpha=opacity*(i/trail.length);
        ctx!.strokeStyle=color;ctx!.lineWidth=width;ctx!.lineCap='round';
        ctx!.beginPath();ctx!.moveTo(trail[i-1].x,trail[i-1].y);ctx!.lineTo(trail[i].x,trail[i].y);ctx!.stroke();
      }
    }
    function resize() {
      width=window.innerWidth;height=window.innerHeight;
      const ratio=Math.min(window.devicePixelRatio||1,1.5);
      canvas!.width=width*ratio;canvas!.height=height*ratio;
      ctx!.setTransform(ratio,0,0,ratio,0,0);
      sparks=[];rockets=[];previous=0;elapsed=0;
      if(motion.matches) {
        // A still firework replaces motion when the device requests less animation.
        for(let shell=0;shell<3;shell++)for(let ray=0;ray<32;ray++) {
          const angle=ray*Math.PI/16, radius=Math.min(width,height)*.16;
          const x=width*(.22+shell*.28), y=height*(.25+shell*.14);
          line([{x:x+Math.cos(angle)*radius*.4,y:y+Math.sin(angle)*radius*.4},{x:x+Math.cos(angle)*radius,y:y+Math.sin(angle)*radius}],colors[ray%colors.length],2,.8);
        }
        ctx!.globalAlpha=1;
      } else launch();
    }
    function draw(time:number) {
      const dt=previous?Math.min((time-previous)/1000,.04):.016;
      previous=time;
      ctx!.clearRect(0,0,width,height);
      elapsed+=dt;
      if(elapsed>.62){elapsed=0;launch();if(launches%4===0)launch();}
      for(const rocket of rockets) {
        rocket.age+=dt;
        const progress=Math.min(1,rocket.age/rocket.duration);
        const ease=1-Math.pow(1-progress,1.6);
        const point={x:rocket.start.x+(rocket.target.x-rocket.start.x)*ease,y:rocket.start.y+(rocket.target.y-rocket.start.y)*ease};
        rocket.trail.push(point);if(rocket.trail.length>22)rocket.trail.shift();
        line(rocket.trail,'#d79a13',2.5,1);
        if(progress===1)burst(rocket);
      }
      rockets=rockets.filter(rocket=>rocket.age<rocket.duration);
      sparks=sparks.filter(spark=>spark.life>0);
      for(const spark of sparks) {
        spark.life-=dt;
        spark.vx*=Math.exp(-dt*.48);spark.vy*=Math.exp(-dt*.48);spark.vy+=50*dt;
        spark.x+=spark.vx*dt;spark.y+=spark.vy*dt;
        spark.trail.push({x:spark.x,y:spark.y});if(spark.trail.length>32)spark.trail.shift();
        const opacity=Math.max(0,Math.min(1,spark.life/.85));
        line(spark.trail,spark.color,spark.size,opacity);
      }
      ctx!.globalAlpha=1;
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
