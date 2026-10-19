# Codifica uma sequência de PNGs em MP4 (H.264) usando o editor de sequência do Blender (sem ffmpeg no sistema).
#   Blender -b --factory-startup -P scripts/v003/codificar_mp4_v003.py -- <pasta_png> <saida.mp4> [fps]
# Roda numa cena vazia de fábrica; não abre nem salva nenhum .blend do estudo.
import bpy
import os
import sys

args = sys.argv[sys.argv.index('--') + 1:]
pasta, saida = args[0], args[1]
fps = int(args[2]) if len(args) > 2 else 24
arquivos = sorted(f for f in os.listdir(pasta) if f.endswith('.png'))
assert arquivos, 'sem quadros em ' + pasta
sc = bpy.context.scene
se = sc.sequence_editor_create()
st = se.strips.new_image('quadros', os.path.join(pasta, arquivos[0]), channel=1, frame_start=1)
for f in arquivos[1:]:
    st.elements.append(f)
img = bpy.data.images.load(os.path.join(pasta, arquivos[0]))
w, h = img.size
sc.render.resolution_x, sc.render.resolution_y = w - (w % 2), h - (h % 2)
sc.render.resolution_percentage = 100
sc.render.fps = fps
sc.frame_start, sc.frame_end = 1, len(arquivos)
im = sc.render.image_settings
im.media_type = 'VIDEO'
im.file_format = 'FFMPEG'
sc.render.ffmpeg.format = 'MPEG4'
sc.render.ffmpeg.codec = 'H264'
sc.render.ffmpeg.constant_rate_factor = 'HIGH'
sc.render.ffmpeg.ffmpeg_preset = 'GOOD'
sc.render.use_sequencer = True
sc.render.filepath = saida
bpy.ops.render.render(animation=True)
print('MP4_OK', saida, len(arquivos), w, h)
