import { useEffect, useRef, type ReactNode } from 'react';

/** Foco fica no menu; ao fechar, volta ao controle que o abriu. */
export function PauseMenuFrame({ label, children }: { label: string; children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const menu = root.current;
    const selectable = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]';
    menu?.querySelector<HTMLElement>(selectable)?.focus({ preventScroll: true });
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !menu) return;
      // offsetParent exclui controles de <details> fechados.
      const choices = Array.from(menu.querySelectorAll<HTMLElement>(selectable)).filter(el => el.offsetParent !== null);
      const first = choices[0], last = choices[choices.length - 1];
      if (!first) { event.preventDefault(); menu.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !menu.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !menu.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    menu?.addEventListener('keydown', trap);
    return () => {
      menu?.removeEventListener('keydown', trap);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return <section className="overlay beta-pause" role="dialog" aria-modal="true" aria-label={label} ref={root} tabIndex={-1}><article>{children}</article></section>;
}
