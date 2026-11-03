import marsMusicUrl from '../assets/audio/music/mars-strung-out.mp3';
import shanghaiMusicUrl from '../assets/audio/music/shanghai-dov.mp3';
import emptyManifest from '../assets/audio/rifle/manifesto.json';
import { AudioEngine } from './AudioEngine';
import manifesto from '../assets/audio/sfx/manifesto.json';
import shanghaiAmbienceUrl from '../assets/audio/ambience/shanghai-empty-city.mp3';
import marsOutsideUrl from '../assets/audio/mars/mars-desert.mp3';
import marsInsideUrl from '../assets/audio/mars/mars-interior.mp3';
import marsDoorUrl from '../assets/audio/mars/mars-door-open.wav';
import hangarDoorUrl from '../assets/audio/mars/hangar-front-open.wav';
import hangarCloseUrl from '../assets/audio/mars/hangar-front-close.wav';
import quartelDoorUrl from '../assets/audio/mars/quartel-door-open.wav';
import quartelCloseUrl from '../assets/audio/mars/quartel-door-close.wav';
const urls = import.meta.glob('../assets/audio/sfx/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const emptyUrls = import.meta.glob('../assets/audio/rifle/rifle-empty-v*.wav', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
let storage: Storage | undefined;
try { storage = window.localStorage; } catch { /* Bloqueio de armazenamento não bloqueia o áudio. */ }
export const audio = new AudioEngine(() => new AudioContext(), manifesto.sources
    .flatMap(source => source.variations.map(v => ({ name: source.name, url: urls[`../assets/audio/sfx/${v.file}`] })))
    .concat(emptyManifest.variations.map(v => ({ name: v.name, url: emptyUrls[`../assets/audio/rifle/${v.file}`] })))
    .concat({ name: 'SFX_Mars_Door_Open', url: marsDoorUrl }, { name: 'SFX_Hangar_Front_Open', url: hangarDoorUrl },
        { name: 'SFX_Hangar_Front_Close', url: hangarCloseUrl }, { name: 'SFX_Quartel_Door_Open', url: quartelDoorUrl }, { name: 'SFX_Quartel_Door_Close', url: quartelCloseUrl }), storage,
    { name: 'Shanghai_Empty_City', url: shanghaiAmbienceUrl },
    { outside: { name: 'Mars_Desert', url: marsOutsideUrl }, inside: { name: 'Mars_Interior', url: marsInsideUrl } },
    { mars: { url: marsMusicUrl }, shanghai: { url: shanghaiMusicUrl } });
