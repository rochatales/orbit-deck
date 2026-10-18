"""Repete o tile do pátio nas faces existentes; sem decal nem piso sobreposto.

A fonte contém 4 × 6 placas de 1,25 × 1,50 m, junta de 30 mm, subdivididas
para poeira/desgaste em COLOR_0. Repetimos os triângulos e suas cores, recortados
pelo contorno exato das duas malhas externas. A altura continua em Z=0: o relevo
de 4 mm do pátio é representado pela junta escura, sem mudar física ou rotas.
A grade mundial é ancorada no pátio (9,5; 3 no Blender), sem reiniciar nas peças.
"""
import math
import bpy
from mathutils import Vector

FLOORS = ('ARQ_Piso_Passarelas', 'ARQ_Piso_Externo')
REFERENCE = 'ARQ_Lab_Piso_Patio'
EPS = 1e-7


def cross(a, b, p):
    return (b[0]-a[0])*(p[1]-a[1]) - (b[1]-a[1])*(p[0]-a[0])


def clip(poly, boundary):
    """Sutherland–Hodgman em XY, interpolando as cores junto com os vértices."""
    sign = 1 if sum(cross((0, 0), a, b) for a, b in zip(boundary, boundary[1:]+boundary[:1])) > 0 else -1
    for a, b in zip(boundary, boundary[1:]+boundary[:1]):
        source, poly = poly, []
        for s, e in zip(source, source[1:]+source[:1]):
            ds, de = sign*cross(a, b, s), sign*cross(a, b, e)
            if ds >= -EPS:
                poly.append(s)
            if (ds >= -EPS) != (de >= -EPS):
                t = ds / (ds-de)
                poly.append(tuple(s[k]+t*(e[k]-s[k]) for k in range(6)))
        if not poly:
            break
    # Recortes que só encostam numa aresta não geram faces degeneradas.
    cleaned = []
    for p in poly:
        if not cleaned or math.hypot(p[0]-cleaned[-1][0], p[1]-cleaned[-1][1]) > EPS:
            cleaned.append(p)
    if len(cleaned) > 1 and math.hypot(cleaned[0][0]-cleaned[-1][0], cleaned[0][1]-cleaned[-1][1]) <= EPS:
        cleaned.pop()
    if len(cleaned) < 3 or abs(sum(cross((0, 0), a, b) for a, b in zip(cleaned, cleaned[1:]+cleaned[:1]))) < EPS:
        return []
    return cleaned


def tile_external_floors(objects):
    by_name = {o.name: o for o in objects}
    reference = by_name[REFERENCE]
    mesh = reference.data
    mesh.calc_loop_triangles()
    attr = mesh.color_attributes['Col']
    points = [reference.matrix_world @ v.co for v in mesh.vertices]
    low = [min(p[k] for p in points) for k in range(2)]
    size = [max(p[k] for p in points)-low[k] for k in range(2)]
    assert all(abs(a-b) < 1e-5 for a, b in zip(size, (5, 9)))
    pattern = []
    for tri in mesh.loop_triangles:
        poly = [tuple(points[v][:2])+tuple(attr.data[l].color) for v, l in zip(tri.vertices, tri.loops)]
        # Inclui as juntas chanfradas na projeção; não há duas superfícies em XY.
        if abs(cross(*poly)) > EPS:
            pattern.append(poly)
    for name in FLOORS:
        obj = by_name[name]
        # A fonte usa Solidify para a espessura. Avalia ANTES do recorte e
        # mantém fundo/laterais; extrudar cada triângulo criaria paredes internas.
        evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        old = evaluated.to_mesh()
        world, local = obj.matrix_world, obj.matrix_world.inverted()
        side_color = tuple(obj.data.materials[0].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value)
        vertices, faces, colors = [], [], []
        for face in old.polygons:
            boundary = [tuple((world @ old.vertices[i].co)[:2]) for i in face.vertices]
            if not all(abs((world @ old.vertices[i].co).z) < EPS for i in face.vertices):
                start = len(vertices)
                vertices.extend(old.vertices[i].co.copy() for i in face.vertices)
                faces.append(tuple(range(start, len(vertices))))
                colors.extend([side_color]*len(face.vertices))
                continue
            lo = [min(v[k] for v in boundary) for k in range(2)]
            hi = [max(v[k] for v in boundary) for k in range(2)]
            for ix in range(math.floor((lo[0]-low[0])/size[0]), math.ceil((hi[0]-low[0])/size[0])):
                for iy in range(math.floor((lo[1]-low[1])/size[1]), math.ceil((hi[1]-low[1])/size[1])):
                    dx, dy = ix*size[0], iy*size[1]
                    for tile in pattern:
                        if max(p[0] for p in tile)+dx < lo[0] or min(p[0] for p in tile)+dx > hi[0] or max(p[1] for p in tile)+dy < lo[1] or min(p[1] for p in tile)+dy > hi[1]:
                            continue
                        poly = clip([(p[0]+dx, p[1]+dy, *p[2:]) for p in tile], boundary)
                        if not poly:
                            continue
                        # Mantém a orientação para cima também se o contorno-fonte for horário.
                        if sum(cross((0, 0), a, b) for a, b in zip(poly, poly[1:]+poly[:1])) < 0:
                            poly.reverse()
                        start = len(vertices)
                        vertices.extend(local @ Vector((p[0], p[1], 0)) for p in poly)
                        faces.append(tuple(range(start, start+len(poly))))
                        colors.extend(p[2:] for p in poly)
        derived = bpy.data.meshes.new(name+'_TilePatio')
        derived.from_pydata(vertices, [], faces)
        derived.materials.append(mesh.materials[0])
        color = derived.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='CORNER')
        for entry, value in zip(color.data, colors):
            entry.color = value
        derived.update()
        evaluated.to_mesh_clear()
        obj.modifiers.clear()
        obj.data = derived
        obj['tile_referencia'] = REFERENCE
        obj['tile_placa_m'] = '1.25,1.5'
        obj['tile_junta_m'] = 0.03
        print('PISO_TILE_PATIO', name, len(faces), 'faces; mesmo contorno e altura')
