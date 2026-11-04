"""Blender 5: combo, giro e morte com espada no mesmo bind do astronauta (v002).
Fontes intactas. Não reexporta o astronauta nem substitui os clipes v001.
Blender -b --factory-startup -P art-source/armas/facao/scripts/preparar_espada.py
"""
import bpy, json, hashlib, math
from mathutils import Matrix, Vector
from pathlib import Path
BASE = Path(__file__).resolve().parents[1]
REPO = BASE.parents[2]
PLAYER = REPO / 'art-source/personagens/explorador-astronauta'
# Root: 'neutral' mantém o corpo na cápsula; 'keep' conserva o recuo da queda em relação ao início.
MAP = {'Sword_Combo': ('Great_Sword_Slash.fbx', 'neutral'),
       'Sword_Turn': ('Great_Sword_180_Turn.fbx', 'neutral'),
       'Sword_Death': ('Two_Handed_Sword_Death.fbx', 'keep')}
# Quadros da fonte: início, contato (pico da ponta guiada pelo pulso, medir_espada.mjs) e fim; rastro no trecho rápido.
CUTS = [{'start': 1, 'contact': 16, 'end': 29, 'trail': [13, 20]},
        {'start': 29, 'contact': 34, 'end': 43, 'trail': [32, 38]},
        {'start': 43, 'contact': 50, 'end': 68, 'trail': [47, 54]}]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
for f in json.loads((BASE / 'notas/fontes-v002.json').read_text()):
    assert sha(BASE / f['copy']) == f['sha256'], f['copy']
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30


def imported(file):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(file))
    objects = [o for o in bpy.data.objects if o not in before]
    return next(o for o in objects if o.type == 'ARMATURE'), next(o for o in objects if o.type == 'MESH'), objects


def set_action(arm, action):
    arm.animation_data_create()
    arm.animation_data.action = action
    arm.animation_data.action_slot = action.slots[0]


def curves(action):
    return [fc for layer in action.layers for strip in layer.strips for slot in action.slots for bag in [strip.channelbag(slot)] if bag for fc in bag.fcurves]


def yaw_of(matrix):
    # Rotação em torno do Z do Blender, igual em sentido à rotation.y do jogo (Y-up).
    forward = matrix.to_quaternion() @ Vector((0, 0, 1))
    return math.atan2(forward.x, -forward.y)


def unwrap(values):
    out = values[:1]
    for value in values[1:]:
        out.append(out[-1] + (value - out[-1] + math.pi) % (2 * math.pi) - math.pi)
    return out


master, mesh, _ = imported(PLAYER / 'mixamo/Idle.fbx')
master.name = 'ExploradorAstronauta'
mesh.name = 'Astronauta_SemMochila'
scene.frame_set(1)
bpy.context.view_layer.update()
anchor = (master.matrix_world @ master.pose.bones['mixamorig:Hips'].head).copy()
ref = json.loads((PLAYER / 'notas/f1-v009.json').read_text())
K = ref['escala']
origin = ref['ajuste_origem_blender_m']
report = {'blender': bpy.app.version_string, 'fps': 30, 'escala': K,
          'base_glb_sha256': sha(REPO / 'src/assets/characters/player/explorador-astronauta.glb'),
          'base_bind_sha256': sha(PLAYER / 'mixamo/Idle.fbx'), 'clipes': []}
runtime = {'fps': 30}
actions = {}
for name, (file, root) in MAP.items():
    arm, _, objects = imported(BASE / 'fontes' / file)
    source = arm.animation_data.action
    assert set(arm.data.bones.keys()) == set(master.data.bones.keys()), file
    bind = max(abs(arm.data.bones[n].matrix_local[i][j] - master.data.bones[n].matrix_local[i][j]) for n in master.data.bones.keys() for i in range(4) for j in range(4))
    assert bind < 1e-5, (file, bind)
    start, end = map(int, source.frame_range)
    fps = scene.render.fps / scene.render.fps_base
    assert abs(fps - 30) < 1e-5, (file, fps)
    poses = []
    for frame in range(start, end + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        poses.append((arm.matrix_world @ arm.pose.bones['mixamorig:Hips'].matrix).copy())
    yaw = unwrap([yaw_of(m) for m in poses])
    action = source.copy()
    action.name = name
    action.use_fake_user = True
    set_action(arm, action)
    # Giro: o quadril termina na orientação de parado; a rotação inicial é compensada no runtime.
    settle = Matrix.Rotation(yaw[0] - yaw[-1], 4, 'Z') if name == 'Sword_Turn' else Matrix.Identity(4)
    for frame, world in zip(range(start, end + 1), poses):
        scene.frame_set(frame)
        desired = settle @ world
        if root == 'neutral':
            desired.translation = (anchor.x, anchor.y, world.translation.z)
        else:
            desired.translation = (anchor.x + world.translation.x - poses[0].translation.x,
                                   anchor.y + world.translation.y - poses[0].translation.y, world.translation.z)
        local = arm.data.bones['mixamorig:Hips'].matrix_local.inverted() @ arm.matrix_world.inverted() @ desired
        bone = arm.pose.bones['mixamorig:Hips']
        bone.location = local.translation
        bone.keyframe_insert('location', frame=frame, group='mixamorig:Hips')
        bone.rotation_mode = 'QUATERNION'
        bone.rotation_quaternion = local.to_quaternion()
        bone.keyframe_insert('rotation_quaternion', frame=frame, group='mixamorig:Hips')
    for fc in curves(action):
        for key in fc.keyframe_points:
            key.interpolation = 'LINEAR'
    forward = [-(m.translation.y - poses[0].translation.y) * K for m in poses]
    if name == 'Sword_Combo':
        runtime['comboDuration'] = (end - start) / fps
        runtime['rootForward'] = [round(v, 4) for v in forward]
        runtime['cuts'] = [{key: ((value - 1) / fps if key != 'trail' else [(v - 1) / fps for v in value]) for key, value in cut.items()} for cut in CUTS]
    if name == 'Sword_Turn':
        runtime['turnDuration'] = (end - start) / fps
        runtime['turnYaw'] = [round(v - yaw[-1], 5) for v in yaw]
    if name == 'Sword_Death':
        runtime['deathDuration'] = (end - start) / fps
    report['clipes'].append({'name': name, 'file': file, 'source_frames': [start, end], 'source_fps': fps, 'duration': (end - start) / fps,
                             'root': root, 'root_forward_m': forward[-1], 'yaw_total_graus': math.degrees(yaw[-1] - yaw[0]), 'bind_delta': bind})
    actions[name] = action
    for obj in objects:
        bpy.data.objects.remove(obj, do_unlink=True)
for a in list(bpy.data.actions):
    if a not in actions.values():
        bpy.data.actions.remove(a)
set_action(master, actions['Sword_Combo'])
master.scale = (K,) * 3
master.location = origin
scene.frame_set(1)
bpy.context.view_layer.update()
# Só as animações são usadas no runtime; malha sem textura mantém o skin, como na v001.
for material in mesh.data.materials:
    if material.use_nodes:
        for node in list(material.node_tree.nodes):
            if node.type == 'TEX_IMAGE':
                material.node_tree.nodes.remove(node)
bpy.ops.object.select_all(action='DESELECT')
master.select_set(True)
mesh.select_set(True)
bpy.context.view_layer.objects.active = master
out = BASE / 'export/explorador-espada-v002.glb'
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True, export_yup=True, export_animations=True,
                          export_animation_mode='ACTIONS', export_anim_single_armature=True, export_anim_slide_to_zero=True,
                          export_force_sampling=True, export_frame_range=False, export_optimize_animation_size=False, export_skins=True)
report['glb'] = {'file': str(out.relative_to(BASE)), 'sha256': sha(out), 'bytes': out.stat().st_size}
(BASE / 'notas/clipes-v002.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
(REPO / 'src/characters/player/swordClips.json').write_text(json.dumps(runtime, ensure_ascii=False) + '\n')
print('ESPADA_REPORT', json.dumps(report))
