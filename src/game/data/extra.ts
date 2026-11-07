// Extra Combat (Jakub, 2026-11-04: "prepare a navigational object and place for
// new content, do not invent screen yet, i will define later. just call it
// 'Extra Combat'", and "extra combat should be locked until player win campaign
// 10-10"). Its place in Loomfall is the Arena across the lake. Its screen
// (Jakub, 2026-11-07): a hall lit by candles under the Arena, three doors in a
// row, each barred by a stripe that says LOCKED: a demonic door, a celestial
// and arcane one, and one full of runes blinking in every colour. Only the
// first opens: a click brings its stripe down and the door stays open; what is
// behind it, and when the other two open, wait for his design.

export const EXTRA_COMBAT = {
  name: 'Extra Combat',
  /** the stage whose first win opens it (his) */
  opensAfter: '10-10',
} as const;

export type DoorId = 'demonic' | 'celestial' | 'runic';

/** The hall's three doors, left to right (his order); the names stand in until he names them. */
export const EXTRA_DOORS: readonly { id: DoorId; name: string; look: string; opens: boolean }[] = [
  { id: 'demonic', name: 'The Demonic Door', look: 'Black basalt veined with fire under a horned skull.', opens: true },
  { id: 'celestial', name: 'The Celestial Door', look: 'Marble and gold, the night sky on its leaves, an arcane circle across them.', opens: false },
  { id: 'runic', name: 'The Runic Door', look: 'A slab of old stone carved all over with runes that never stop changing colour.', opens: false },
];
