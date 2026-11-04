/** Um decodificador por cabine; sem áudio próprio, e sem trabalho quando a janela fica oculta. */
export function bindCockpitVideo(video: HTMLVideoElement, src: string, page: Document, motion: MediaQueryList) {
    const update = () => {
        if (page.hidden || motion.matches || video.dataset.failed === 'true') video.pause();
        else void video.play().catch(() => { /* Poster permanece disponível se autoplay/codec falhar. */ });
    };
    const fail = () => { video.dataset.failed = 'true'; video.pause(); };
    video.src = src;
    video.muted = true;
    video.dataset.failed = 'false';
    page.addEventListener('visibilitychange', update);
    motion.addEventListener('change', update);
    video.addEventListener('error', fail);
    update();
    return () => {
        page.removeEventListener('visibilitychange', update);
        motion.removeEventListener('change', update);
        video.removeEventListener('error', fail);
        video.pause();
        video.removeAttribute('src');
        video.load();
    };
}
