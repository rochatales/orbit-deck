import { useEffect, useRef, useState } from 'react';
/** Transmissão curta por evento, reutilizável; sem diálogo ou avanço automático. */
export function RadioToast({ text, sender, serial, active }: { text: string; sender: string; serial: number; active: boolean }) {
    const [shown, setShown] = useState(false), lastShown = useRef(0);
    useEffect(() => {
        if (!active) { setShown(false); return; }
        if (!serial || serial === lastShown.current) return;
        lastShown.current = serial;
        setShown(true);
        const timer = window.setTimeout(() => setShown(false), 8000);
        return () => window.clearTimeout(timer);
    }, [serial, active]);
    return shown ? <aside className="campaign-radio" role="status"><b>{sender} / RÁDIO</b><p>{text}</p></aside> : null;
}
