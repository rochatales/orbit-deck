"""Blender -b <v006 B3.blend> -P scripts/export-colony-v006.py -- <pasta de saída>.

Exporta a camada escolhida pelo autor sem salvar ou alterar o arquivo-fonte.
Referências, colisores, variantes antigas, câmeras e luzes ficam fora do GLB.
"""
import bpy
import hashlib
import json
import os
import sys
from mathutils import Vector
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(__file__))
from colony_prop_geometry import repair_prop_geometry

source = bpy.data.filepath
expected_sha = "a17aa3c4b557a7e323997429ec7083d1bca5d990c55dcb552c460352f2728dc4"
assert hashlib.sha256(open(source, "rb").read()).hexdigest() == expected_sha
assert source.endswith('mars_colony_estudo_v006_plataforma_B3.blend')
out = sys.argv[sys.argv.index('--') + 1]
os.makedirs(out, exist_ok=True)
layer = bpy.context.scene.view_layers['Plataforma_B3']
layer.update()
objects = [o for o in layer.objects if o.type == 'MESH'
           and not o.name.startswith(('REF_', 'COL_', 'SPAWN_', 'INTERACT_', 'CAM_', 'LUZ_'))
           and (not o.hide_render or o.name == 'ARQ_Laboratorio_Porta_Folhas_Aberta')]
repair_prop_geometry(objects, layer)
layer.update()
names = {o.name for o in objects}
parts = []
for o in objects:
    supports = {}
    for key in ('apoiado_em', 'apoiado_em_todos'):
        supports[key] = [s.strip() for s in str(o.get(key, '')).split(',') if s.strip()]
        assert all(s in names for s in supports[key]), (o.name, supports[key])
    corners = [o.matrix_world @ Vector(p) for p in o.bound_box]
    bounds = {'minX': min(p.x for p in corners), 'maxX': max(p.x for p in corners),
              'minY': min(p.z for p in corners), 'maxY': max(p.z for p in corners),
              'minZ': min(-p.y for p in corners), 'maxZ': max(-p.y for p in corners)}
    parts.append({'name': o.name, 'bounds': bounds, **supports})
for o in layer.objects:
    o.select_set(False, view_layer=layer)
for o in objects:
    o['colony_name'] = o.name
    # A folha recolhida está oculta na cena salva, mas é necessária para abrir a porta no jogo.
    o.hide_render = False
    o.hide_viewport = False
    o.hide_set(False, view_layer=layer)
    o.select_set(True, view_layer=layer)
with bpy.context.temp_override(view_layer=layer):
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, 'colony-v006.glb'),
        export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
        export_extras=True, export_cameras=False, export_lights=False,
        export_animations=False, export_vertex_color='MATERIAL')
manifest = {'version': 'v006 B3', 'source': os.path.basename(source),
            'sourceSha256': hashlib.sha256(open(source, 'rb').read()).hexdigest(),
            'parts': parts,
            'colliders': [list(map(float, o['rect_jogo'].split(',')))
                          for o in bpy.data.collections['COL_CANDIDATO'].objects]}
with open(os.path.join(out, 'colony-v006.manifest.json'), 'w') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
assert hashlib.sha256(open(source, 'rb').read()).hexdigest() == expected_sha
print('COLONY_EXPORT', len(parts), 'objetos; fonte preservada', manifest['sourceSha256'])
