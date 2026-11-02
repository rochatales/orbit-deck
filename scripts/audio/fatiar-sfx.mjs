import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync, existsSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
export function run(binary, args) {
    const r = spawnSync(binary, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    if (r.status !== 0) throw new Error(`${binary}: ${r.stderr || r.error}`);
    return r;
}
export function limitFor(name) {
    if (name.includes('Reload')) return 1.5;
    if (name.includes('Rifle_shot')) return .45;
    if (name.includes('_step')) return .35;
    if (name.includes('_death_hit')) return 1.6;
    if (name.includes('Item_collected')) return .9;
    return .8;
}
export function audibleRanges(log, duration) {
    const ranges = []; let cursor = 0;
    for (const match of log.matchAll(/silence_(start|end): ([\d.]+)/g)) {
        const at = Math.min(duration, Number(match[2]));
        if (match[1] === 'start') { if (at - cursor > .025) ranges.push([cursor, at]); }
        else cursor = at;
    }
    // silence_end was the last event, or no silence at all.
    const events = [...log.matchAll(/silence_(start|end): ([\d.]+)/g)];
    if (!events.length || events.at(-1)[1] === 'end') {
        if (duration - cursor > .025) ranges.push([cursor, duration]);
    }
    return ranges;
}
export function joinFragments(ranges, gap) {
    const result = [];
    for (const [start, end] of ranges) {
        const previous = result.at(-1);
        if (previous && start - previous[1] <= gap) previous[1] = end;
        else result.push([start, end]);
    }
    return result;
}
export const HEAVY_STEP_PEAK_DB = -6;
export function generate(source = resolve(root, 'art-source/audio/combate-v001/originais'), onlyHeavy = false) {
    const originals = resolve(root, 'art-source/audio/combate-v001/originais');
    const output = resolve(root, 'src/assets/audio/sfx');
    if(!onlyHeavy)mkdirSync(originals, { recursive: true }); mkdirSync(output, { recursive: true });
    const names = readdirSync(source).filter(n => /^SFX_.*\.mp3$/i.test(n)).sort();
    if (names.length !== 17) throw new Error(`Esperados 17 originais, encontrados ${names.length}`);
    const old = existsSync(resolve(output, 'manifesto.json')) ? JSON.parse(readFileSync(resolve(output, 'manifesto.json'))) : null;
    const manifest = { version: 1, detector: { db: -38, seconds: .06 }, encoding: { sampleRate: 48000, channels: 1, kbps: 96 }, sources: [] };
    for (const name of names) {
        if(onlyHeavy && name !== 'SFX_Mutant_big_step.mp3'){const entry=old?.sources.find(s=>s.name===basename(name,'.mp3'));if(!entry)throw new Error(`Manifesto incompleto: ${name}`);manifest.sources.push(entry);continue;}
        const bytes = readFileSync(resolve(source, name)), sha256 = createHash('sha256').update(bytes).digest('hex');
        const original = resolve(originals, name);
        if (existsSync(original) && createHash('sha256').update(readFileSync(original)).digest('hex') !== sha256) throw new Error(`Cópia existente diferente: ${name}`);
        if (resolve(source, name) !== original) copyFileSync(resolve(source, name), original);
        const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', original]).stdout);
        const duration = Number(probe.format.duration), stem = basename(name, '.mp3'), limit = limitFor(stem);
        const log = run('ffmpeg', ['-hide_banner', '-i', original, '-af', 'silencedetect=noise=-38dB:d=0.06', '-f', 'null', '-']).stderr;
        const ranges = audibleRanges(log, duration);
        if (!ranges.length) throw new Error(`Sem sinal: ${name}`);
        // Disparo tem um clique de cauda separado por ~0,25 s, não outro tiro.
        // Recarga tem três tomadas completas; usa a primeira, sem concatenar repetições.
        const takes = joinFragments(ranges, stem.includes('Rifle_shot') ? .35 : stem.includes('Reload') ? .2 : 0);
        const groups = (stem.includes('Reload') ? takes.slice(0, 1) : takes).map(r => [r]);
        const entry = { name: stem, original: `art-source/audio/combate-v001/originais/${name}`, sha256, sourceDuration: duration, sourceSampleRate: Number(probe.streams[0].sample_rate), sourceChannels: probe.streams[0].channels, detectedSegments: ranges.length, detectedTakes: takes.length, maxDuration: limit, variations: [] };
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i], useful = group.reduce((n, [a, b]) => n + b - a, 0);
            const target = Math.min(useful, limit - .035); // folga para frames/padding MP3
            const file = `${stem}_v${String(i + 1).padStart(2, '0')}.mp3`;
            const trims = group.map(([a, b], j) => `[0:a]atrim=start=${a}:end=${b},asetpts=PTS-STARTPTS[p${j}]`).join(';');
            const concat = group.map((_, j) => `[p${j}]`).join('') + `concat=n=${group.length}:v=0:a=1[all]`;
            let tempo = '', ratio = stem.includes('Reload') ? useful / target : 1;
            while (ratio > 2) { tempo += 'atempo=2,'; ratio /= 2; }
            if (ratio > 1) tempo += `atempo=${ratio},`;
            const fade = Math.min(.025, target / 4);
            let filter = `${trims};${concat};[all]${tempo}atrim=duration=${target},afade=t=out:st=${Math.max(0, target - fade)}:d=${fade},aformat=channel_layouts=mono[out]`;
            if(stem==='SFX_Mutant_big_step') {
                const measure=run('ffmpeg',['-hide_banner','-i',original,'-filter_complex',filter.replace('[out]','[pre]')+';[pre]volumedetect[out]','-map','[out]','-f','null','-']).stderr;
                const peak=Number(measure.match(/max_volume: ([-\d.]+) dB/)?.[1]);if(!Number.isFinite(peak))throw new Error('Pico indisponível');
                filter=filter.replace('[out]',`,volume=${HEAVY_STEP_PEAK_DB-peak}dB[out]`);entry.normalization={targetPeakDb:HEAVY_STEP_PEAK_DB,method:'Pico PCM mono após corte/fade, ganho por variação antes do MP3'};
            }
            run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', original, '-filter_complex', filter, '-map', '[out]', '-ar', '48000', '-ac', '1', '-b:a', '96k', '-map_metadata', '-1', resolve(output, file)]);
            if(stem==='SFX_Mutant_big_step') {
                const encoded=run('ffmpeg',['-hide_banner','-i',resolve(output,file),'-af','volumedetect','-f','null','-']).stderr;
                const peak=Number(encoded.match(/max_volume: ([-\d.]+) dB/)?.[1]);if(!Number.isFinite(peak))throw new Error('Pico MP3 indisponível');
                filter=filter.replace('[out]',`,volume=${HEAVY_STEP_PEAK_DB-peak}dB[out]`);
                run('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',original,'-filter_complex',filter,'-map','[out]','-ar','48000','-ac','1','-b:a','96k','-map_metadata','-1',resolve(output,file)]);
                entry.normalization.method='Pico mono por variação, com segunda passagem corrigindo o pico decodificado do MP3';
            }
            const info = JSON.parse(run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', resolve(output, file)]).stdout);
            const peakLog = run('ffmpeg', ['-hide_banner', '-i', resolve(output, file), '-af', 'volumedetect', '-f', 'null', '-']).stderr;
            const measured = Number(info.format.duration);
            if (measured > limit + .001) throw new Error(`Duração ${measured} > ${limit}: ${file}`);
            entry.variations.push({ file, duration: measured, peakDb: Number(peakLog.match(/max_volume: ([-\d.]+) dB/)?.[1]), ranges: group });
        }
        manifest.sources.push(entry);
        console.log(`${stem}: ${ranges.length} trechos → ${entry.variations.length} variações (máx. ${limit}s)`);
    }
    const current = new Set(manifest.sources.flatMap(s => s.variations.map(v => v.file)));
    for (const s of old?.sources ?? []) for (const v of s.variations) if (!current.has(v.file) && /^SFX_[\w]+_v\d+\.mp3$/.test(v.file)) unlinkSync(resolve(output, v.file));
    writeFileSync(resolve(output, 'manifesto.json'), JSON.stringify(manifest, null, 2) + '\n');
    return manifest;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) generate(process.argv[2]==='--normalize-heavy-only'?undefined:process.argv[2],process.argv.includes('--normalize-heavy-only'));
