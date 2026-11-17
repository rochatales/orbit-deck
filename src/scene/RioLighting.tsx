import { RIO_LIGHT } from '../game/rio/lighting';

export const RIO_SKY = RIO_LIGHT.sky;

export function RioLighting() {
    return <>
        <hemisphereLight args={[RIO_LIGHT.hemisphereSky, RIO_LIGHT.hemisphereGround, RIO_LIGHT.hemisphereIntensity]}/>
        <directionalLight color={RIO_LIGHT.sunColor} intensity={RIO_LIGHT.sunIntensity} position={[...RIO_LIGHT.sunPosition]} castShadow
            shadow-mapSize={[2048, 2048]} shadow-camera-left={-80} shadow-camera-right={80}
            shadow-camera-top={80} shadow-camera-bottom={-80} shadow-camera-near={1} shadow-camera-far={175}
            shadow-normalBias={.035}/>
    </>;
}
