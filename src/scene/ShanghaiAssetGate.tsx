import { Html } from '@react-three/drei';
import type { PropsWithChildren } from 'react';
import type { OfficeWorld } from '../world/createOfficeMap';
/** Nunca inicia física/controller numa prévia ainda sem geometria visível. */
export function ShanghaiAssetGate({ world, children }: PropsWithChildren<{ world: OfficeWorld }>) {
    if (world.group.userData.assetState === 'loading') throw world.group.userData.visualReady;
    if (world.group.userData.assetState === 'error') return <Html center><section role="alert" style={{background:'#19252b',color:'white',padding:20,width:300}}>
      <p>Não foi possível carregar Shanghai fase 01.</p>
      <button onClick={() => location.reload()}>Tentar novamente</button>
    </section></Html>;
    return <>{children}</>;
}
