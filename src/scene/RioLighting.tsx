export const RIO_SKY = '#e6c4a2';

export function RioLighting() {
    return <>
        <hemisphereLight args={['#f3dfc7', '#8c8178', 1.55]}/>
        <directionalLight color="#ffd3a0" intensity={2.15} position={[-28, 37, 40]} castShadow
            shadow-mapSize={[2048, 2048]} shadow-camera-left={-80} shadow-camera-right={80}
            shadow-camera-top={80} shadow-camera-bottom={-80} shadow-camera-near={1} shadow-camera-far={175}
            shadow-normalBias={.035}/>
    </>;
}
