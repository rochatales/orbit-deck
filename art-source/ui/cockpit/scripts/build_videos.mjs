/** node art-source/ui/cockpit/scripts/build_videos.mjs [--render]
 * Blender 5.1 + ffmpeg/ffprobe. Fontes somente leitura; vídeos locais sem áudio.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const out = resolve(root, 'src/assets/ui/cockpit');
function run(command, args) {
    const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`${command}: ${result.stderr || result.stdout}`);
    return result.stdout;
}
if (process.argv.includes('--render')) run(process.env.BLENDER || '/Applications/Blender.app/Contents/MacOS/Blender', ['--background', '--factory-startup', '--python', 'art-source/ui/cockpit/scripts/render_backdrops.py']);
copyFileSync(resolve(root, 'art-source/ui/cockpit/referencias/cabine-janelas-brancas.jpg'), resolve(out, 'cabine.jpg'));
const videos = [];
for (const [map, rgb] of [['mars', [176, 106, 64]], ['shanghai', [125, 139, 142]]]) {
    const file = resolve(out, `${map}.mp4`);
    // Uma nuvem suave atravessa o quadro; seno periódico fecha exatamente o ciclo de 6 s.
    const dust = `color=c=black:s=640x360:r=24:d=6,format=rgba,geq=r='${rgb[0]}':g='${rgb[1]}':b='${rgb[2]}':a='20*pow(0.5+0.5*sin(X/100+Y/60-2*PI*T/6),3)'`;
    run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-loop', '1', '-framerate', '24', '-i', resolve(out, `${map}.png`), '-f', 'lavfi', '-i', dust,
        '-filter_complex', '[1:v]scale=1280:720[dust];[0:v][dust]overlay=shortest=1,format=yuv420p[v]', '-map', '[v]', '-t', '6', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-movflags', '+faststart', file]);
    const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate', '-of', 'json', file]));
    videos.push({ map, file: relative(root, file), provisional: true, atmosphere: map === 'mars' ? 'poeira avermelhada' : 'névoa cinza', ...probe });
}
const assets = ['cabine.jpg', 'mars.png', 'shanghai.png', 'mars.mp4', 'shanghai.mp4'].map(name => {
    const file = resolve(out, name), bytes = readFileSync(file);
    return { file: relative(root, file), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
});
writeFileSync(resolve(root, 'art-source/ui/cockpit/manifesto.json'), JSON.stringify({ version: 1, source: 'referencias/cabine-janelas-brancas.jpg (cópia intacta do autor)', exterior: 'Renders dos mapas do projeto; loops provisórios de 6 s / 24 fps. Não são captura ao vivo nem cinematográfica final.', videos, assets }, null, 2) + '\n');
console.log(videos.map(v => `${v.map}: ${v.format.duration}s; ${v.format.size} bytes`).join('\n'));
