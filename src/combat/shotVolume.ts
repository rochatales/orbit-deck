/** Limites inclusivos. Metadado ausente preserva bloqueio em toda a altura. */
export function containsShotHeight(volume: { minY?: number; maxY?: number }, height: number) {
    return height >= (volume.minY ?? -Infinity) && height <= (volume.maxY ?? Infinity);
}
