import { useEffect, useRef } from 'react';
import { bindDialogFocus } from '../ui/dialogFocus';
import { useExpeditionStore } from '../state/useExpeditionStore';
import './EngineerDialogue.css';
export function EngineerDialogue({ calm }: { calm: boolean }) {
    const root = useRef<HTMLElement>(null);
    useEffect(() => root.current ? bindDialogFocus(root.current, document) : undefined, []);
    return <section ref={root} className="overlay engineer-dialogue" role="dialog" aria-modal="true" aria-label="Conversa com o Engenheiro" tabIndex={-1}><article>
        <p className="eyebrow">ENGENHEIRO · OFICINA / DATA CENTER</p>
        <h2>{calm ? 'EDEN está nos acompanhando.' : 'Precisamos reativar estes sistemas.'}</h2>
        <p>{calm ? 'Vou continuar cuidando da Oficina e do Data Center. Com EDEN por perto, podemos organizar os próximos passos.'
            : 'Precisamos buscar cobre na Terra para reativar EDEN. Estou tentando manter a Oficina e o Data Center funcionando.'}</p>
        <button onClick={() => useExpeditionStore.getState().closePanel()}>Voltar à exploração</button>
    </article></section>;
}
