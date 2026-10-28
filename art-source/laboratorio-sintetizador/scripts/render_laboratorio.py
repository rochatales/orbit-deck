#!/usr/bin/env python3
"""
Render validation sheets for Laboratory with Diamond Synthesis Machine (Horda Survivor):
- 01_front.png, 02_side.png, 03_back.png, 04_3q.png
- wf_01_front.png, wf_02_side.png, wf_03_back.png, wf_04_3q.png
- anim_Idle_Ready.png, anim_Synthesizing.png, anim_Drawer_Dispense.png, anim_Standby_PowerDown.png
- jogo_zoom_maximo.png
- Composite sheets:
  - folha_turnaround_4_vistas.png
  - folha_turnaround_2x2_vistas.png
  - folha_wireframe_4_vistas.png
  - folha_4_animacoes_3d.png
  - folha_comparacao_referencia_x_3d.png
"""

import math
import os
import bpy
import numpy as np
from mathutils import Vector

ROOT = "/Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador"
BLEND_PATH = os.path.join(ROOT, "blend", "laboratorio_sintetizador_v001.blend")
REF_IMG_PATH = os.path.join(ROOT, "referencia", "laboratorio_estudo.jpg")
RENDERS_DIR = os.path.join(ROOT, "renders")
os.makedirs(RENDERS_DIR, exist_ok=True)


def point_camera_at(cam_obj, loc, target):
    cam_obj.location = loc
    direction = Vector(target) - Vector(loc)
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam_obj.rotation_euler = rot_quat.to_euler()


def build_wireframe_mat():
    m = bpy.data.materials.new("WireOverlay")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    wf = nt.nodes.new("ShaderNodeWireframe")
    wf.use_pixel_size = True
    wf.inputs["Size"].default_value = 1.2
    em_bg = nt.nodes.new("ShaderNodeBsdfPrincipled")
    em_bg.inputs["Base Color"].default_value = (0.22, 0.24, 0.28, 1.0)
    em_bg.inputs["Metallic"].default_value = 0.45
    em_bg.inputs["Roughness"].default_value = 0.50
    em_line = nt.nodes.new("ShaderNodeEmission")
    em_line.inputs["Color"].default_value = (0.05, 0.95, 1.00, 1.0)  # vibrant cyan electric wire
    em_line.inputs["Strength"].default_value = 3.5
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(wf.outputs["Fac"], mix.inputs["Fac"])
    nt.links.new(em_bg.outputs["BSDF"], mix.inputs[1])
    nt.links.new(em_line.outputs["Emission"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return m


def setup_lights_and_studio():
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 48
    scene.render.film_transparent = False

    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        # Clean soft studio ambient matching concept presentation board
        bg.inputs["Color"].default_value = (0.76, 0.75, 0.72, 1.0)
        bg.inputs["Strength"].default_value = 0.65

    # 1. Main ceiling fluorescent wash array
    ceil_data = bpy.data.lights.new("CeilingWashLight", type='AREA')
    ceil_data.energy = 280.0
    ceil_data.size = 12.0
    ceil_data.color = (0.94, 0.96, 1.00)
    ceil_obj = bpy.data.objects.new("CeilingWashLight", ceil_data)
    bpy.context.collection.objects.link(ceil_obj)
    point_camera_at(ceil_obj, (0.0, 0.0, 7.5), (0.0, 0.0, 1.2))

    # 2. Main isometric key light
    key_data = bpy.data.lights.new("LabKeyLight", type='AREA')
    key_data.energy = 280.0
    key_data.size = 8.0
    key_data.color = (0.96, 0.98, 1.00)
    key_obj = bpy.data.objects.new("LabKeyLight", key_data)
    bpy.context.collection.objects.link(key_obj)
    point_camera_at(key_obj, (-6.0, -9.0, 9.5), (0.0, 0.0, 1.35))

    # 3. Secondary fill light from opposite quadrant
    fill_data = bpy.data.lights.new("LabFillLight", type='AREA')
    fill_data.energy = 160.0
    fill_data.size = 8.0
    fill_data.color = (0.92, 0.90, 0.86)
    fill_obj = bpy.data.objects.new("LabFillLight", fill_data)
    bpy.context.collection.objects.link(fill_obj)
    point_camera_at(fill_obj, (8.0, -5.0, 8.0), (0.0, 0.0, 1.35))

    # 4. Warm window glow light (North wall window)
    win_data = bpy.data.lights.new("WarmWindowFill", type='AREA')
    win_data.energy = 90.0
    win_data.size = 3.2
    win_data.color = (1.00, 0.65, 0.18)
    win_obj = bpy.data.objects.new("WarmWindowFill", win_data)
    bpy.context.collection.objects.link(win_obj)
    point_camera_at(win_obj, (-1.3, 4.8, 2.3), (-1.3, 2.0, 1.0))

    # 5. Brilliant cyan electric point light inside synthesis chamber
    core_light_data = bpy.data.lights.new("ChamberCoreLight", type='POINT')
    core_light_data.energy = 45.0
    core_light_data.shadow_soft_size = 0.15
    core_light_data.color = (0.05, 0.95, 1.00)
    core_light_obj = bpy.data.objects.new("ChamberCoreLight", core_light_data)
    core_light_obj.location = (0.0, 0.0, 1.45)
    bpy.context.collection.objects.link(core_light_obj)

    # Ambient ground contact shadow plate
    bpy.ops.mesh.primitive_plane_add(size=36.0, location=(0.0, 0.0, -0.42))
    floor = bpy.context.active_object
    floor.name = "GroundContactPlate"
    m = bpy.data.materials.new("GroundMat")
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.74, 0.73, 0.70, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.90
    floor.data.materials.append(m)


def load_rgba(path):
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    arr = np.array(img.pixels[:], dtype=np.float32).reshape((h, w, 4))
    bpy.data.images.remove(img)
    return arr


def save_rgba(arr, path):
    h, w, _ = arr.shape
    img = bpy.data.images.new("CompTemp", width=w, height=h, alpha=True)
    img.pixels[:] = arr.reshape(-1).tolist()
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)


def resize_nn(arr, new_h, new_w):
    h, w, c = arr.shape
    ys = np.clip((np.arange(new_h) * h / new_h).astype(int), 0, h - 1)
    xs = np.clip((np.arange(new_w) * w / new_w).astype(int), 0, w - 1)
    return arr[ys[:, None], xs[None, :], :]


def make_grid(paths, rows, cols, cell_w=640, cell_h=640, sep=6):
    total_w = cols * cell_w + (cols - 1) * sep
    total_h = rows * cell_h + (rows - 1) * sep
    canvas = np.zeros((total_h, total_w, 4), dtype=np.float32)
    canvas[:, :, 0:3] = 0.14
    canvas[:, :, 3] = 1.0
    for idx, p in enumerate(paths):
        r = idx // cols
        c = idx % cols
        inv_r = (rows - 1) - r
        tile = resize_nn(load_rgba(p), cell_h, cell_w)
        y0 = inv_r * (cell_h + sep)
        x0 = c * (cell_w + sep)
        canvas[y0:y0 + cell_h, x0:x0 + cell_w, :] = tile
    return canvas


def main():
    bpy.ops.wm.open_mainfile(filepath=BLEND_PATH)
    setup_lights_and_studio()

    scene = bpy.context.scene
    mesh_obj = bpy.data.objects["LaboratorySynthesizerMesh"]
    arm_obj = bpy.data.objects["LaboratorySynthesizerArmature"]

    cam_data = bpy.data.cameras.new("RenderCam")
    cam_data.lens = 42.0
    cam_obj = bpy.data.objects.new("RenderCam", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    target = (0.0, 0.0, 1.25)
    # Camera locations tailored to the 14x10m lab with 90-degree corner cutaway
    views = [
        # 01_front: Looking North through the low cutaway South wall & service door
        ("01_front.png", (0.0, -11.5, 7.8), target),
        # 02_side: Looking East through the low cutaway West wall & airlock door
        ("02_side.png",  (-12.8, 0.0, 7.5), target),
        # 03_back: Elevated high view from North-East looking down over the room
        ("03_back.png",  (8.5, 9.5, 9.8), target),
        # 04_3q: The classic 90-degree corner cutaway isometric view (South-West to North-East) matching reference!
        ("04_3q.png",    (-9.5, -9.8, 8.6), target),
    ]

    scene.render.resolution_x = 768
    scene.render.resolution_y = 768

    for tr in arm_obj.animation_data.nla_tracks:
        tr.mute = True
    arm_obj.animation_data.action = bpy.data.actions["Idle_Ready"]
    scene.frame_set(1)

    pbr_paths = []
    for fname, loc, tgt in views:
        point_camera_at(cam_obj, loc, tgt)
        out_p = os.path.join(RENDERS_DIR, fname)
        scene.render.filepath = out_p
        bpy.ops.render.render(write_still=True)
        pbr_paths.append(out_p)

    # Wireframe renders
    orig_mat = mesh_obj.data.materials[0]
    wf_mat = build_wireframe_mat()
    mesh_obj.data.materials[0] = wf_mat
    scene.cycles.samples = 24

    wf_paths = []
    for fname, loc, tgt in views:
        point_camera_at(cam_obj, loc, tgt)
        wf_name = "wf_" + fname
        out_p = os.path.join(RENDERS_DIR, wf_name)
        scene.render.filepath = out_p
        bpy.ops.render.render(write_still=True)
        wf_paths.append(out_p)

    mesh_obj.data.materials[0] = orig_mat
    scene.cycles.samples = 36

    # 4 Animation frames in the 3/4 cutaway perspective
    point_camera_at(cam_obj, (-9.5, -9.8, 8.6), target)
    anim_specs = [
        ("anim_Idle_Ready.png", "Idle_Ready", 16),
        ("anim_Synthesizing.png", "Synthesizing", 24),
        ("anim_Drawer_Dispense.png", "Drawer_Dispense", 18),
        ("anim_Standby_PowerDown.png", "Standby_PowerDown", 15),
    ]
    anim_paths = []
    for fname, act_name, frm in anim_specs:
        arm_obj.animation_data.action = bpy.data.actions[act_name]
        scene.frame_set(frm)
        out_p = os.path.join(RENDERS_DIR, fname)
        scene.render.filepath = out_p
        bpy.ops.render.render(write_still=True)
        anim_paths.append(out_p)

    # Game max zoom perspective (Isometric camera angle matching in-game view of Horda Survivor)
    arm_obj.animation_data.action = bpy.data.actions["Idle_Ready"]
    scene.frame_set(1)
    cam_data.lens = 48.0
    point_camera_at(cam_obj, (-7.2, -8.4, 6.8), (0.0, 0.0, 1.35))
    scene.render.resolution_x = 960
    scene.render.resolution_y = 800
    scene.cycles.samples = 54
    zoom_path = os.path.join(RENDERS_DIR, "jogo_zoom_maximo.png")
    scene.render.filepath = zoom_path
    bpy.ops.render.render(write_still=True)

    # Composite sheets
    save_rgba(make_grid(pbr_paths, 1, 4, 600, 600), os.path.join(RENDERS_DIR, "folha_turnaround_4_vistas.png"))
    save_rgba(make_grid(pbr_paths, 2, 2, 680, 680), os.path.join(RENDERS_DIR, "folha_turnaround_2x2_vistas.png"))
    save_rgba(make_grid(wf_paths, 2, 2, 680, 680), os.path.join(RENDERS_DIR, "folha_wireframe_4_vistas.png"))
    save_rgba(make_grid(anim_paths, 2, 2, 680, 680), os.path.join(RENDERS_DIR, "folha_4_animacoes_3d.png"))

    if os.path.exists(REF_IMG_PATH):
        comp = make_grid([REF_IMG_PATH, pbr_paths[3]], 1, 2, 768, 600)
        save_rgba(comp, os.path.join(RENDERS_DIR, "folha_comparacao_referencia_x_3d.png"))

    print("LAB_SYNTHESIZER_RENDERS_OK")


if __name__ == "__main__":
    main()
