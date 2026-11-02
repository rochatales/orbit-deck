import { AudioEngine } from './AudioEngine';
import manifesto from '../assets/audio/sfx/manifesto.json';
import shanghaiAmbienceUrl from '../assets/audio/ambience/shanghai-empty-city.mp3';
const urls = import.meta.glob('../assets/audio/sfx/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
let storage: Storage | undefined;
try { storage = window.localStorage; } catch { /* Bloqueio de armazenamento não bloqueia o áudio. */ }
export const audio = new AudioEngine(() => new AudioContext(), manifesto.sources
    .flatMap(source => source.variations.map(v => ({ name: source.name, url: urls[`../assets/audio/sfx/${v.file}`] }))), storage,
    { name: 'Shanghai_Empty_City', url: shanghaiAmbienceUrl });
