import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, Color, DoubleSide, InstancedMesh, Mesh, MeshStandardMaterial, Object3D } from 'three';
import type { OfficeWorld } from '../world/createOfficeMap';
import { chunkGeometry } from '../game/props/crateImpact';
import { createDebris, createDecals, createWeeds, type Debris, type Decal } from '../game/shanghai/urbanDecay';
import { createDecayAtlas, createWeedTexture } from '../game/shanghai/decayTextures';

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEBRIS_COLORS: Record<Debris['tone'], Color> = {
  asfalto: new Color('#33363a'), concreto: new Color('#8c8a83'), tijolo: new Color('#8a4632'), ladrilho: new Color('#a49d8b')
};
const WEED_COLORS = [new Color('#7fa043'), new Color('#9cb04e'), new Color('#5f8c3c'), new Color('#b6a964')];

function decalGeometry(decals: readonly Decal[]) {
  const positions = new Float32Array(decals.length * 12), uvs = new Float32Array(decals.length * 8), index: number[] = [];
  decals.forEach((d, i) => {
    const c = Math.cos(d.angle) * d.size / 2, s = Math.sin(d.angle) * d.size / 2;
    const u0 = (d.cell % 4) / 4, v0 = 1 - (Math.floor(d.cell / 4) + 1) / 4;
    [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]].forEach(([a, b, u, v], k) => {
      positions.set([d.x + a * c - b * s, d.y, d.z + a * s + b * c], i * 12 + k * 3);
      uvs.set([u0 + u / 4, v0 + v / 4], i * 8 + k * 2);
    });
    index.push(i * 4, i * 4 + 2, i * 4 + 1, i * 4, i * 4 + 3, i * 4 + 2);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** Três planos cruzados de 1 m com normal para cima: o tufo acende como o piso. */
function weedGeometry() {
  const positions: number[] = [], uvs: number[] = [], normals: number[] = [], index: number[] = [];
  for (let k = 0; k < 3; k++) {
    const a = k * Math.PI / 3, cx = Math.cos(a) * .5, cz = Math.sin(a) * .5, base = k * 4;
    positions.push(-cx, 0, -cz, cx, 0, cz, cx, 1, cz, -cx, 1, -cz);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    for (let n = 0; n < 4; n++) normals.push(0, 1, 0);
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setIndex(index);
  return geometry;
}

/** Destruição urbana e mato: 3 draw calls, 2 texturas em canvas, nenhum colisor. */
function createDecay(world: OfficeWorld) {
  const height = world.surfaceHeight ?? (() => 0);
  const decals = createDecals(height), debris = createDebris(height, decals), weeds = createWeeds(height, decals);
  const atlas = createDecayAtlas(), weedTexture = createWeedTexture();

  const decalMaterial = new MeshStandardMaterial({ map: atlas, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const decalMesh = new Mesh(decalGeometry(decals), decalMaterial);
  decalMesh.name = 'ShanghaiDecayDecals'; decalMesh.receiveShadow = true; decalMesh.renderOrder = 1;

  const dummy = new Object3D(), tint = new Color();
  const debrisMaterial = new MeshStandardMaterial({ roughness: .95, flatShading: true });
  const debrisMesh = new InstancedMesh(chunkGeometry(), debrisMaterial, debris.length);
  debrisMesh.name = 'ShanghaiDecayDebris'; debrisMesh.castShadow = true; debrisMesh.receiveShadow = true;
  debris.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.tilt, p.yaw, p.roll, 'YXZ'); dummy.scale.set(p.w, p.h, p.d);
    dummy.updateMatrix(); debrisMesh.setMatrixAt(i, dummy.matrix);
    debrisMesh.setColorAt(i, tint.copy(DEBRIS_COLORS[p.tone]).multiplyScalar(.82 + ((i * 53) % 13) / 36));
  });

  const sway = { value: 0 };
  const weedMaterial = new MeshStandardMaterial({ map: weedTexture, alphaTest: .45, side: DoubleSide, roughness: .9 });
  weedMaterial.onBeforeCompile = shader => {
    shader.uniforms.uSway = sway;
    shader.vertexShader = 'uniform float uSway;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float phase = instanceMatrix[3].x * .7 + instanceMatrix[3].z * .5;
        transformed.x += sin(uSway * 1.6 + phase) * .09 * uv.y * uv.y;
        transformed.z += cos(uSway * 1.3 + phase) * .05 * uv.y * uv.y;
      #endif`);
  };
  const weedMesh = new InstancedMesh(weedGeometry(), weedMaterial, weeds.length);
  weedMesh.name = 'ShanghaiDecayWeeds'; weedMesh.receiveShadow = true;
  weeds.forEach((w, i) => {
    dummy.position.set(w.x, w.y, w.z); dummy.rotation.set(0, w.yaw, 0); dummy.scale.set(w.width, w.height, w.width);
    dummy.updateMatrix(); weedMesh.setMatrixAt(i, dummy.matrix);
    const a = WEED_COLORS[Math.floor(w.tone * 4) % 4];
    weedMesh.setColorAt(i, tint.copy(a).multiplyScalar(.85 + w.tone * .3));
  });

  return {
    decalMesh, debrisMesh, weedMesh, sway,
    dispose() {
      decalMesh.geometry.dispose(); decalMaterial.dispose(); atlas.dispose();
      debrisMesh.geometry.dispose(); debrisMaterial.dispose(); debrisMesh.dispose();
      weedMesh.geometry.dispose(); weedMaterial.dispose(); weedTexture.dispose(); weedMesh.dispose();
    }
  };
}

export function ShanghaiDecay({ world }: { world: OfficeWorld }) {
  const decay = useMemo(() => createDecay(world), [world]);
  useEffect(() => () => decay.dispose(), [decay]);
  useFrame((_, dt) => { if (!reducedMotion) decay.sway.value += Math.min(dt, .1); });
  return <>
    <primitive object={decay.decalMesh} dispose={null}/>
    <primitive object={decay.debrisMesh} dispose={null}/>
    <primitive object={decay.weedMesh} dispose={null}/>
  </>;
}
