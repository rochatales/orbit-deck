import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
// Última rajada mecânica forte (~2,9 s), com ataque e decaimento; não só a reverberação final.
const root = new URL('../../src/assets/audio/mars/', import.meta.url);
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', new URL('door-original.mp3', root).pathname,
    '-af', 'atrim=start=2.75:end=3.85,asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st=1.02:d=0.08',
    '-map_metadata', '-1', '-ac', '1', '-ar', '48000', '-c:a', 'libmp3lame', '-b:a', '96k', new URL('mars-door-open.mp3', root).pathname]);
const path = new URL('manifesto.json', root), manifest = JSON.parse(fs.readFileSync(path));
manifest.door = { file: 'mars-door-open.mp3', source: 'door-original.mp3', startSeconds: 2.75, endSeconds: 3.85,
    fadeInSeconds: .01, fadeOutSeconds: .08, sha256: createHash('sha256').update(fs.readFileSync(new URL('mars-door-open.mp3', root))).digest('hex') };
fs.writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');
