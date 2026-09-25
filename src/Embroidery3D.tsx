import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type EmbroideryStitch3D = { color: string; x: number; y: number; type: 'cross'|'half' };

type Props = { width:number; height:number; stitches:EmbroideryStitch3D[]; zoom?:number };

function placeInstance(mesh:THREE.InstancedMesh, index:number, a:THREE.Vector3, b:THREE.Vector3){
  const direction=new THREE.Vector3().subVectors(b,a);
  const length=direction.length();
  const mid=new THREE.Vector3().addVectors(a,b).multiplyScalar(.5);
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  const scale=new THREE.Vector3(1,length/10,1);
  const matrix=new THREE.Matrix4().compose(mid,q,scale);
  mesh.setMatrixAt(index,matrix);
}

export default function Embroidery3D({width,height,stitches,zoom=1}:Props){
  const host=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=host.current;if(!el)return;
    const scene=new THREE.Scene();scene.background=new THREE.Color('#d9c7ae');
    const camera=new THREE.PerspectiveCamera(38,1,.01,100);camera.position.set(0,8,15);
    const renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;el.appendChild(renderer.domElement);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=5;controls.maxDistance=35;controls.target.set(0,0,0);
    scene.add(new THREE.HemisphereLight('#fff7e9','#5c4636',2.1));
    const key=new THREE.DirectionalLight('#ffffff',3);key.position.set(-8,14,12);scene.add(key);
    const scale=10/Math.max(width,height),halfW=width*scale/2,halfH=height*scale/2;
    const fabric=new THREE.Mesh(new THREE.PlaneGeometry(width*scale,height*scale),new THREE.MeshStandardMaterial({color:'#cdb894',roughness:.95}));
    fabric.rotation.x=-Math.PI/2;fabric.position.y=-.12;scene.add(fabric);
    const hoop=new THREE.Mesh(new THREE.TorusGeometry(Math.min(halfW,halfH)*.98,.10,12,96),new THREE.MeshStandardMaterial({color:'#715a43',roughness:.75}));
    hoop.rotation.x=-Math.PI/2;scene.add(hoop);
    const root=new THREE.Group();root.rotation.x=THREE.MathUtils.degToRad(3);scene.add(root);
    const groups=new Map<string,{cross:EmbroideryStitch3D[];half:EmbroideryStitch3D[]}>();
    for(const st of stitches){if(!groups.has(st.color))groups.set(st.color,{cross:[],half:[]});groups.get(st.color)![st.type].push(st);}
    const baseGeo=new THREE.CylinderGeometry(Math.max(.018,scale*.55),Math.max(.018,scale*.55),10,6);
    for(const [color,items] of groups){
      for(const kind of ['cross','half'] as const){
        const list=items[kind];if(!list.length)continue;
        const mat=new THREE.MeshStandardMaterial({color,roughness:.52,metalness:.02});
        const mesh=new THREE.InstancedMesh(baseGeo,mat,list.length);mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
        list.forEach((st,i)=>{
          const cx=(st.x+.5)*scale-halfW,cy=halfH-(st.y+.5)*scale,z=.10;
          const a=new THREE.Vector3(cx-scale*.31,cy+scale*.31,z+(kind==='cross'?0:.003));
          const b=new THREE.Vector3(cx+scale*.31,cy-scale*.31,z+(kind==='cross'?0:.003));
          placeInstance(mesh,i,a,b);
        });
        mesh.instanceMatrix.needsUpdate=true;root.add(mesh);
        if(kind==='cross'){
          const second=new THREE.InstancedMesh(baseGeo,mat,list.length);second.instanceMatrix.setUsage(THREE.StaticDrawUsage);
          list.forEach((st,i)=>{
            const cx=(st.x+.5)*scale-halfW,cy=halfH-(st.y+.5)*scale,z=.106;
            placeInstance(second,i,new THREE.Vector3(cx+scale*.31,cy+scale*.31,z),new THREE.Vector3(cx-scale*.31,cy-scale*.31,z));
          });
          second.instanceMatrix.needsUpdate=true;root.add(second);
        }
      }
    }
    const resize=()=>{const w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);camera.aspect=w/h;camera.position.z=15/zoom;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};
    resize();const ro=new ResizeObserver(resize);ro.observe(el);
    let frame=0;const tick=()=>{frame=requestAnimationFrame(tick);controls.update();renderer.render(scene,camera)};tick();
    return()=>{cancelAnimationFrame(frame);ro.disconnect();controls.dispose();root.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry!==baseGeo)m.geometry?.dispose();const mat=m.material;if(Array.isArray(mat))mat.forEach(x=>x.dispose());else mat?.dispose()});baseGeo.dispose();renderer.dispose();renderer.domElement.remove()};
  },[width,height,stitches,zoom]);
  return <div ref={host} className="embroidery-3d" aria-label="Visualisation 3D réaliste du motif brodé"><div className="three-hint">GLISSER · ORBITER &nbsp; / &nbsp; PINCER · ZOOMER</div></div>;
}
