# Reimporta o GLB de prévia da v006 numa cena limpa (Blender de fábrica), mede e renderiza "depois" com as luzes da fonte.
#   Blender -b --factory-startup -P art-source/mars-colony-plataforma/scripts/reimportar_previa_v006.py
# Grava export/previa_v006_B3/plataforma_v006_B3_reimportado.blend (arquivo novo) e verificacao_reimportacao.json.
import bpy
import json
import math
import os
from mathutils import Matrix, Vector, kdtree

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
D = os.path.join(ROOT, 'export', 'previa_v006_B3')
SAIDA = os.path.join(D, 'plataforma_v006_B3_reimportado.blend')
assert not os.path.exists(SAIDA), 'cena de reimportação já existe; não sobrescrever'
os.makedirs(os.path.join(D, 'renders_depois'), exist_ok=True)
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.join(D, 'plataforma_v006_B3_previa.glb'))
man = json.load(open(os.path.join(D, 'manifesto_plataforma_v006_B3.json')))
fonte = {o['nome']: o for o in man['objetos']}
rep = {}

# ---- ambiente e luzes iguais aos da fonte (o glTF não carrega mundo, gestão de cor nem as luzes, que ficaram fora)
w = bpy.data.worlds.new('MUNDO_Marte')
sc.world = w
w.use_nodes = True
bg = w.node_tree.nodes.get('Background')
bg.inputs['Color'].default_value = man['mundo_fonte']['cor']
bg.inputs['Strength'].default_value = man['mundo_fonte']['forca']
sc.view_settings.view_transform = man['mundo_fonte']['view_transform']
try:
    sc.view_settings.look = man['mundo_fonte']['look']
except Exception:
    pass
sc.render.engine = 'BLENDER_EEVEE'
sc.eevee.taa_render_samples = 48
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1920, 1080, 100
for n, l in man['luzes_fonte_fora_do_glb'].items():
    ld = bpy.data.lights.new(n, l['tipo'])
    ld.energy, ld.color = l['energia'], l['cor']
    if l['angulo'] is not None:
        ld.angle = l['angulo']
    if l['raio'] is not None:
        ld.shadow_soft_size = l['raio']
    lo = bpy.data.objects.new(n, ld)
    sc.collection.objects.link(lo)
    lo.matrix_world = Matrix(l['matriz'])

# ---- 1. organização e IDs
objs = [o for o in bpy.data.objects if o.type in ('MESH', 'EMPTY', 'CAMERA') and 'id_estavel' in o]
papeis = {}
for o in objs:
    papeis.setdefault(o['papel'], []).append(o.name)
rep['organizacao'] = {'nos_com_id_estavel': len(objs), 'ids_unicos': len({o['id_estavel'] for o in objs}) == len(objs),
                      'id_estavel_igual_ao_manifesto': all(bpy.data.objects[n]['id_estavel'] == f['id_estavel'] for n, f in fonte.items()
                                                           if n in bpy.data.objects),
                      'colisor_anotado_em_todas_as_malhas': all('colisor' in bpy.data.objects[n] for n in fonte if n in bpy.data.objects),
                      'objetos_COL_importados': [o.name for o in bpy.data.objects if o.name.startswith('COL_')],
                      'por_papel': {k: sorted(v) for k, v in sorted(papeis.items())}}

# ---- 2. transformações, pivôs, escala, contagens, materiais
dg = bpy.context.evaluated_depsgraph_get()
tr = []
for n, f in fonte.items():
    o = bpy.data.objects.get(n)
    if o is None:
        tr.append({'nome': n, 'erro': 'ausente'})
        continue
    t = o.matrix_world.translation
    piv = [t.x, t.z, -t.y]
    ev = o.evaluated_get(dg)
    me = ev.to_mesh()
    me.calc_loop_triangles()
    ws = [o.matrix_world @ v.co for v in me.vertices]
    bb_min = [min(v.x for v in ws), min(v.z for v in ws), min(-v.y for v in ws)]
    bb_max = [max(v.x for v in ws), max(v.z for v in ws), max(-v.y for v in ws)]
    tr.append({'nome': n, 'pivo_dif_m': round(max(abs(a - b) for a, b in zip(piv, f['pivo_jogo_xyz'])), 5),
               'bbox_dif_m': round(max([abs(a - b) for a, b in zip(bb_min, f['bbox_jogo']['min'])] +
                                       [abs(a - b) for a, b in zip(bb_max, f['bbox_jogo']['max'])]), 5),
               'escala': [round(v, 4) for v in o.matrix_world.to_scale()],
               'tri_fonte': f['triangulos'], 'tri_reimp': len(me.loop_triangles),
               'materiais_reimp': sorted({m.name for m in o.data.materials if m})})
    ev.to_mesh_clear()
alt = {n: fonte[n]['bbox_jogo']['max'][1] for n in ('PLAT_B3_Foguete', 'PLAT_B3_Torre_Servico', 'PLAT_B3_Mastro_Servico')}
alt_r = {}
for n in alt:
    o = bpy.data.objects[n]
    alt_r[n] = round(max((o.matrix_world @ v.co).z for v in o.data.vertices), 4)
rep['escala_e_transformacoes'] = {
    'pivo_dif_max_m': max(x.get('pivo_dif_m', 9) for x in tr), 'bbox_dif_max_m': max(x.get('bbox_dif_m', 9) for x in tr),
    'escalas_diferentes_de_1': [x['nome'] for x in tr if any(abs(v - 1) > 1e-4 for v in x.get('escala', [1, 1, 1]))],
    'alturas_fonte_m': alt, 'alturas_reimportado_m': alt_r,
    'INTERACT_Nave_jogo': [round(v, 4) for v in (lambda t: (t.x, t.z, -t.y))(bpy.data.objects['INTERACT_Nave'].matrix_world.translation)],
    'SPAWN_Desembarque_jogo': [round(v, 4) for v in (lambda t: (t.x, t.z, -t.y))(bpy.data.objects['SPAWN_Desembarque'].matrix_world.translation)],
    'tri_total_fonte': sum(x.get('tri_fonte', 0) for x in tr), 'tri_total_reimp': sum(x.get('tri_reimp', 0) for x in tr),
    'materiais_diferentes': [x['nome'] for x in tr if x.get('materiais_reimp') != sorted(set(fonte[x['nome']]['materiais']))],
    'por_objeto': tr}
rep['materiais_reimportados'] = sorted({m.name for m in bpy.data.materials if m.users})
vid = bpy.data.materials.get('M_Vidro')
rep['vidro'] = {'surface_render_method': getattr(vid, 'surface_render_method', None)} if vid else None

# ---- 3. normais (ângulo entre a normal da fonte e a reimportada no mesmo canto de face)
ref = json.load(open(os.path.join(D, 'referencia_normais_fonte.json')))
nm = {}
for n, pts in ref.items():
    o = bpy.data.objects[n]
    ev = o.evaluated_get(dg)
    me = ev.to_mesh()
    rot = o.matrix_world.to_3x3()
    kd = kdtree.KDTree(len(me.loops))
    lst = []
    for i, lp in enumerate(me.loops):
        p = o.matrix_world @ me.vertices[lp.vertex_index].co
        lst.append((rot @ Vector(lp.normal)).normalized())
        kd.insert(p, i)
    kd.balance()
    angs = []
    for x, y, z, nx, ny, nz in pts:
        nref = Vector((nx, ny, nz))
        cands = kd.find_range(Vector((x, y, z)), 1e-3)
        if cands:
            angs.append(min(math.degrees(nref.angle(lst[c[1]], 0.0)) for c in cands))
    nm[n] = {'cantos_de_face_fonte': len(pts), 'comparados': len(angs), 'desvio_max_graus': round(max(angs), 3),
             'desvio_medio_graus': round(sum(angs) / len(angs), 4)}
    ev.to_mesh_clear()
rep['normais'] = nm

# ---- renders "depois", mesmas câmeras (importadas do GLB) e luzes da fonte
for o in bpy.data.objects:
    if o.type == 'CAMERA':
        sc.camera = o
        nome = 'CAM_PLAT_B3_Conexao' if 'Conexao' in o.name else 'CAM_PLAT_Geral'
        sc.render.filepath = os.path.join(D, 'renders_depois', nome + '.png')
        bpy.ops.render.render(write_still=True)
sc['nota'] = 'Cena de reimportação do GLB de prévia da plataforma v006 (B3); não é fonte de arte.'
bpy.ops.wm.save_as_mainfile(filepath=SAIDA)
json.dump(rep, open(os.path.join(D, 'verificacao_reimportacao.json'), 'w'), ensure_ascii=False, indent=1)
print('REIMP_OK', json.dumps({k: v for k, v in rep.items() if k not in ('escala_e_transformacoes', 'organizacao')}, ensure_ascii=False))
print('TRANSF', json.dumps({k: v for k, v in rep['escala_e_transformacoes'].items() if k != 'por_objeto'}, ensure_ascii=False))
print('ORG', json.dumps({k: v for k, v in rep['organizacao'].items() if k != 'por_papel'}, ensure_ascii=False), sorted(rep['organizacao']['por_papel']))
