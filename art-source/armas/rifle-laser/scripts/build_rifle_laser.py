"""Rifle laser v001: escala real, origem na empunhadura e vazios Grip_R, Grip_L e Muzzle.

Convenção das armas (Blender): cano para -Y, topo para +Z, origem no centro do punho (Grip_R).
No glTF/three isso vira cano para +Z e topo para +Y, o mesmo "para a frente" do jogador.

Uso, a partir da raiz do repositório:
  Blender -b --factory-startup -P art-source/armas/rifle-laser/scripts/build_rifle_laser.py -- [--comprimento 0.75] [--render]
"""
import bpy, sys, json, math, hashlib, os
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
LENGTH = float(args[args.index('--comprimento') + 1]) if '--comprimento' in args else 0.75
RENDER = '--render' in args
TEXTURE = 1024
BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(BASE, 'fontes', 'rifle-laser-original.glb')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
for o in list(bpy.context.scene.objects):
    if o is not mesh and o.type == 'EMPTY':
        mesh.parent = None
        bpy.data.objects.remove(o)
mesh.name = 'RifleLaser'
mesh.data.name = 'RifleLaser'
bpy.context.view_layer.objects.active = mesh
mesh.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def verts():
    return [mesh.matrix_world @ v.co for v in mesh.data.vertices]

# Escala uniforme pelo comprimento (eixo Y, cano para -Y).
vs = verts()
span = max(v.y for v in vs) - min(v.y for v in vs)
mesh.scale = (LENGTH / span,) * 3
bpy.ops.object.transform_apply(scale=True)
vs = verts()
minY, maxY = min(v.y for v in vs), max(v.y for v in vs)
minZ, maxZ = min(v.z for v in vs), max(v.z for v in vs)

def centroid(points):
    return sum(points, Vector()) / len(points)

def window(y0, y1, z0, z1):
    """Vértices numa faixa relativa: y de 0 (boca) a 1 (coronha), z de 0 (base) a 1 (topo)."""
    return [v for v in vs
            if minY + y0 * LENGTH <= v.y <= minY + y1 * LENGTH
            and minZ + z0 * (maxZ - minZ) <= v.z <= minZ + z1 * (maxZ - minZ)]

# Boca: anel mais à frente do cano.
muzzle_ring = [v for v in vs if v.y <= minY + 0.012 * LENGTH]
muzzle = centroid(muzzle_ring)
muzzle.y = minY
# Punho: massa abaixo do corpo, atrás do carregador (55–80% do comprimento, metade inferior).
grip = centroid(window(0.64, 0.80, 0.05, 0.30))
grip.x = 0
# Apoio da mão esquerda: base do guarda-mão (8–30% do comprimento, faixa logo abaixo do cano).
fore = window(0.06, 0.30, 0.30, 0.55)
grip_l = Vector((0, centroid(fore).y, min(v.z for v in fore)))

# Origem no punho.
offset = grip.copy()
mesh.location -= offset
bpy.ops.object.transform_apply(location=True)
muzzle -= offset; grip_l -= offset

def empty(name, loc, size=0.03):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = 'ARROWS'; e.empty_display_size = size
    e.location = loc
    bpy.context.scene.collection.objects.link(e)
    e.parent = mesh
    return e

root = mesh
empty('Grip_R', Vector((0, 0, 0)))
empty('Grip_L', grip_l)
empty('Muzzle', muzzle)

# Texturas reduzidas só na exportação; a fonte original fica intacta em fontes/.
for img in bpy.data.images:
    if img.size[0] > TEXTURE:
        img.scale(TEXTURE, TEXTURE)

os.makedirs(os.path.join(BASE, 'blend'), exist_ok=True)
os.makedirs(os.path.join(BASE, 'export'), exist_ok=True)
for img in bpy.data.images:
    img.pack()
blend = os.path.join(BASE, 'blend', 'rifle-laser-v001.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend)
glb = os.path.join(BASE, 'export', 'rifle-laser-v001.glb')
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', export_yup=True, export_apply=True,
                          export_extras=False, export_animations=False)

def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()

vs = verts()
tris = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
gltf = lambda v: [round(v.x, 4), round(v.z, 4), round(-v.y, 4)]
report = {
    'versao': 'v001',
    'comprimento_m': LENGTH,
    'eixos': 'glTF/three: cano para +Z, topo para +Y, origem no centro do punho (Grip_R)',
    'dimensoes_m': {'largura_x': round(max(v.x for v in vs) - min(v.x for v in vs), 4),
                    'altura_y': round(max(v.z for v in vs) - min(v.z for v in vs), 4),
                    'comprimento_z': round(max(v.y for v in vs) - min(v.y for v in vs), 4)},
    'vazios_gltf_m': {'Grip_R': [0, 0, 0], 'Grip_L': gltf(grip_l), 'Muzzle': gltf(muzzle)},
    'triangulos': tris,
    'materiais': len(mesh.data.materials),
    'textura_px': TEXTURE,
    'bytes_glb': os.path.getsize(glb),
    'sha256': {'fonte_glb': sha(SRC), 'blend': sha(blend), 'glb': sha(glb)},
}
os.makedirs(os.path.join(BASE, 'notas'), exist_ok=True)
with open(os.path.join(BASE, 'notas', 'medidas-v001.json'), 'w') as f:
    json.dump(report, f, indent=2, ensure_ascii=False)
print('RIFLE', json.dumps(report, ensure_ascii=False))

if RENDER:
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x, scene.render.resolution_y = 1200, 700
    world = bpy.data.worlds.new('w'); scene.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.32, 0.32, 0.35, 1)
    sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); scene.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), 0, math.radians(35)); sun.data.energy = 3
    marker = bpy.data.materials.new('marcador'); marker.diffuse_color = (1, 0.2, 0.6, 1)
    marker.use_nodes = True
    marker.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value = (1, 0.15, 0.55, 1)
    marker.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 4
    # Arma translúcida só no render, para os marcadores aparecerem.
    for m in mesh.data.materials:
        m.surface_render_method = 'BLENDED'
        m.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.35
    for name in ('Grip_R', 'Grip_L', 'Muzzle'):
        e = bpy.data.objects[name]
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.012, location=e.matrix_world.translation)
        s = bpy.context.active_object; s.data.materials.append(marker); s.show_in_front = True
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam); scene.camera = cam
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = LENGTH * 1.2
    centre = Vector((0, (min(v.y for v in vs) + max(v.y for v in vs)) / 2, (min(v.z for v in vs) + max(v.z for v in vs)) / 2))
    for name, d in {'lado': (1, 0, 0), 'tres-quartos': (0.8, -0.5, 0.35)}.items():
        d = Vector(d).normalized()
        cam.location = centre + d * 2
        cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = os.path.join(BASE, 'renders', f'rifle-v001-{name}.png')
        bpy.ops.render.render(write_still=True)
