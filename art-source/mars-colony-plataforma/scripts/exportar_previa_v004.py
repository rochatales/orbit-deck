# GLB EXCLUSIVAMENTE DE PRÉVIA da variante recomendada (B). Não é asset de runtime. Não salva o .blend.
#   Blender -b art-source/mars-colony-plataforma/blend/mars_colony_estudo_v004_plataforma.blend \
#           -P art-source/mars-colony-plataforma/scripts/exportar_previa_v004.py
import bpy
import json
import os
import struct

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'export', 'plataforma_v004_B_previa.glb')
sc = bpy.context.scene
vl = sc.view_layers['Plataforma_B']
nomes = set()
for cn in ('PLATAFORMA_COMUM', 'PLATAFORMA_B_DESLOCADA'):
    nomes |= {o.name for o in bpy.data.collections[cn].all_objects}
nomes |= {'ARQ_Piso_Deck', 'ARQ_Deck_Marcacoes', 'PROP_Tanques', 'SPAWN_Desembarque', 'INTERACT_Nave'}
for o in bpy.data.objects:
    o.select_set(False, view_layer=vl) if o.name in vl.objects else None
for n in nomes:
    o = bpy.data.objects[n]
    o['previa'] = 'estudo v004 — somente prévia; não importar no jogo sem decisão do autor'
    o.select_set(True, view_layer=vl)
with bpy.context.temp_override(view_layer=vl):
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                              export_extras=True, export_cameras=False, export_lights=False, export_vertex_color='MATERIAL')
b = open(OUT, 'rb').read()
ln = struct.unpack('<I', b[12:16])[0]
j = json.loads(b[20:20 + ln])
acc = j['accessors']
tri = sum((acc[p['indices']]['count'] if 'indices' in p else acc[p['attributes']['POSITION']]['count']) // 3
          for m in j['meshes'] for p in m['primitives'])
nos = {n['name']: n.get('translation') for n in j['nodes']}
info = {'arquivo': os.path.relpath(OUT, ROOT), 'bytes': len(b), 'nos': len(j['nodes']), 'malhas': len(j['meshes']),
        'materiais': len(j.get('materials', [])), 'triangulos_por_instancia_de_malha': tri,
        'INTERACT_Nave': nos.get('INTERACT_Nave'), 'SPAWN_Desembarque': nos.get('SPAWN_Desembarque'),
        'nos_com_extras_previa': sum(1 for n in j['nodes'] if 'previa' in n.get('extras', {}))}
json.dump(info, open(os.path.join(ROOT, 'notas', 'previa_glb_v004.json'), 'w'), indent=1, ensure_ascii=False)
print('PREVIA_OK', json.dumps(info, ensure_ascii=False))
