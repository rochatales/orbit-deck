import { Color, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Matrix4, PlaneGeometry, ShaderMaterial, Vector4 } from 'three';
import type { GroundBounds } from './sandwindPolicy';
import { SANDWIND_APPEARANCE } from './sandwindPolicy';
import { SandCloudField, SandwindWind, SAND_WIND, SAND_NOISE_GLSL } from './sandwindWind';

/** Uma draw call, sem sombras. Partículas macias advectadas pelo mesmo vento da névoa. */
export class SandCloudVisual {
    readonly field = new SandCloudField();
    readonly mesh: InstancedMesh<PlaneGeometry, ShaderMaterial>;
    private readonly matrix = new Matrix4();
    private disposed = false;
    constructor(private wind: SandwindWind, shelters: readonly GroundBounds[]) {
        const geometry = new PlaneGeometry(1, 1);
        geometry.setAttribute('cloudPhase', new InstancedBufferAttribute(this.field.phases, 1));
        const count = shelters.length;
        const material = new ShaderMaterial({
            transparent: true, depthWrite: false,
            uniforms: {
                elapsed: { value: 0 }, opacity: { value: SAND_WIND.cloudOpacity },
                sandColor: { value: new Color(SANDWIND_APPEARANCE.cloudColor) },
                shelters: { value: shelters.map(b => new Vector4(b.minX, b.maxX, b.minZ, b.maxZ)) }
            },
            vertexShader: `attribute float cloudPhase;
                varying vec2 vCloudUv; varying vec3 vCloudWorld; varying float vPhase;
                void main() {
                    vec3 center=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
                    float w=length(instanceMatrix[0].xyz), h=length(instanceMatrix[1].xyz);
                    vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]);
                    vec3 up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
                    vCloudWorld=center+right*position.x*w+up*position.y*h;
                    vCloudUv=uv; vPhase=cloudPhase;
                    gl_Position=projectionMatrix*viewMatrix*vec4(vCloudWorld,1.);
                }`,
            fragmentShader: `uniform float elapsed, opacity; uniform vec3 sandColor;
                ${count ? `uniform vec4 shelters[${count}];` : ''}
                varying vec2 vCloudUv; varying vec3 vCloudWorld; varying float vPhase;
                ${SAND_NOISE_GLSL}
                void main() {
                    ${count ? `for (int i=0; i<${count}; i++) {
                        vec4 b=shelters[i];
                        if(vCloudWorld.x>b.x && vCloudWorld.x<b.y && vCloudWorld.z>b.z && vCloudWorld.z<b.w && vCloudWorld.y<2.8) discard;
                    }` : ''}
                    vec2 uv=(vCloudUv-.5)*2.;
                    float edge=1.-smoothstep(.12,1.,dot(uv,uv));
                    float noise=sandCloudNoise(vCloudUv*vec2(3.2,1.8)+vec2(vPhase, vPhase*.31)-vec2(elapsed*.09,0.));
                    float ground=smoothstep(-.05,.28,vCloudWorld.y);
                    vec2 border=min(vCloudWorld.xz-vec2(${SAND_WIND.minX}.,${SAND_WIND.minZ}.),vec2(${SAND_WIND.maxX}.,${SAND_WIND.maxZ}.)-vCloudWorld.xz);
                    float bounds=smoothstep(0.,3.,min(border.x,border.y));
                    float alpha=opacity*edge*smoothstep(.15,.8,noise)*ground*bounds;
                    if(alpha<.003) discard;
                    gl_FragColor=vec4(sandColor,alpha);
                    #include <tonemapping_fragment>
                    #include <colorspace_fragment>
                }`
        });
        this.mesh = new InstancedMesh(geometry, material, SAND_WIND.cloudCount);
        this.mesh.name = 'MarsSandClouds'; this.mesh.userData.sandwindCloud = true;
        this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
        this.mesh.frustumCulled = false; this.mesh.renderOrder = 4;
        this.writeMatrices();
    }
    private writeMatrices() {
        for (let i = 0; i < SAND_WIND.cloudCount; i++) {
            this.matrix.makeScale(this.field.sizes[i * 2], this.field.sizes[i * 2 + 1], 1);
            this.matrix.setPosition(this.field.positions[i * 2], .7 + (i % 5) * .12, this.field.positions[i * 2 + 1]);
            this.mesh.setMatrixAt(i, this.matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }
    update(delta: number, enabled: boolean, moving: boolean, paused: boolean) {
        if (this.disposed) return;
        this.mesh.visible = enabled && moving;
        this.field.update(delta, this.wind, enabled && moving, paused);
        if (!enabled || !moving || paused) return;
        this.mesh.material.uniforms.elapsed.value = this.field.time;
        this.mesh.material.uniforms.opacity.value = SAND_WIND.cloudOpacity * (.9 + .1 * Math.sin(this.wind.time * .37));
        this.writeMatrices();
    }
    dispose() {
        if (this.disposed) return; this.disposed = true;
        this.mesh.removeFromParent(); this.mesh.dispose(); this.mesh.geometry.dispose(); this.mesh.material.dispose();
    }
}
