import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type EmbroideryStitch3D = { color: string; x: number; y: number; type: 'cross'|'half' };

type Props = {
  width: number;
  height: number;
  stitches: EmbroideryStitch3D[];
  zoom?: number;
};

function makeSegment(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 6);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), direction.normalize());
  return mesh;
}

export default function Embroidery3D({width, height, stitches, zoom=1}: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#d9c7ae');

    const camera = new THREE.PerspectiveCamera(38, 1, .01, 100);
    camera.position.set(0, Math.max(8, Math.min(width,height)*.55), Math.max(12, Math.min(width,height)*.8));
    camera.lookAt(0,0,0);

    const renderer = new THREE.WebGLRenderer({antialias:true, alpha:false});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .08;
    controls.minDistance = 5;
    controls.maxDistance = 80;
    controls.target.set(0,0,0);

    scene.add(new THREE.HemisphereLight('#fff7e9','#5c4636',2.2));
    const key = new THREE.DirectionalLight('#ffffff',3);
    key.position.set(-8,14,12);
    scene.add(key);

    const scale = 10 / Math.max(width,height);
    const halfW = width * scale / 2;
    const halfH = height * scale / 2;

    const fabric = new THREE.Mesh(
      new THREE.PlaneGeometry(width*scale, height*scale),
      new THREE.MeshStandardMaterial({color:'#cdb894',roughness:.95,metalness:0})
    );
    fabric.rotation.x = -Math.PI/2;
    fabric.position.y = -.12;
    scene.add(fabric);

    const hoop = new THREE.Mesh(
      new THREE.TorusGeometry(Math.min(halfW,halfH)*.98,.10,12,96),
      new THREE.MeshStandardMaterial({color:'#715a43',roughness:.75,metalness:.05})
    );
    hoop.rotation.x = -Math.PI/2;
    hoop.position.y = -.02;
    scene.add(hoop);

    const root = new THREE.Group();
    root.rotation.x = THREE.MathUtils.degToRad(3);
    scene.add(root);

    const thickness = Math.max(.018, scale*.55);
    const z = .10;
    stitches.forEach(st => {
      const cx = (st.x + .5) * scale - halfW;
      const cy = halfH - (st.y + .5) * scale;
      const mat = new THREE.MeshStandardMaterial({color:st.color,roughness:.55,metalness:.03});
      const a = new THREE.Vector3(cx-scale*.31, cy+scale*.31, z);
      const b = new THREE.Vector3(cx+scale*.31, cy-scale*.31, z);
      root.add(makeSegment(a,b,thickness,mat));
      if (st.type === 'cross') {
        const c = new THREE.Vector3(cx+scale*.31, cy+scale*.31, z+.006);
        const d = new THREE.Vector3(cx-scale*.31, cy-scale*.31, z+.006);
        root.add(makeSegment(c,d,thickness,mat));
      }
    });

    const resize = () => {
      const w = Math.max(1,el.clientWidth);
      const h = Math.max(1,el.clientHeight);
      camera.aspect = w/h;
      camera.position.multiplyScalar(zoom === 1 ? 1 : 1);
      camera.updateProjectionMatrix();
      renderer.setSize(w,h,false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let frame=0;
    const tick=()=>{frame=requestAnimationFrame(tick);controls.update();renderer.render(scene,camera)};
    tick();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      root.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry)m.geometry.dispose();const mat=m.material;if(Array.isArray(mat))mat.forEach(x=>x.dispose());else if(mat)mat.dispose()});
      scene.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry)m.geometry.dispose();});
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [width,height,stitches,zoom]);

  return <div ref={host} className="embroidery-3d" aria-label="Visualisation 3D réaliste du motif brodé"><div className="three-hint">GLISSER · ORBITER &nbsp; / &nbsp; PINCER · ZOOMER</div></div>;
}
