"""Molduras de porta salientes da parede; correção derivada, não salva a fonte Blender.

Causa do pisca dos batentes verdes (S6.12): na fonte B3 o batente
(`ARQ_*_Porta_*`), a verga e o portal do laboratório têm as faces frontal,
traseira e interna exatamente nos planos do painel bege e do vidro da parede
que os apoia. Com todos os materiais `DoubleSide`, a GPU sorteia a cada pixel
qual superfície vence o teste de profundidade; ao mover a câmera (o jogador
anda), a faixa alterna verde/bege (z-fighting).

Regra: cada ilha da malha de uma moldura cresce SALIENCIA em todos os eixos,
no espaço do mundo. A moldura passa a envolver o plano da parede em vez de
coincidir com ele; silhueta muda 2 mm, imperceptível no jogo. Uma ilha que
encosta numa ilha maior da mesma peça (vedação, marcação, luz da verga) cresce
SALIENCIA além da maior ilha maior que toca, para não empatar com ela.
Ilhas rentes ao piso (< 2 cm: soleiras, faixas de sinalização) não crescem:
não tocam a parede e, lado a lado, passariam a se sobrepor. As folhas
(`Folhas`) não entram: são substituídas pela porta animada.
"""
import re

SALIENCIA = 0.002  # m; 24 bits de profundidade na câmera ortográfica resolvem ~0,01 mm
RENTE_AO_PISO = 0.02  # m, altura (eixo Z do Blender)
MOLDURA = re.compile(r'^ARQ_.*_(Porta|Portal)_(?!.*Folhas)')


def islands(mesh):
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


def is_door_frame(name):
    return bool(MOLDURA.match(name))


def separate_door_frames(objects):
    for obj in objects:
        if not is_door_frame(obj.name):
            continue
        assert obj.data.users == 1, obj.name
        world, local = obj.matrix_world, obj.matrix_world.inverted()
        mesh = obj.data
        parts = []
        for ids in islands(mesh):
            points = {i: world @ mesh.vertices[i].co for i in ids}
            low = [min(p[k] for p in points.values()) for k in range(3)]
            high = [max(p[k] for p in points.values()) for k in range(3)]
            volume = (high[0] - low[0]) * (high[1] - low[1]) * (high[2] - low[2])
            parts.append((points, low, high, volume))
        parts.sort(key=lambda part: -part[3])
        grown = []
        for points, low, high, volume in parts:
            if high[2] - low[2] < RENTE_AO_PISO:
                continue
            grow = SALIENCIA + max([g for other_low, other_high, other_volume, g in grown
                                    if other_volume > volume
                                    and all(low[k] <= other_high[k] + 1e-6 and other_low[k] <= high[k] + 1e-6
                                            for k in range(3))], default=0)
            grown.append((low, high, volume, grow))
            center = [(low[k] + high[k]) / 2 for k in range(3)]
            for i, point in points.items():
                for k in range(3):
                    delta = point[k] - center[k]
                    if abs(delta) > 1e-6:
                        point[k] += grow if delta > 0 else -grow
                mesh.vertices[i].co = local @ point
        mesh.update()
        print('MOLDURA_SALIENTE', obj.name)
