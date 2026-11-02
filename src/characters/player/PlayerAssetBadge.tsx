import { usePlayerAsset } from './playerAssetChoice';

/**
 * Indicação explícita do GLB do player e controle de comparação (S2.12). Visível em
 * desenvolvimento ou com `?comparar`. Troca só o visual no mesmo corpo, ponto, câmera e luz.
 */
export function PlayerAssetBadge() {
    const variant = usePlayerAsset(s => s.variant), clips = usePlayerAsset(s => s.clips);
    const setVariant = usePlayerAsset(s => s.setVariant);
    const nome = variant === 'astronauta' ? 'Explorador astronauta (colônia / combate)' : variant === 'r7' ? 'Explorador r7 (S6.8 · 4c0ecfd)' : 'Personagem atual (player-main.glb)';
    const backward = clips.includes('Backward');
    return <aside className="qa-asset" aria-live="polite">
    <p className="eyebrow">PRÉVIA DE TESTE · PERSONAGEM</p>
    <strong>{nome}</strong>
    <small>{clips.length ? `Clipes: ${clips.join(', ')}` : 'Carregando o GLB…'}{clips.length > 0 && !backward ? ' · sem Backward (recuo usa Run)' : ''}</small>
    {(['astronauta', 'r7', 'atual'] as const).map(option => <button key={option} className="secondary" disabled={variant === option}
      onClick={e => { setVariant(option); e.currentTarget.blur(); }}>
      {option === 'astronauta' ? 'Astronauta' : option === 'r7' ? 'Explorador r7' : 'Personagem anterior'}
    </button>)}
  </aside>;
}
