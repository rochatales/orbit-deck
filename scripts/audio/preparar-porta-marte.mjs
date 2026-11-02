import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
const root = new URL('../../src/assets/audio/mars/', import.meta.url);
const path = new URL('manifesto.json', root), manifest = JSON.parse(fs.readFileSync(path));
// Trechos com mecanismo e ataque; atempo encurta sem alterar o tom. Fontes intactas.
function prepare(file, source, start, end, duration) {
    let speed = (end - start) / duration;
    const tempo = [];
    while (speed > 2) { tempo.push('atempo=2'); speed /= 2; }
    tempo.push(`atempo=${speed}`);
    const fadeOut = .025;
    const filter = [`atrim=start=${start}:end=${end}`, 'asetpts=PTS-STARTPTS', ...tempo,
        `apad=whole_dur=${duration}`, `atrim=duration=${duration}`, 'afade=t=in:d=0.003', `afade=t=out:st=${duration - fadeOut}:d=${fadeOut}`].join(',');
    execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', new URL(source, root).pathname,
        '-af', filter, '-map_metadata', '-1', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', new URL(file, root).pathname]);
    return { file, source, startSeconds: start, endSeconds: end, durationSeconds: duration,
        tempo: (end - start) / duration, fadeInSeconds: .003, fadeOutSeconds: fadeOut,
        sha256: createHash('sha256').update(fs.readFileSync(new URL(file, root))).digest('hex') };
}
manifest.door = prepare('mars-door-open.wav', 'door-original.wav', 0, .8, .4);
manifest.quartelDoorOpen = prepare('quartel-door-open.wav', 'door-original.wav', 0, .8, .25);
manifest.quartelDoorClose = prepare('quartel-door-close.wav', 'door-original.wav', 0, .8, .2);
manifest.hangarFrontDoor = prepare('hangar-front-open.wav', 'hangar-door-original.mp3', .12, 1.45, .2);
manifest.hangarFrontDoorClose = prepare('hangar-front-close.wav', 'hangar-door-original.mp3', .12, 1.45, .28);
fs.writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');
