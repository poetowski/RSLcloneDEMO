// The tutorial's words (src/game/tutorial.ts; every text a stand-in,
// DESIGN_DECISIONS.md 35): each step's title, what it says, and what to click
// (`act`) or the button that leads on (`next`). {braces} are filled in as it
// runs: {area}, {team}, {actor}, {skill}, {recruit}, {button}, {next}.

export type TutorialStepId =
  | 'welcome' | 'gate' | 'area' | 'stage' | 'prepare' | 'fight'
  | 'meter' | 'skill' | 'target' | 'targetAll' | 'targetAlly' | 'cooldown' | 'victory' | 'victoryRecruit' | 'defeat'
  | 'recruit' | 'home' | 'board' | 'journeyTab' | 'claim' | 'farewell';

export interface TutorialText {
  title: string;
  text: string;
  /** what to click: the step ends when it is clicked */
  act?: string;
  /** the button that leads on, where nothing is to be clicked */
  next?: string;
}

export const TUTORIAL: Record<TutorialStepId, TutorialText> = {
  welcome: {
    title: 'WELCOME, ARCHIVIST',
    text: 'The celestial Loom is broken, and the legends it wove are scattered souls. Recollect them as champions, and with them mend the Loom.',
    next: 'BEGIN',
  },
  gate: { title: 'THE SANCTUM', text: 'Every place on this island leads somewhere. The Starbridge Gate opens the campaign.', act: 'Click the Gate.' },
  area: { title: 'THE CAMPAIGN', text: 'The broken world, one area after another, each a string of battles.', act: 'Open the {area}.' },
  stage: { title: 'STAGES', text: 'Clear a stage to open the next one.', act: 'Choose stage 1-1.' },
  prepare: { title: 'STAGE 1-1', text: 'A stage shows its enemies and what its first clear brings.', act: 'Click PREPARE.' },
  fight: { title: 'YOUR TEAM', text: 'Up to three champions fight together; choose them from the roster below. {team}', act: 'Click FIGHT!' },
  meter: {
    title: 'TURN METER',
    text: 'Every champion rides this track. The one who reaches the gold end acts; the higher the SPD, the sooner.',
    next: 'NEXT',
  },
  skill: { title: 'SKILLS', text: "It is {actor}'s turn. The first skill is a basic attack; the others strike harder, then rest for a few turns.", act: 'Choose {skill}.' },
  target: { title: 'TARGET', text: 'Now choose whom {skill} strikes.', act: 'Click an enemy.' },
  targetAll: { title: 'TARGET', text: '{skill} strikes every enemy at once.', act: 'Click any enemy.' },
  targetAlly: { title: 'TARGET', text: 'Now choose whom {skill} helps.', act: 'Click an ally.' },
  cooldown: { title: 'COOLDOWN', text: '{skill} is resting: the number counts the turns until it is ready again. Now win the battle!', next: 'GOT IT' },
  victory: { title: 'VICTORY', text: 'The stars count your champions still standing at the end: three when nobody falls.', act: 'Click {button}.' },
  victoryRecruit: { title: 'VICTORY', text: 'The stars count your champions still standing. This first clear brings {recruit}.', act: 'Click {button}.' },
  defeat: { title: 'DEFEAT', text: 'Even legends fall. The battle can begin again.', act: 'Click RETRY.' },
  recruit: { title: 'A NEW CHAMPION', text: '{recruit} joins your Reliquary, where every champion you recruit waits.', act: 'Click CONTINUE.' },
  home: { title: 'ONWARD', text: 'The campaign will wait for you. One more place to see in the Sanctum.', act: 'Click BACK.' },
  board: { title: 'CHALLENGES', text: "The Herald's Board posts quests to accomplish, each with a reward. You have just done your first.", act: 'Click the board.' },
  journeyTab: { title: 'THE JOURNEY', text: 'Quests one after another: claiming one opens the next.', act: 'Open the JOURNEY.' },
  claim: { title: 'THE JOURNEY', text: 'Quests one after another: claiming one opens the next. Finish Tutorial is done.', act: 'Click CLAIM.' },
  farewell: { title: 'GO WELL, ARCHIVIST', text: 'Your reward waits in Weaving. The next quest is open: {next}.', next: 'FINISH' },
};

/** The card that asks before the tutorial is skipped. */
export const TUTORIAL_SKIP = {
  title: 'SKIP THE TUTORIAL?',
  text: 'You can play it again from Challenges: it is the first quest of the Journey.',
  stay: 'STAY',
  skip: 'SKIP',
  /** the link on every card, and on the cards after the first victory, where it only closes them */
  link: 'skip tutorial',
  close: 'close',
};

/** The steps a run passes, in order: the pips on the cards (a step not here shows as the one before it). */
export const TUTORIAL_PATH: readonly TutorialStepId[] = ['welcome', 'gate', 'area', 'prepare', 'fight', 'meter', 'skill', 'target', 'victory', 'home', 'board', 'claim', 'farewell'];
