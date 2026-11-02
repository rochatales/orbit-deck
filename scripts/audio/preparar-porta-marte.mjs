import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
// Últimos 0,761 s audíveis; a fonte termina com 1,7 s de silêncio.
const root = new URL('../../src/assets/audio/mars/', import.meta.url);
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', new URL('door-original.mp3', root).pathname,
    '-ss', '4.05', '-t', '0.761', '-af', 'afade=t=in:d=0.01,afade=t=out:st=0.721:d=0.04',
    '-map_metadata', '-1', '-ac', '1', '-ar', '48000', '-c:a', 'libmp3lame', '-b:a', '96k', new URL('mars-door-open.mp3', root).pathname]);
const path = new URL('manifesto.json', root), manifest = JSON.parse(fs.readFileSync(path));
manifest.door = { file: 'mars-door-open.mp3', source: 'door-original.mp3', startSeconds: 4.05, endSeconds: 4.811,
    fadeInSeconds: .01, fadeOutSeconds: .04, sha256: createHash('sha256').update(fs.readFileSync(new URL('mars-door-open.mp3', root))).digest('hex') };
fs.writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');
