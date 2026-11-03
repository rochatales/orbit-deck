import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, InstancedBufferAttribute, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry, SRGBColorSpace, Vector2 } from 'three';
import { simulationBlocked } from '../game/simulationGate';
import { playerPosition } from '../state/playerTransient';
import { cloudLayout, CLOUD_CLEAR, CLOUD_WIND } from './shanghaiCloudLayout';
import { crateRandom } from '../game/props/crateImpact';

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Puff de névoa em fBm (5 oitavas de ruído de valor) com queda radial suave: sem disco
 * perfeito nem degraus de 8 bits; a borda é irregular como nuvem de verdade. */
function createCloudTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!, image = g.createImageData(size, size), rand = crateRandom('nuvem-fbm');
  const grid = 64, lattice = Float32Array.from({ length: grid * grid }, () => rand());
  const value = (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const at = (a: number, b: number) => lattice[((b % grid + grid) % grid) * grid + ((a % grid + grid) % grid)];
    const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx, bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx;
    return top + (bottom - top) * sy;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let n = 0, amp = .5, freq = 4 / size;
    for (let o = 0; o < 5; o++) { n += value(x * freq, y * freq) * amp; amp *= .5; freq *= 2; }
    const dx = x / size - .5, dy = y / size - .5, r = Math.sqrt(dx * dx + dy * dy) * 2;
    const falloff = Math.max(0, 1 - r * (.75 + n * .5));
    const density = Math.max(0, Math.min(1, (n - .32) * 2.2)) * falloff * falloff * (3 - 2 * falloff);
    const shade = 214 + n * 36, i = (y * size + x) * 4;
    image.data[i] = shade; image.data[i + 1] = shade * .985; image.data[i + 2] = shade * .97; image.data[i + 3] = density * 255;
  }
  g.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * Névoa baixa de Shanghai (S6.3): densa nas bordas e bancos que cruzam o mapa com o vento.
 * - Desenhada por cima da cena (sem teste de profundidade): não corta a berma facetada nem as
 *   ruínas em degraus — era daí o aspecto pixelado.
 * - Clareira em volta do explorador para não esconder combate; dithering contra faixas.
 * - Deriva sem alocação no useFrame; parada com prefers-reduced-motion.
 */
export function ShanghaiClouds() {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const instances = useMemo(() => cloudLayout(reducedMotion), []);
  const player = useMemo(() => ({ value: new Vector2(playerPosition.x, playerPosition.z) }), []);

  const { geometry, material, texture } = useMemo(() => {
    const texture = createCloudTexture();
    const geometry = new PlaneGeometry(1, 1);
    geometry.setAttribute('aAlpha', new InstancedBufferAttribute(Float32Array.from(instances, c => c.alpha), 1));
    const material = new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false, dithering: true });
    material.onBeforeCompile = shader => {
      shader.uniforms.uPlayer = player;
      shader.vertexShader = 'attribute float aAlpha;\nvarying float vAlpha;\nvarying vec2 vCloudXZ;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vAlpha = aAlpha;
        #ifdef USE_INSTANCING
          vCloudXZ = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xz;
        #else
          vCloudXZ = (modelMatrix * vec4(transformed, 1.0)).xz;
        #endif`);
      shader.fragmentShader = 'uniform vec2 uPlayer;\nvarying float vAlpha;\nvarying vec2 vCloudXZ;\n' + shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        diffuseColor.a *= vAlpha * smoothstep(${CLOUD_CLEAR.inner.toFixed(1)}, ${CLOUD_CLEAR.outer.toFixed(1)}, distance(vCloudXZ, uPlayer));`);
    };
    return { geometry, material, texture };
  }, [instances, player]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); texture.dispose(); }, [geometry, material, texture]);

  const place = (mesh: InstancedMesh, i: number) => {
    const c = instances[i];
    dummy.position.set(c.x, c.y, c.z); dummy.rotation.set(-Math.PI / 2, 0, c.spin); dummy.scale.set(c.scale, c.scale * c.stretch, 1);
    dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
  };
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < instances.length; i++) place(mesh, i);
    mesh.instanceMatrix.needsUpdate = true;
  }, [instances]);

  useFrame((_, delta) => {
    player.value.set(playerPosition.x, playerPosition.z);
    const mesh = meshRef.current;
    if (reducedMotion || simulationBlocked() || !mesh) return;
    const dt = Math.min(delta, .1);
    for (let i = 0; i < instances.length; i++) {
      const c = instances[i];
      c.x += c.drift * CLOUD_WIND.x * dt; c.z += c.drift * CLOUD_WIND.z * dt; c.spin += c.drift * .004 * dt;
      if (c.x > c.maxX) c.x = c.minX;
      if (c.z > c.maxZ) c.z = c.minZ;
      place(mesh, i);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, instances.length]} name="ShanghaiClouds" frustumCulled={false} renderOrder={20}/>;
}
