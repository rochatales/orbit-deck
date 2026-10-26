"""
build_supply_crate.py
Procedural low-poly build of the "supply crate in a crater" map prop
(grey hard-shell crate with peach-orange bands sunk into cracked concrete).
Holograms from the concept art are intentionally left out. Target: < 5k tris.

Gameplay contract (node / material names the runtime relies on):
  SupplyCrate                root empty (origin = bottom centre of the tile)
    Base                     cracked slab tile + crater + rubble (static)
    Crate                    empty, slight tilt
      Crate_Body             shell, bumpers, straps, handles, latches
      LidPivot               empty on the back hinge (rotation X opens the lid)
        Lid
      Loot                   supplies inside; hide once collected
  Material Glow_Status (front status light) and Glow_Loot carry the cyan emissive.
  Action "Lid_Open": LidPivot rotation from closed (frame 1) to open (frame 24).

States:
  closed  lid closed, status light on, loot inside   (item available)
  open    lid open, status light on, loot visible    (opening / about to collect)
  empty   lid open, status light off, loot hidden    (item collected)

Usage:
  Blender MCP / Scripting tab:
      exec(open("<repo>/blender/scripts/build_supply_crate.py").read())
  Headless (Blender binary or the `bpy` pip module):
      blender -b -P blender/scripts/build_supply_crate.py -- --export --render
      python  blender/scripts/build_supply_crate.py --export --render
  Inside the UI the build happens in its own scene ("SupplyCrate").
"""
import bpy
import math
import os
import random
import sys
from mathutils import Matrix, Vector

try:
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
except NameError:  # exec() from Blender MCP has no __file__
    PROJECT_ROOT = os.environ.get("ORBIT_DECK_ROOT", "/Users/rochatales/Automations/game-workplace")

sys.path.insert(0, os.path.join(PROJECT_ROOT, "blender/scripts"))
from build_emergency_locker import Builder, trs, new_empty, count_triangles, _lin  # noqa: E402

OUTPUT_GLB = os.path.join(PROJECT_ROOT, "src/assets/props/supply-crate.glb")
OUTPUT_BLEND = os.path.join(PROJECT_ROOT, "blender/props/supply_crate.blend")
PREVIEW_DIR = os.path.join(PROJECT_ROOT, "blender/props")

SCENE_NAME = "SupplyCrate"
TRI_BUDGET = 5000
LID_OPEN_DEG = -108.0

# name: (hex, roughness, metalness, emission hex, emission strength)
MATERIALS = {
    "Shell_Grey":     ("#C4C8CD", 0.62, 0.25, None, 0.0),
    "Shell_GreyDk":   ("#8D939A", 0.70, 0.25, None, 0.0),
    "Accent_Orange":  ("#E8925C", 0.70, 0.10, None, 0.0),
    "Metal_Dark":     ("#474D55", 0.50, 0.50, None, 0.0),
    "Metal_Light":    ("#A9B0B8", 0.40, 0.60, None, 0.0),
    "Interior_Dark":  ("#22272E", 0.90, 0.10, None, 0.0),
    "Glow_Status":    ("#7FEFFF", 0.30, 0.00, "#4FE8FF", 4.0),
    "Glow_Loot":      ("#7FEFFF", 0.30, 0.00, "#4FE8FF", 2.5),
    "Concrete":       ("#A3A8AE", 0.95, 0.00, None, 0.0),
    "Concrete_Dark":  ("#6C7279", 0.95, 0.00, None, 0.0),
    "Rubble":         ("#596068", 0.95, 0.00, None, 0.0),
    "Dirt":           ("#4E3B30", 0.95, 0.00, None, 0.0),
}
GLOW_MATERIALS = ("Glow_Status", "Glow_Loot")

# Crate dimensions (crate local space: origin bottom centre, front = -Y)
L, D, H = 1.30, 0.80, 0.48     # body length (X), depth (Y), height
LH = 0.22                      # lid height
T = 0.06                       # wall thickness
Z0 = 0.05                      # top of the skids / underside of the shell

TILE = 2.0
SLAB_TOP = 0.24
DIRT_TOP = 0.16
CRATER_A, CRATER_B = 0.92, 0.68   # crater ellipse radii (X, Y)


def build_materials():
    mats = {}
    for name, (col, rough, metal, emi, strength) in MATERIALS.items():
        m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        m.use_nodes = True
        bsdf = m.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = _lin(col)
        bsdf.inputs["Roughness"].default_value = rough
        bsdf.inputs["Metallic"].default_value = metal
        if emi:
            bsdf.inputs["Emission Color"].default_value = _lin(emi)
        bsdf.inputs["Emission Strength"].default_value = strength if emi else 0.0
        m.diffuse_color = _lin(col)
        mats[name] = m
    return mats


# --------------------------------------------------------------------------
# Base: cracked slab plates around a crater
# --------------------------------------------------------------------------

def prism(b, pts, z0, z1, mat, matrix=Matrix.Identity(4)):
    """Vertical prism from a CCW 2D outline: top cap + side walls (no bottom)."""
    with b.frame(matrix):
        b.poly([(x, y, z1) for x, y in pts], mat)
        n = len(pts)
        for i in range(n):
            (ax, ay), (bx, by) = pts[i], pts[(i + 1) % n]
            b.poly([(ax, ay, z0), (bx, by, z0), (bx, by, z1), (ax, ay, z1)], mat)


def shrink(pts, gap):
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    out = []
    for x, y in pts:
        dx, dy = x - cx, y - cy
        d = math.hypot(dx, dy)
        k = max(0.0, 1.0 - gap / d) if d > 0 else 1.0
        out.append((cx + dx * k, cy + dy * k))
    return out, (cx, cy)


def crater_r(x, y):
    return math.hypot(x / CRATER_A, y / CRATER_B)


def build_base(mats, root, coll):
    rng = random.Random(11)
    b = Builder("Base", mats)
    b.box((TILE, TILE, DIRT_TOP), (0, 0, DIRT_TOP / 2), "Dirt", bevel=0.01)

    # jittered grid -> slab plates; interior points jitter, border points stay on the edge
    n = 8
    half = TILE / 2
    grid = [[None] * (n + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        for j in range(n + 1):
            x, y = -half + TILE * i / n, -half + TILE * j / n
            if 0 < i < n:
                x += rng.uniform(-0.08, 0.08)
            if 0 < j < n:
                y += rng.uniform(-0.08, 0.08)
            grid[i][j] = (x, y)

    cells = []
    for i in range(n):
        for j in range(n):
            q = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]]
            if rng.random() < 0.45:  # split some plates diagonally for an irregular crack pattern
                cells += [[q[0], q[1], q[2]], [q[0], q[2], q[3]]] if rng.random() < 0.5 else \
                         [[q[0], q[1], q[3]], [q[1], q[2], q[3]]]
            else:
                cells.append(q)

    for pts in cells:
        pts, (cx, cy) = shrink(pts, 0.014)
        r = crater_r(cx, cy)
        if r < 1.0:
            continue  # inside the crater
        m = Matrix.Identity(4)
        if r < 1.55:
            # plates at the rim are pushed up: inner edge lifts toward the crater
            u = Vector((cx, cy, 0)).normalized()
            axis = Vector((-u.y, u.x, 0))
            ang = math.radians(rng.uniform(6, 12) * (1.55 - r) / 0.55)
            rot = Matrix.Rotation(ang, 4, axis)
            if (rot @ (-u * 0.1)).z < 0:
                rot = Matrix.Rotation(-ang, 4, axis)
            lift = 0.035 * (1.55 - r) / 0.55
            m = Matrix.Translation((cx, cy, SLAB_TOP + lift)) @ rot @ Matrix.Translation((-cx, -cy, -SLAB_TOP))
        mat = "Concrete_Dark" if rng.random() < 0.12 else "Concrete"
        prism(b, pts, DIRT_TOP - 0.02, SLAB_TOP + rng.uniform(-0.006, 0.006), mat, m)

    # crater floor (darker dirt disc slightly above the dirt block)
    ring = [(CRATER_A * 1.05 * math.cos(a), CRATER_B * 1.05 * math.sin(a))
            for a in [k * 2 * math.pi / 14 for k in range(14)]]
    b.poly([(x, y, DIRT_TOP + 0.004) for x, y in ring], "Rubble")

    # rubble: big chunks in the crater around the crate, small debris on the slabs
    for k in range(20):
        a = k / 20 * 2 * math.pi + rng.uniform(-0.15, 0.15)
        rr = rng.uniform(0.82, 1.0)
        x, y = CRATER_A * rr * math.cos(a), CRATER_B * rr * math.sin(a)
        r = rng.uniform(0.07, 0.13)
        b.rock(r, (x, y, DIRT_TOP + r * 0.35), "Rubble" if k % 3 else "Concrete_Dark",
               squash=0.65, subdiv=1 if r > 0.105 else 0, rng=rng, rot_z=rng.uniform(0, 360))
    for _ in range(22):
        while True:
            x, y = rng.uniform(-0.92, 0.92), rng.uniform(-0.92, 0.92)
            if crater_r(x, y) > 1.15:
                break
        r = rng.uniform(0.025, 0.06)
        b.rock(r, (x, y, SLAB_TOP + r * 0.3), "Concrete" if rng.random() < 0.5 else "Concrete_Dark",
               squash=0.6, subdiv=0, rng=rng, rot_z=rng.uniform(0, 360))
    return b.finish(parent=root, collection=coll)


# --------------------------------------------------------------------------
# Crate
# --------------------------------------------------------------------------

def u_handle(b, base, axis_out, axis_span, span, reach, radius=0.02, mat="Accent_Orange"):
    """U-shaped grab handle: two legs out along axis_out, bar along axis_span."""
    base, o, s = Vector(base), Vector(axis_out), Vector(axis_span)
    p0 = base - s * span / 2
    p1 = base + s * span / 2
    b.rod([p0, p0 + o * reach, p1 + o * reach, p1], radius, mat, seg=6)
    for p in (p0, p1):
        b.box((0.06, 0.06, 0.06), p - o * 0.005, "Metal_Dark")


def band_frame(b, z, h, w=0.03, mat="Shell_GreyDk"):
    """Rectangular band hugging the outside of the walls (keeps the inside open)."""
    o = 0.006
    for sy in (-1, 1):
        b.box((L + 2 * o, w, h), (0, sy * (D / 2 - w / 2 + o), z), mat, bevel=0.006)
    for sx in (-1, 1):
        b.box((w, D + 2 * o - 2 * w, h), (sx * (L / 2 - w / 2 + o), 0, z), mat, bevel=0.006)


def build_crate_body(mats, parent, coll):
    b = Builder("Crate_Body", mats)
    zc, hz = (Z0 + H) / 2, H - Z0
    # skids
    for y in (-0.24, 0.24):
        b.box((L - 0.16, 0.12, Z0 + 0.01), (0, y, (Z0 + 0.01) / 2), "Metal_Dark", bevel=0.01)
    # floor + walls
    b.box((L - 0.02, D - 0.02, 0.05), (0, 0, Z0 + 0.025), "Shell_Grey", bevel=0.01)
    b.box((L, T, hz), (0, -D / 2 + T / 2, zc), "Shell_Grey", bevel=0.018)
    b.box((L, T, hz), (0, D / 2 - T / 2, zc), "Shell_Grey", bevel=0.018)
    b.box((T, D - 2 * T, hz), (-L / 2 + T / 2, 0, zc), "Shell_Grey", bevel=0.018)
    b.box((T, D - 2 * T, hz), (L / 2 - T / 2, 0, zc), "Shell_Grey", bevel=0.018)
    # interior liner
    b.box((L - 2 * T, D - 2 * T, 0.006), (0, 0, Z0 + 0.053), "Interior_Dark")
    for sx in (-1, 1):
        b.box((0.006, D - 2 * T, hz - 0.06), (sx * (L / 2 - T - 0.003), 0, zc + 0.02), "Interior_Dark")
    for sy in (-1, 1):
        b.box((L - 2 * T, 0.006, hz - 0.06), (0, sy * (D / 2 - T - 0.003), zc + 0.02), "Interior_Dark")
    # rim band (darker lip where the lid meets the body) + lower kick band, as open frames
    band_frame(b, H - 0.02, 0.035)
    band_frame(b, Z0 + 0.04, 0.06)
    # orange corner bumpers
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.box((0.13, 0.13, hz + 0.02), (sx * (L / 2 - 0.035), sy * (D / 2 - 0.035), zc), "Accent_Orange",
                  bevel=0.025)
    # front / back panels: recessed plate + orange straps + stripe
    for sy, face in ((-1, "front"), (1, "back")):
        y = sy * (D / 2 + 0.006)
        b.box((0.56, 0.012, 0.24), (0, y, 0.27), "Shell_GreyDk", bevel=0.004)
        b.box((0.50, 0.014, 0.025), (0, y + sy * 0.002, 0.21), "Accent_Orange")
        for x in (-0.44, 0.44):
            b.box((0.09, 0.014, hz - 0.08), (x, y, zc - 0.01), "Accent_Orange", bevel=0.004)
        for x in (-0.24, 0.24):
            for z in (0.17, 0.37):
                b.cyl(0.012, 0.014, (x, y + sy * 0.006, z), "Metal_Dark", rot=(90, 0, 0), seg=6)
    # front latches (plates; the hooks live on the lid)
    for x in (-0.2, 0.2):
        b.box((0.10, 0.025, 0.11), (x, -D / 2 - 0.012, H - 0.07), "Metal_Light", bevel=0.006)
        b.box((0.06, 0.03, 0.03), (x, -D / 2 - 0.02, H - 0.1), "Metal_Dark")
    # status light on the front panel
    b.box((0.10, 0.016, 0.03), (0, -D / 2 - 0.012, 0.33), "Glow_Status", bevel=0.004)
    b.box((0.14, 0.012, 0.06), (0, -D / 2 - 0.008, 0.33), "Metal_Dark", bevel=0.004)
    # side handles (X ends) and big front U brackets
    for sx in (-1, 1):
        u_handle(b, (sx * (L / 2 + 0.005), 0, 0.32), (sx, 0, 0), (0, 1, 0), 0.32, 0.07)
        b.box((0.012, 0.36, 0.09), (sx * (L / 2 + 0.006), 0, 0.2), "Accent_Orange", bevel=0.004)
    for x in (-0.44, 0.44):
        u_handle(b, (x, -D / 2 - 0.01, 0.27), (0, -1, 0), (0, 0, 1), 0.2, 0.06, radius=0.018)
    return b.finish(parent=parent, collection=coll)


def build_lid(mats, pivot, coll):
    b = Builder("Lid", mats)
    # lid local space: hinge at origin (back top edge), lid extends to -Y
    yc = -D / 2
    b.box((L, D, LH), (0, yc, LH / 2), "Shell_Grey", bevel=0.07)
    b.box((L - 0.12, D - 0.12, 0.006), (0, yc, -0.003), "Interior_Dark")
    # raised top panel + orange pinstripes
    b.box((L - 0.34, D - 0.26, 0.035), (0, yc, LH + 0.008), "Shell_Grey", bevel=0.015)
    for dy in (-0.11, 0.11):
        b.box((L - 0.46, 0.03, 0.006), (0, yc + dy, LH + 0.027), "Accent_Orange")
    # orange straps wrapping over the lid
    for x in (-0.44, 0.44):
        b.box((0.09, D - 0.04, 0.05), (x, yc, LH + 0.004), "Accent_Orange", bevel=0.006)
        b.box((0.09, 0.014, LH - 0.07), (x, -D - 0.006, LH / 2 - 0.005), "Accent_Orange", bevel=0.004)
        b.box((0.09, 0.014, LH - 0.07), (x, 0.006, LH / 2 - 0.005), "Accent_Orange", bevel=0.004)
    # corner caps
    for sx in (-1, 1):
        for y in (-D + 0.035, -0.035):
            b.box((0.13, 0.13, LH - 0.02), (sx * (L / 2 - 0.035), y, LH / 2 - 0.005), "Accent_Orange",
                  bevel=0.03)
    # latch hooks
    for x in (-0.2, 0.2):
        b.box((0.08, 0.03, 0.08), (x, -D - 0.012, 0.03), "Metal_Light", bevel=0.006)
    # hinges at the back
    for x in (-0.3, 0.3):
        b.cyl(0.022, 0.16, (x, 0.012, 0.0), "Metal_Dark", rot=(0, 90, 0), seg=6)
    # top bolts
    for sx in (-1, 1):
        for y in (yc - 0.2, yc + 0.2):
            b.cyl(0.014, 0.012, (sx * 0.5, y, LH + 0.006), "Metal_Dark", seg=6)
    return b.finish(parent=pivot, collection=coll)


def build_loot(mats, parent, coll):
    b = Builder("Loot", mats)
    zf = Z0 + 0.056
    # supply case
    with b.frame(trs((-0.26, 0.02, zf), (0, 0, 8), (1, 1, 1))):
        b.box((0.42, 0.30, 0.20), (0, 0, 0.10), "Shell_GreyDk", bevel=0.015)
        b.box((0.43, 0.31, 0.03), (0, 0, 0.12), "Accent_Orange")
        b.box((0.12, 0.03, 0.025), (0, 0, 0.215), "Metal_Dark")
    # energy cells
    for i, (x, y) in enumerate(((0.12, -0.12), (0.22, -0.12), (0.17, 0.06))):
        b.cyl(0.045, 0.24, (x, y, zf + 0.12), "Metal_Light", seg=8)
        b.cyl(0.047, 0.12, (x, y, zf + 0.12), "Glow_Loot", seg=8)
    # small box
    b.box((0.18, 0.16, 0.12), (0.42, 0.08, zf + 0.06), "Accent_Orange", rot=(0, 0, -14), bevel=0.01)
    return b.finish(parent=parent, collection=coll)


def lid_action(pivot):
    pivot.rotation_mode = "XYZ"
    pivot.rotation_euler = (0, 0, 0)
    pivot.keyframe_insert("rotation_euler", index=0, frame=1)
    pivot.rotation_euler = (math.radians(LID_OPEN_DEG), 0, 0)
    pivot.keyframe_insert("rotation_euler", index=0, frame=24)
    pivot.animation_data.action.name = "Lid_Open"
    pivot.rotation_euler = (0, 0, 0)


def prepare_scene():
    if bpy.app.background and bpy.context.window is None:
        scene = bpy.context.scene
        for ob in list(scene.objects):
            bpy.data.objects.remove(ob, do_unlink=True)
        scene.name = SCENE_NAME
    else:
        old = bpy.data.scenes.get(SCENE_NAME)
        if old:
            for ob in list(old.objects):
                bpy.data.objects.remove(ob, do_unlink=True)
            bpy.data.scenes.remove(old)
        scene = bpy.data.scenes.new(SCENE_NAME)
        bpy.context.window.scene = scene
    scene.unit_settings.system = "METRIC"
    scene.frame_start, scene.frame_end = 1, 24
    return scene


def build():
    scene = prepare_scene()
    coll = scene.collection
    mats = build_materials()
    root = new_empty("SupplyCrate", collection=coll)
    build_base(mats, root, coll)
    crate = new_empty("Crate", (0.0, 0.02, DIRT_TOP + 0.01), (1.5, -2.0, 6.0), root, coll)
    build_crate_body(mats, crate, coll)
    pivot = new_empty("LidPivot", (0, D / 2, H), parent=crate, collection=coll)
    build_lid(mats, pivot, coll)
    build_loot(mats, crate, coll)
    lid_action(pivot)
    scene.frame_set(1)
    tris = count_triangles(scene)
    print(f"[supply_crate] triangles: {tris} (budget {TRI_BUDGET})")
    if tris > TRI_BUDGET:
        print("[supply_crate] WARNING: over triangle budget")
    return scene


# --------------------------------------------------------------------------
# States, export, preview
# --------------------------------------------------------------------------

def set_state(state, scene=None):
    """'closed' (item available), 'open' (lid open, item visible), 'empty' (collected)."""
    scene = scene or bpy.context.scene
    lit = state != "empty"
    for name in GLOW_MATERIALS:
        bsdf = bpy.data.materials[name].node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Emission Strength"].default_value = MATERIALS[name][4] if lit else 0.0
        bsdf.inputs["Base Color"].default_value = _lin(MATERIALS[name][0] if lit else "#2A3440")
    scene.frame_set(1 if state == "closed" else 24)
    loot = scene.objects["Loot"]
    loot.hide_render = loot.hide_viewport = state == "empty"


def export_glb(path=OUTPUT_GLB):
    set_state("closed")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_active_scene=True,
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=False,
        export_materials="EXPORT",
    )
    print(f"[supply_crate] exported {path} ({os.path.getsize(path) // 1024} KB)")


def setup_preview(scene):
    cam_data = bpy.data.cameras.new("Preview_Cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 3.2
    cam = bpy.data.objects.new("Preview_Cam", cam_data)
    scene.collection.objects.link(cam)
    target = Vector((0.0, 0.0, 0.5))
    cam.location = target + Vector((1.0, -1.0, 0.95)).normalized() * 8
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam

    sun = bpy.data.objects.new("Preview_Sun", bpy.data.lights.new("Preview_Sun", "SUN"))
    sun.data.energy = 3.4
    sun.data.angle = math.radians(6)
    sun.rotation_euler = (math.radians(48), math.radians(12), math.radians(-30))
    scene.collection.objects.link(sun)

    world = scene.world or bpy.data.worlds.new("Preview_World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = _lin("#1E242B")
    bg.inputs["Strength"].default_value = 1.8

    scene.render.engine = "CYCLES"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.resolution_x = scene.render.resolution_y = 900
    scene.view_settings.view_transform = "AgX"


def render_previews():
    scene = bpy.context.scene
    setup_preview(scene)
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    for state in ("closed", "open", "empty"):
        set_state(state)
        scene.render.filepath = os.path.join(PREVIEW_DIR, f"_preview_supply_crate_{state}.png")
        bpy.ops.render.render(write_still=True)
        print(f"[supply_crate] preview {scene.render.filepath}")
    set_state("closed")
    for name in ("Preview_Cam", "Preview_Sun"):
        ob = scene.objects.get(name)
        if ob:
            bpy.data.objects.remove(ob, do_unlink=True)


def main(argv):
    build()
    if "--render" in argv:
        render_previews()
    if "--export" in argv:
        export_glb()
        os.makedirs(os.path.dirname(OUTPUT_BLEND), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=OUTPUT_BLEND, copy=True)


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    main(args)
