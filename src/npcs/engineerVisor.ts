/** Medido por raios sobre o capacete posado em Idle, no espaço de mixamorigHead.
 * Folga de 6 mm locais (~9,3 mm no runtime); raio compensa escala efetiva do osso 1,55705.
 * Mantém a espessura em metros do filete/halo do jogador. */
export const ENGINEER_VISOR_POINTS = [
    [-.125, .13, .10518755], [-.1, .1, .13749657], [-.07, .075, .15368547],
    [-.035, .06, .16364517], [0, .055, .16642057], [.035, .06, .16485206],
    [.07, .075, .15332448], [.1, .1, .13671278], [.125, .13, .10462702]
] as const;
export const ENGINEER_VISOR_RADIUS_SCALE = 1 / 1.5570486838860242;
