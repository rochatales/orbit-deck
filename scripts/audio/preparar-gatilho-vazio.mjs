import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { audibleRanges, run } from './fatiar-sfx.mjs';
const root = new URL('../../src/assets/audio/rifle/', import.meta.url), manifestPath = new URL('manifesto.json', root);
const manifest = JSON.parse(fs.readFileSync(manifestPath)), source = new URL(manifest.source.file, root).pathname;
const log = run('ffmpeg', ['-hide_banner', '-i', source, '-af', 'silencedetect=noise=-38dB:d=0.06', '-f', 'null', '-']).stderr;
const takes = audibleRanges(log, manifest.source.durationSeconds).filter(([a, b]) => b - a >= .06);
manifest.variations = takes.map(([a, b], i) => {
    const start = Math.max(0, a - .005), end = Math.min(manifest.source.durationSeconds, b + .025), duration = end - start;
    const file = `rifle-empty-v${String(i + 1).padStart(2, '0')}.wav`;
    execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', source, '-af',
        `atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS,afade=t=in:d=0.003,afade=t=out:st=${duration - .008}:d=0.008`,
        '-map_metadata', '-1', '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', new URL(file, root).pathname]);
    return { file, name: 'SFX_Rifle_Empty', startSeconds: start, endSeconds: end, sha256: createHash('sha256').update(fs.readFileSync(new URL(file, root))).digest('hex') };
});
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
