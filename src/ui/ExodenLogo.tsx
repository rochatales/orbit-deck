/** Traços de cada letra em uma célula de 100 × 120, sem fonte externa. */
const LETTERS: Record<string, { d: string; width?: number }> = {
    E: { d: 'M92 12H12V108H92M12 60H78' },
    X: { d: 'M10 10L90 110M90 10L10 110' },
    O: { d: 'M32 12H68L88 32V88L68 108H32L12 88V32Z' },
    D: { d: 'M12 12H62L88 38V82L62 108H12Z' },
    N: { d: 'M12 112V12L88 108V8' },
    R: { d: 'M12 112V12H70L88 30V48L70 66H12M50 66L90 112' },
    C: { d: 'M90 12H32L12 32V88L32 108H90' },
    M: { d: 'M12 112V14L62 74L112 14V112', width: 124 },
    Ç: { d: 'M90 12H32L12 32V88L32 108H90M50 112V132H34' }
};

function Word({ word, y, scale, stroke, gap }: { word: string; y: number; scale: number; stroke: number; gap: number }) {
    let x = 0;
    return <g transform={`translate(0 ${y}) scale(${scale})`}>{[...word].map((letter, index) => {
        const glyph = LETTERS[letter], at = x;
        x += (glyph.width ?? 100) + gap;
        return <path key={index} transform={`translate(${at} 0)`} d={glyph.d} fill="none" strokeWidth={stroke} strokeLinejoin="miter" strokeMiterlimit={2.2}/>;
    })}</g>;
}

/** Marca da tela inicial, com rasgos de sinal como na referência. */
export function ExodenLogo() {
    const words = <>
        <Word word="EXODEN" y={0} scale={1.2} stroke={29} gap={22}/>
        <Word word="RECOMEÇO" y={168} scale={.885} stroke={24} gap={16}/>
    </>;
    return <h1 className="home-logo">
        <span className="home-sr-only">EXODEN Recomeço</span>
        <svg viewBox="-16 -8 880 322" aria-hidden="true" focusable="false">
            <g className="home-logo-ghost">{words}</g>
            <g className="home-logo-letters">{words}</g>
            <g className="home-logo-tears">
                <rect x="-16" y="40" width="240" height="2.5"/><rect x="430" y="92" width="150" height="2"/><rect x="600" y="28" width="250" height="2.5"/>
                <rect x="80" y="218" width="190" height="2"/><rect x="520" y="256" width="320" height="2.5"/>
            </g>
        </svg>
    </h1>;
}
