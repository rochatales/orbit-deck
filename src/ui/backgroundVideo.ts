/** Um decodificador por fundo. O poster cobre a pausa por movimento reduzido ou falha. */
export function bindBackgroundVideo(video: HTMLVideoElement, src: string, page: Document, motion: MediaQueryList) {
    let loaded = false;
    const update = () => {
        if (page.hidden || motion.matches || video.dataset.failed === 'true') video.pause();
        else {
            if (!loaded) { video.src = src; loaded = true; }
            void video.play().catch(() => { /* O poster permanece disponível se autoplay falhar. */ });
        }
    };
    const fail = () => { video.dataset.failed = 'true'; video.pause(); };
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
