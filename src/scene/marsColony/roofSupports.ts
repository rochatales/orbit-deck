import type { ColonyPart } from './visibility';

/** Vínculo de cobertura, resolvido só na montagem; apoios em paredes não propagam fade. */
export function colonyRoofOwners(parts: ColonyPart[]) {
    const byName = new Map(parts.map(part => [part.name, part]));
    const owners = new Map<string, string>();
    const visiting = new Set<string>();
    const resolve = (name: string): string | undefined => {
        if (owners.has(name)) return owners.get(name);
        if (visiting.has(name)) throw new Error(`Ciclo de apoio na colônia: ${name}`);
        const part = byName.get(name);
        if (!part) throw new Error(`Apoio ausente na colônia: ${name}`);
        visiting.add(name);
        const roots = new Set<string>();
        for (const support of [...part.apoiado_em, ...part.apoiado_em_todos]) {
            const roof = resolve(support);
            if (roof) roots.add(roof);
        }
        visiting.delete(name);
        if (roots.size > 1) throw new Error(`Peça com coberturas distintas: ${name}`);
        const owner = roots.values().next().value ?? (name.startsWith('TET_') ? name : undefined);
        if (owner) owners.set(name, owner);
        return owner;
    };
    for (const part of parts) resolve(part.name);
    return owners;
}
