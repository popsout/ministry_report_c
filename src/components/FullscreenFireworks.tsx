import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Each shell has a related set of ember colors, without a rainbow wheel.
const palettes = [
  ['#c98b29', '#e6ad4d', '#ffe3a0', '#dc7459'],
  ['#c98b29', '#e4b665', '#ffe7b1', '#779bc5'],
  ['#bb8035', '#dfa447', '#ffdf94', '#c96970'],
];
type Point = { x:number; y:number };
type Spark = Point & { vx:number; vy:number; life:number; color:string; size:number; shimmer:number; trail:Point[] };
type Rocket = { start:Point; target:Point; age:number; duration:number; palette:string[]; trail:Point[] };

export default function FullscreenFireworks() {
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
      rockets.push({start:{x:Math.max(20,Math.min(width-20,targetX+(Math.random()-.5)*width*.3)),y:height+12},target:{x:targetX,y:height*(.16+Math.random()*.38)},age:0,duration:1.05+Math.random()*.35,palette:palettes[launches%palettes.length],trail:[]});
    }
    function burst(rocket:Rocket) {
      const speed=Math.min(width*.58,height*.38,355);
      // Uneven spherical shells leave fine, curved ember trails as gravity takes over.
      for(let i=0;i<150;i++) {
        const angle=Math.PI*2*i/150+(Math.random()-.5)*.09;
        const depth=Math.random()*2-1;
        const velocity=speed*Math.sqrt(1-depth*depth)*(.72+Math.random()*.28);
        const life=2.1+Math.random()*1.15;
        const shade=Math.random();
        const color=rocket.palette[shade<.48?0:shade<.72?1:shade<.87?2:3];
        sparks.push({...rocket.target,vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity*.82,life,color,size:.7+Math.random()*.7,shimmer:Math.random()*Math.PI*2,trail:[{...rocket.target}]});
      }
    }
    function line(trail:Point[],color:string,width:number,opacity:number) {
      if(trail.length<2)return;
      const tail=trail[0],head=trail[trail.length-1];
      if(Math.hypot(head.x-tail.x,head.y-tail.y)<.05)return;
      const gradient=ctx!.createLinearGradient(tail.x,tail.y,head.x,head.y);
      gradient.addColorStop(0,color+'00');gradient.addColorStop(.45,color+'80');gradient.addColorStop(1,color);
      ctx!.globalAlpha=opacity;ctx!.strokeStyle=gradient;ctx!.lineCap='round';
      ctx!.beginPath();ctx!.moveTo(tail.x,tail.y);
      for(let i=1;i<trail.length;i++)ctx!.lineTo(trail[i].x,trail[i].y);
      ctx!.lineWidth=width*3;ctx!.globalAlpha=opacity*.12;ctx!.stroke();
      ctx!.lineWidth=width;ctx!.globalAlpha=opacity;ctx!.stroke();
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
          line([{x:x+Math.cos(angle)*radius*.4,y:y+Math.sin(angle)*radius*.4},{x:x+Math.cos(angle)*radius,y:y+Math.sin(angle)*radius}],palettes[shell][ray%4],1.2,.8);
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
        line(rocket.trail,'#c38b37',1.4,1);
        if(progress===1)burst(rocket);
      }
      rockets=rockets.filter(rocket=>rocket.age<rocket.duration);
      sparks=sparks.filter(spark=>spark.life>0);
      for(const spark of sparks) {
        spark.life-=dt;
        spark.vx*=Math.exp(-dt*.62);spark.vy*=Math.exp(-dt*.62);spark.vy+=78*dt;
        spark.x+=spark.vx*dt;spark.y+=spark.vy*dt;
        spark.trail.push({x:spark.x,y:spark.y});if(spark.trail.length>26)spark.trail.shift();
        const opacity=Math.max(0,Math.min(1,spark.life/1.3));
        const shimmer=spark.life<1 ? .72+.28*Math.sin(time*.018+spark.shimmer) : 1;
        line(spark.trail,spark.color,spark.size,opacity*shimmer);
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
  </div>,document.body);
}
