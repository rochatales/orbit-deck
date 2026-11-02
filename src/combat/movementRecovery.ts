import type { RobotKind } from './config';
/** Só a relação entre aliados muda; terreno, jogador e raios continuam sólidos. */
export const MOVEMENT_RECOVERY = { window: 1.5, progress: .3, yieldAfter: 3, passAfter: 4, yieldDistance: 1, yieldDuration: 1.5 } as const;
export interface MovementRecovery {
    progressTracked: boolean; progressX: number; progressZ: number; progressDistance: number;
    progressWindow: number; noProgress: number; recoveryStage: number; avoidSide: number; passing: boolean;
    steerLeft: number; steerTurn: number;
    yieldLeft: number; yieldX: number; yieldZ: number;
    recoveryRepaths: number; recoveryYieldAttempts: number; recoveryYields: number; recoveryPasses: number;
}
export function newMovementRecovery(): MovementRecovery {
    return { progressTracked:false,progressX:0,progressZ:0,progressDistance:0,progressWindow:0,noProgress:0,recoveryStage:0,avoidSide:1,passing:false,
        steerLeft:0,steerTurn:0,yieldLeft:0,yieldX:0,yieldZ:0,recoveryRepaths:0,recoveryYieldAttempts:0,recoveryYields:0,recoveryPasses:0 };
}
/** Reinício/contato/ação intencional não carregam uma recuperação para outra vida. Contadores são da tentativa. */
export function resetMovementRecovery(r: MovementRecovery) {
    r.progressTracked=false;r.progressWindow=0;r.noProgress=0;r.recoveryStage=0;r.passing=false;r.yieldLeft=0;r.steerLeft=0;
}
export function trackMovementGoal(r: MovementRecovery & {x:number;z:number}, x: number, z: number) {
    if(r.progressTracked){
        // Jogador/nó mudou: reancora após a janela, sem apagar o tempo travado ou pular degraus.
        if(r.progressWindow>=MOVEMENT_RECOVERY.window&&Math.hypot(x-r.progressX,z-r.progressZ)>.5){
            r.progressX=x;r.progressZ=z;r.progressDistance=Math.hypot(x-r.x,z-r.z);r.progressWindow=0;
        }
        return;
    }
    r.progressX=x;r.progressZ=z;r.progressDistance=Math.hypot(x-r.x,z-r.z);r.progressTracked=true;r.progressWindow=0;
}
/** Mede sempre contra o mesmo alvo ancorado; recalcular path/passos laterais não apagam falta de progresso. */
export function updateMovementRecovery(r: MovementRecovery & {x:number;z:number}, dt: number) {
    if(!r.progressTracked)return 0;
    r.progressWindow+=dt;r.noProgress+=dt;
    const remaining=Math.hypot(r.progressX-r.x,r.progressZ-r.z);
    if(r.progressDistance-remaining>=MOVEMENT_RECOVERY.progress || remaining<.08) {
        r.progressTracked=false;r.progressWindow=0;r.noProgress=0;r.recoveryStage=r.passing?3:0;return -1;
    }
    if(r.recoveryStage===0&&r.progressWindow>=MOVEMENT_RECOVERY.window){r.recoveryStage=1;r.avoidSide*=-1;r.steerLeft=0;r.recoveryRepaths++;return 1;}
    if(r.recoveryStage===1&&r.noProgress>=MOVEMENT_RECOVERY.yieldAfter){r.recoveryStage=2;r.recoveryYieldAttempts++;return 2;}
    if(r.recoveryStage===2&&r.noProgress>=MOVEMENT_RECOVERY.passAfter){r.recoveryStage=3;r.passing=true;r.yieldLeft=0;r.steerLeft=0;r.recoveryPasses++;return 3;}
    return 0;
}
export function movementPriority(kind: RobotKind) {
    return kind==='largeMutant'?3:kind==='largePatrol'?2:kind==='patrol'?1:0;
}
