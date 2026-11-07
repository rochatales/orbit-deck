import { useEffect, useRef } from 'react';
import type { Acquisition } from '../state/useExpeditionStore';
import { ItemArtwork } from './ItemArtwork';
import { bindDialogFocus } from './dialogFocus';

const LABELS: Record<Acquisition, string> = { rifle: 'Rifle laser', sonar: 'Sonar', machete: 'Facão de plasma' };

export function EquipmentAcquisition({ item, onFinish }: { item: Acquisition; onFinish: (item: Acquisition) => void }) {
    const root = useRef<HTMLElement>(null), artwork = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const dialog = root.current!, icon = artwork.current!;
        const releaseFocus = bindDialogFocus(dialog, document);
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let animation: Animation | undefined;
        let fallback = 0;
        const finish = () => onFinish(item);
        const timer = window.setTimeout(() => {
            const slot = dialog.closest('.runtime')?.querySelector(`[data-acquisition-target="${item}"]`);
            if (reduced || !slot || !icon.animate) { finish(); return; }
            const from = icon.getBoundingClientRect(), to = slot.getBoundingClientRect();
            const x = to.left + to.width / 2 - from.left - from.width / 2;
            const y = to.top + to.height / 2 - from.top - from.height / 2;
            const scale = Math.min(to.width / from.width, to.height / from.height) * .88;
            dialog.classList.add('is-flying');
            animation = icon.animate([
                { transform: 'translate(0, 0) scale(1)' },
                { transform: `translate(${x}px, ${y}px) scale(${scale})` }
            ], { duration: 340, easing: 'cubic-bezier(.55,.03,.76,.4)', fill: 'forwards' });
            animation.onfinish = finish;
            fallback = window.setTimeout(finish, 550);
        }, reduced ? 900 : 1400);
        return () => {
            window.clearTimeout(timer);
            window.clearTimeout(fallback);
            animation?.cancel();
            releaseFocus();
        };
    }, [item, onFinish]);

    return <section className="equipment-acquisition" ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="acquisition-title">
        <div className="acquisition-light" aria-hidden="true"/>
        <div className="acquisition-art" ref={artwork}><ItemArtwork item={item}/></div>
        <header><p className="eyebrow">EQUIPAMENTO RECEBIDO</p><h2 id="acquisition-title">{LABELS[item]}</h2></header>
        <button type="button" className="secondary" onClick={() => onFinish(item)}>Continuar</button>
    </section>;
}
