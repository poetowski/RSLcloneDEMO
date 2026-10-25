// The Journey's rules (data/challenges.ts holds its quests): a quest is locked
// until the one before it is claimed, open while its goal is not met, ready
// once it is, and claimed after its reward was taken. Goals are read from the
// save as it stands, so a quest whose goal was met before it opened is ready
// the moment it opens. Rules: docs/MECHANICS_GUIDE.md 15.
import { cleared, MasterArchivist, saveArchivist } from './archivist';
import { JOURNEY, QuestDef, QuestGoal } from './data/challenges';
import { rollMainStat } from './reliquary/drops';
import { rollSpool, ThreadSpool } from './reliquary/matrix';

export type QuestState = 'claimed' | 'ready' | 'open' | 'locked';

/** Whether the save meets a goal. */
export function goalMet(a: MasterArchivist, g: QuestGoal): boolean {
  switch (g.kind) {
    case 'tutorial':
      return a.tutorial === 'done';
    case 'stage':
      return cleared(a, g.stage);
    case 'weave':
      return a.reliquary.files().some((f) => f.matrix.spools().length > 0);
  }
}

export function questState(a: MasterArchivist, q: QuestDef): QuestState {
  if (a.claimed.includes(q.id)) return 'claimed';
  const i = JOURNEY.indexOf(q);
  if (i > 0 && !a.claimed.includes(JOURNEY[i - 1].id)) return 'locked';
  return goalMet(a, q.goal) ? 'ready' : 'open';
}

/** How many quests wait to be claimed (the badge on the main menu). */
export function readyCount(a: MasterArchivist): number {
  return JOURNEY.filter((q) => questState(a, q) === 'ready').length;
}

/** The quest the Journey stands at: the first not claimed (none when all are). */
export function currentQuest(a: MasterArchivist): QuestDef | undefined {
  return JOURNEY.find((q) => !a.claimed.includes(q.id));
}

/** What a claim gave: the spool it found, or the Stardust. */
export type QuestFind = { kind: 'spool'; spool: ThreadSpool } | { kind: 'fragments'; amount: number };

/** Claims a ready quest: a spool goes into storage with the NEW badge, Stardust to the Wishing Star, and the next quest opens. Null when it is not ready. */
export function claimQuest(a: MasterArchivist, id: string, rng: () => number = Math.random): QuestFind | null {
  const q = JOURNEY.find((x) => x.id === id);
  if (!q || questState(a, q) !== 'ready') return null;
  let find: QuestFind;
  if (q.reward.kind === 'spool') {
    const spool = rollSpool(q.reward.pattern, q.reward.grade, rollMainStat(rng), rng);
    a.reliquary.addSpool(spool, true);
    find = { kind: 'spool', spool };
  } else {
    a.fragments += q.reward.amount;
    find = { kind: 'fragments', amount: q.reward.amount };
  }
  a.claimed.push(q.id);
  saveArchivist(a);
  return find;
}
