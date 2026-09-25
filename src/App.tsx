import { useEffect, useMemo, useRef, useState } from 'react';
import Embroidery3D from './Embroidery3D';
import { Download, Upload, WandSparkles, Grid3X3, Box, Palette, Undo2, Redo2, ZoomIn, ZoomOut, RotateCcw, Save, FileJson, Image as ImageIcon, SlidersHorizontal, Sparkles, ChevronRight, MousePointer2, Crosshair, Eye, Layers3, CircleHelp } from 'lucide-react';

type Dmc={code:string,name:string,hex:string};
type Stitch={color:number; type:'cross'|'half'|'back'|'empty'};
type Pattern={name:string;width:number;height:number;stitches:Stitch[];palette:number[];fabric:string;count:number;strands:number;prompt:string;createdAt:string};

const DMC:Dmc[]=[
{code:'310',name:'Noir',hex:'#181818'},{code:'B5200',name:'Blanc',hex:'#FFFFFF'},{code:'3865',name:'Ivoire',hex:'#F3E8D0'},
{code:'666',name:'Rouge',hex:'#C81D3B'},{code:'321',name:'Rouge vermillon',hex:'#B82C32'},{code:'601',name:'Fuchsia',hex:'#D91A73'},
{code:'742',name:'Jaune',hex:'#F2C84B'},{code:'444',name:'Ocre',hex:'#C49A2E'},{code:'699',name:'Vert',hex:'#176B45'},
{code:'469',name:'Olive',hex:'#66733D'},{code:'798',name:'Bleu',hex:'#27658D'},{code:'820',name:'Bleu nuit',hex:'#263D67'},
{code:'3843',name:'Turquoise',hex:'#1597A7'},{code:'550',name:'Violet',hex:'#713A70'},{code:'434',name:'Brun',hex:'#7E4A2F'},
{code:'838',name:'Brun foncé',hex:'#5E392A'},{code:'760',name:'Saumon',hex:'#E88986'},{code:'754',name:'Pêche',hex:'#F1C5A9'},
{code:'520',name:'Prune',hex:'#6C3F53'},{code:'3347',name:'Vert forêt',hex:'#365A43'},{code:'415',name:'Gris perle',hex:'#A5A5A0'},
{code:'646',name:'Gris olive',hex:'#6B685A'},{code:'762',name:'Gris clair',hex:'#D6D2C9'},{code:'3371',name:'Noir brun',hex:'#2D211D'}
];

const blank=(w:number,h:number):Stitch[]=>Array.from({length:w*h},()=>({color:-1,type:'empty'}));
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const hash=(s:string)=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const dist=(a:string,b:string)=>{const f=(x:string)=>{const n=parseInt(x.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255]};const x=f(a),y=f(b);return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2])};
const nearest=(hex:string,pool:number[])=>pool.reduce((best,i)=>dist(hex,DMC[i].hex)<dist(hex,DMC[best].hex)?i:best,pool[0]??0);

function parseIntent(text:string,size:number){
 const t=text.toLowerCase();
 const m=text.match(/(\d{2,3})\s*[×x]\s*(\d{2,3})/i);
 const width=clamp(Number(m?.[1]||size),20,180),height=clamp(Number(m?.[2]||size),20,180);
 const colorMatch=text.match(/(\d{1,2})\s*(?:couleurs?|colors?)/i);
 const maxColors=clamp(Number(colorMatch?.[1]||8),2,24);
 const styles=t.includes('réal')||t.includes('realist')?'realistic':t.includes('minimal')?'minimal':t.includes('pixel')?'pixel':t.includes('couture')?'couture':'graphic';
 const pool=t.includes('tigre')||t.includes('lion')||t.includes('panth')?[0,2,15,7,1,3,5,9]:
   t.includes('rose')||t.includes('cœur')||t.includes('coeur')?[0,2,3,5,8,16,1]:
   t.includes('nord')||t.includes('maison')?[0,1,2,11,10,6,14]:
   t.includes('papillon')?[0,3,5,6,8,10,13,1]:
   t.includes('mer')||t.includes('océan')?[0,1,10,11,12,2,6]:
   [0,2,5,6,8,10,13,14,16,1];
 const palette=pool.slice(0,maxColors);
 const subject=t.includes('tigre')?'Tigre':t.includes('lion')?'Lion':t.includes('papillon')?'Papillon':t.includes('rose')?'Rose':t.includes('cœur')||t.includes('coeur')?'Cœur':t.includes('maison')?'Maison nordique':t.includes('portrait')?'Portrait':'Motif génératif';
 return {width,height,maxColors,styles,palette,subject};
}

function generate(prompt:string,w:number,h:number):Pattern{
 const intent=parseIntent(prompt,w); w=intent.width;h=intent.height;const pool=intent.palette;const seed=hash(prompt);const out=blank(w,h);
 const cx=(w-1)/2,cy=(h-1)/2;
 const noise=(x:number,y:number)=>{let v=Math.sin((x+seed%997)*.19)+Math.cos((y+seed%613)*.17)+Math.sin((x+y+seed%311)*.071);return v/3};
 const subject=intent.subject;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const nx=(x-cx)/(w*.48),ny=(y-cy)/(h*.48),r=Math.hypot(nx,ny);
   let score=-9;
   if(subject==='Tigre'||subject==='Lion'){score=.9-r*1.4+noise(x,y)*.55+Math.sin(nx*10+ny*3)*.32; if(Math.abs(nx)>.75)score-=2;}
   else if(subject==='Papillon'){const ax=Math.abs(nx), yy=ny; score=1.05-Math.abs(ax-(.28+.12*Math.abs(yy)))*3.7-Math.abs(yy)*.7+noise(x,y)*.25; if(Math.abs(nx)<.08)score-=.7;}
   else if(subject==='Rose'||subject==='Cœur'){score=.8-Math.abs(Math.hypot(nx,ny)-.48)*5+Math.sin(nx*13)*Math.sin(ny*13)*.25;}
   else if(subject==='Maison nordique'){const roof=ny+0.35-Math.abs(nx)*.75;score=ny>.05&&ny<.68?1.1:ny<.05&&roof<.05?1.3:-1;score+=noise(x,y)*.3;}
   else {score=.75-r*1.5+noise(x,y)*.45;}
   if(score>.05){let k=Math.abs(Math.floor((Math.sin(x*.73+y*.37+seed)*100000)))%pool.length;if(intent.styles==='minimal')k= k%Math.min(4,pool.length);if(subject==='Tigre'&&(Math.abs(Math.sin(x*.48+y*.16))>.68))k=0;out[y*w+x]={color:pool[k],type:intent.styles==='couture'&&k%7===0?'half':'cross'};}
 }
 return {name:intent.subject+' · '+intent.styles,prompt,width:w,height:h,stitches:out,palette:pool,fabric:'Aïda',count:14,strands:2,createdAt:new Date().toISOString()};
}

function App(){
 const [pattern,setPattern]=useState<Pattern>(()=>{const saved=localStorage.getItem('brodez-pattern');return saved?JSON.parse(saved):generate('Un tigre majestueux, noir ivoire fuchsia, 60 × 60',60,60)});
 const [prompt,setPrompt]=useState(pattern.prompt);
 const [view,setView]=useState<'2d'|'3d'|'chart'|'threads'>('2d');
 const [zoom,setZoom]=useState(1);
 const [selected,setSelected]=useState<number|null>(null);
 const [activeColor,setActiveColor]=useState<number>(pattern.palette[0]??0);
 const [history,setHistory]=useState<Pattern[]>([]);
 const [future,setFuture]=useState<Pattern[]>([]);
 const [imageName,setImageName]=useState('');
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const fileRef=useRef<HTMLInputElement>(null);

 const count=useMemo(()=>pattern.stitches.filter(s=>s.color>=0).length,[pattern]);
 const colors=useMemo(()=>Array.from(new Set(pattern.stitches.filter(s=>s.color>=0).map(s=>s.color))),[pattern]);
 const push=(next:Pattern)=>{setHistory(h=>[...h.slice(-29),pattern]);setFuture([]);setPattern(next);localStorage.setItem('brodez-pattern',JSON.stringify(next));};
 const mutateCell=(idx:number)=>{const next={...pattern,stitches:[...pattern.stitches]};next.stitches[idx]=next.stitches[idx].color===activeColor?{color:-1,type:'empty'}:{color:activeColor,type:'cross'};push(next);setSelected(idx);};
 const draw=()=>{
   const c=canvasRef.current;if(!c)return;const ctx=c.getContext('2d');if(!ctx)return;
   const d=window.devicePixelRatio||1,rect=c.getBoundingClientRect();const W=rect.width,H=rect.height;c.width=W*d;c.height=H*d;ctx.scale(d,d);ctx.clearRect(0,0,W,H);
   const pad=Math.min(W,H)*.055,cell=Math.min((W-pad*2)/pattern.width,(H-pad*2)/pattern.height);const ox=(W-cell*pattern.width)/2,oy=(H-cell*pattern.height)/2;
   ctx.fillStyle=view==='chart'?'#eee7dc':'#d9c7ae';ctx.fillRect(0,0,W,H);
   if(view!=='threads'){ctx.strokeStyle=view==='chart'?'rgba(70,60,50,.16)':'rgba(255,255,255,.12)';ctx.lineWidth=.6;for(let x=0;x<=pattern.width;x++){ctx.beginPath();ctx.moveTo(ox+x*cell,oy);ctx.lineTo(ox+x*cell,oy+pattern.height*cell);ctx.stroke()}for(let y=0;y<=pattern.height;y++){ctx.beginPath();ctx.moveTo(ox,oy+y*cell);ctx.lineTo(ox+pattern.width*cell,oy+y*cell);ctx.stroke()}}
   pattern.stitches.forEach((s,i)=>{if(s.color<0)return;const x=i%pattern.width,y=Math.floor(i/pattern.width),X=ox+x*cell,Y=oy+y*cell;const col=DMC[s.color].hex;ctx.strokeStyle=col;ctx.lineCap='round';ctx.lineWidth=Math.max(1.2,cell*(view==='3d'?.19:.15));if(s.type==='half'){ctx.beginPath();ctx.moveTo(X+cell*.18,Y+cell*.82);ctx.lineTo(X+cell*.82,Y+cell*.18);ctx.stroke()}else{ctx.beginPath();ctx.moveTo(X+cell*.2,Y+cell*.2);ctx.lineTo(X+cell*.8,Y+cell*.8);ctx.moveTo(X+cell*.8,Y+cell*.2);ctx.lineTo(X+cell*.2,Y+cell*.8);ctx.stroke()}if(selected===i){ctx.strokeStyle='#ff1688';ctx.lineWidth=2;ctx.strokeRect(X+1,Y+1,Math.max(2,cell-2),Math.max(2,cell-2));}});
   if(view==='threads'){ctx.font='700 12px Inter, sans-serif';colors.forEach((ci,k)=>{const x=ox+(k%4)*cell*10,y=oy+Math.floor(k/4)*cell*7;ctx.fillStyle=DMC[ci].hex;ctx.fillRect(x,y,cell*5,cell*5);ctx.fillStyle='#111';ctx.fillText('DMC '+DMC[ci].code,x,y+cell*6.2);ctx.fillText(DMC[ci].name,x,y+cell*7.7);ctx.fillText(String(pattern.stitches.filter(s=>s.color===ci).length)+' points',x,y+cell*9.2)})}
 };
 useEffect(()=>{draw();const fn=()=>draw();window.addEventListener('resize',fn);return()=>window.removeEventListener('resize',fn)},[pattern,view,zoom,selected]);
 const clickCanvas=(e:React.MouseEvent<HTMLCanvasElement>)=>{if(view==='threads')return;const c=canvasRef.current;if(!c)return;const r=c.getBoundingClientRect();const pad=Math.min(r.width,r.height)*.055,cell=Math.min((r.width-pad*2)/pattern.width,(r.height-pad*2)/pattern.height),ox=(r.width-cell*pattern.width)/2,oy=(r.height-cell*pattern.height)/2;const x=Math.floor((e.clientX-r.left-ox)/cell),y=Math.floor((e.clientY-r.top-oy)/cell);if(x>=0&&y>=0&&x<pattern.width&&y<pattern.height)mutateCell(y*pattern.width+x)};
 const generateNow=()=>{if(!prompt.trim())return;push(generate(prompt,pattern.width,pattern.height))};
 const undo=()=>{if(!history.length)return;const prev=history[history.length-1];setFuture(f=>[pattern,...f]);setHistory(h=>h.slice(0,-1));setPattern(prev);localStorage.setItem('brodez-pattern',JSON.stringify(prev))};
 const redo=()=>{if(!future.length)return;const next=future[0];setHistory(h=>[...h,pattern]);setFuture(f=>f.slice(1));setPattern(next);localStorage.setItem('brodez-pattern',JSON.stringify(next))};
 const reset=()=>push(generate(prompt,pattern.width,pattern.height));
 const save=()=>{localStorage.setItem('brodez-pattern',JSON.stringify(pattern));};
 const download=(name:string,type:string,data:string|Blob)=>{const a=document.createElement('a');a.href=typeof data==='string'?data:URL.createObjectURL(data);a.download=name;a.click();if(typeof data!=='string')setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
 const exportJSON=()=>download('brodez-pattern.json','application/json',new Blob([JSON.stringify(pattern,null,2)],{type:'application/json'}));
 const exportSVG=()=>{const cell=12,w=pattern.width*cell,h=pattern.height*cell;let s='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><rect width="100%" height="100%" fill="#eee7dc"/>';pattern.stitches.forEach((p,i)=>{if(p.color<0)return;const x=i%pattern.width*cell,y=Math.floor(i/pattern.width)*cell,c=DMC[p.color].hex;s+='<path d="M'+(x+2)+' '+(y+2)+'L'+(x+cell-2)+' '+(y+cell-2)+'M'+(x+cell-2)+' '+(y+2)+'L'+(x+2)+' '+(y+cell-2)+'" stroke="'+c+'" stroke-width="2" stroke-linecap="round"/>'});s+='</svg>';download('brodez-pattern.svg','image/svg+xml',new Blob([s],{type:'image/svg+xml'}))};
 const exportChart=()=>{const rows=pattern.stitches.map((s,i)=>({x:i%pattern.width+1,y:Math.floor(i/pattern.width)+1,color:s.color>=0?'DMC '+DMC[s.color].code:'',type:s.type})).filter(r=>r.color);const csv='X;Y;FIL;POINT\n'+rows.map(r=>[r.x,r.y,r.color,r.type].join(';')).join('\n');download('brodez-chart.csv','text/csv',new Blob([csv],{type:'text/csv;charset=utf-8'}))};
 const importImage=(file:File)=>{const img=new Image();img.onload=()=>{const off=document.createElement('canvas'),ctx=off.getContext('2d');if(!ctx)return;off.width=pattern.width;off.height=pattern.height;ctx.drawImage(img,0,0,off.width,off.height);const data=ctx.getImageData(0,0,off.width,off.height).data;const pool=pattern.palette.length?pattern.palette:DMC.map((_,i)=>i);const stitches=pattern.stitches.map((_,i)=>{const r=data[i*4],g=data[i*4+1],b=data[i*4+2],a=data[i*4+3];if(a<80)return {color:-1,type:'empty' as const};const hex='#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');return {color:nearest(hex,pool),type:'cross' as const}});push({...pattern,stitches,name:file.name.replace(/\.[^.]+$/,'')+' · conversion DMC',prompt:'Image importée : '+file.name});setPrompt('Image importée : '+file.name);setImageName(file.name)};img.src=URL.createObjectURL(file)};
 return <div className="app">
  <header className="topbar"><div className="brand"><span className="brandmark"><i/><i/><i/><i/></span><strong>BRODEZ</strong><span className="studio">STUDIO</span></div><div className="doc"><span className="live"/><span>LOCAL-FIRST</span><b>{pattern.name}</b></div><div className="top-actions"><button title="Annuler" onClick={undo}><Undo2/></button><button title="Rétablir" onClick={redo}><Redo2/></button><button className="ghost" onClick={save}><Save/> ENREGISTRER</button><button className="dark" onClick={exportSVG}><Download/> EXPORTER</button></div></header>
  <div className="workspace">
   <aside className="left">
    <div className="panel-title"><span>01</span><b>INTENTION</b></div>
    <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Décris exactement ce que tu veux broder…"/>
    <button className="generate" onClick={generateNow}><WandSparkles/> GÉNÉRER LE MOTIF <ChevronRight/></button>
    <div className="examples"><label>ESSAIS RAPIDES</label>{['Un tigre majestueux, noir ivoire fuchsia, 80 × 80, 12 couleurs','Un cœur couture avec roses rouges et feuillage, 60 × 60','Une maison nordique sous les étoiles, bleu nuit et ocre, 70 × 60','Un papillon graphique très coloré, 60 × 60'].map(x=><button key={x} onClick={()=>{setPrompt(x);push(generate(x,pattern.width,pattern.height))}}>{x}<ChevronRight/></button>)}</div>
    <div className="import"><label>SOURCE</label><button onClick={()=>fileRef.current?.click()}><ImageIcon/> IMPORTER UNE IMAGE</button><input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>e.target.files?.[0]&&importImage(e.target.files[0])}/>{imageName&&<small>{imageName}</small>}</div>
    <div className="controls"><label>FORMAT</label><div className="seg"><button className={pattern.width===pattern.height?'active':''} onClick={()=>{const n=pattern.width;push(generate(prompt,n,n))}}>CARRÉ</button><button onClick={()=>push(generate(prompt,80,60))}>PAYSAGE</button></div><label>TOILE</label><select value={pattern.width+'x'+pattern.height} onChange={e=>{const [w,h]=e.target.value.split('x').map(Number);push(generate(prompt,w,h))}}><option value="40x40">40 × 40</option><option value="60x60">60 × 60</option><option value="80x80">80 × 80</option><option value="100x100">100 × 100</option><option value="120x90">120 × 90</option></select></div>
   </aside>
   <main className="stage">
    <div className="stage-head"><div><span className="eyebrow">MOTIF / SOURCE DE VÉRITÉ</span><h1>{pattern.name}</h1><p>{pattern.width} × {pattern.height} points · {count.toLocaleString('fr-FR')} croix · {colors.length} fils</p></div><div className="view-switch">{[['2d','2D',Grid3X3],['3d','3D',Box],['chart','PATRON',Crosshair],['threads','FILS',Palette]].map(([id,label,Icon])=><button key={id as string} className={view===id?'active':''} onClick={()=>setView(id as any)}><Icon/><span>{label as string}</span></button>)}</div></div>
    <div className={'canvas-wrap '+view} style={{'--zoom':zoom} as React.CSSProperties}><div className="canvas-card">{view==='3d'?<Embroidery3D width={pattern.width} height={pattern.height} zoom={zoom} stitches={pattern.stitches.map((s,i)=>({color:s.color>=0?DMC[s.color].hex:'#00000000',x:i%pattern.width,y:Math.floor(i/pattern.width),type:s.type==='half'?'half':'cross'})).filter(s=>s.color!=='#00000000')}/>:<canvas ref={canvasRef} onClick={clickCanvas}/>}<div className="canvas-corners"><span>01</span><span>{pattern.width}</span><span>{pattern.height}</span></div></div></div>
    <div className="stage-foot"><div className="legend"><span className="live"/><b>ÉDITABLE</b><span>Cliquez une case pour ajouter / retirer un point</span></div><div className="zoom"><button onClick={()=>setZoom(z=>clamp(+(z-.1).toFixed(2),.7,1.4))}><ZoomOut/></button><span>{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(z=>clamp(+(z+.1).toFixed(2),.7,1.4))}><ZoomIn/></button><button onClick={()=>setZoom(1)}><RotateCcw/></button></div></div>
   </main>
   <aside className="right">
    <div className="panel-title"><span>02</span><b>MATIÈRE</b></div>
    <div className="selected"><div className="big-cross" style={{color:selected!==null&&pattern.stitches[selected]?.color>=0?DMC[pattern.stitches[selected].color].hex:DMC[activeColor].hex}}>×</div><div><small>{selected!==null?'CASE SÉLECTIONNÉE':'COULEUR ACTIVE'}</small><strong>{selected!==null&&pattern.stitches[selected]?.color>=0?'DMC '+DMC[pattern.stitches[selected].color].code:'DMC '+DMC[activeColor].code}</strong></div></div>
    <label>PALETTE DMC</label><div className="palette">{DMC.map((d,i)=><button key={d.code} className={activeColor===i?'chosen':''} title={d.code+' · '+d.name} onClick={()=>setActiveColor(i)}><i style={{background:d.hex}}/><span>{d.code}</span></button>)}</div>
    <div className="stats"><div><span>POINTS</span><b>{count.toLocaleString('fr-FR')}</b></div><div><span>COULEURS</span><b>{colors.length}</b></div><div><span>TOILE</span><b>{pattern.count} CT</b></div><div><span>BRINS</span><b>{pattern.strands}</b></div></div>
    <div className="inspector"><div><SlidersHorizontal/><b>PARAMÈTRES</b></div><label>TISSU</label><select value={pattern.fabric} onChange={e=>setPattern({...pattern,fabric:e.target.value})}><option>Aïda</option><option>Lin</option><option>Evenweave</option><option>Toile Zweigart</option></select><label>COMPTE</label><select value={pattern.count} onChange={e=>setPattern({...pattern,count:Number(e.target.value)})}><option value="11">11 ct</option><option value="14">14 ct</option><option value="16">16 ct</option><option value="18">18 ct</option><option value="20">20 ct</option></select><label>BRINS</label><select value={pattern.strands} onChange={e=>setPattern({...pattern,strands:Number(e.target.value)})}><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></div>
    <div className="exports"><label>FABRIQUER</label><button onClick={exportSVG}><Download/> SVG vectoriel</button><button onClick={exportChart}><Grid3X3/> Tableau CSV</button><button onClick={exportJSON}><FileJson/> Pattern JSON</button></div>
   </aside>
  </div>
  <footer><span><Sparkles/> BRODEZ 2.0</span><span>INTENTION → COMPOSITION → GRILLE → DMC → PATRON</span><span><MousePointer2/> AI PROPOSE · VOUS VALIDEZ</span></footer>
 </div>
}
export default App;