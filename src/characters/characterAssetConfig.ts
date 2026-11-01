import edenAsset from '../assets/characters/npcs/brand-brain.glb';
import playerAsset from '../assets/characters/player/player-main.glb';
import astronautaAsset from '../assets/characters/player/explorador-astronauta.glb';
import exploradorR7Asset from '../assets/characters/player/explorador-r7.glb';
export type CharacterFallbackType = 'player' | 'brand-brain' | 'editorial' | 'narration' | 'design' | 'output-review' | 'smart-lab' | 'orbit-garden';
export interface CharacterAssetConfig {
    id: string;
    name: string;
    assetPath: string;
    scale: number;
    positionOffset: [
        number,
        number,
        number
    ];
    rotationOffset: [
        number,
        number,
        number
    ];
    accentColor: string;
    fallbackType: CharacterFallbackType;
    /**
     * 'estilizado': acabamento antigo (flatShading e visor escurecido por código).
     * 'preservar': materiais do GLB como exportados (normais suaves, cor e ORM bakeados).
     */
    materialProfile?: 'estilizado' | 'preservar';
    /** Velocidades da passada do GLB, sem alterar a velocidade física. */
    runReferenceSpeed?: number;
    combatRunReferenceSpeed?: number;
    backwardReferenceSpeed?: number;
    combatBackwardReferenceSpeed?: number;
    backwardTimeScale?: readonly [number, number];
}
export const PLAYER_CHARACTER_ASSET: CharacterAssetConfig = {
    id: 'player', name: 'Explorador', assetPath: playerAsset, scale: 0.857, positionOffset: [0, 0, 0], rotationOffset: [0, 0, 0], accentColor: '#66e6ff', fallbackType: 'player', materialProfile: 'estilizado'
};
/**
 * Explorador r7 (S6.8, `4c0ecfd`, `explorador_v2_candidato_r7.glb`, SHA-256 143a14d0…): mesmo rig
 * de 41 ossos e escala do ativo, com Idle, Run, Talk, Fall e Backward. Asset separado; o GLB ativo
 * (`player-main.glb`) continua no repositório para comparação.
 */
export const EXPLORADOR_R7_ASSET: CharacterAssetConfig = {
    id: 'player-r7', name: 'Explorador', assetPath: exploradorR7Asset, scale: 0.857, positionOffset: [0, 0, 0], rotationOffset: [0, 0, 0], accentColor: '#66e6ff', fallbackType: 'player', materialProfile: 'preservar'
};
/** Consolidação: Run Rifle_Run_00 e Backward Backwards_Rifle_Run no v003.
 * 57 ossos Mixamo, pés na origem, 1,5 m e materiais exportados. */
export const EXPLORADOR_ASTRONAUTA_ASSET: CharacterAssetConfig = {
    id: 'player-astronauta', name: 'Explorador astronauta', assetPath: astronautaAsset,
    scale: 1, positionOffset: [0, 0, 0], rotationOffset: [0, 0, 0],
    accentColor: '#66e6ff', fallbackType: 'player', materialProfile: 'preservar',
    runReferenceSpeed: 2.7706, combatRunReferenceSpeed: 2.7706, backwardReferenceSpeed: 1.4012, combatBackwardReferenceSpeed: 2.8689273214, backwardTimeScale: [0.2, 2.0]
};
export type PlayerAssetVariant = 'astronauta' | 'r7' | 'atual';
export const PLAYER_ASSET_VARIANTS: Record<PlayerAssetVariant, CharacterAssetConfig> = { astronauta: EXPLORADOR_ASTRONAUTA_ASSET, r7: EXPLORADOR_R7_ASSET, atual: PLAYER_CHARACTER_ASSET };
export const EDEN_CHARACTER_ASSET: CharacterAssetConfig = {
    id: 'eden', name: 'EDEN', assetPath: edenAsset, scale: 1.3, positionOffset: [0.06, 0.68, 0], rotationOffset: [0, 0.06, 0], accentColor: '#f2c94c', fallbackType: 'brand-brain'
};
