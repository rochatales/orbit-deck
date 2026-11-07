import { useEffect, useRef } from 'react';
import { bindDialogFocus } from '../ui/dialogFocus';
import { useExpeditionStore } from '../state/useExpeditionStore';
import './EngineerDialogue.css';
export function EngineerDialogue({ calm, swordPickup }: { calm: boolean; swordPickup: boolean }) {
    const root = useRef<HTMLElement>(null);
    useEffect(() => root.current ? bindDialogFocus(root.current, document) : undefined, []);
    return <section ref={root} className="overlay engineer-dialogue" role="dialog" aria-modal="true" aria-label="Conversa com o Engenheiro" tabIndex={-1}><article>
        <p className="eyebrow">ENGENHEIRO · OFICINA / DATA CENTER</p>
        <h2>{swordPickup ? 'Seu facão de plasma está pronto.' : calm ? 'EDEN está nos acompanhando.' : 'Precisamos reativar estes sistemas.'}</h2>
        <p>{swordPickup ? 'Leve o facão de plasma para Shanghai. Use 2 para equipá-lo quando encontrar os mutantes.'
            : calm ? 'Vou continuar cuidando da Oficina e do Data Center. Com EDEN por perto, podemos organizar os próximos passos.'
            : 'Precisamos buscar cobre na Terra para reativar EDEN. Estou tentando manter a Oficina e o Data Center funcionando.'}</p>
        {swordPickup && <button onClick={() => useExpeditionStore.getState().receiveSword()}>Receber facão de plasma</button>}
        <button onClick={() => useExpeditionStore.getState().closePanel()}>Voltar à exploração</button>
    </article></section>;
}
