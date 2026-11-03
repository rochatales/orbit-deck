import { Color, ShaderMaterial } from 'three';

export function createGroundRingMaterial(color: string) {
    return new ShaderMaterial({ transparent: true, depthWrite: false, toneMapped: false,
        uniforms: { color: { value: new Color(color) } },
        vertexShader: `varying vec2 ground;
            void main() { ground = position.xy; vec4 p = vec4(position, 1.0);
            #ifdef USE_INSTANCING
                p = instanceMatrix * p;
            #endif
                gl_Position = projectionMatrix * modelViewMatrix * p; }`,
        fragmentShader: `uniform vec3 color; varying vec2 ground;
            void main() { float d = abs(length(ground) - 0.76);
                float thin = 1.0 - smoothstep(0.009, 0.026, d);
                float halo = 0.24 * exp(-d * d / 0.012);
                float a = min(0.95, thin + halo); if (a < 0.003) discard;
                gl_FragColor = vec4(color * (1.0 + thin * 0.7), a);
                #include <colorspace_fragment>
            }`,
    });
}
