"""Blender -b <v006 B3.blend> -P scripts/export-rocket-b3.py -- <pasta de saída>.

Foguete da colônia de Marte (PLAT_B3_Foguete, mesma malha e materiais do
colony-v006.glb da S6.12) como asset próprio, sem a base de lançamento.
Pedido do autor (18/10/2026): em Shanghai, só o foguete estacionado, sem base
e sem mudar o solo. A posição é ajustada só em memória: centro da pegada na
origem e ponto mais baixo (motores) em y = 0. A fonte nunca é salva.
"""
import bpy
import hashlib
import json
import os
import sys
from mathutils import Vector

source = bpy.data.filepath
expected_sha = "a17aa3c4b557a7e323997429ec7083d1bca5d990c55dcb552c460352f2728dc4"
assert source.endswith('mars_colony_estudo_v006_plataforma_B3.blend')
assert hashlib.sha256(open(source, "rb").read()).hexdigest() == expected_sha
out = sys.argv[sys.argv.index('--') + 1]
os.makedirs(out, exist_ok=True)
layer = bpy.context.scene.view_layers['Plataforma_B3']
layer.update()
rocket = layer.objects['PLAT_B3_Foguete']
corners = [rocket.matrix_world @ Vector(c) for c in rocket.bound_box]
center = Vector(((min(c.x for c in corners) + max(c.x for c in corners)) / 2,
                 (min(c.y for c in corners) + max(c.y for c in corners)) / 2,
                 min(c.z for c in corners)))
rocket.matrix_world.translation -= center
layer.update()
for o in layer.objects:
    o.select_set(False, view_layer=layer)
rocket.select_set(True, view_layer=layer)
with bpy.context.temp_override(view_layer=layer):
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, 'rocket-b3.glb'), export_format='GLB',
        use_selection=True, export_apply=True, export_yup=True, export_extras=True,
        export_cameras=False, export_lights=False, export_animations=False,
        export_vertex_color='MATERIAL')
corners = [rocket.matrix_world @ Vector(c) for c in rocket.bound_box]
# Pegada no plano do jogo (x, z = −y do Blender) e altura, já na origem.
info = {'source': os.path.basename(source), 'sourceSha256': expected_sha, 'object': rocket.name,
        'footprint': {'minX': min(c.x for c in corners), 'maxX': max(c.x for c in corners),
                      'minZ': min(-c.y for c in corners), 'maxZ': max(-c.y for c in corners)},
        'height': max(c.z for c in corners) - min(c.z for c in corners)}
with open(os.path.join(out, 'rocket-b3.json'), 'w') as f:
    json.dump(info, f, ensure_ascii=False, indent=2)
assert hashlib.sha256(open(source, 'rb').read()).hexdigest() == expected_sha
print('ROCKET_EXPORT', json.dumps(info))
