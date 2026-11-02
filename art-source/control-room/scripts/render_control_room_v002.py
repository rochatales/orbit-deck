"""Renders de conferência da Control Room v002 (estilo Hangar + Pedestal Central EDEN)."""
import bpy, sys, math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = Path('/Users/rochatales/.gemini/antigravity/brain/ec592869-d18a-49a4-88cf-000653513181')

bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'blend/control_room_v002.blend'))
s = bpy.context.scene
s.render.engine = 'CYCLES'
s.cycles.samples = 12
s.cycles.use_denoising = True
s.render.threads_mode = 'FIXED'
s.render.threads = 4
s.render.resolution_x = 1100
s.render.resolution_y = 900
s.render.resolution_percentage = 100
s.view_settings.view_transform = 'AgX'

s.world.use_nodes = True
s.world.node_tree.nodes.get('Background').inputs[0].default_value = (.16, .18, .22, 1)
s.world.node_tree.nodes.get('Background').inputs[1].default_value = .55

asset = list(bpy.context.scene.objects)
parts = {o.name: o for o in asset}
origin = Vector((0, 10.5, 0))


def material(n, col):
    m = bpy.data.materials.new(n)
    m.use_nodes = True
    m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (*col, 1)
    m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .82
    return m


bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 10.5, -.025))
bpy.context.object.data.materials.append(material('STUDIO_Ground', (.15, .10, .075)))

for name, p, power, size, col in [
    ('Key', (-6, -8, 11), 2200, 8, (1, .84, .66)),
    ('Fill', (8, -4, 7), 1450, 7, (.72, .86, 1)),
    ('Rim', (-2, 7, 9), 1850, 6, (1, .76, .56)),
    ('Interior', (0, 0, 2.4), 60, 2.6, (.45, .92, 1))
]:
    bpy.ops.object.light_add(type='AREA', location=origin + Vector(p))
    o = bpy.context.object
    o.name = 'STUDIO_' + name
    o.data.energy = power
    o.data.shape = 'DISK'
    o.data.size = size
    o.data.color = col
    o.rotation_euler = (origin + Vector((0, 0, .9)) - o.location).to_track_quat('-Z', 'Y').to_euler()

bpy.ops.object.camera_add()
camera = bpy.context.object
s.camera = camera
camera.data.type = 'ORTHO'


def render(name, p, target=(0, 0, 1.35), scale=10.5):
    camera.location = origin + Vector(p)
    camera.rotation_euler = (origin + Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.ortho_scale = scale
    out_a = ROOT / 'renders' / f'{name}.png'
    out_b = OUT_DIR / f'{name}.png'
    s.render.filepath = str(out_a)
    bpy.ops.render.render(write_still=True)
    out_b.write_bytes(out_a.read_bytes())


def state(roof=True, interaction=False, doors=True):
    for o in asset:
        hidden = (
            (not roof and (o.get('papel') == 'roof' or 'TET_Control' in o.get('apoiado_em', '')))
            or (o.get('estado_operacao') == 'interaction' and not interaction)
            or (o.get('papel') == 'door' and not doors)
        )
        o.hide_render = hidden


# 1. Exterior estilo Hangar (vista 3/4 Sudoeste)
state(True, False, True)
render('control_room_v002_exterior_sw', (-10, -13, 9.8), (0, 0, 1.45), scale=10.6)

# 2. Exterior vista 3/4 Sudeste (mostrando os dois portais Sul e Leste)
state(True, False, True)
render('control_room_v002_exterior_se', (10, -13, 9.8), (0, 0, 1.45), scale=10.6)

# 3. Interior sem teto (vista geral da sala com pedestal central EDEN)
state(False, True, False)
render('control_room_v002_interior_top', (10, -13, 15.5), (0, 0, .85), scale=9.8)

# 4. Close-up isométrico do Pedestal Central EDEN (corte de paredes frontais para ver o pedestal completo)
state(False, True, False)
for name in [
    'ARQ_Control_Parede_S', 'ARQ_Control_Parede_L',
    'ARQ_Control_Portal_S', 'ARQ_Control_Portal_L',
    'PROP_Control_Status_S', 'PROP_Control_Status_L',
    'ARQ_Control_Cantos', 'VID_Control'
]:
    if name in parts:
        parts[name].hide_render = True
render('control_room_v002_pedestal_eden', (5.5, -6.5, 5.2), (0, 0, .72), scale=4.2)

print('RENDERS_V002_OK')
