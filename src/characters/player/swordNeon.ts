import { AdditiveBlending, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, PointLight, ShaderMaterial, Uint32BufferAttribute, type Object3D } from 'three';

/** Cores da referência do autor: miolo amarelo quente, franja laranja. */
export const SWORD_NEON = {
  core: new Color('#fff6b4'), glow: new Color('#ffd21f'), edge: new Color('#ff9410'),
  /** Acima desta altura do modelo (glTF, cabo em +Y) começa a guarda: fora do neon. */
  bladeTop: .02, inflate: .011, haloWidth: .22
} as const;

/** Lâminas como fonte de luz em Shanghai, como a mochila; em Marte a luz fica desligada. */
/** Na ponta da lâmina, longe do capacete: perto do corpo, o decaimento estourava o personagem. */
export const SWORD_LIGHT = { color: '#ffc21a', intensity: 1.5, reach: 4, decay: 2, bladePoint: -.62, swingBoost: .25 } as const;
export function createSwordLight() {
  const light = new PointLight(SWORD_LIGHT.color, 0, SWORD_LIGHT.reach, SWORD_LIGHT.decay);
  light.name = 'EspadaNeonLuz'; light.castShadow = false;
  return light;
}

/** Índices só dos triângulos inteiros na lâmina; os atributos são os da própria arma. */
export function bladeTriangles(geometry: BufferGeometry, top: number = SWORD_NEON.bladeTop) {
  const y = geometry.getAttribute('position'), index = geometry.getIndex(), count = index ? index.count : y.count, out: number[] = [];
  for (let i = 0; i + 2 < count; i += 3) {
    const a = index ? index.getX(i) : i, b = index ? index.getX(i + 1) : i + 1, c = index ? index.getX(i + 2) : i + 2;
    if (y.getY(a) < top && y.getY(b) < top && y.getY(c) < top) out.push(a, b, c);
  }
  return out;
}

const COLORSPACE = '#include <colorspace_fragment>';

function contourMaterial(power: { value: number }) {
  return new ShaderMaterial({
    uniforms: { power, inflate: { value: SWORD_NEON.inflate }, core: { value: SWORD_NEON.core }, glow: { value: SWORD_NEON.glow }, edge: { value: SWORD_NEON.edge } },
    vertexShader: `uniform float inflate; varying vec3 vNormal; varying vec3 vView;
      void main(){ vec4 p = modelViewMatrix * vec4(position + normal * inflate, 1.); vNormal = normalize(normalMatrix * normal); vView = normalize(-p.xyz); gl_Position = projectionMatrix * p; }`,
    fragmentShader: `uniform float power; uniform vec3 core, glow, edge; varying vec3 vNormal; varying vec3 vView;
      void main(){ float f = pow(1. - abs(dot(normalize(vNormal), normalize(vView))), 1.6);
        vec3 c = mix(glow, core, smoothstep(.45, .95, f)); c = mix(edge, c, smoothstep(.05, .5, f));
        gl_FragColor = vec4(c * power, (.1 + f * .95) * clamp(power, 0., 1.));
        ${COLORSPACE}
      }`,
    transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false, side: DoubleSide
  });
}

function haloMaterial(power: { value: number }) {
  return new ShaderMaterial({
    uniforms: { power, width: { value: SWORD_NEON.haloWidth }, glow: { value: SWORD_NEON.glow }, edge: { value: SWORD_NEON.edge } },
    vertexShader: `uniform float width; attribute vec2 corner; varying vec2 vCorner;
      void main(){ vCorner = corner; vec4 c = modelViewMatrix * vec4(position, 1.);
        vec3 axis = (modelViewMatrix * vec4(0., 1., 0., 0.)).xyz; float scale = length(axis);
        vec3 side = normalize(cross(axis, -c.xyz)); c.xyz += side * corner.x * width * scale; gl_Position = projectionMatrix * c; }`,
    fragmentShader: `uniform float power; uniform vec3 glow, edge; varying vec2 vCorner;
      void main(){ float along = smoothstep(0., .16, vCorner.y) * smoothstep(1., .82, vCorner.y); float d = abs(vCorner.x);
        float a = exp(-d * d * 9.) * along; vec3 c = mix(edge, glow, exp(-d * d * 18.));
        gl_FragColor = vec4(c * power, a * .42 * clamp(power, 0., 1.2));
        ${COLORSPACE}
      }`,
    transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false, side: DoubleSide
  });
}

/**
 * Neon em volta da lâmina, sem tocar no GLB nem acrescentar textura: contorno pela borda da própria
 * malha, um pouco inflada, e um halo sempre virado para a câmera. Dois draw calls por espada.
 */
export function createSwordNeon(weapon: Object3D) {
  let blade: Mesh | undefined;
  weapon.traverse(node => { if (!blade && (node as Mesh).isMesh) blade = node as Mesh; });
  let flicker = 1;
  const power = { value: 1 }, geometries: BufferGeometry[] = [], materials: ShaderMaterial[] = [], meshes: Mesh[] = [];
  if (blade) {
    const contour = new BufferGeometry();
    contour.setAttribute('position', blade.geometry.getAttribute('position'));
    contour.setAttribute('normal', blade.geometry.getAttribute('normal'));
    contour.setIndex(new Uint32BufferAttribute(bladeTriangles(blade.geometry), 1));
    const halo = new BufferGeometry();
    halo.setAttribute('position', new Float32BufferAttribute([0, -.6, 0, 0, -.6, 0, 0, .06, 0, 0, .06, 0], 3));
    halo.setAttribute('corner', new Float32BufferAttribute([-1, 0, 1, 0, -1, 1, 1, 1], 2));
    halo.setIndex([0, 1, 2, 2, 1, 3]);
    const contourMat = contourMaterial(power), haloMat = haloMaterial(power);
    for (const [geometry, material, name, order] of [[contour, contourMat, 'EspadaNeonContorno', 4], [halo, haloMat, 'EspadaNeonHalo', 3]] as const) {
      const mesh = new Mesh(geometry, material);
      mesh.name = name; mesh.renderOrder = order; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
      blade.add(mesh); geometries.push(geometry); materials.push(material); meshes.push(mesh);
    }
  }
  return {
    meshes,
    /** `level`: 1 em repouso; sobe no corte. Pulso discreto de tubo de neon. */
    update(time: number, level: number) { flicker = 1 + .07 * Math.sin(time * 7.3) + .03 * Math.sin(time * 19); power.value = level * flicker; },
    /** Mesmo pulso do tubo, para a luz no ambiente acompanhar o brilho da lâmina. */
    get flicker() { return flicker; },
    dispose() { for (const mesh of meshes) mesh.removeFromParent(); for (const geometry of geometries) geometry.dispose(); for (const material of materials) material.dispose(); }
  };
}
