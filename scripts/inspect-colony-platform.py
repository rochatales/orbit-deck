"""Blender -b <fonte B3> -P scripts/inspect-colony-platform.py -- <pasta>.

Mede tiles e candidatos a escada, renderiza a B3 original; nunca salva o blend.
As câmeras são criadas apenas em memória. Renders não equivalem a aceite.
"""
import hashlib
import json
import os
import sys
import bpy
from mathutils import Vector
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(__file__))
from colony_arch_geometry import islands

EXPECTED = 'a17aa3c4b557a7e323997429ec7083d1bca5d990c55dcb552c460352f2728dc4'
source = bpy.data.filepath
assert hashlib.sha256(open(source, 'rb').read()).hexdigest() == EXPECTED
out = sys.argv[sys.argv.index('--')+1]
os.makedirs(out, exist_ok=True)
scene = bpy.context.scene
for layer in scene.view_layers:
    layer.update()
layer = scene.view_layers['Plataforma_B3']
layer.update()
names = ['ARQ_Lab_Piso_Patio', 'ARQ_Lab_Patio_MeioFio', 'ARQ_Piso_Passarelas', 'ARQ_Piso_Externo']
names += [o.name for o in bpy.data.objects if o.type == 'MESH'
          and not o.name.startswith(('COL_', 'REF_'))
          and any(word in o.name.lower() for word in ('escad', 'degra', 'rampa', 'passarela', 'base_lancamento', 'casa_elevador', 'elevador_embarque'))
          and o.name not in names]
report = {'sourceSha256': EXPECTED, 'coordinates': 'Blender X,Y,Z; jogo x,z = X,-Y',
          'layers': [{'name': l.name, 'candidates': [o.name for o in l.objects if o.name in names]} for l in scene.view_layers],
          'objects': []}
for name in names:
    obj = bpy.data.objects[name]
    mesh = obj.data
    points = [obj.matrix_world @ v.co for v in mesh.vertices]
    bounds = lambda ids: [[min(points[i][k] for i in ids), max(points[i][k] for i in ids)] for k in range(3)]
    item = {'name': name, 'bounds': bounds(range(len(points))), 'materials': [m.name for m in mesh.materials],
            'faces': len(mesh.polygons), 'properties': {k: str(obj[k]) for k in obj.keys()},
            'islands': [bounds(ids) for ids in islands(mesh)]}
    if name == 'ARQ_Lab_Piso_Patio':
        item['coordinates'] = [sorted({round(v[k], 6) for v in points}) for k in range(3)]
        attr = mesh.color_attributes['Col']
        item['colors'] = sorted({tuple(round(v, 6) for v in d.color) for d in attr.data})
        item['tileMeasurement'] = {'plateMeters': [1.25, 1.5], 'jointMeters': 0.03, 'reliefMeters': 0.004,
                                   'originBlenderXY': [9.5, 3], 'repeatMeters': [5, 9]}
    report['objects'].append(item)
with open(os.path.join(out, 'fonte-inspecao.json'), 'w') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)
# Mantém visibilidade e iluminação salvas da B3; só troca câmera/enquadramento.
for l in scene.view_layers:
    l.use = l.name == 'Plataforma_B3'
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.resolution_x = 1200
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
cam = bpy.data.objects.new('QA_camera', bpy.data.cameras.new('QA_camera'))
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 17
for label, position, target in [('b3-original', (-23, -26, 17), (-10, -41.5, 1.3)),
                                 ('b3-acesso', (-1, -31, 9), (-9.5, -40, 1.4))]:
    cam.location = position
    cam.rotation_euler = (Vector(target)-cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(out, label+'.png')
    bpy.ops.render.render(write_still=True)
assert hashlib.sha256(open(source, 'rb').read()).hexdigest() == EXPECTED
