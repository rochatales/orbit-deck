# GLB de PRÉVIA da plataforma B3 (v006), com IDs estáveis e manifesto. Não é asset de runtime; não exporta para os
# caminhos do jogo. Os colisores novos ficam FORA do GLB, num JSON separado de propostas. Não salva o .blend.
#   Blender -b art-source/mars-colony-plataforma/blend/mars_colony_estudo_v006_plataforma_B3.blend \
#           -P art-source/mars-colony-plataforma/scripts/exportar_previa_v006.py
# Saída: export/previa_v006_B3/ (GLB, manifesto, propostas de colisor, normais de referência, renders "antes").
import bpy
import json
import math
import os
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'export', 'previa_v006_B3')
os.makedirs(os.path.join(OUT, 'renders_antes'), exist_ok=True)
assert bpy.data.filepath.endswith('mars_colony_estudo_v006_plataforma_B3.blend')
GLB = os.path.join(OUT, 'plataforma_v006_B3_previa.glb')
assert not os.path.exists(GLB), 'GLB de prévia já existe; não sobrescrever'
sc = bpy.context.scene
vl = sc.view_layers['Plataforma_B3']
vl.update()
dg = vl.depsgraph
dg.update()

# ------------------------------------------------------------ escopo
MALHAS = [o for o in bpy.data.collections['PLATAFORMA_B3_V006'].all_objects if o.type == 'MESH']
MALHAS += [o for o in bpy.data.collections['PLATAFORMA_COMUM'].objects if o.type == 'MESH']   # sem a subcoleção PISO_V004
MALHAS += [bpy.data.objects[n] for n in ('ARQ_Piso_Deck', 'ARQ_Deck_Marcacoes', 'PROP_Tanques')]
MARCADORES = [bpy.data.objects[n] for n in ('SPAWN_Desembarque', 'INTERACT_Nave')]
CAMERAS = [bpy.data.objects[n] for n in ('CAM_PLAT_Geral', 'CAM_PLAT_B3_Conexao')]
LUZES = ['LUZ_Sol', 'LUZ_Preenchimento', 'LUZ_Deck_Ciano']
ESCOPO = MALHAS + MARCADORES + CAMERAS
NOMES = {o.name for o in ESCOPO}
assert all(n in vl.objects for n in NOMES), [n for n in NOMES if n not in vl.objects]

PAPEL = [('Sinal_Casa', 'sinalizacao'), ('Sinal_Totem', 'sinalizacao'), ('Sinal_Piso', 'sinalizacao_piso'), ('Foguete', 'foguete'), ('Base_Lancamento', 'base_lancamento'), ('Casa_Elevador', 'elevador_chegada_base'),
         ('Sinal_Casa', 'sinalizacao'), ('Torre_Servico', 'torre_servico'), ('Mastro', 'mastro_servico'),
         ('Braco', 'braco_tripulacao'), ('Passarela', 'passarela'), ('Umbilical', 'umbilical'), ('Linhas', 'linhas_abastecimento'),
         ('Elevador_Embarque', 'elevador_embarque'), ('Chevrons', 'sinalizacao_piso'), ('Sinal_Piso', 'sinalizacao_piso'),
         ('Totem', 'coluna_chamada_elevador'), ('Sinal_Totem', 'sinalizacao'), ('Parapeitos', 'baia_parapeitos'),
         ('Console', 'mobiliario'), ('Carro', 'mobiliario'), ('Rack', 'mobiliario'), ('Piso_Deck', 'piso_contexto'),
         ('Deck_Marcacoes', 'piso_contexto'), ('Tanques', 'tanques_contexto'), ('SPAWN_', 'marcador'), ('INTERACT_', 'marcador'),
         ('CAM_', 'camera')]
COLISOR = {'PLAT_B3_Base_Lancamento': 'proposta separada: COL_NOVO_PLAT_B3_Base_Lancamento',
           'PLAT_B3_Torre_Servico': 'proposta separada: COL_NOVO_PLAT_B3_Torre_Servico',
           'PLAT_B3_Mastro_Servico': 'proposta separada: COL_NOVO_PLAT_B3_Mastro_Servico',
           'PLAT_B3_Totem_Embarque': 'ativo do piloto: fundo da nave (x ±1,7; z 34,75–35,25)',
           'PLAT_Baia_Parapeitos': 'ativo do piloto: laterais e fundo da nave'}


def papel(n):
    for k, p in PAPEL:
        if k in n:
            return p
    return 'outro'


def id_estavel(n):
    for pre in ('PLAT_B3_', 'PLAT_', 'ARQ_', 'PROP_', 'CAM_PLAT_'):
        if n.startswith(pre):
            return 'marte.plataforma.' + n[len(pre):].lower()
    return 'marte.plataforma.' + n.lower()


for o in ESCOPO:
    o['id_estavel'] = id_estavel(o.name)
    o['papel'] = papel(o.name)
    o['estado_inicial'] = 'visivel'
    o['previa'] = 'estudo v006 (B3) — somente prévia; não importar no jogo sem decisão do autor'
    if o.type == 'MESH':
        if o.name in COLISOR:
            o['colisor'] = COLISOR[o.name]
        elif o.name.startswith('PLAT_B3_') and papel(o.name) in ('elevador_embarque', 'sinalizacao_piso'):
            o['colisor'] = 'sem colisor: rente ao piso (até 2 cm)'
        elif papel(o.name) in ('piso_contexto',):
            o['colisor'] = 'piso caminhável ativo do piloto (sem mudança)'
        else:
            o['colisor'] = 'fora da área caminhável; sem colisor próprio'

# ------------------------------------------------------------ manifesto (fonte), medido na camada Plataforma_B3
ids = [o['id_estavel'] for o in ESCOPO]
assert len(ids) == len(set(ids)), 'id_estavel repetido'


def dados(o):
    ev = o.evaluated_get(dg)
    mw = ev.matrix_world
    d = {'nome': o.name, 'id_estavel': o['id_estavel'], 'papel': o['papel'], 'tipo': o.type, 'estado_inicial': o['estado_inicial'],
         'pivo_jogo_xyz': [round(mw.translation.x, 4), round(mw.translation.z, 4), round(-mw.translation.y, 4)],
         'rotacao_blender': [round(v, 5) for v in mw.to_euler()], 'escala': [round(v, 5) for v in mw.to_scale()]}
    if o.type == 'MESH':
        me = ev.to_mesh()
        me.calc_loop_triangles()
        ws = [mw @ v.co for v in me.vertices]
        d.update({'colisor': o['colisor'], 'triangulos': len(me.loop_triangles), 'vertices': len(me.vertices),
                  'materiais': [m.name for m in o.data.materials if m],
                  'bbox_jogo': {'min': [round(min(v.x for v in ws), 4), round(min(v.z for v in ws), 4), round(min(-v.y for v in ws), 4)],
                                'max': [round(max(v.x for v in ws), 4), round(max(v.z for v in ws), 4), round(max(-v.y for v in ws), 4)]},
                  'modificadores': [m.type for m in o.modifiers]})
        ev.to_mesh_clear()
    if o.type == 'CAMERA':
        d['camera'] = {'tipo': o.data.type, 'lente_mm': o.data.lens, 'ortho_scale': o.data.ortho_scale}
    return d


props = []
for o in bpy.data.collections['COL_NOVO_PLATAFORMA'].objects:
    if o.name.startswith('COL_NOVO_PLAT_B3_'):
        r = [float(v) for v in o['rect_jogo'].split(',')]
        ws = [o.matrix_basis @ v.co for v in o.data.vertices]
        props.append({'nome': o.name, 'rect_jogo_minX_maxX_minZ_maxZ': r, 'altura_m': round(max(v.z for v in ws), 2),
                      'nota': o.get('nota', ''), 'estado': 'proposta; não integra os colisores ativos'})
json.dump({'versao': 'v006 (B3)', 'colisores_propostos': props,
           'nota': 'Fora do GLB de prévia. Retângulos no plano do jogo (x, z); a passagem (r 0,36 m) não perde área com eles '
                   '(notas/analise_v006.json).'}, open(os.path.join(OUT, 'colisores_propostos_v006_B3.json'), 'w'), ensure_ascii=False, indent=1)
luzes = {}
for n in LUZES:
    o = bpy.data.objects[n]
    ev = o.evaluated_get(dg)
    luzes[n] = {'tipo': o.data.type, 'energia': o.data.energy, 'cor': list(o.data.color),
                'matriz': [list(r) for r in ev.matrix_world], 'angulo': getattr(o.data, 'angle', None),
                'raio': getattr(o.data, 'shadow_soft_size', None)}
bg = sc.world.node_tree.nodes['Background']
manifesto = {
    'versao': 'v006 (B3)', 'fonte': 'blend/mars_colony_estudo_v006_plataforma_B3.blend', 'camada': 'Plataforma_B3',
    'conversao_eixos': 'Blender (X, Y, Z) -> jogo/glTF (x = X, y = Z, z = -Y); pivo_jogo_xyz e bbox_jogo já em coordenadas do jogo',
    'regras': {'identificador': 'id_estavel = "marte.plataforma." + nome sem prefixo de variante; o nome do nó glTF é o nome do objeto',
               'transporte': 'extras do nó glTF (propriedades personalizadas) + este manifesto',
               'colisores': 'nenhum colisor no GLB; propostas em colisores_propostos_v006_B3.json; a malha nunca é colisor',
               'marcadores': 'SPAWN_Desembarque e INTERACT_Nave como nós vazios, só para conferência de posição'},
    'objetos': [dados(o) for o in sorted(MALHAS, key=lambda o: o.name)],
    'marcadores': [dados(o) for o in MARCADORES], 'cameras': [dados(o) for o in CAMERAS],
    'luzes_fonte_fora_do_glb': luzes,
    'mundo_fonte': {'cor': list(bg.inputs['Color'].default_value), 'forca': bg.inputs['Strength'].default_value,
                    'view_transform': sc.view_settings.view_transform, 'look': sc.view_settings.look},
}

# normais de referência (peças suavizadas e chanfradas): normal por canto de face, coordenadas do mundo
ref = {}
for n in ('PLAT_B3_Foguete', 'PLAT_B3_Braco_Tripulacao', 'PLAT_B3_Base_Lancamento', 'PLAT_B3_Casa_Elevador_Base'):
    o = bpy.data.objects[n]
    ev = o.evaluated_get(dg)
    me = ev.to_mesh()
    mw = ev.matrix_world
    rot_ = mw.to_3x3()
    pts = []
    for lp in me.loops:
        p = mw @ me.vertices[lp.vertex_index].co
        nn = (rot_ @ Vector(lp.normal)).normalized()
        pts.append([round(p.x, 4), round(p.y, 4), round(p.z, 4), round(nn.x, 5), round(nn.y, 5), round(nn.z, 5)])
    ref[n] = pts
    ev.to_mesh_clear()
json.dump(ref, open(os.path.join(OUT, 'referencia_normais_fonte.json'), 'w'))

# ------------------------------------------------------------ exportação (só o escopo; luzes ficam fora: o glTF perde cor e força do sol)
for o in vl.objects:
    o.select_set(False, view_layer=vl)
for o in ESCOPO:
    o.hide_set(False, view_layer=vl)
    o.select_set(True, view_layer=vl)
with bpy.context.temp_override(view_layer=vl):
    bpy.ops.export_scene.gltf(filepath=GLB, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                              export_extras=True, export_cameras=True, export_lights=False, export_vertex_color='MATERIAL')
manifesto['glb'] = {'arquivo': os.path.relpath(GLB, ROOT), 'bytes': os.path.getsize(GLB)}
json.dump(manifesto, open(os.path.join(OUT, 'manifesto_plataforma_v006_B3.json'), 'w'), ensure_ascii=False, indent=1)

# ------------------------------------------------------------ renders "antes": só o escopo e as 3 luzes da fonte
for o in bpy.data.objects:
    if o.type in ('MESH', 'CURVE', 'FONT'):
        o.hide_render = o.name not in NOMES
    if o.type == 'LIGHT':
        o.hide_render = o.name not in LUZES
for v in sc.view_layers:
    v.use = (v.name == 'Plataforma_B3')
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1920, 1080, 100
for cam in CAMERAS:
    sc.camera = cam
    sc.render.filepath = os.path.join(OUT, 'renders_antes', cam.name + '.png')
    bpy.ops.render.render(write_still=True, layer='Plataforma_B3')
print('EXPORT_V006_OK', GLB, len(MALHAS), len(props))
