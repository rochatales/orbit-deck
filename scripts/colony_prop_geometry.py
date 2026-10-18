"""Correção derivada de superfícies sobrepostas; não salva a fonte Blender.

União exata de sólidos dos props identificados na auditoria. Remove faces
internas/coplananres preservando silhueta, materiais, transform e identidade.
"""
import bpy


def components(mesh):
    neighbors = {v.index: set() for v in mesh.vertices}
    for edge in mesh.edges:
        a, b = edge.vertices
        neighbors[a].add(b)
        neighbors[b].add(a)
    seen = set()
    for start in neighbors:
        if start in seen:
            continue
        pending, ids = [start], set()
        while pending:
            vertex = pending.pop()
            if vertex in ids:
                continue
            ids.add(vertex)
            pending.extend(neighbors[vertex] - ids)
        seen.update(ids)
        yield ids


def union_prop(obj, layer):
    original = obj.data
    solids = []
    for ids in components(original):
        indices = sorted(ids)
        remap = {old: new for new, old in enumerate(indices)}
        polygons = [p for p in original.polygons if p.vertices[0] in ids]
        mesh = bpy.data.meshes.new('QA_solido')
        mesh.from_pydata([original.vertices[i].co for i in indices], [],
                         [[remap[i] for i in p.vertices] for p in polygons])
        for material in original.materials:
            mesh.materials.append(material)
        for face, source in zip(mesh.polygons, polygons):
            face.material_index = source.material_index
            face.use_smooth = source.use_smooth
        solid = bpy.data.objects.new('QA_solido', mesh)
        bpy.context.scene.collection.objects.link(solid)
        solids.append(solid)
    target = solids[0]
    for operand in solids[1:]:
        modifier = target.modifiers.new('Uniao_sem_coplanaridade', 'BOOLEAN')
        modifier.operation = 'UNION'
        modifier.solver = 'EXACT'
        modifier.object = operand
        with bpy.context.temp_override(view_layer=layer, object=target, active_object=target):
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        bpy.data.objects.remove(operand, do_unlink=True)
    result = target.data
    result.name = original.name + "_SemSobreposicao"
    obj.data = result
    bpy.data.objects.remove(target, do_unlink=True)
    return result


def repair_prop_geometry(objects, layer):
    exact = {'PROP_Lab_VolumeTecnico_Provisorio', 'PROP_Hub_Mobiliario',
             'PROP_EDEN_Mobiliario', 'PROP_Deposito_Mobiliario'}
    prefixes = ('PROP_Lab_Caixa.', 'PROP_Lab_Balizador.', 'PROP_Balizador.',
                'PROP_Pavilhao_Balizador.', 'PROP_Cadeira.')
    cache = {}
    for obj in objects:
        if obj.name not in exact and not obj.name.startswith(prefixes):
            continue
        key = obj.data.as_pointer()
        if key not in cache:
            cache[key] = union_prop(obj, layer)
        else:
            obj.data = cache[key]
        print('PROP_UNION', obj.name)
    # As duas bases de cadeira atravessam o anel luminoso do hub: a união local
    # não resolve uma face compartilhada entre objetos. Recorta só o anel/mesa
    # pela geometria das cadeiras (as cadeiras e suas posições são preservadas).
    hub = next(o for o in objects if o.name == 'PROP_Hub_Mobiliario')
    for name in ('PROP_Cadeira.00', 'PROP_Cadeira.01'):
        chair = next(o for o in objects if o.name == name)
        modifier = hub.modifiers.new('Folga_base_cadeira', 'BOOLEAN')
        modifier.operation = 'DIFFERENCE'
        modifier.solver = 'EXACT'
        modifier.object = chair
        with bpy.context.temp_override(view_layer=layer, object=hub, active_object=hub):
            while hub.modifiers[0] != modifier:
                bpy.ops.object.modifier_move_up(modifier=modifier.name)
            bpy.ops.object.modifier_apply(modifier=modifier.name)
