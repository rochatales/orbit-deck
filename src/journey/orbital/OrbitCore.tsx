/**
 * Núcleo central da seleção orbital. Pulsa devagar para parecer "vivo"
 * sem competir com os nodes de deck.
 */
interface OrbitCoreProps {
  stationName: string;
}

export function OrbitCore({ stationName }: OrbitCoreProps) {
  return (
    <div className="orbit-core" aria-hidden="true">
      <span className="orbit-core-halo" />
      <span className="orbit-core-pulse" />
      <span className="orbit-core-body" />
      <span className="orbit-core-shimmer" />
      <span className="orbit-core-name">{stationName}</span>
    </div>
  );
}
