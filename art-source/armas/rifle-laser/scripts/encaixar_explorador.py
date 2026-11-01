"""Encaixe do rifle laser na mão direita do explorador rigado no Mixamo.

O encaixe é calculado uma vez na pose de tiro (Firing_Rifle, quadro 1):
- Grip_R vai ao centro da palma direita;
- o cano aponta da palma direita para a palma esquerda (linha Grip_R → Grip_L);
- o topo do rifle fica o mais perto possível do "para cima" do mundo.
O resultado é um deslocamento fixo em relação ao osso mixamorig:RightHand (o mesmo que o jogo vai usar),
reaplicado nos outros clipes para conferir. Nada aqui entra no jogo.

  Blender -b --factory-startup -P art-source/armas/rifle-laser/scripts/encaixar_explorador.py -- [--pasta <clipes>] [--render]
"""
import bpy, sys, os, json, math
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RENDER = '--render' in ARGS
PASTA = ARGS[ARGS.index('--pasta') + 1] if '--pasta' in ARGS else os.path.expanduser('~/Game Development/Horda Survivor/Personagens/3D')
BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RIFLE = os.path.join(BASE, 'export', 'rifle-laser-v001.glb')
ALTURA = 1.5  # altura do explorador no jogo
POSE = ('Firing_Rifle.fbx', 1)
# Clipes e quadros conferidos com o mesmo encaixe (o rifle só fica preso à mão direita).
CONFERIR = [
    ('Firing_Rifle.fbx', 1), ('Firing_Rifle.fbx', 18), ('Idle.fbx', 60), ('Rifle_Start_Run.fbx', 40),
    ('Standard_Run.fbx', 10), ('Sprint Backward.fbx', 8), ('Reloading.fbx', 50),
]
MAO = 'mixamorig:RightHand'


def importar(clip, quadro):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=os.path.join(PASTA, clip))
    arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
    bpy.context.scene.frame_set(quadro)
    bpy.context.view_layer.update()
    return arm, mesh


# Escala única: altura do Idle de pé (a pose de repouso do Mixamo não serve, a malha fica encolhida nela).
_arm, _mesh = importar('Idle.fbx', 1)
_pts = [_mesh.matrix_world @ v.co for v in _mesh.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh().vertices]
K = ALTURA / (max(p.z for p in _pts) - min(p.z for p in _pts))


def carregar(clip, quadro):
    arm, mesh = importar(clip, quadro)
    k = K
    arm.scale = (k,) * 3
    bpy.context.view_layer.update()
    bpy.ops.import_scene.gltf(filepath=RIFLE)
    rifle = bpy.data.objects['RifleLaser']
    return arm, mesh, rifle, k


def osso(arm, nome):
    return arm.matrix_world @ arm.pose.bones[nome].matrix


def palma(arm, lado):
    nomes = [f'mixamorig:{lado}Hand'] + [f'mixamorig:{lado}Hand{d}1' for d in ('Index', 'Middle', 'Ring')]
    return sum((arm.matrix_world @ arm.pose.bones[n].head for n in nomes), Vector()) / len(nomes)


def base(frente, cima):
    f = frente.normalized()
    c = (cima - f * cima.dot(f)).normalized()
    return Matrix((f, c, f.cross(c))).transposed()


# 1. Encaixe na pose de tiro.
arm, mesh, rifle, k = carregar(*POSE)
gl = bpy.data.objects['Grip_L'].matrix_local.translation
pr, pl = palma(arm, 'Right'), palma(arm, 'Left')
rot = base(pl - pr, Vector((0, 0, 1))) @ base(gl, Vector((0, 0, 1))).inverted()
mundo = Matrix.Translation(pr) @ rot.to_4x4()
deslocamento = osso(arm, MAO).inverted() @ mundo
loc, quat, esc = deslocamento.decompose()
medidas = {
    'pose_de_encaixe': {'clip': POSE[0], 'quadro': POSE[1]},
    'escala_explorador': round(k, 4),
    'osso': MAO,
    'deslocamento_no_osso': {'posicao': [round(c, 5) for c in loc], 'quaternion_wxyz': [round(c, 5) for c in quat], 'escala': [round(c, 5) for c in esc]},
    'distancia_palmas_m': round((pl - pr).length, 3),
    'distancia_grips_m': round(gl.length, 3),
    'conferencia': [],
}

# 2. O mesmo deslocamento em cada clipe; mede onde ficam a mão esquerda e a boca do cano.
scene = None
for clip, quadro in CONFERIR:
    arm, mesh, rifle, k = carregar(clip, quadro)
    rifle.matrix_world = osso(arm, MAO) @ deslocamento
    bpy.context.view_layer.update()
    grip_l = bpy.data.objects['Grip_L'].matrix_world.translation
    muzzle = bpy.data.objects['Muzzle'].matrix_world.translation
    raiz = arm.matrix_world @ arm.pose.bones['mixamorig:Hips'].head
    medidas['conferencia'].append({
        'clip': clip, 'quadro': quadro,
        'folga_mao_esquerda_m': round((grip_l - palma(arm, 'Left')).length, 3),
        # Boca do cano no referencial do jogo: lado (+ = direita do personagem), altura e frente, a partir do quadril projetado no chão.
        'muzzle_lado_altura_frente_m': [round(-(muzzle.x - raiz.x), 3), round(muzzle.z, 3), round(-(muzzle.y - raiz.y), 3)],
    })
    if RENDER:
        scene = bpy.context.scene
        scene.render.engine = 'BLENDER_EEVEE'
        scene.render.resolution_x, scene.render.resolution_y = 640, 720
        w = bpy.data.worlds.new('w'); scene.world = w; w.use_nodes = True
        w.node_tree.nodes['Background'].inputs[0].default_value = (0.33, 0.33, 0.36, 1)
        sol = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); scene.collection.objects.link(sol)
        sol.rotation_euler = (math.radians(45), 0, math.radians(200)); sol.data.energy = 3
        cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam); scene.camera = cam
        cam.data.type = 'ORTHO'; cam.data.ortho_scale = 1.9
        centro = Vector((raiz.x, raiz.y - 0.15, 0.8))
        nome = os.path.splitext(clip)[0].replace(' ', '-').lower()
        for vista, d in {'lado': (-1, -0.15, 0.1), 'frente': (-0.6, -1, 0.25)}.items():
            d = Vector(d).normalized(); cam.location = centro + d * 6
            cam.rotation_euler = (centro - cam.location).to_track_quat('-Z', 'Y').to_euler()
            scene.render.filepath = os.path.join(BASE, 'renders', 'encaixe-explorador', f'{nome}-q{quadro}-{vista}.png')
            bpy.ops.render.render(write_still=True)

with open(os.path.join(BASE, 'notas', 'encaixe-explorador-v001.json'), 'w') as f:
    json.dump(medidas, f, indent=2, ensure_ascii=False)
print('ENCAIXE', json.dumps(medidas, ensure_ascii=False))
