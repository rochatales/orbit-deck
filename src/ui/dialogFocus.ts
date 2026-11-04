/** Foco permanece no diálogo, inclusive após trocar de painel; fechar restaura o foco anterior. */
export function bindDialogFocus(menu: HTMLElement, page: Document) {
    const previous = page.activeElement;
    const selector = 'button:not(:disabled), select:not(:disabled), summary, [tabindex="0"]';
    (menu.querySelector<HTMLElement>(selector) ?? menu).focus({ preventScroll: true });
    const trap = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;
        const choices = Array.from(menu.querySelectorAll<HTMLElement>(selector)).filter(el => el.offsetParent !== null);
        const first = choices[0], last = choices[choices.length - 1];
        if (!first) { event.preventDefault(); menu.focus(); }
        else if (event.shiftKey && (page.activeElement === first || !menu.contains(page.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (page.activeElement === last || !menu.contains(page.activeElement))) { event.preventDefault(); first.focus(); }
    };
    page.addEventListener('keydown', trap);
    return () => {
        page.removeEventListener('keydown', trap);
        if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
}
