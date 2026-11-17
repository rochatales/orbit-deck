import { Color, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, PlaneGeometry, ShaderMaterial, type Group } from 'three';
import { RIO_ARES_POSITION } from './layout';

export const RIO_LANDING_DUST = { puffs: 40, duration: 4.2 } as const;

/** Poeira remanescente do pouso. Uma chamada de desenho, com partículas montadas no carregamento. */
export function createRioLandingDust(group: Group) {
    const { puffs, duration } = RIO_LANDING_DUST;
    const starts = new Float32Array(puffs * 3);
    const drifts = new Float32Array(puffs * 3);
    const shapes = new Float32Array(puffs * 3);
    for (let i = 0; i < puffs; i++) {
        const offset = i * 3;
        const angle = i * 2.39996;
        const side = i % 2 ? 1 : -1;
        const radial = .35 + (i % 7) * .12;
        starts.set([.8 + Math.cos(angle) * radial, .15, side * (1.9 + Math.abs(Math.sin(angle)) * radial)], offset);
        drifts.set([Math.cos(angle) * (1.8 + i % 4), .24 + (i % 6) * .07, side * (1.2 + i % 3)], offset);
        shapes.set([i % 10 * .055, 2.3 + (i % 8) * .19, .47 + (i % 5) * .16], offset);
    }

    const plane = new PlaneGeometry();
    const geometry = new InstancedBufferGeometry();
    geometry.setIndex(plane.index);
    for (const [name, attribute] of Object.entries(plane.attributes)) geometry.setAttribute(name, attribute);
    geometry.instanceCount = puffs;
    geometry.setAttribute('aStart', new InstancedBufferAttribute(starts, 3));
    geometry.setAttribute('aDrift', new InstancedBufferAttribute(drifts, 3));
    geometry.setAttribute('aShape', new InstancedBufferAttribute(shapes, 3));
    const time = { value: 0 };
    const material = new ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { uAge: time, uDustColor: { value: new Color('#c9ab82') } },
        vertexShader: /* glsl */ `
            uniform float uAge;
            attribute vec3 aStart;
            attribute vec3 aDrift;
            attribute vec3 aShape;
            varying vec2 vUv;
            varying float vAlpha;
            void main() {
                float age = max(0.0, uAge - aShape.x);
                float t = clamp(age / aShape.y, 0.0, 1.0);
                vAlpha = smoothstep(0.0, 0.22, age) * (1.0 - smoothstep(0.22, 1.0, t)) * 0.23;
                vec3 center = aStart + aDrift * (1.0 - exp(-age * 0.8));
                float size = aShape.z + t * 1.8;
                vec4 view = modelViewMatrix * vec4(center, 1.0);
                view.xy += position.xy * vec2(1.5, 0.76) * size;
                vUv = uv * 2.0 - 1.0;
                gl_Position = projectionMatrix * view;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 uDustColor;
            varying vec2 vUv;
            varying float vAlpha;
            void main() {
                float r = dot(vUv, vUv);
                gl_FragColor = vec4(uDustColor, vAlpha * exp(-2.8 * r) * (1.0 - smoothstep(0.35, 1.0, r)));
                #include <colorspace_fragment>
            }
        `,
    });
    const mesh = new Mesh(geometry, material);
    mesh.name = 'RioARES_Poeira';
    mesh.position.set(RIO_ARES_POSITION.x, 0, RIO_ARES_POSITION.z);
    mesh.frustumCulled = false;
    mesh.visible = false;
    group.add(mesh);

    return (dt: number) => {
        if (dt <= 0 || time.value >= duration) return;
        time.value = Math.min(duration, time.value + Math.min(dt, .1));
        mesh.visible = time.value < duration;
    };
}
