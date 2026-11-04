"""Gera o GLB de runtime da EDEN a partir de eden_v001.blend. Não salva o .blend.

O v001 só tem cinco grupos de vértices (Chest, Head, Hips, Holo_Halo, Root): braços,
mãos e barbatanas seguem o Chest e as pernas seguem o Hips, então os clipes não movem
essas peças. Aqui cada ilha da malha passa a seguir seu osso, 100% e sem mexer em
vértices, UVs, materiais ou ações.

Uso, na raiz do repositório:
  Blender -b --factory-startup art-source/eden-control-room/blend/eden_v001.blend \
    --python art-source/eden-control-room/scripts/exportar_runtime.py
"""
import bmesh
import bpy
import collections
import hashlib
import json
import pathlib

from mathutils import Vector
from mathutils.geometry import intersect_point_line

ROOT = pathlib.Path(__file__).resolve().parents[3]
FONTE = pathlib.Path(bpy.data.filepath)
GLB = ROOT / 'src/assets/characters/npcs/eden-v002.glb'
NOTAS = ROOT / 'art-source/eden-control-room/notas/export_runtime.json'

ARM = bpy.data.objects['EdenArmature']
MESH = bpy.data.objects['EdenMesh']
BONES = {b.name: (ARM.matrix_world @ b.head_local, ARM.matrix_world @ b.tail_local) for b in ARM.data.bones}
WINGLETS = [f'Winglet_{a}_{s}' for a in ('Upper', 'Lower') for s in 'LR']
# Na ordem do corpo: em empate na articulação (cotovelo, joelho, tornozelo) fica o osso distal.
ARM_BONES = [f'{b}_{s}' for b in ('Hand', 'Forearm', 'UpperArm') for s in 'LR']
LEG_BONES = [f'{b}_{s}' for b in ('Foot', 'LowerLeg', 'UpperLeg') for s in 'LR']


def seg_dist(point, bone):
    a, b = BONES[bone]
    t = max(0.0, min(1.0, intersect_point_line(point, a, b)[1]))
    return (a + (b - a) * t - point).length


def nearest(point, bones):
    return min(bones, key=lambda bone: round(seg_dist(point, bone), 4))


def osso_da_ilha(grupo, centro, topo):
    if grupo == 'Chest':
        if abs(centro.x) >= 0.15:
            winglet = nearest(centro, WINGLETS)
            return winglet if seg_dist(centro, winglet) <= 0.05 else nearest(centro, ARM_BONES)
        if seg_dist(centro, 'Heart_Core') <= 0.01:
            return 'Heart_Core'
        if seg_dist(centro, 'Neck') <= 0.03:
            return 'Neck'
        return 'Spine1' if topo <= 1.352 else 'Chest'
    # Pelve, proteção da virilha e os quatro painéis da casaca nascem acima do quadril.
    if grupo == 'Hips' and topo <= 1.05:
        return nearest(centro, LEG_BONES)
    return grupo


def ilhas(bm):
    vistos = set()
    for vert in bm.verts:
        if vert.index in vistos:
            continue
        vistos.add(vert.index)
        pilha, ilha = [vert], []
        while pilha:
            atual = pilha.pop()
            ilha.append(atual)
            for edge in atual.link_edges:
                outro = edge.other_vert(atual)
                if outro.index not in vistos:
                    vistos.add(outro.index)
                    pilha.append(outro)
        yield ilha


def religar():
    bm = bmesh.new()
    bm.from_mesh(MESH.data)
    deform = bm.verts.layers.deform.active
    nomes = {g.index: g.name for g in MESH.vertex_groups}
    plano = []
    for ilha in ilhas(bm):
        lo = [min(v.co[k] for v in ilha) for k in range(3)]
        hi = [max(v.co[k] for v in ilha) for k in range(3)]
        grupos = {nomes[i] for v in ilha for i in v[deform].keys()}
        assert len(grupos) == 1, grupos
        grupo = grupos.pop()
        centro = MESH.matrix_world @ Vector([(lo[k] + hi[k]) / 2 for k in range(3)])
        plano.append((grupo, osso_da_ilha(grupo, centro, hi[2]), [v.index for v in ilha]))
    bm.free()
    resumo = collections.Counter()
    for grupo, osso, indices in plano:
        resumo[osso] += 1
        if osso == grupo:
            continue
        destino = MESH.vertex_groups.get(osso) or MESH.vertex_groups.new(name=osso)
        MESH.vertex_groups[grupo].remove(indices)
        destino.add(indices, 1.0, 'REPLACE')
    for vert in MESH.data.vertices:
        assert len(vert.groups) == 1 and vert.groups[0].weight == 1.0, vert.index
    return dict(sorted(resumo.items()))


def sha256(path):
    return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()


ilhas_por_osso = religar()
GLB.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(GLB), export_format='GLB', export_apply=False, export_animations=True,
                          export_nla_strips=True, export_yup=True)
NOTAS.write_text(json.dumps({
    'fonte': FONTE.relative_to(ROOT).as_posix(),
    'fonte_sha256': sha256(FONTE),
    'glb': GLB.relative_to(ROOT).as_posix(),
    'glb_bytes': GLB.stat().st_size,
    'glb_sha256': sha256(GLB),
    'triangulos': sum(len(p.vertices) - 2 for p in MESH.data.polygons),
    'ossos': len(ARM.data.bones),
    'ossos_com_malha': len(ilhas_por_osso),
    'ilhas_por_osso': ilhas_por_osso,
    'blender': bpy.app.version_string,
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('EXPORT ok', GLB, ilhas_por_osso)
