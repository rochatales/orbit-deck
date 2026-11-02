import { AudioEngine } from './AudioEngine';
import manifesto from '../assets/audio/sfx/manifesto.json';
import shanghaiAmbienceUrl from '../assets/audio/ambience/shanghai-empty-city.mp3';
import marsOutsideUrl from '../assets/audio/mars/mars-desert.mp3';
import marsInsideUrl from '../assets/audio/mars/mars-interior.mp3';
import marsDoorUrl from '../assets/audio/mars/mars-door-open.wav';
const urls = import.meta.glob('../assets/audio/sfx/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
let storage: Storage | undefined;
try { storage = window.localStorage; } catch { /* Bloqueio de armazenamento não bloqueia o áudio. */ }
export const audio = new AudioEngine(() => new AudioContext(), manifesto.sources
    .flatMap(source => source.variations.map(v => ({ name: source.name, url: urls[`../assets/audio/sfx/${v.file}`] })))
    .concat({ name: 'SFX_Mars_Door_Open', url: marsDoorUrl }), storage,
    { name: 'Shanghai_Empty_City', url: shanghaiAmbienceUrl },
    { outside: { name: 'Mars_Desert', url: marsOutsideUrl }, inside: { name: 'Mars_Interior', url: marsInsideUrl } });
