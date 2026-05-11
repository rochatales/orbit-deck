/**
 * Núcleo central da seleção orbital. Pulsa devagar para parecer "vivo"
 * sem competir com os nodes de deck.
 */
export function OrbitCore() {
  return (
    <div className="orbit-core" aria-hidden="true">
      <span className="orbit-core-halo" />
      <span className="orbit-core-pulse" />
      <span className="orbit-core-body" />
      <span className="orbit-core-shimmer" />
      <span className="orbit-core-label">Orbit Core</span>
    </div>
  );
}
