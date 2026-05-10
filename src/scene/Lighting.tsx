import { SoftShadows } from "@react-three/drei";

export function Lighting() {
  return (
    <>
      <SoftShadows size={18} samples={10} focus={0.45} />
      <hemisphereLight args={["#fff5df", "#c8b8a5", 1.05]} />
      <directionalLight
        castShadow
        position={[11, 16, 9]}
        intensity={1.6}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={58}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={28}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0003}
      />
      <pointLight position={[0, 6.5, 2]} intensity={16} distance={40} decay={2} color="#ffe9c8" />
    </>
  );
}
