"""
bake_player_glb.py
Combine the Mixamo-rigged player T-pose with each animation FBX into a single
GLB with named clips embedded.

Inputs:  blender/rigged/player.fbx          (T-pose, full skin)
         blender/rigged/player-rigged-Breathing-Idle.fbx
         blender/rigged/player-rigged-Slow-Run.fbx
         blender/rigged/player-rigged-fallflat.fbx
         blender/rigged/player-rigged-talking.fbx

Output:  src/assets/characters/player/player-main.glb        (overwritten)
         src/assets/characters/player/player-main.glb.bak    (auto-backup)

Per-clip post-processing:
  - Action renamed to clean label (Idle, Run, Fall, Talk)
  - Horizontal hips translation zeroed -> clip plays in-place; Rapier handles
    actual world translation in code

Each action is pushed to its own NLA track so the glTF exporter preserves them
all. Idle is set as the active action so the model has a default pose at load.
"""
import bpy
import os

PROJECT_ROOT = "/Users/rochatales/Automations/game-workplace"
RIGGED_DIR   = os.path.join(PROJECT_ROOT, "blender/rigged")

MASTER_FBX = os.path.join(RIGGED_DIR, "player.fbx")  # Mixamo T-pose with skin

CLIPS = [
    ("Idle", "player-rigged-Breathing-Idle.fbx"),
    ("Run",  "player-rigged-Slow-Run.fbx"),
    ("Fall", "player-rigged-fallflat.fbx"),
    ("Talk", "player-rigged-talking.fbx"),
]

OUTPUT_GLB = os.path.join(PROJECT_ROOT, "src/assets/characters/player/player-main.glb")
BACKUP_GLB = OUTPUT_GLB + ".bak"


def clear_scene():
    if bpy.context.scene.objects:
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete(use_global=False)
    # Hard-purge actions: even fake-user'd ones from previous runs must go,
    # otherwise the glTF exporter ships every leftover action.
    for action in list(bpy.data.actions):
        action.use_fake_user = False
        bpy.data.actions.remove(action, do_unlink=True)
    for blk in (bpy.data.armatures, bpy.data.meshes, bpy.data.materials,
                bpy.data.images, bpy.data.cameras, bpy.data.lights):
        for item in list(blk):
            if item.users == 0:
                blk.remove(item)


def find_armature():
    return next((o for o in bpy.context.scene.objects if o.type == "ARMATURE"), None)


def find_mesh():
    return next((o for o in bpy.context.scene.objects if o.type == "MESH"), None)


def iter_action_fcurves(action):
    """Walk the slotted-action tree (Blender 4.4+/5.x) to yield every fcurve."""
    for layer in action.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                for fc in cb.fcurves:
                    yield fc


def strip_horizontal_hips_translation(action):
    """Zero X and Y components of mixamorig:Hips location keyframes.
    Keeps Z (vertical) so falls / jumps still drop the body."""
    target_path = 'pose.bones["mixamorig:Hips"].location'
    for fc in list(iter_action_fcurves(action)):
        if fc.data_path == target_path and fc.array_index in (0, 1):
            for kp in fc.keyframe_points:
                kp.co[1] = 0.0
                kp.handle_left[1] = 0.0
                kp.handle_right[1] = 0.0


def import_action_from_fbx(anim_fbx_path):
    """Import an animation FBX, pull out its action, delete the imported
    objects, return the orphan-but-fake-user'd action."""
    pre = set(bpy.context.scene.objects)
    bpy.ops.import_scene.fbx(filepath=anim_fbx_path)
    new_objs = [o for o in bpy.context.scene.objects if o not in pre]

    src_arm = next((o for o in new_objs if o.type == "ARMATURE"), None)
    action = None
    if src_arm and src_arm.animation_data and src_arm.animation_data.action:
        action = src_arm.animation_data.action
        # Detach so we can safely delete src_arm
        src_arm.animation_data.action = None
        action.use_fake_user = True

    bpy.ops.object.select_all(action="DESELECT")
    for o in new_objs:
        o.select_set(True)
    bpy.ops.object.delete(use_global=False)

    return action


def push_action_to_nla(arm_obj, label, action):
    """Each action lives on its own NLA track so the glTF exporter
    sees them all as separate animations."""
    track = arm_obj.animation_data.nla_tracks.new()
    track.name = label
    track.strips.new(name=label,
                     start=int(action.frame_range[0]),
                     action=action)


def main():
    clear_scene()

    if not os.path.exists(MASTER_FBX):
        return {"status": "error", "msg": f"master FBX missing: {MASTER_FBX}"}

    bpy.ops.import_scene.fbx(filepath=MASTER_FBX)
    master_arm = find_armature()
    master_mesh = find_mesh()
    if not master_arm or not master_mesh:
        return {"status": "error", "msg": "master rig has no armature or mesh"}

    master_arm.name  = "PlayerArmature"
    master_mesh.name = "PlayerMesh"

    if not master_arm.animation_data:
        master_arm.animation_data_create()

    # If master came in with its own (T-pose) action, drop it before we add ours
    master_arm.animation_data.action = None

    baked = []
    for label, fname in CLIPS:
        path = os.path.join(RIGGED_DIR, fname)
        if not os.path.exists(path):
            baked.append({"label": label, "status": "missing"})
            continue
        action = import_action_from_fbx(path)
        if not action:
            baked.append({"label": label, "status": "no_action"})
            continue
        action.name = label
        strip_horizontal_hips_translation(action)
        push_action_to_nla(master_arm, label, action)
        baked.append({
            "label": label,
            "status": "ok",
            "frames": int(action.frame_range[1] - action.frame_range[0]) + 1,
            "duration_s": round((int(action.frame_range[1] - action.frame_range[0]) + 1) / 30.0, 2),
        })

    # Default visible pose: Idle
    idle = bpy.data.actions.get("Idle")
    if idle:
        master_arm.animation_data.action = idle

    # Final purge: remove any action whose name isn't in our clip labels.
    # The master FBX brings in a leftover Mixamo T-pose action that would
    # otherwise leak into the GLB as a noisy 'Armature|mixamo...' clip.
    keep = {label for label, _ in CLIPS}
    for action in list(bpy.data.actions):
        if action.name not in keep:
            action.use_fake_user = False
            try:
                bpy.data.actions.remove(action, do_unlink=True)
            except RuntimeError:
                pass

    # Backup current GLB before overwrite
    if os.path.exists(OUTPUT_GLB):
        os.replace(OUTPUT_GLB, BACKUP_GLB)

    bpy.ops.object.select_all(action="DESELECT")
    master_arm.select_set(True)
    master_mesh.select_set(True)
    bpy.context.view_layer.objects.active = master_arm

    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_GLB,
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_skins=True,
        export_apply=False,
        export_yup=True,
    )

    return {
        "status": "ok",
        "output": OUTPUT_GLB,
        "output_size_mb": round(os.path.getsize(OUTPUT_GLB) / 1024 / 1024, 2),
        "backup_kept": os.path.exists(BACKUP_GLB),
        "clips": baked,
    }


if __name__ == "__main__":
    print(main())
