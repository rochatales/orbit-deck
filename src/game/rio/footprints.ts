import {
    DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, PlaneGeometry,
    ShaderMaterial, Vector3,
} from 'three';
import { RIO_LIGHT } from './lighting';

const CAPACITY = 96;
const LIFETIME = 36;

export class RioFootprints {
    readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
    private readonly centers = new InstancedBufferAttribute(new Float32Array(CAPACITY * 3), 3).setUsage(DynamicDrawUsage);
    private readonly headings = new InstancedBufferAttribute(new Float32Array(CAPACITY * 2), 2).setUsage(DynamicDrawUsage);
    private readonly alpha = new InstancedBufferAttribute(new Float32Array(CAPACITY), 1).setUsage(DynamicDrawUsage);
    private readonly born = new Float32Array(CAPACITY);
    private readonly depth = new Float32Array(CAPACITY);
    private cursor = 0;
    private time = 0;

    constructor() {
        const plane = new PlaneGeometry(.22, .38);
        const geometry = new InstancedBufferGeometry();
        geometry.setIndex(plane.index);
        geometry.setAttribute('position', plane.attributes.position);
        geometry.setAttribute('uv', plane.attributes.uv);
        geometry.setAttribute('center', this.centers);
        geometry.setAttribute('heading', this.headings);
        geometry.setAttribute('impression', this.alpha);
        const material = new ShaderMaterial({
            transparent: true, depthWrite: false,
            uniforms: { uSun: { value: new Vector3(...RIO_LIGHT.sunPosition).normalize() } },
            vertexShader: /* glsl */ `
                uniform vec3 uSun;
                attribute vec3 center;
                attribute vec2 heading;
                attribute float impression;
                varying vec2 p;
                varying vec2 sun;
                varying float strength;
                void main() {
                    p = uv * 2.0 - 1.0;
                    vec2 right = vec2(heading.x, -heading.y);
                    vec2 forward = vec2(-heading.y, -heading.x);
                    sun = vec2(dot(right, uSun.xz), dot(forward, uSun.xz));
                    vec2 offset = right * position.x + forward * position.y;
                    strength = impression;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(center + vec3(offset.x, 0.0, offset.y), 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                varying vec2 p;
                varying vec2 sun;
                varying float strength;
                float sole(vec2 uv) {
                    float heel = length((uv - vec2(-.11, -.48)) / vec2(.56, .40));
                    float toe = length((uv - vec2(.08, .26)) / vec2(.74, .60));
                    float arch = length((uv - vec2(-.14, -.02)) / vec2(.45, .56));
                    return 1.0 - smoothstep(.73, 1.0, min(heel, min(toe, arch)));
                }
                void main() {
                    float cut = sole(p);
                    float edge = sole(p - sun * .15) - sole(p + sun * .15);
                    float tread = .85 + .15 * cos(p.y * 31.0 + abs(p.x) * 4.0);
                    float shade = cut * .34 * tread + max(edge, 0.0) * .42;
                    float rim = max(-edge, 0.0) * .24;
                    vec3 color = mix(vec3(.20, .117, .064), vec3(.78, .59, .35),
                                     rim / max(.001, rim + shade));
                    gl_FragColor = vec4(color, strength * (shade + rim));
                    #include <colorspace_fragment>
                }
            `,
        });
        const mesh = new Mesh(geometry, material);
        mesh.name = 'RioPegadasNaAreia';
        mesh.frustumCulled = false;
        mesh.renderOrder = 1; // A lâmina animada ainda pode cobrir uma marca.
        geometry.instanceCount = 0;
        mesh.raycast = () => {};
        this.mesh = mesh;
    }

    stamp(x: number, y: number, z: number, heading: number, left: boolean, damp: boolean) {
        const slot = this.cursor;
        this.cursor = (slot + 1) % CAPACITY;
        // Pontas das botas levemente abertas para cada lado.
        const yaw = heading + Math.PI + (left ? -.11 : .11);
        this.centers.setXYZ(slot, x, y + .012, z);
        this.headings.setXY(slot, Math.cos(yaw), Math.sin(yaw));
        this.centers.needsUpdate = this.headings.needsUpdate = true;
        this.born[slot] = this.time;
        this.depth[slot] = damp ? 1 : .82;
        this.alpha.setX(slot, this.depth[slot]);
        this.mesh.geometry.instanceCount = Math.max(this.mesh.geometry.instanceCount, slot + 1);
        this.alpha.needsUpdate = true;
    }

    step(dt: number) {
        if (dt <= 0 || !this.mesh.geometry.instanceCount) return;
        this.time += Math.min(dt, .1);
        let hasVisiblePrint = false;
        for (let i = 0; i < this.mesh.geometry.instanceCount; i++) {
            const remaining = Math.max(0, LIFETIME - (this.time - this.born[i]));
            this.alpha.setX(i, this.depth[i] * Math.min(1, remaining / 12));
            hasVisiblePrint ||= remaining > 0;
        }
        if (!hasVisiblePrint) { this.mesh.geometry.instanceCount = 0; this.cursor = 0; }
        this.alpha.needsUpdate = true;
    }

    dispose() {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
