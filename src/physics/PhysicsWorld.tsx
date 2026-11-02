import { INTERPOLATE, PHYSICS_STEP, PHYSICS_PRIORITY } from './interpolation';
import { useSimulationBlocked } from '../game/simulationGate';
import { Physics } from '@react-three/rapier';
import type { PropsWithChildren } from 'react';
import type { OfficeWorld } from '../world/createOfficeMap';
import { OfficeColliders } from './colliders';
export function PhysicsWorld({ officeWorld, children }: PropsWithChildren<{
    officeWorld: OfficeWorld;
}>) {
    const paused = useSimulationBlocked();
    return <Physics gravity={[0, 0, 0]} timeStep={PHYSICS_STEP} interpolate={INTERPOLATE} updatePriority={PHYSICS_PRIORITY} paused={paused}><OfficeColliders officeWorld={officeWorld}/>{children}</Physics>;
}
