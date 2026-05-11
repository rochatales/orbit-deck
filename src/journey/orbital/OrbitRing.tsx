interface OrbitRingProps {
  /** Tamanho do anel como porcentagem do contêiner (ex.: "60%"). */
  sizePercent: number;
  /** Quando ativo, o anel ganha glow na cor do deck selecionado. */
  active?: boolean;
  /** Cor do glow ativo. */
  accentColor?: string;
}

export function OrbitRing({ sizePercent, active = false, accentColor }: OrbitRingProps) {
  const sizeStyle = `${sizePercent.toFixed(2)}%`;
  return (
    <div
      className={`orbit-ring${active ? " orbit-ring-active" : ""}`}
      aria-hidden="true"
      style={{
        width: sizeStyle,
        height: sizeStyle,
        ...(active && accentColor
          ? {
              borderColor: accentColor,
              boxShadow: `0 0 36px ${accentColor}66, inset 0 0 28px ${accentColor}33`
            }
          : undefined)
      }}
    />
  );
}
