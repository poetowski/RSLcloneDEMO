// Extra Combat (Jakub, 2026-11-04: "prepare a navigational object and place for
// new content, do not invent screen yet, i will define later. just call it
// 'Extra Combat'", and "extra combat should be locked until player win campaign
// 10-10"). Its place in Loomfall is the Arena across the lake; what it holds
// waits for his design, so it has no screen yet.

export const EXTRA_COMBAT = {
  name: 'Extra Combat',
  /** the stage whose first win opens it (his) */
  opensAfter: '10-10',
} as const;
