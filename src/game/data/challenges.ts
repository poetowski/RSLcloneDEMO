// Challenges (Jakub, 2026-10-24: "It is a list of quests to accomplish. it has
// three parts. first part is Daily. second tab is Persistent. third tab is
// Journey. for now in daily and persistent tabs those ar ejust placeholders.
// but in Journey, we need to design a horizonal pathway of quests, these are
// unlocked sequentialy. first quest is "Finish Tutorial". second quest is
// placeholder."). The Journey's quests in their order; each opens once the one
// before it is claimed. Stand-ins (DESIGN_DECISIONS.md 35): every text but the
// first quest's title, the second quest (Weave a Spool) and both rewards.
import { PatternId } from './types';

export type ChallengeTab = 'daily' | 'persistent' | 'journey';

/** The three parts, in his order. */
export const CHALLENGE_TABS: readonly { id: ChallengeTab; name: string; placeholder?: string }[] = [
  { id: 'daily', name: 'DAILY', placeholder: 'Daily challenges are not designed yet.' },
  { id: 'persistent', name: 'PERSISTENT', placeholder: 'Persistent challenges are not designed yet.' },
  { id: 'journey', name: 'JOURNEY' },
];

/** What a quest asks: the tutorial played to its end, or a spool woven into any champion's Weaver Matrix. */
export type QuestGoal = { kind: 'tutorial' } | { kind: 'weave' };

/** What claiming a quest gives: a spool of one Weave Pattern and grade (0 Ashen, 1 Silver, 2 Gilded), its main stat drawn by slot. */
export interface QuestReward {
  kind: 'spool';
  pattern: PatternId;
  grade: 0 | 1 | 2;
}

export interface QuestDef {
  id: string;
  title: string;
  /** what to do, as the quest's panel reads it */
  text: string;
  goal: QuestGoal;
  reward: QuestReward;
}

/** The Journey, in order. */
export const JOURNEY: readonly QuestDef[] = [
  {
    id: 'finish_tutorial',
    title: 'Finish Tutorial',
    text: 'Walk the tutorial to its end: the Sanctum, the campaign and your first battle.',
    goal: { kind: 'tutorial' },
    reward: { kind: 'spool', pattern: 'pattern_vigor', grade: 1 },
  },
  // his placeholder; a quest of my own stands in so the pathway can be walked
  {
    id: 'weave_spool',
    title: 'Weave a Spool',
    text: "Weave any spool into a champion's Weaver Matrix: open WEAVING, choose a spool and WEAVE it.",
    goal: { kind: 'weave' },
    reward: { kind: 'spool', pattern: 'pattern_sunder', grade: 2 },
  },
];
