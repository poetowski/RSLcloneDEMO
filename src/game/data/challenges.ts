// Challenges (Jakub, 2026-10-24: "It is a list of quests to accomplish. it has
// three parts. first part is Daily. second tab is Persistent. third tab is
// Journey. for now in daily and persistent tabs those ar ejust placeholders.
// but in Journey, we need to design a horizonal pathway of quests, these are
// unlocked sequentialy. first quest is "Finish Tutorial". second quest is
// placeholder."). The Journey's quests in their order; each opens once the one
// before it is claimed. Then (2026-10-25): "maybe we can make also new journey
// quest: beat campaign 1-3. reward can be 100 summoning fragments. so player
// then can spawn his third hero", and the same day: "swap quests: weave a spool
// make sooner and after that make beat campaign 1-3. reweards can stay. swap
// also rewards": my placeholder, Weave a Spool, comes second and gives the 100
// Stardust; Beat Campaign 1-3 comes third and gives the spool. Stand-ins
// (DESIGN_DECISIONS.md 35, 36): every text but the titles Finish Tutorial and
// Beat Campaign 1-3, the quest Weave a Spool, and the spool rewards.
import { PatternId } from './types';

export type ChallengeTab = 'daily' | 'persistent' | 'journey';

/** The three parts, in his order. */
export const CHALLENGE_TABS: readonly { id: ChallengeTab; name: string; placeholder?: string }[] = [
  { id: 'daily', name: 'DAILY', placeholder: 'Daily challenges are not designed yet.' },
  { id: 'persistent', name: 'PERSISTENT', placeholder: 'Persistent challenges are not designed yet.' },
  { id: 'journey', name: 'JOURNEY' },
];

/** What a quest asks: the tutorial played to its end, a stage of the campaign cleared, or a spool woven into any champion's Weaver Matrix. */
export type QuestGoal = { kind: 'tutorial' } | { kind: 'stage'; stage: string } | { kind: 'weave' };

/**
 * What claiming a quest gives: a spool of one Weave Pattern and grade (0
 * Ashen, 1 Silver, 2 Gilded), its main stat drawn by slot; or Stardust, the
 * fragments that merge into Soulstars.
 */
export type QuestReward = { kind: 'spool'; pattern: PatternId; grade: 0 | 1 | 2 } | { kind: 'fragments'; amount: number };

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
  // his placeholder, a quest of my own; second on his word, with the second place's 100 Stardust (his):
  // the summon of the third champion, the first one drawn at random
  {
    id: 'weave_spool',
    title: 'Weave a Spool',
    text: "Weave any spool into a champion's Weaver Matrix: open WEAVING, choose a spool and WEAVE it. Its reward is the Stardust for your first summon at the Wishing Star.",
    goal: { kind: 'weave' },
    reward: { kind: 'fragments', amount: 100 },
  },
  // his (2026-10-25), third on his word, with the spool the third place gave
  {
    id: 'beat_1_3',
    title: 'Beat Campaign 1-3',
    text: 'Clear stage 1-3 of the campaign.',
    goal: { kind: 'stage', stage: '1-3' },
    reward: { kind: 'spool', pattern: 'pattern_sunder', grade: 2 },
  },
];
