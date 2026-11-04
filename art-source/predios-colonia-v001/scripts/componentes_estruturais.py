"""Seleção por componentes reais; preserva UV, materiais, transformações e todos os COL."""
import bpy
import bmesh


def partition(obj, predicate, roof=None, name='Componentes_Teto'):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    parents = list(range(len(bm.verts)))

    def find(i):
        while parents[i] != i:
            parents[i] = parents[parents[i]]
            i = parents[i]
        return i

    def join(a, b):
        parents[find(a)] = find(b)

    coords = {}
    for v in bm.verts:
        key = tuple(round(x, 5) for x in v.co)
        if key in coords:
            join(v.index, coords[key])
        else:
            coords[key] = v.index
    for edge in bm.edges:
        join(edge.verts[0].index, edge.verts[1].index)
    groups = {}
    for v in bm.verts:
        groups.setdefault(find(v.index), []).append(v)
    selected, report = [], []
    for vertices in groups.values():
        points = [obj.matrix_world @ v.co for v in vertices]
        lo = [min(p[k] for p in points) for k in range(3)]
        hi = [max(p[k] for p in points) for k in range(3)]
        if predicate(lo, hi):
            selected.extend(vertices)
            report.append({'min_blender': lo, 'max_blender': hi, 'vertices': len(vertices)})
    if selected and roof:
        chosen = {v.index for v in selected}
        copy = bm.copy()
        copy.verts.ensure_lookup_table()
        bmesh.ops.delete(copy, geom=[v for v in copy.verts if v.index not in chosen], context='VERTS')
        mesh = obj.data.copy()
        copy.to_mesh(mesh)
        copy.free()
        node = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(node)
        node.parent = roof
        node.matrix_world = obj.matrix_world.copy()
    if selected:
        bmesh.ops.delete(bm, geom=selected, context='VERTS')
        bm.to_mesh(obj.data)
    bm.free()
    return report


def fix_building(building):
    roof = bpy.data.objects['Building_Roof']
    report = {}
    if building == 'meeting-room':
        # Quatro claraboias com moldura/vidro, antes presos às paredes, entre 3,008 e 3,296 m.
        for name in ['Wall_E', 'Wall_N', 'Wall_S', 'Wall_W', 'Interior']:
            obj = bpy.data.objects.get(name)
            if obj and obj.type == 'MESH':
                parts = partition(obj, lambda lo, hi: lo[2] > 2.9, roof, 'Teto_' + name)
                if parts:
                    report[name] = parts
    elif building == 'data-center':
        # Placa e letras autorais antigas, à direita do novo portal; nada da placa padrão/DC.
        report['placa_legada'] = partition(bpy.data.objects['Wall_S'], lambda lo, hi:
            lo[0] > 1.16 and hi[0] < 3.34 and lo[1] > -4.06 and hi[1] < -3.98 and lo[2] > 2.53 and hi[2] < 3.03)
        # Dois tubos verticais da estrutura antiga (0,17–3,13 m); retirada completa, sem pontas suspensas.
        report['interior_legado'] = partition(bpy.data.objects['Interior'], lambda lo, hi: hi[2] > 3.0)
    elif building == 'workshop':
        # Mesma falha de classificação nos dutos altos da Oficina; mantém posição e os esconde com o teto.
        report['dutos_telhado'] = partition(bpy.data.objects['Wall_S'], lambda lo, hi: hi[2] > 2.9, roof, 'Teto_Dutos_Oficina')
    return report
