/** Tempos medidos até 99% do deslocamento real das folhas/rampa, sem mudar a animação. */
export const DOOR_TIMING = {
    response: 12,
    minimum: .05,
    normal: { open: .4, close: .4, openEvent: 'doorOpen', closeEvent: 'doorClose' },
    quartel: { open: .25, close: .2, openEvent: 'quartelDoorOpen', closeEvent: 'quartelDoorClose' },
    hangar: { open: .2, close: .28, openEvent: 'hangarDoorOpen', closeEvent: 'hangarDoorClose' },
} as const;
