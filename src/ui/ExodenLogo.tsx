import { useId } from 'react';

// Contornos vetoriais da marca nas proporções da referência.
const EXODEN = 'M0 0H74V21H23V33H62V54H23V70H74V92H0Z'
    + 'M91 18L109 3L132 28L151 3L170 18L145 46L170 76L151 91L131 65L109 91L91 76L117 46Z'
    + 'M202 0H239L260 21V71L239 92H202L181 71V21Z M210 22L203 29V63L210 70H231L238 63V29L231 22Z'
    + 'M272 0H322L351 29V64L322 92H272Z M294 22V70H313L329 54V38L313 22Z'
    + 'M362 0H435V21H384V33H424V54H384V70H435V92H362Z'
    + 'M449 13L472 4L504 49V8H527V80L505 88L472 45V85H449Z';
const RECOMECO = 'M0 0H43L57 14V33L45 45L59 63H43L26 42H13V63H0Z M13 12V30H38L44 24V18L38 12Z'
    + 'M67 0H118V12H80V25H110V37H80V51H118V63H67Z'
    + 'M145 0H178V12H150L139 22V42L150 51H178V63H145L126 45V18Z'
    + 'M203 0H229L247 18V45L229 63H203L185 45V18Z M208 12L198 22V41L208 51H224L234 41V22L224 12Z'
    + 'M255 0H269L290 24L310 0H325V63H312V19L290 43L268 19V63H255Z'
    + 'M333 0H386V12H346V25H378V37H346V51H386V63H333Z'
    + 'M411 0H443V12H415L405 22V42L415 51H443V63H424V78H413V63H411L392 45V18Z'
    + 'M472 0H498L516 18V45L498 63H472L454 45V18Z M477 12L467 22V41L477 51H493L503 41V22L493 12Z';

export function ExodenLogo() {
    const cut = useId();
    const words = <>
        <path d={EXODEN}/>
        <path d={RECOMECO} transform="translate(2 105)"/>
    </>;
    return <h1 className="home-logo">
        <span className="home-sr-only">EXODEN Recomeço</span>
        <svg viewBox="-4 -3 535 188" aria-hidden="true" focusable="false">
            <defs>
                <mask id={cut} maskUnits="userSpaceOnUse" x="-4" y="-3" width="535" height="188">
                    <rect x="-4" y="-3" width="535" height="188" fill="white"/>
                    <path d="M-4 27H122 M272 60H403 M425 19H524 M97 135H182 M329 159H521" stroke="black" strokeWidth="1.35"/>
                </mask>
            </defs>
            <g className="home-logo-shadow" fillRule="evenodd">{words}</g>
            <g className="home-logo-face" fillRule="evenodd" mask={`url(#${cut})`}>{words}</g>
        </svg>
    </h1>;
}
