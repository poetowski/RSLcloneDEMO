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
 * fragments that merge into Soulstars; or Gold, the Merchant's coin. `count`: how many spools, one when absent;
 * `also`: spools of a second pattern and grade given with them.
 * Or a champion: it joins only through this quest, and is never summoned.
 */
export interface SpoolGift {
  pattern: PatternId;
  grade: 0 | 1 | 2;
  count?: number;
}
export type QuestReward = ({ kind: 'spool'; also?: SpoolGift } & SpoolGift) | { kind: 'fragments'; amount: number } | { kind: 'gold'; amount: number } | { kind: 'champion'; champion: string };

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
    text: 'Walk the tutorial to its end: Loomfall, the campaign and your first battle.',
    goal: { kind: 'tutorial' },
    // his (2026-11-03): "reward for finishing tutorial should be 2 ashen vigor spool"
    reward: { kind: 'spool', pattern: 'pattern_vigor', grade: 0, count: 2 },
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
  // his (2026-10-25), third on his word; since 2026-11-03 "reward for finishing beating 1-3 is 2 silver sunder spool"
  {
    id: 'beat_1_3',
    title: 'Beat Campaign 1-3',
    text: 'Clear stage 1-3 of the campaign.',
    goal: { kind: 'stage', stage: '1-3' },
    reward: { kind: 'spool', pattern: 'pattern_sunder', grade: 1, count: 2 },
  },
  // his (2026-11-01): "to beat campaign 1-10. reward can be 2 spools"; since 2026-11-03 "reward for beating 1-10
  // should be 2 gilded vigor spools and 2 sunder spools" (the Sunder ones read as Gilded too)
  {
    id: 'beat_1_10',
    title: 'Beat Campaign 1-10',
    text: 'Clear stage 1-10 of the campaign, the last of the Fracture Reach.',
    goal: { kind: 'stage', stage: '1-10' },
    reward: { kind: 'spool', pattern: 'pattern_vigor', grade: 2, count: 2, also: { pattern: 'pattern_sunder', grade: 2, count: 2 } },
  },
  // his (2026-11-01): "beat 3-10 campaign. reward for this is 250 spawning fragments";
  // since 2026-11-03 "change rewards of quest beating 3-10 is 5000 gold"
  {
    id: 'beat_3_10',
    title: 'Beat Campaign 3-10',
    text: 'Clear stage 3-10 of the campaign, the last of the Moonlit Basin.',
    goal: { kind: 'stage', stage: '3-10' },
    reward: { kind: 'gold', amount: 5000 },
  },
  // his (2026-11-01): "beat campaign 5-10. reward is Paladin hero acquired. it will get unclocked once reward collected";
  // since 2026-11-03 on his word "reward for beating 5-10 should be 400 stardust", the Paladin moving to 10-10;
  // then the same day "reward for beating 5-10 is 300 stardust"
  {
    id: 'beat_5_10',
    title: 'Beat Campaign 5-10',
    text: 'Clear stage 5-10 of the campaign, the last of the Snowy Mesa.',
    goal: { kind: 'stage', stage: '5-10' },
    reward: { kind: 'fragments', amount: 300 },
  },
  // his (2026-11-01): "new quest beating campaign 8-10. reward is 3 spools";
  // since 2026-11-03 "reward for beating campaign 8-10 is 10000 gold"
  {
    id: 'beat_8_10',
    title: 'Beat Campaign 8-10',
    text: 'Clear stage 8-10 of the campaign, the last of the Crystal Graveyard.',
    goal: { kind: 'stage', stage: '8-10' },
    reward: { kind: 'gold', amount: 10000 },
  },
  // his (2026-11-03): "create new journey quest: beat campaign 10-10 and its reward is paladin instead of 5-10"
  {
    id: 'beat_10_10',
    title: 'Beat Campaign 10-10',
    text: 'Clear stage 10-10 of the campaign, the last of the Blossom Caldera.',
    goal: { kind: 'stage', stage: '10-10' },
    reward: { kind: 'champion', champion: 'paladin' },
  },
];
