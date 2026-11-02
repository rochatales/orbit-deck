import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
// WAV de 1,8 s já editado pelo autor: usar a ação inteira, sem cortes nem mudança de velocidade.
const root = new URL('../../src/assets/audio/mars/', import.meta.url);
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', new URL('door-original.wav', root).pathname,
    '-af', 'asetpts=PTS-STARTPTS,afade=t=in:d=0.005,afade=t=out:st=1.72:d=0.08',
    '-map_metadata', '-1', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', new URL('mars-door-open.wav', root).pathname]);
// Porta/rampa frontal do Hangar: ataque perto do início e trava final, sem silêncio longo.
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', new URL('hangar-door-original.mp3', root).pathname,
    '-af', 'atrim=start=0.12:end=2.26,asetpts=PTS-STARTPTS,afade=t=in:d=0.005,afade=t=out:st=2.06:d=0.08',
    '-map_metadata', '-1', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', new URL('hangar-front-open.wav', root).pathname]);
const path = new URL('manifesto.json', root), manifest = JSON.parse(fs.readFileSync(path));
manifest.door = { file: 'mars-door-open.wav', source: 'door-original.wav', startSeconds: 0, endSeconds: 1.8,
    fadeInSeconds: .005, fadeOutSeconds: .08, sha256: createHash('sha256').update(fs.readFileSync(new URL('mars-door-open.wav', root))).digest('hex') };
manifest.hangarFrontDoor = { file: 'hangar-front-open.wav', source: 'hangar-door-original.mp3', startSeconds: .12, endSeconds: 2.26,
    fadeInSeconds: .005, fadeOutSeconds: .08, sha256: createHash('sha256').update(fs.readFileSync(new URL('hangar-front-open.wav', root))).digest('hex') };
fs.writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');
