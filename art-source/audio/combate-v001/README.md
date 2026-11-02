# Combate v001 — originais preservados

Cópia byte a byte dos 17 MP3 fornecidos pelo autor em 25/10/2026, da pasta
`/Users/rochatales/game development/Horda survivor/00_audios/` (somente leitura).
Nenhum original foi normalizado, convertido ou substituído.

SHA-256 completo, formatos, intervalos de corte, durações/picos e variações:
`src/assets/audio/sfx/manifesto.json`, na raiz do projeto.

Reproduzir pela raiz, com ffmpeg/ffprobe no PATH:

```bash
node scripts/audio/fatiar-sfx.mjs
```

Saídas geradas somente em `src/assets/audio/sfx/`. A primeira cópia pode ser
refeita passando o caminho da fonte; cópias existentes com hash diferente causam
erro, sem sobrescrever a divergência. Procedimento e escuta no handoff
`docs/handoffs/s3.10-audio-combate.md`.
