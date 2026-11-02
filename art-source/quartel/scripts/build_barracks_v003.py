"""Opção 2 escolhida pelo autor: escala uniforme 0,75×, incorporada à geometria.
Blender -b --factory-startup -P art-source/quartel/scripts/build_barracks_v003.py -- [--render]
Lê v002, grava apenas v003. Raiz final 1×; posição/orientação do mapa ficam para runtime.
"""
import bpy, sys, json, math, hashlib
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;OUT=HERE.parent;S=.75
source=OUT/'blend/barracks-v002.blend';source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.name='Quartel_v003';scene.frame_set(1)
root=scene.objects['Barracks'];assert all(o.parent==root for o in scene.objects if o!=root)
assert tuple(root.scale)==(1,1,1) and root.location.length==0
for o in root.children:
    o.location*=S
    if o.type=='MESH':
        for v in o.data.vertices:v.co*=S
        o.data.update()
    else:o.scale*=S
    for key in ['size_m','center_m']:
        if key in o:o[key]=[v*S for v in o[key]]
    for key in ['corner_radius','rise','run']:
        if key in o:o[key]*=S
# Regrava ações equivalentes, com deslocamentos em metros já escalados.
for name,delta,action in [('EntranceDoor',(0,-1.45*S,0),'Door_Open'),('EntranceDoor_S',(1.45*S,0,0),'Door_S_Open')]:
    o=scene.objects[name];o.animation_data_clear()
    for orphan in list(bpy.data.actions):
        if orphan.users==0:bpy.data.actions.remove(orphan)
    o.location=(0,0,0);o.keyframe_insert('location',frame=1)
    o.location=delta;o.keyframe_insert('location',frame=20);o.animation_data.action.name=action
scene.frame_set(1);root['variante']='v003 — opção 2, escala 0,75× escolhida pelo autor'
root['scale_applied']=True;root['baked_scale']=S;root['source_v002_sha256']=source_hash
root['placement_x']=10.5;root['placement_z']=0.;root['placement_rotation_y_deg']=-90.
bpy.context.view_layer.update()
for action in list(bpy.data.actions):
    if action.users==0:bpy.data.actions.remove(action)
bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
for o in root.children:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'export/barracks-v003.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_cameras=False,export_lights=False,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=False)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blend/barracks-v003.blend'))
(OUT/'notas/build-v003.json').write_text(json.dumps({'variant':'v003','chosenOption':'2 (C da planta v002)','chosenBy':'autor, 26/10/2026','sourceV002SHA256':source_hash,'bakedScale':S,'rootScale':[1,1,1],'placement':{'x':10.5,'z':0,'rotationYDeg':-90,'appliedToAsset':False},'runtime':False},indent=2,ensure_ascii=False)+'\n')
assert hashlib.sha256(source.read_bytes()).hexdigest()==source_hash
if '--render' in sys.argv:
    sys.path.insert(0,str(HERE));sys.path.insert(0,str(OUT.parent/'armario-emergencia/scripts'))
    import build_barracks as src
    cam=src.setup_preview(scene);scene.cycles.samples=32
    scene.render.resolution_x=1440;scene.render.resolution_percentage=100
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));bpy.context.object.name='StudioFloor'
    roof=scene.objects['Building_Roof']
    for name,cut,d,target,width in [('frente',False,(-1,0,0),(-.3,-.6,1.575),10.875),('tres-quartos',False,(-1,-1,.8),(-.375,-.3,.975),14.25),('superior-sem-teto',True,(0,0,1),(-.375,-.6,.375),14.25)]:
        scene.render.resolution_y=900 if name=='frente' else 1080
        roof.hide_render=cut;src.aim(cam,d,target,width)
        for ln in ['Preview_Warm1','Preview_Warm2']:
            scene.objects[ln].location*=S if name=='frente' else 1
            scene.objects[ln].data.energy=250 if cut else 0
        scene.render.filepath=str(OUT/'renders'/('v003-'+name+'.png'));bpy.ops.render.render(write_still=True)
