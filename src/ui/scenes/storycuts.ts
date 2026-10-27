/**
 * Story mode cutscenes. The words and the fighters come from sequel/story.ts;
 * this file puts them in rooms, points a camera at them and lets the beard do
 * the talking.
 */
import type { Cutscene, Line, Shot, Actor } from '../cutscene';
import { CAST } from '../cutscene';
import {
  buildHan,
  buildMateoGrown,
  buildOneTon,
  buildOpponent,
  fightWon,
  storyChapter,
  type StoryFightDef,
} from '../../sequel/story';
import type { StorySave } from '../../sequel/types';

const shot = (bg: Shot['bg'], cast: Actor[], lines: Line[], caption?: string): Shot => ({ bg, cast, lines, caption });

type Who = keyof typeof CAST;

const npc = (who: Who, name: string, x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => ({
  id: who,
  look: CAST[who],
  name,
  x,
  facing,
  ...o,
});

const dane = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => npc('dane', 'DANE WHYTE', x, facing, o);
const oneton = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => npc('oneton', '1TON', x, facing, o);
const ray = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => npc('ray', 'UNCLE RAY', x, facing, o);
const bradie = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => npc('bradie', 'BRADIE', x, facing, o);
const jimmy = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => npc('jimmy', 'JIMMY QUAVO', x, facing, o);
const gordon = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => npc('gordon', 'GORDON VANCE', x, facing, o);
/** Mateo at nineteen (chapters 1-8): grown out of the hoodie, a welterweight's frame, full height. From chapter 9, bigMateo. */
const MATEO_19 = { ...CAST.mateo, build: 1, beard: 1, tattoo: 1, outfit: { top: 0xb8733a, bottom: 0x2a2a44, bulk: 1, hands: CAST.mateo.skin } };
const mateo = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => npc('mateo', 'MATEO VARGA', x, facing, { look: MATEO_19, scale: 1.29, ...o });
const lenny = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => npc('lenny', 'LENNY PRATT', x, facing, o);
const verity = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => npc('zenith', 'VERITY KANE', x, facing, o);
const auditor = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => npc('auditor', 'THE AUDITOR', x, facing, o);
const chairman = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => npc('chairman', 'THE CHAIRMAN', x, facing, o);
const cuchilloSuit = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => npc('cuchillo', 'EL CUCHILLO', x, facing, o);
const duke = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => npc('duke', 'DUKE KESSLER', x, facing, o);
const rico = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => npc('rico', 'RICO ALVAREZ', x, facing, o);
const cesar = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => npc('cesar', 'CESAR RIOS', x, facing, o);

const fighterActor = (id: string, name: string, fighter: Actor['fighter'], x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => ({
  id,
  fighter,
  name,
  x,
  facing,
  scale: 1.2,
  ...o,
});

const cuchillo = (save: StorySave, rematch: boolean, x: number, facing: 1 | -1): Actor =>
  fighterActor('cuchillo', 'EL CUCHILLO', buildOpponent(save, rematch ? 'cuchillo_rematch' : 'cuchillo'), x, facing);

const brick = (save: StorySave, x: number, facing: 1 | -1): Actor =>
  fighterActor('brick', 'BRICK BASTION', buildOpponent(save, 'brick'), x, facing, { scale: 1.34 });

const mateoFight = (save: StorySave, betrayal: boolean, x: number, facing: 1 | -1): Actor =>
  fighterActor('mateo', 'MATEO VARGA', buildOpponent(save, betrayal ? 'mateo_betrayal' : 'mateo_spar'), x, facing, { scale: 1.05 });

const oneTonFight = (save: StorySave, x: number, facing: 1 | -1, final = false): Actor =>
  fighterActor('oneton', '1TON', buildOneTon(save, final), x, facing, { scale: 1.2 });

/** Han Tibular, the CBFC middleweight champion from game one, in fight kit and in street clothes. */
const hanFight = (save: StorySave, x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor =>
  fighterActor('han', 'HAN TIBULAR', buildHan(save), x, facing, { scale: 1.26, ...o });
const han = (save: StorySave, x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor =>
  hanFight(save, x, facing, { clothes: { top: 0x2a3a5a, bottom: 0x22222a }, ...o });
/** Mateo grown: twenty-one, a light heavyweight, jacked and inked to the knuckles. */
const bigMateoFight = (save: StorySave, x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor =>
  fighterActor('mateo', 'MATEO VARGA', buildMateoGrown(save), x, facing, { scale: 1.34, ...o });
const bigMateo = (save: StorySave, x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor =>
  bigMateoFight(save, x, facing, { clothes: { top: 0xb8733a, bottom: 0x22222a }, ...o });

const dukeFight = (save: StorySave, x: number, facing: 1 | -1): Actor =>
  fighterActor('duke', 'DUKE KESSLER', buildOpponent(save, 'duke'), x, facing, { scale: 1.36 });

const ricoFight = (save: StorySave, x: number, facing: 1 | -1): Actor =>
  fighterActor('rico', 'RICO ALVAREZ', buildOpponent(save, 'rico'), x, facing, { scale: 1.28 });

const cesarFight = (save: StorySave, x: number, facing: 1 | -1): Actor =>
  fighterActor('cesar', 'CESAR RIOS', buildOpponent(save, 'cesar'), x, facing, { scale: 1.34 });

const daniel = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => npc('daniel', 'DIRTY DANIEL', x, facing, o);

// ---------------------------------------------------------------- chapter 1

function introBackRow(save: StorySave): Cutscene {
  return {
    title: 'CHAPTER 1: THE BEARD IN THE BACK ROW',
    film: true,
    shots: [
      shot('warehouse', [dane(150, 1), ray(250, -1), bradie(344, -1)], [
        { who: null, text: 'The CBFC sign is in the trunk of Dane Whyte\'s car. The car is in Ray\'s name. Ray is in the soup.' },
        { who: 'dane', text: 'The cage is level. The lights work. The rent is late.' },
        { who: 'ray', text: 'The rent is not late. The rent is dead.' },
        { who: 'bradie', text: 'I posted the warehouse show. Four thousand views. Two of them were my mom.' },
        { who: 'dane', text: 'Which two?' },
        { who: 'bradie', text: 'She has two phones.' },
      ], 'SIX MONTHS AFTER THE BUYOUT'),
      shot('warehouse', [dane(142, 1), oneton(352, -1, { enter: 'right' })], [
        { who: 'oneton', text: 'Dane Whyte. Former president of the CBFC. Current president of a building with one working toilet.' },
        { who: 'dane', text: 'Two. If you count the bucket.' },
        { who: 'oneton', text: 'I have been coming to your press conferences for six years. You have never once answered my question.' },
        { who: 'dane', text: 'Ask it again.' },
        { who: 'oneton', text: 'When are you going to put a Mexican fighter in the main event?' },
        { who: 'dane', text: 'When one walks in the door.' },
      ], 'THE BACK ROW'),
      shot('warehouse', [dane(120, 1), oneton(280, -1), npc('promoter', 'A DRUNK HECKLER', 390, -1)], [
        { who: 'promoter', text: 'Hey, beard! You gonna write about it or do something about it?' },
        { who: 'oneton', text: 'Both.' },
        { who: null, text: 'He takes off his blazer, folds it twice, and steps into the cage. The heckler is a large man. Was.' },
        { who: null, text: 'One punch. The folding chair does not move. The heckler does.', sfx: 'punch', shake: true, flash: true },
        { who: 'ray', text: 'Holy hell. The reporter can fight.' },
        { who: 'oneton', text: 'The math is Mexican.' },
        { who: 'dane', text: 'What does that even mean?' },
        { who: 'oneton', text: 'It means I don\'t miss.' },
      ], 'THE TRYOUT'),
    ],
    choices: [
      { id: 'offer', label: 'OFFER HIM A TRYOUT' },
      { id: 'ask', label: 'ASK WHAT HE ACTUALLY WANTS' },
      { id: 'write', label: 'TELL HIM TO STICK TO WRITING' },
    ],
  };
}

function outroBackRow(save: StorySave): Cutscene {
  return {
    title: 'CHAPTER 1: THE BEARD IN THE BACK ROW',
    film: true,
    shots: [
      shot('warehouse', [oneton(220, -1), ray(330, 1), dane(120, 1)], [
        { who: null, text: 'Two weeks later. 1ton has a locker, a mouthguard and a notebook with your name in it.' },
        { who: 'ray', text: 'He\'s got hands. He\'s also got a mouth with a mortgage.' },
        { who: 'oneton', text: 'I have been writing about fighters my whole life. I want to know what it feels like to be the sentence.' },
        { who: 'dane', text: 'That is either the best thing you have ever said or the worst.' },
        { who: 'oneton', text: 'Write it down.' },
      ], 'THE SENTENCE'),
    ],
  };
}

// ---------------------------------------------------------------- chapter 2

function introMexicanMath(save: StorySave): Cutscene {
  return {
    title: 'CHAPTER 2: THE MEXICAN MATH',
    film: true,
    shots: [
      shot('lucha', [ray(130, 1), oneton(250, -1), dane(350, 1)], [
        { who: null, text: 'Guadalajara. A gym with a tin roof and a ring that leans left.' },
        { who: 'ray', text: 'Your father fought here?' },
        { who: 'oneton', text: 'Thirty years. Four hundred fights. No headlines.' },
        { who: 'oneton', text: 'He used to say the only thing a Mexican fighter needs is a fair count. He never got one.' },
        { who: 'dane', text: 'So you became a reporter.' },
        { who: 'oneton', text: 'So I became a reporter. Then I met a promoter who kept saying no.' },
        { who: 'dane', text: 'I said no because I did not have a Mexican fighter.' },
        { who: 'oneton', text: 'You do now.' },
        { who: 'ray', text: 'He moves like his knees are held together with tape and spite.' },
        { who: 'oneton', text: 'The tape is Mexican.' },
      ], 'GUADALAJARA, MEXICO'),
      shot('lucha', [oneton(180, -1), ray(290, 1)], [
        { who: 'ray', text: 'The man you are fighting is called El Cuchillo. He has a knife tattoo and a cousin in the commission.' },
        { who: 'oneton', text: 'I wrote about his cousin.' },
        { who: 'ray', text: 'Was it nice?' },
        { who: 'oneton', text: 'It was accurate.' },
      ], 'THE OPPONENT'),
    ],
  };
}

function outroMexicanMath(save: StorySave): Cutscene {
  const won = fightWon(save, storyChapter(save).fight!);
  return {
    title: won ? '1TON WINS' : '1TON LEARNS',
    film: true,
    shots: [
      shot('warehouse', [
        dane(130, 1),
        won ? cuchillo(save, false, 220, -1) : oneton(220, -1),
        bradie(340, -1),
      ], won ? [
        { who: null, text: 'El Cuchillo is on his stool. 1ton is standing. The crowd is doing the thing where they forget how to sit.' },
        { who: 'oneton', text: 'Tell your cousin the press sends its regards.' },
        { who: 'cuchillo', text: 'My cousin does not read.' },
        { who: 'oneton', text: 'Then tell him the math is Mexican.' },
        { who: 'bradie', text: 'That clip is going to do numbers. Bad numbers for him. Great numbers for us.' },
        { who: 'dane', text: 'You won.' },
        { who: 'oneton', text: 'I know. I was there.' },
      ] : [
        { who: null, text: 'El Cuchillo is celebrating. 1ton is on his stool, looking at the canvas like it owes him money.' },
        { who: 'dane', text: 'You lost.' },
        { who: 'oneton', text: 'I learned.' },
        { who: 'dane', text: 'What?' },
        { who: 'oneton', text: 'That the knife brings friends.' },
        { who: 'bradie', text: 'The clip is at nine hundred thousand. My mom has three phones now.' },
      ], won ? 'THE FIRST WIN' : 'THE FIRST LESSON'),
    ],
    choices: [
      { id: 'give_credit', label: 'GIVE HIM THE CREDIT IN THE INTERVIEW' },
      { id: 'take_credit', label: 'TAKE THE CREDIT YOURSELF' },
    ],
  };
}

// ---------------------------------------------------------------- chapter 3

function introBrick(save: StorySave): Cutscene {
  return {
    title: 'CHAPTER 3: BRICK BY BRICK',
    film: true,
    shots: [
      shot('warehouse', [dane(120, 1), gordon(220, -1), ray(320, 1), brick(save, 392, -1)], [
        { who: 'gordon', text: 'Dane. The block is being rezoned. I brought a contractor.' },
        { who: 'brick', text: 'Brick Bastion. I knock things down.' },
        { who: 'dane', text: 'You are going to knock down my warehouse.' },
        { who: 'brick', text: 'I am going to knock down your warehouse, then the condos that replace it. It is a full-service operation.' },
        { who: 'gordon', text: 'Zenith will pay twenty-five thousand for the lease. Or Brick fights your best man for it. Paragraph nine.' },
        { who: 'brick', text: 'I wrote paragraph nine.' },
        { who: 'dane', text: 'My best man is a reporter with a notebook and a knee that clicks.' },
      ], 'THE LANDLORD'),
      shot('warehouse', [dane(110, 1), ray(200, 1), han(save, 300, -1, { enter: 'right' }), gordon(400, -1)], [
        { who: null, text: 'The roller door goes up. Rain, sodium light, and a man with a championship belt over his shoulder and a gym bag that says RAY\'S BOXING & SOUP.' },
        { who: 'ray', text: 'Han.' },
        { who: 'han', text: 'Uncle Ray. You did not call.' },
        { who: 'ray', text: 'You are the middleweight champion of the world. You have people for calls.' },
        { who: 'han', text: 'Trent from strategy wanted me to do a "fan journey". Through a shopping mall. In the belt.' },
        { who: 'dane', text: 'Han Tibular. The last time I saw you, you were beating Spadam Biggs in my building.' },
        { who: 'han', text: 'It is not your building anymore, Mr. Whyte. That is why I am here.' },
        { who: 'gordon', text: 'You are under contract to Zenith.' },
        { who: 'han', text: 'I read it. Paragraph thirty-one says I can fight anywhere my uncle cooks. He cooks here.' },
        { who: 'brick', text: 'I do not care who you are.' },
        { who: 'han', text: 'You will in about four minutes.' },
      ], 'THE PRIDE OF THE MARITIMES'),
    ],
    choices: [
      { id: 'zenith_money', label: 'TAKE ZENITH\'S $25,000 AND LET HAN FIGHT ANYWAY' },
      { id: 'tear_check', label: 'TEAR UP THE CHECK IN GORDON\'S FACE' },
    ],
  };
}

function outroBrick(save: StorySave): Cutscene {
  const won = fightWon(save, storyChapter(save).fight!);
  return {
    title: won ? 'THE BUILDING STAYS' : 'THE BUILDING LEANS',
    film: true,
    shots: [
      shot('warehouse', won ? [dane(110, 1), han(save, 200, 1), brick(save, 290, -1), ray(380, -1)] : [dane(110, 1), han(save, 200, -1, { pose: 'doubled' }), brick(save, 300, 1), ray(390, -1)], won ? [
        { who: null, text: 'Brick is on one knee, holding his jaw like it has a warranty.' },
        { who: 'brick', text: 'You broke my permit.' },
        { who: 'han', text: 'You broke my uncle\'s door.' },
        { who: 'gordon', text: 'The lease stands. Zenith will be in touch.' },
        { who: 'ray', text: 'They are always in touch. It is the touching that worries me.' },
        { who: 'dane', text: 'Han. Whatever Zenith pays you, I cannot.' },
        { who: 'han', text: 'You can pay me in soup. Ray already does.' },
      ] : [
        { who: null, text: 'Even champions have bad nights. Han is on one knee. Brick is not.' },
        { who: 'brick', text: 'Nice building. I am going to put a juice bar where your cage is.' },
        { who: 'ray', text: 'The permit is fake.' },
        { who: 'gordon', text: 'The permit is real. The building is not. That is the beauty of zoning.' },
        { who: 'han', text: 'Run it back.' },
        { who: 'gordon', text: 'Please do. It is in the lease.' },
      ], won ? 'THE LEASE HOLDS' : 'THE LEASE BENDS'),
    ],
  };
}

// ---------------------------------------------------------------- chapter 4

function introSparring(save: StorySave): Cutscene {
  return {
    title: 'CHAPTER 4: THE SPARRING PARTNER',
    film: true,
    shots: [
      shot('gym', [oneton(140, 1), mateo(260, -1), ray(360, 1)], [
        { who: 'mateo', text: 'You are the reporter.' },
        { who: 'oneton', text: 'You are the kid from the soup line.' },
        { who: 'mateo', text: 'I am the kid who owns the soup line now. Ray gave me a key.' },
        { who: 'ray', text: 'I gave him a key to the mop closet.' },
        { who: 'mateo', text: 'It is a start.' },
        { who: 'dane', text: 'You two are sparring. No hard shots. No egos.' },
        { who: 'oneton', text: 'I do not have an ego.' },
        { who: 'mateo', text: 'He has a notebook.' },
        { who: 'oneton', text: 'The notebook has an ego.' },
      ], 'THE KID COMES HOME'),
    ],
  };
}

function outroSparring(save: StorySave): Cutscene {
  const hurt = !!save.flags.mateoHurt;
  return {
    title: 'CHAPTER 4: THE SPARRING PARTNER',
    film: true,
    shots: [
      shot('gym', [oneton(150, 1), mateo(260, -1), dane(370, 1)], [
        hurt
          ? { who: null, text: 'Mateo is on his stool, holding his ribs. 1ton is still wearing his gloves.' }
          : { who: null, text: 'Mateo is on his stool, breathing hard. 1ton is still wearing his gloves.' },
        { who: 'oneton', text: 'I did not mean—' },
        { who: 'mateo', text: hurt ? 'You did. A little.' : 'You did. A little.' },
        { who: 'dane', text: 'It was a sparring session.' },
        { who: 'mateo', text: 'It was a job interview. I just did not know who was hiring.' },
        { who: 'oneton', text: 'I am sorry.' },
        { who: 'mateo', text: 'Say it without the notebook.' },
      ], 'NO HARD SHOTS'),
    ],
    choices: [
      { id: 'apologize', label: 'MAKE 1TON APOLOGIZE TO MATEO' },
      { id: 'toughen', label: 'TELL MATEO TO TOUGHEN UP' },
    ],
  };
}

// ---------------------------------------------------------------- chapter 5

function introAudit(save: StorySave): Cutscene {
  return {
    title: 'CHAPTER 5: THE AUDIT',
    film: true,
    shots: [
      shot('zenith', [verity(130, 1), lenny(240, -1), auditor(340, 1)], [
        { who: 'verity', text: 'Mr. Whyte. Your promotion is an unlicensed fight club with a website.' },
        { who: 'lenny', text: 'The website is the problem. It has an audience.' },
        { who: 'auditor', text: 'I am here to audit your safety compliance, your payroll and your future.' },
        { who: null, text: 'Dane and 1ton are on the other side of the table. The table cost more than the warehouse.' },
      ], 'SIXTY FLOORS UP'),
      shot('warehouse', [dane(120, 1), oneton(210, -1), auditor(320, 1), verity(410, -1)], [
        { who: 'oneton', text: 'I am here to be audited.' },
        { who: 'dane', text: 'That is not a thing.' },
        { who: 'oneton', text: 'It is now.' },
        { who: 'verity', text: 'If Mr. Morales wins, Zenith will recognize the warehouse as a legitimate promotion. If he loses, we will call it an incident and take the lease.' },
        { who: 'auditor', text: 'I have never lost a fight.' },
        { who: 'oneton', text: 'You have never had one.' },
        { who: 'auditor', text: 'I have had settlements.' },
      ], 'THE AUDIT'),
    ],
  };
}

function outroAudit(save: StorySave): Cutscene {
  return {
    title: 'CHAPTER 5: THE AUDIT',
    film: true,
    shots: [
      shot('lot', [oneton(160, 1), verity(280, -1), lenny(380, 1)], [
        { who: null, text: 'The parking lot after the audit. Verity Kane is holding a card. The card is black. The card is always black.' },
        { who: 'verity', text: 'When you are tired of being somebody\'s answer, call me.' },
        { who: 'oneton', text: 'I am not somebody\'s answer.' },
        { who: 'verity', text: 'Not yet.' },
        { who: 'lenny', text: 'The card is also a non-disclosure agreement.' },
      ], 'THE PARKING LOT'),
      shot('warehouse', [dane(160, 1), oneton(280, -1), ray(380, 1)], [
        { who: 'dane', text: 'What did she want?' },
        { who: 'oneton', text: 'To audit me.' },
        { who: 'ray', text: 'People do not hand out black cards for auditing.' },
        { who: 'oneton', text: 'Some people do.' },
      ], 'WHAT DID SHE WANT'),
    ],
    choices: [
      { id: 'confront', label: 'CONFRONT 1TON ABOUT THE CARD' },
      { id: 'ignore', label: 'SAY NOTHING' },
    ],
  };
}

// ---------------------------------------------------------------- chapter 6

function introBoard(save: StorySave): Cutscene {
  return {
    title: 'CHAPTER 6: THE BOARD',
    film: true,
    shots: [
      shot('zenith', [verity(110, 1), chairman(260, -1), lenny(390, 1)], [
        { who: 'verity', text: 'The board has approved a corporate exhibition.' },
        { who: 'lenny', text: 'It is not a fight. It is a brand activation with a cage.' },
        { who: 'chairman', text: 'I can fight.' },
        { who: 'verity', text: 'The Chairman is a legacy asset.' },
        { who: 'chairman', text: 'I have never lost a board meeting.' },
        { who: null, text: 'Dane and 1ton are in the doorway. Nobody offers them a chair.' },
      ], 'THE BOARDROOM'),
      shot('warehouse', [dane(130, 1), oneton(250, -1), chairman(380, 1)], [
        { who: 'dane', text: 'The board cannot fight.' },
        { who: 'chairman', text: 'I can.' },
        { who: 'oneton', text: 'What are the stakes?' },
        { who: 'verity', text: 'Your debt. Your building. Your future. We will take all three.' },
        { who: 'dane', text: 'And if we win?' },
        { who: 'verity', text: 'We will forgive the debt and call it community outreach.' },
        { who: 'chairman', text: 'I have never lost a board meeting.' },
        { who: 'oneton', text: 'This is a fight.' },
        { who: 'chairman', text: 'Same thing.' },
      ], 'THE EXHIBITION'),
    ],
  };
}

function outroBoard(save: StorySave): Cutscene {
  const won = fightWon(save, storyChapter(save).fight!);
  return {
    title: won ? 'THE BOARD CONCEDES' : 'THE BOARD PREVAILS',
    film: true,
    shots: [
      shot('warehouse', [oneton(160, 1), dane(280, -1), bradie(390, 1)], [
        won
          ? { who: null, text: 'The Chairman is sitting on the canvas in a suit that cost more than the purse. 1ton is standing over him, breathing like a man who has just been promoted.' }
          : { who: null, text: '1ton is on his stool. The Chairman is straightening his tie. The tie is not straight. Neither is the story.' },
        { who: 'bradie', text: 'The clip is at two million. Zenith stock is down. My mom has three phones now.' },
        { who: 'oneton', text: 'I want the main event.' },
        { who: 'dane', text: 'You just had it.' },
        { who: 'oneton', text: 'I want the next one. And the one after that. And my name over the door.' },
        { who: 'dane', text: 'Your name is over the door.' },
        { who: 'oneton', text: 'Not yet.' },
      ], won ? 'THE MAIN EVENT' : 'THE MAIN EVENT, LATER'),
    ],
    choices: [
      { id: 'main_event', label: 'GIVE HIM THE MAIN EVENT' },
      { id: 'co_main', label: 'KEEP HIM AS CO-MAIN' },
    ],
  };
}

// ---------------------------------------------------------------- chapter 7

function introRematch(save: StorySave): Cutscene {
  return {
    title: 'CHAPTER 7: THE REMATCH NOBODY ASKED FOR',
    film: true,
    shots: [
      shot('presser', [dane(90, 1), han(save, 190, 1), cuchilloSuit(300, -1), lenny(410, -1)], [
        { who: 'cuchillo', text: 'The warehouse has a champion now. The warehouse should not have nice things.' },
        { who: 'han', text: 'You lost to 1ton. 1ton used to be a reporter.' },
        { who: 'cuchillo', text: 'He was a very physical reporter.' },
        { who: 'lenny', text: 'The rematch is for a Zenith television slot. Winner takes the slot. Loser takes the bus.' },
        { who: 'cuchillo', text: 'I brought a knife.' },
        { who: 'dane', text: 'To a press conference?' },
        { who: 'cuchillo', text: 'It is a metaphor.' },
        { who: 'han', text: 'It is a knife. Uncle Ray, he brought a knife.' },
        { who: null, text: 'In the third row, 1ton writes something down and does not look up. He has stopped asking questions at pressers. That is new.' },
      ], 'THE PRESS CONFERENCE'),
    ],
  };
}

function outroRematch(save: StorySave): Cutscene {
  const won = fightWon(save, storyChapter(save).fight!);
  return {
    title: won ? 'THE SLOT IS YOURS' : 'THE SLOT IS HIS',
    film: true,
    shots: [
      shot('cage', [dane(110, 1), han(save, 200, 1), oneton(320, -1, { look: CAST.oneton })], [
        won
          ? { who: null, text: 'El Cuchillo leaves on a stretcher with a metaphor in his hand. 1ton watched the whole fight from the third row.' }
          : { who: null, text: 'El Cuchillo leaves with the television slot. 1ton watched the whole fight from the third row.' },
        { who: 'oneton', text: won ? 'He made it look easy.' : 'Even he looked human out there.' },
        { who: 'dane', text: 'You were supposed to be in his corner.' },
        { who: 'oneton', text: 'You did not ask.' },
        { who: 'han', text: 'Since when do you need an invitation?' },
        { who: 'oneton', text: 'Since Zenith started sending them. Gold envelope. Very heavy paper.' },
      ], won ? 'THE WATCHER' : 'THE WATCHER, AGAIN'),
    ],
    choices: [
      { id: 'ask_why', label: 'ASK HIM WHY HE DID NOT HELP' },
      { id: 'thank', label: 'THANK HIM FOR WATCHING' },
    ],
  };
}

// ---------------------------------------------------------------- chapter 8

function introBrother(save: StorySave): Cutscene {
  return {
    title: 'CHAPTER 8: THE BROTHER YOU MADE',
    film: true,
    shots: [
      shot('locker', [oneton(130, 1), mateo(260, -1), dane(380, 1)], [
        { who: 'oneton', text: 'They booked me against the kid.' },
        { who: 'dane', text: 'Then do not fight him.' },
        { who: 'oneton', text: 'They are paying me to be the guy who does not ask.' },
        { who: 'mateo', text: 'You do not have to do this.' },
        { who: 'oneton', text: 'I know.' },
        { who: 'mateo', text: 'Then do not.' },
        { who: 'oneton', text: 'I know.' },
        { who: 'dane', text: '1ton.' },
        { who: 'oneton', text: 'I know.' },
      ], 'THE BOOKING'),
    ],
  };
}

function outroBrother(save: StorySave): Cutscene {
  const hurt = !!save.flags.mateoHurt;
  return {
    title: 'CHAPTER 8: THE BROTHER YOU MADE',
    film: true,
    shots: [
      shot('cage', hurt ? [mateo(180, -1, { pose: 'doubled' }), oneton(300, 1), dane(410, -1)] : [mateo(180, -1), oneton(300, 1), dane(410, -1)], hurt ? [
        { who: null, text: 'Mateo is on the canvas. The referee is late. The photograph is early.' },
        { who: 'oneton', text: 'They wanted a message.' },
        { who: 'dane', text: 'You delivered it.' },
        { who: 'oneton', text: 'No. They wanted a message from you. I delivered mine.' },
      ] : [
        { who: null, text: 'Mateo is on his feet. 1ton is on his feet. Nobody is celebrating.' },
        { who: 'oneton', text: 'They wanted a message.' },
        { who: 'dane', text: 'You did not deliver it.' },
        { who: 'oneton', text: 'Not tonight.' },
      ], hurt ? 'THE MESSAGE' : 'THE MESSAGE, WITHHELD'),
      shot('cage', [oneton(160, 1), verity(270, -1), lenny(370, 1), dane(90, 1)], [
        { who: 'verity', text: 'Mr. Morales. The offer stands. Your own promotion. Your own roster. Your own name.' },
        { who: 'dane', text: 'You are not ready.' },
        { who: 'oneton', text: 'You are not listening. I am not asking.' },
        { who: 'oneton', text: 'You built me to be a weapon, Dane. You just did not think I would point myself at you.' },
        { who: 'dane', text: 'I built you a cage.' },
        { who: 'oneton', text: 'You built me a home. Then you put a lock on it.' },
        { who: null, text: 'Ray is outside. He has been outside the whole time, holding a bucket and waiting for a kid who is not coming out.' },
      ], 'THE TURN'),
      shot('street', [ray(140, 1), duke(255, -1), rico(335, -1), cesar(410, -1)], [
        { who: null, text: 'The loading dock. 11:41 PM. Three men in 1ton\'s colours, one old man in a cardigan.' },
        { who: 'ray', text: 'The kid is not yours.' },
        { who: 'duke', text: 'The kid signed.' },
        { who: 'ray', text: 'He signed a contract. Not a person.' },
        { who: 'rico', text: 'Walk away, old man.' },
        { who: 'ray', text: 'I have been walking away since before you could drive.' },
        { who: null, text: 'Ray hits Duke first. A right hand, old and heavy. Duke\'s nose goes sideways. For one second the street remembers who Uncle Ray used to be.' },
        { who: 'duke', text: 'Hold him.' },
        { who: null, text: 'Rico hits him with the payphone. Cesar catches him before he falls. Then Cesar hits him again.' },
        { who: 'cesar', text: 'He said the old man was a loose end.' },
        { who: null, text: 'They leave him on the pavement. The bucket rolls into the gutter. The payphone rings once and stops.' },
        { who: 'ray', text: 'Tell him... tell the kid the soup is off.' },
      ], 'THE STREET  /  11:41 PM'),
      shot('street', [han(save, 165, 1), ray(300, 1, { pose: 'down' }), dane(80, 1)], [
        { who: null, text: 'Han gets there eleven minutes later. The ambulance gets there in nine. The math is not on anybody\'s side.' },
        { who: 'han', text: 'Ray. Uncle Ray. Stay with me.' },
        { who: 'ray', text: 'You were always late to the weigh-in.' },
        { who: 'han', text: 'Who did this?' },
        { who: 'ray', text: 'The same people who made him. Do not... do not do it for me.' },
        { who: 'han', text: 'Then who do I do it for?' },
        { who: 'ray', text: 'Mateo. Make sure he eats something. Hands up. Chin down.' },
        { who: null, text: 'Uncle Ray dies at 11:58 PM on a Tuesday, outside the building where he taught a generation of fighters to keep their hands up. Marie\'s soup is still on the stove at the gym.' },
        { who: null, text: 'The police take statements. The papers take photographs. 1ton does not come out of the arena.' },
      ], 'THE STREET  /  11:58 PM'),
    ],
    choices: [
      { id: 'hold', label: 'STAY WITH RAY UNTIL THE AMBULANCE' },
      { id: 'hunt', label: 'PUT THEIR NAMES ON THE WALL' },
    ],
  };
}

// ---------------------------------------------------------------- chapter 9

function introCrew(save: StorySave): Cutscene {
  return {
    title: 'CHAPTER 9: THE CREW',
    film: true,
    shots: [
      shot('gym', [dane(110, 1), han(save, 210, 1), bigMateo(save, 310, -1), bradie(400, -1)], [
        { who: null, text: 'The gym is closed. The soup pot is cold. Ray\'s cardigan is folded on the stool where he used to watch the door.' },
        { who: 'bradie', text: 'The funeral is Thursday. The police want a statement.' },
        { who: 'dane', text: 'I gave them one. I gave them three names.' },
        { who: 'mateo', text: 'They already had three names.' },
        { who: null, text: 'Duke Kessler. Rico Alvarez. Cesar Rios. Three men who work for 1ton Morales and have never had to hide.' },
        { who: 'dane', text: 'I am a promoter, Han. I can book them. I cannot fight them.' },
        { who: 'han', text: 'Then book them. All three. One at a time.' },
        { who: 'dane', text: 'Cesar is a light heavyweight.' },
        { who: 'han', text: 'Then I am moving up.' },
        { who: 'mateo', text: 'You have never fought at light heavyweight.' },
        { who: 'han', text: 'Ray never fought at seventy. He hit Duke anyway.' },
        { who: 'bradie', text: 'That is not a plan. That is a list.' },
        { who: 'dane', text: 'It is the same thing with better lighting.' },
      ], 'THE FUNERAL, THREE DAYS LATER'),
      shot('street', [han(save, 145, 1), duke(285, -1)], [
        { who: null, text: 'The alley behind Ray\'s. Duke Kessler is waiting by the door he used to work. He is not hiding.' },
        { who: 'duke', text: 'The old man hit like a door.' },
        { who: 'han', text: 'He taught me how.' },
        { who: 'duke', text: 'You should have stayed a champion.' },
        { who: 'han', text: 'I am. That is the problem you have tonight.' },
      ], 'NAME ONE'),
    ],
  };
}

/** Chapter nine, halfway: three weeks into the move up, Han's knee goes. Mateo takes Cesar. */
function hanInjury(save: StorySave): Shot[] {
  return [
    shot('gym', [han(save, 170, 1, { pose: 'doubled' }), bigMateo(save, 290, -1), dane(390, -1)], [
      { who: null, text: 'Three weeks into the cut up to light heavyweight. Two hundred and four pounds. A single leg on the heavy bag Ray hung in 1998.' },
      { who: null, text: 'The knee makes a sound like a folding chair.', shake: true, sfx: 'snap' },
      { who: 'han', text: 'That is fine. That is fine. That is not fine.' },
      { who: 'dane', text: 'The doctor says eight months.' },
      { who: 'han', text: 'Cesar is in three weeks.' },
      { who: 'mateo', text: 'Then I have three weeks.' },
      { who: null, text: 'Mateo Varga. Twenty-one. Two hundred and five pounds. The kid in the hoodie three sizes too big grew into it, then out of it, then got the whole of Ray\'s menu tattooed down his left arm.' },
      { who: 'han', text: 'You are not ready.' },
      { who: 'mateo', text: 'Ray said nobody is. He said you go anyway and eat something after.' },
      { who: 'han', text: '...Hands up. Chin down.' },
      { who: 'mateo', text: 'Eat something.' },
    ], 'THE KNEE'),
  ];
}

function outroCrew(save: StorySave): Cutscene {
  const wins = ['crew_duke', 'crew_rico', 'crew_cesar'].filter((id) => save.flags[`won_${id}`] === true).length;
  const all = wins === 3;
  return {
    title: 'CHAPTER 9: THE CREW',
    film: true,
    shots: [
      shot('street', [dane(110, 1), han(save, 210, 1), bigMateo(save, 310, -1), bradie(400, -1)], [
        { who: null, text: all
          ? 'Three names. Three men on the pavement. None of them dead. That is the difference between Ray\'s boys and the man 1ton became.'
          : `${wins} of the three names came off the napkin. The others are still walking around with 1ton\'s number in their phone.` },
        { who: 'mateo', text: 'The police found the payphone.' },
        { who: 'han', text: 'Good.' },
        { who: 'mateo', text: 'In a dumpster. They did not find Rico.' },
        { who: 'han', text: 'I found Rico.' },
        { who: 'bradie', text: '1ton called the gym. He said he paid for the flowers.' },
        { who: 'mateo', text: 'The card said "sorry for the math."' },
        { who: 'dane', text: 'Zenith just put their light heavyweight belt on him. The buyback rides on it. One night. Five rounds.' },
        { who: 'han', text: 'My knee says eight months.' },
        { who: 'mateo', text: 'Then it is me.' },
        { who: null, text: 'The contract arrives the next morning. MATEO VARGA vs 1TON. Ray\'s bucket is in the corner. Nobody moves it.' },
      ], all ? 'THREE FOR THREE' : 'THE NAPKIN'),
    ],
  };
}

// ---------------------------------------------------------------- chapter 10

function introBuyback(save: StorySave): Cutscene {
  return {
    title: 'CHAPTER 10: THE BUYBACK',
    film: true,
    shots: [
      shot('locker', [dane(110, 1), han(save, 210, 1, { pose: 'headDown' }), bigMateoFight(save, 320, -1), bradie(410, -1, { pose: 'stand' })], [
        { who: null, text: 'The locker room is smaller than it used to be. Ray\'s bucket is on the bench. Han is on crutches. Nobody moves either of them.' },
        { who: 'mateo', text: 'He used to say the crowd is a liar.' },
        { who: 'han', text: 'He said that about the judges.' },
        { who: 'mateo', text: 'He said it about everybody.' },
        { who: 'dane', text: 'If you lose, Zenith keeps the company and 1ton keeps the belt.' },
        { who: 'mateo', text: 'And if I win?' },
        { who: 'dane', text: 'Then you are the light heavyweight champion of the world, and I owe you a lot more than soup.' },
        { who: 'han', text: 'He tells everybody "no hard shots" and then throws the overhand. Wait for it. Duck it. Then make him pay for every question he ever asked.' },
      ], 'THE OLD DOME'),
      shot('cage', [bigMateoFight(save, 140, 1), oneton(300, -1, { enter: 'right' }), verity(400, -1), lenny(445, -1)], [
        { who: null, text: 'The Old Dome. Eighteen thousand people. A jumbotron that says THE MEXICAN MATH in three languages and one font.' },
        { who: 'oneton', text: 'I remember you. Twelve years old. A mop and a hoodie.' },
        { who: 'mateo', text: 'I remember you. Back row. A notebook.' },
        { who: 'oneton', text: 'You know what Dane\'s problem is? He never answered my question.' },
        { who: 'mateo', text: 'When is he going to put a Mexican fighter in the main event?' },
        { who: 'oneton', text: 'Tonight. And he still lost.' },
        { who: null, text: 'The crowd waits. Ray\'s bucket is in Mateo\'s corner, empty, and everybody in the building can see it.' },
      ], 'THE MAIN EVENT'),
    ],
    choices: [
      { id: 'apologize_final', label: 'DANE: APOLOGIZE TO 1TON. MEAN IT.' },
      { id: 'thank_final', label: 'DANE: THANK HIM FOR THE YEARS' },
      { id: 'threaten_final', label: 'DANE: TELL HIM YOU MADE HIM' },
    ],
  };
}

function outroBuyback(save: StorySave): Cutscene {
  const winner = String(save.flags.finalWinner ?? '');
  const won = winner === 'player';
  const draw = winner === 'draw';
  return {
    title: won ? 'AND NEW' : draw ? 'A DRAW' : 'AND STILL',
    film: true,
    shots: [
      shot('cage', won ? [bigMateoFight(save, 220, 1, { pose: 'armUp' }), oneton(320, -1, { pose: 'doubled' })] : draw ? [bigMateoFight(save, 220, -1, { pose: 'doubled' }), oneton(310, 1, { pose: 'doubled' })] : [oneton(220, 1), bigMateoFight(save, 320, -1, { pose: 'doubled' })], won ? [
        { who: null, text: '1ton is on the canvas. The beard is flat. The crowd is not.' },
        { who: 'oneton', text: 'You hit like Ray.' },
        { who: 'mateo', text: 'Ray hit like Ray.' },
        { who: null, text: 'Verity Kane tears up a contract at cageside. She does it neatly. She folds the pieces. The company is coming home.' },
        { who: null, text: 'A microphone is in Mateo\'s face before the belt is round his waist. Han is standing up on his good knee, clapping, crying, pretending he is not crying.' },
      ] : draw ? [
        { who: null, text: 'Both men are on the canvas. Neither is getting up first.' },
        { who: 'mateo', text: 'I cannot believe we did this.' },
        { who: 'oneton', text: 'I can. I wrote it down.' },
        { who: 'lenny', text: 'A draw is a win for Zenith. Technically. Legally. Emotionally.' },
      ] : [
        { who: null, text: 'Mateo is on one knee. 1ton Morales is standing. The crowd is making a sound that has not been invented yet.' },
        { who: 'oneton', text: 'Ask me the question, Dane.' },
        { who: 'dane', text: 'When are you going to put a Mexican fighter in the main event?' },
        { who: 'oneton', text: 'I just did.' },
      ], won ? 'THE NEW CHAMPION' : draw ? 'EVERYBODY LOSES' : 'THE NEW PRESIDENT'),
    ],
    choices: won ? [
      { id: 'callout_han', label: 'MATEO: "HAN. I WANT YOUR BELT. HERE. IN THE WAREHOUSE."' },
      { id: 'defend_belt', label: 'MATEO: "THIS BELT STAYS HOME. WHO\'S NEXT?"' },
    ] : undefined,
  };
}

function introLegacy(save: StorySave): Cutscene {
  const torch = save.choices.ch_buyback === 'callout_han';
  return {
    title: 'CHAPTER 11: THE TORCH',
    film: true,
    shots: torch ? [
      shot('gym', [hanFight(save, 170, 1), bigMateoFight(save, 300, -1), dane(400, -1)], [
        { who: null, text: 'Eight months later. The knee is healed. The soup is on. The cage in the warehouse has two champions in it and one of them is going to leave without a belt.' },
        { who: 'han', text: 'Ray would have hated this.' },
        { who: 'mateo', text: 'Ray would have sold tickets.' },
        { who: 'han', text: 'Ray would have hated this and sold tickets.' },
        { who: 'dane', text: 'It sold out in four minutes. 1ton bought a ticket. Back row.' },
        { who: 'han', text: 'I am not going to take it easy on you.' },
        { who: 'mateo', text: 'If you did I would never forgive you.' },
        { who: 'han', text: 'Hands up.' },
        { who: 'mateo', text: 'Chin down.' },
      ], 'SECRET FIGHT  /  CHAMPION vs CHAMPION'),
    ] : [
      shot('presser', [dane(110, 1), bigMateo(save, 210, 1), cesar(330, -1), han(save, 420, -1)], [
        { who: null, text: 'Cesar Rios made bail, made weight and made the number-one ranking. America is a land of opportunity.' },
        { who: 'cesar', text: 'You got lucky. Your friend got hurt. You got his fight. You got my fight.' },
        { who: 'mateo', text: 'I got your fight and I got your number. Come and get it back.' },
        { who: 'han', text: 'He is going to try to make it ugly. Let him. Ugly is where you grew up.' },
      ], 'FIRST DEFENSE'),
    ],
  };
}

function outroLegacy(save: StorySave): Cutscene {
  const torch = save.choices.ch_buyback === 'callout_han';
  const won = torch ? save.flags.legacyWinner === 'mateo' : save.flags.defenseWinner === 'mateo';
  return {
    title: torch ? (won ? 'THE TORCH' : 'NOT YET, KID') : won ? 'THE CHAMPION' : 'ONE GOOD NIGHT',
    film: true,
    shots: [
      shot('cage', torch ? [hanFight(save, 200, 1), bigMateoFight(save, 300, -1, { pose: won ? 'armUp' : 'stand' })] : [bigMateoFight(save, 220, 1, { pose: won ? 'armUp' : 'doubled' }), cesar(320, -1)], torch ? (won ? [
        { who: null, text: 'Han gets up slowly. He picks the middleweight belt up off the canvas himself.' },
        { who: 'han', text: 'Ray said one day a kid would walk in the door and be better than me. He said I would hate it.' },
        { who: 'mateo', text: 'Do you?' },
        { who: 'han', text: 'No.' },
        { who: null, text: 'He buckles the belt around Mateo\'s waist. In the back row, 1ton closes the notebook and, for the first time in his life, does not write anything down.' },
      ] : [
        { who: null, text: 'Han wins. Barely. He spends the whole interview talking about the kid.' },
        { who: 'han', text: 'Monday. Six a.m.' },
        { who: 'mateo', text: 'I will be there at five-forty.' },
        { who: 'han', text: 'I know. That is why it is not yet. Not never.' },
      ]) : won ? [
        { who: null, text: 'Cesar is on the canvas where Ray fell, in a manner of speaking. The belt stays in the warehouse.' },
        { who: 'mateo', text: 'This one is for the soup.' },
        { who: 'han', text: 'Next year, kid. You and me.' },
      ] : [
        { who: null, text: 'La Mano takes the belt. Mateo had one good night. He will always have it.' },
        { who: 'han', text: 'Monday. Six a.m.' },
      ], torch ? 'THE WAREHOUSE' : 'THE OLD DOME'),
    ],
  };
}

// ---------------------------------------------------------------- talk scenes

/** The young men in the flashbacks: Ray at 33 in the Golden Gloves final, Butch and his mullet, Han's dad on the wharf. */
const RAY_1987 = { ...CAST.ray, hairColor: 0x3a2a1e, beard: 1, build: 1, outfit: undefined, trunks: 0x8a1a1a, trim: 0xe8d8b0, glove: 0x8a1a1a };
const BUTCH_1987 = { ...CAST.promoter, hairStyle: 5, hairColor: 0x8a6a3a, beard: 2, build: 2, outfit: undefined, trunks: 0x1a3a8a, trim: 0xe8e8e8, glove: 0x1a3a8a };
const MARC_TIBULAR = { ...CAST.ray, skin: 0xe2b392, hairStyle: 2, hairColor: 0x5a3a22, beard: 2, build: 2, outfit: { top: 0xd8a020, bottom: 0x2a3a5a, shirt: 0x3a3a3a, bulk: 2, hands: 0xe2b392 } };
const HAN_15 = { ...CAST.mateo, skin: 0xe2b392, hairStyle: 9, hairColor: 0x6a4a2a, build: 0, outfit: { top: 0x2a5a8a, bottom: 0x2a2a30, bulk: 2, hands: 0xe2b392 } };

/** A talk's three answers: each one is said, and answered, on screen. */
const answers = (honest: [string, Line[]], coach: [string, Line[]], cold: [string, Line[]]) => [
  { id: 'honest', label: honest[0], reply: honest[1] },
  { id: 'coach', label: coach[0], reply: coach[1] },
  { id: 'cold', label: cold[0], reply: cold[1] },
];

export function talkScene(save: StorySave): Cutscene | null {
  const ch = storyChapter(save);
  switch (ch.talk) {
    case 'notebook':
      return {
        title: 'THE NOTEBOOK',
        film: true,
        shots: [
          shot('warehouse', [oneton(200, -1), dane(330, 1), ray(410, -1)], [
            { who: null, text: 'Closing time. 1ton is still in the back row. Ray is stacking chairs around him like he is a pillar.' },
            { who: null, text: '1ton opens the notebook. Every page is a Mexican fighter you did not sign.' },
            { who: 'oneton', text: 'Forty-one names. Fourteen champions. Six of them fought on your prelims and never got a second call.' },
            { who: 'dane', text: 'That is not personal.' },
            { who: 'oneton', text: 'It is not personal to you. That is the problem.' },
            { who: 'ray', text: 'The man has a point, Dane. He also has my good chair.' },
          ], 'THE NOTEBOOK'),
          shot('warehouse', [dane(150, 1), npc('xavier', 'XAVIER "ALLSTAR" COCKETT', 290, -1, { enter: 'right' }), oneton(390, -1)], [
            { who: null, text: 'The roller door goes up. Boots. A cowboy hat. A horse trailer idling in the lot.' },
            { who: 'xavier', text: 'Dane Whyte! I heard Zenith threw you out. I started a league. Two, technically. One of them is in a barn.' },
            { who: 'dane', text: 'Xavier. Han\'s first promoter. You still owe him four hundred dollars.' },
            { who: 'xavier', text: 'I owe everybody four hundred dollars. It is a business model. You need fighters, I need a building with a roof. Call me.' },
            { who: null, text: 'He leaves a business card. It is a playing card with a phone number on it. The ace of spades.' },
          ], 'THE COWBOY'),
        ],
        choices: answers(
          ['"You are right. I never looked."', [
            { who: 'dane', text: 'You are right. I had the CBFC for eleven years and I never looked past the first three names on a list.' },
            { who: 'oneton', text: '...Nobody has ever said that to me.' },
            { who: 'ray', text: 'Now the hard bit. What are you going to do about it?' },
            { who: 'dane', text: 'Start with him.' },
            { who: null, text: '1ton closes the notebook. He looks at it like it might not need to exist any more.' },
          ]],
          ['"Then get in the cage and make me look."', [
            { who: 'dane', text: 'You want a Mexican fighter in the main event? Then get in the cage and make me look.' },
            { who: 'oneton', text: 'I am a reporter.' },
            { who: 'ray', text: 'You have a fighter\'s hands. I noticed when you were holding my chair hostage.' },
            { who: 'oneton', text: '...Six a.m.?' },
            { who: 'ray', text: 'Six a.m. Bring the notebook. Write down how much it hurts.' },
          ]],
          ['"Write whatever you want. Nobody reads it."', [
            { who: 'dane', text: 'Write whatever you want. Nobody reads the Lucha Lowdown.' },
            { who: 'oneton', text: 'Forty thousand people read it.' },
            { who: 'dane', text: 'Forty thousand people read the back of cereal boxes.' },
            { who: null, text: '1ton writes something down. He underlines it. Ray sighs and keeps stacking chairs.' },
            { who: 'ray', text: 'You have been a promoter too long, Dane. You forgot how to talk to people.' },
          ]],
        ),
      };
    case 'father':
      return {
        title: 'THE MASK',
        film: true,
        shots: [
          shot('lucha', [oneton(180, 1), dane(320, -1), ray(400, -1)], [
            { who: null, text: 'He takes a mask out of a shoebox. It is red and silver and older than both of you.' },
            { who: 'oneton', text: 'My father wore this in Guadalajara. He lost it in a mask-versus-mask match in 1989.' },
            { who: 'dane', text: 'He lost his mask?' },
            { who: 'oneton', text: 'He lost his name. The mask was the only thing they let him keep.' },
            { who: 'ray', text: 'Mine lost me to a gym. Same thing, smaller shoebox.' },
            { who: 'oneton', text: 'I want to find out what is under it.' },
          ], 'THE SHOEBOX'),
        ],
        choices: answers(
          ['"Then we find out together."', [
            { who: 'dane', text: 'Then we find out together. In the cage, under the lights, with his mask in your corner.' },
            { who: 'oneton', text: 'You would put it in my corner?' },
            { who: 'ray', text: 'I will put it on the bucket. Nobody touches the bucket.' },
            { who: null, text: '1ton laughs, for the first time since you met him. It is a big laugh. It does not fit the beard.' },
          ]],
          ['"Your father would be proud."', [
            { who: 'dane', text: 'Your father would be proud of you.' },
            { who: 'oneton', text: 'You never met him.' },
            { who: 'dane', text: 'I met you.' },
            { who: 'ray', text: 'That was nice, Dane. Write that one down, reporter.' },
            { who: 'oneton', text: 'I already did.' },
          ]],
          ['"Masks sell. Wear it on the poster."', [
            { who: 'dane', text: 'Masks sell. Wear it on the poster.' },
            { who: null, text: '1ton puts the mask back in the shoebox very carefully, and closes the lid.' },
            { who: 'oneton', text: 'No.' },
            { who: 'ray', text: 'Some things are not merchandise, Dane.' },
            { who: 'dane', text: 'Everything is merchandise, Ray.' },
            { who: 'ray', text: 'Then why do you still have your dad\'s watch?' },
          ]],
        ),
      };
    case 'gordon':
      return {
        title: 'THE LANDLORD',
        film: true,
        shots: [
          shot('warehouse', [gordon(180, -1), dane(310, 1), ray(390, -1)], [
            { who: 'gordon', text: 'Dane. I have known you for eleven years. You have never once paid rent on time.' },
            { who: 'dane', text: 'I have paid it eleven times.' },
            { who: 'gordon', text: 'Late is late. Zenith is early. That is the whole difference between us.' },
            { who: 'ray', text: 'Gordon. We boxed when we were nine. You cried when you got a nosebleed.' },
            { who: 'gordon', text: 'I was eight. And that was allergies, Raymond.' },
          ], 'THE LEASE'),
        ],
        choices: answers(
          ['"Your son mops Ray\'s floor now. Ask him why."', [
            { who: 'dane', text: 'Tyler mops Ray\'s floor now. Six a.m., every Monday. Ask him why.' },
            { who: 'gordon', text: '...He does not take my calls.' },
            { who: 'ray', text: 'He takes mine. He asks about you. Every week.' },
            { who: null, text: 'Gordon Vance looks at the floor for a long time. It is very clean. Tyler did a good job.' },
            { who: 'gordon', text: 'The rent is due on the first. ...The fifth. The fifth is fine.' },
          ]],
          ['"Give me one season. You get a cut."', [
            { who: 'dane', text: 'One season. You get two percent of the gate.' },
            { who: 'gordon', text: 'Five.' },
            { who: 'dane', text: 'Three, and Ray makes you soup.' },
            { who: 'ray', text: 'I am not making him soup.' },
            { who: 'gordon', text: 'Three. And he makes me soup.' },
          ]],
          ['"Sell it to Zenith. See if they keep you."', [
            { who: 'dane', text: 'Sell it to Zenith. See how long they keep a landlord around once they own the land.' },
            { who: 'gordon', text: 'That is a threat.' },
            { who: 'dane', text: 'That is a forecast.' },
            { who: null, text: 'Gordon leaves. He takes a photo of the fire exit on his way out. That is never good.' },
          ]],
        ),
      };
    case 'mateo':
      return {
        title: 'THE KID',
        film: true,
        shots: [
          shot('gym', [mateo(170, 1), ray(270, -1), dane(380, -1)], [
            { who: null, text: 'Ray\'s Boxing & Soup, after hours. Ray is taping Mateo\'s hands, slowly, the way he taped Han\'s.' },
            { who: 'ray', text: 'Over the knuckles. Under the thumb. Not so tight your fingers go blue. You remember what I said the first day?' },
            { who: 'mateo', text: '"You\'re not that good yet, but you\'re cheap."' },
            { who: 'ray', text: 'You are still cheap.' },
            { who: 'mateo', text: 'Dane, they want me on a Zenith undercard. Real money. My nan\'s rent.' },
            { who: 'ray', text: 'He is nineteen. I would like him to be twenty.' },
          ], 'THE HANDS'),
        ],
        choices: answers(
          ['"Not yet. You fight here first."', [
            { who: 'dane', text: 'Not yet. You fight here first, where Ray can see you.' },
            { who: 'mateo', text: 'And my nan\'s rent?' },
            { who: 'dane', text: 'I will cover it.' },
            { who: 'ray', text: 'He cannot cover it.' },
            { who: 'dane', text: 'I will find a way to cover it.' },
            { who: 'mateo', text: '...Okay. Okay. Thank you.' },
          ]],
          ['"Take it. Ray goes with you."', [
            { who: 'dane', text: 'Take it. Ray works your corner.' },
            { who: 'ray', text: 'I am seventy.' },
            { who: 'dane', text: 'You are the best cutman in the Maritimes.' },
            { who: 'ray', text: 'I am the ONLY cutman in the Maritimes.' },
            { who: 'mateo', text: 'Is that a yes?' },
            { who: 'ray', text: 'Bring a sandwich. They never feed the corners.' },
          ]],
          ['"Money is money. Sign it."', [
            { who: 'dane', text: 'Money is money, kid. Sign it.' },
            { who: 'ray', text: 'Dane.' },
            { who: 'dane', text: 'He wants to help his nan. That is a good reason to get punched.' },
            { who: null, text: 'Ray finishes the tape in silence. When he is done he holds both of Mateo\'s hands for a second, like he is checking them for something.' },
          ]],
        ),
      };
    case 'ray':
      return {
        title: 'THE OLD MAN',
        film: true,
        shots: [
          shot('gym', [ray(180, 1), oneton(300, -1)], [
            { who: null, text: 'Five a.m. The gym is dark except for the soup. 1ton has been hitting the bag for an hour. Ray has been pretending not to watch.' },
            { who: 'ray', text: 'You drop your right when you throw the jab. Everybody from a newsroom does that.' },
            { who: 'oneton', text: 'Did you ever lose, Ray?' },
            { who: 'ray', text: 'Golden Gloves final. 1987. A man called Butch.' },
          ], 'FIVE A.M.'),
          { ...shot('gym', [npc('ray87', 'RAY, 1987', 180, 1, { look: RAY_1987, pose: 'guard' }), npc('butch', 'BUTCH', 300, -1, { look: BUTCH_1987, pose: 'guard' })], [
            { who: null, text: 'Moncton Coliseum. Three thousand people. A thirty-three-year-old electrician with a right hand and a wife in the third row.' },
            { who: 'ray87', text: 'Marie! MARIE! Third round, I promise!', poses: { ray87: 'pointUp' } },
            { who: null, text: 'Butch, mullet and all, hits him with a left hook he never saw.', shake: true, sfx: 'punch', poses: { ray87: 'rocked', butch: 'leadHook' } },
            { who: null, text: 'Ray gets up at nine. Loses on the cards. Marie meets him at the bus with two bowls of soup in a thermos.', poses: { ray87: 'headDown', butch: 'stand' } },
          ], '1987  /  GOLDEN GLOVES FINAL'), flashback: true },
          shot('gym', [ray(180, 1), oneton(300, -1)], [
            { who: 'ray', text: 'She said, "A gym should feed people, not just hit them." Six months later we opened this place.' },
            { who: 'oneton', text: 'So losing made the gym.' },
            { who: 'ray', text: 'Losing made me listen. The gym was her idea. Everything good here was her idea.' },
          ], 'FIVE A.M.'),
        ],
        choices: answers(
          ['1TON: "Teach me the left hook."', [
            { who: 'oneton', text: 'Teach me the left hook. Butch\'s one.' },
            { who: 'ray', text: 'Ha! Hands up. Chin down. Turn the hip, not the shoulder. Again. Again. AGAIN.' },
            { who: null, text: 'By seven the bag is swinging and the soup is boiling over and neither of them notices.' },
            { who: 'ray', text: 'You learn fast, reporter. Do not let it go to your head.' },
          ]],
          ['1TON: "Would Marie have liked me?"', [
            { who: 'oneton', text: 'Would Marie have liked me?' },
            { who: 'ray', text: '...She would have hated the beard. She would have fed you until you couldn\'t move. Then she would have liked you.' },
            { who: 'oneton', text: 'That is the nicest thing anybody has said to me in this country.' },
            { who: 'ray', text: 'Eat something. You look like a man who writes for a living.' },
          ]],
          ['1TON: "You should have won."', [
            { who: 'oneton', text: 'You should have won. The judges robbed you.' },
            { who: 'ray', text: 'Nobody robbed me. Butch was better that night. You will lose too. Lose like a man and then come back Monday.' },
            { who: 'oneton', text: 'I do not plan on losing.' },
            { who: 'ray', text: 'Nobody plans on it. That is why it works.' },
          ]],
        ),
      };
    case 'contract':
      // chapter six: the first crack. 1ton has a gold envelope and he does not want to talk about it.
      return {
        title: 'THE GOLD ENVELOPE',
        film: true,
        shots: [
          shot('lot', [oneton(180, 1), dane(310, -1)], [
            { who: null, text: 'The parking lot of the Old Dome, after the board meeting. 1ton is holding a gold envelope. He puts it in his jacket when he sees you.' },
            { who: 'dane', text: 'What is that?' },
            { who: 'oneton', text: 'Fan mail.' },
            { who: 'dane', text: 'Fan mail does not come in Zenith gold.' },
            { who: 'oneton', text: 'She offered me a promotion. My own roster. My own name. She said I could ask whatever questions I want, and they would all have answers.' },
            { who: 'oneton', text: 'I said I would think about it. She said that is what the envelope is for.' },
          ], 'THE OFFER'),
        ],
        choices: answers(
          ['"Open it. We read it together."', [
            { who: 'dane', text: 'Open it. We read it together, like any other paper.' },
            { who: 'oneton', text: '...Not tonight.' },
            { who: null, text: 'He does not open it. He does not throw it away either. You notice which pocket it goes in. The inside one. The one by his heart.' },
          ]],
          ['"Whatever they offer, I\'ll match it."', [
            { who: 'dane', text: 'Whatever they offer, I will match it.' },
            { who: 'oneton', text: 'You cannot match it, Dane. Nobody can. That is what scares me.' },
            { who: 'dane', text: 'Then let me try.' },
            { who: 'oneton', text: 'You always say that. Ray says it differently.' },
          ]],
          ['"Sign it and you\'re done here."', [
            { who: 'dane', text: 'Sign it and you are done here. That is not a threat. That is the business.' },
            { who: 'oneton', text: 'Everything is the business with you.' },
            { who: null, text: 'He walks to his car. He sits in it for ten minutes without starting it. Then he drives toward the Zenith tower, not home.' },
          ]],
        ),
      };
    case 'cuchillo':
      return {
        title: 'THE KNIFE',
        film: true,
        shots: [
          shot('presser', [cuchilloSuit(180, 1), dane(320, -1)], [
            { who: 'cuchillo', text: 'You think he is your fighter. He thinks you are his landlord.' },
            { who: 'dane', text: 'He thinks you are a knife.' },
            { who: 'cuchillo', text: 'I am a knife. You are a lease. We are both legal instruments.' },
            { who: 'dane', text: 'What did Zenith offer you?' },
            { who: 'cuchillo', text: 'The same thing they offered him. A door with my name on it. The difference is I read the contract. He just looked at the gold.' },
          ], 'THE KNIFE'),
        ],
        choices: answers(
          ['"What does his contract say?"', [
            { who: 'dane', text: 'What does his contract say?' },
            { who: 'cuchillo', text: 'Clause fourteen. "Loyalty to the Zenith family supersedes all prior relationships." They wrote it for him. They wrote it about you.' },
            { who: null, text: 'He hands you a folded page. Somebody has underlined "prior relationships" in gold ink.' },
          ]],
          ['"Come work for me instead."', [
            { who: 'dane', text: 'Come work for me instead.' },
            { who: 'cuchillo', text: 'Ha! You cannot pay me.' },
            { who: 'dane', text: 'I can pay you in a fair fight and Ray\'s soup.' },
            { who: 'cuchillo', text: '...How good is the soup?' },
          ]],
          ['"Stay away from my fighters."', [
            { who: 'dane', text: 'Stay away from my fighters.' },
            { who: 'cuchillo', text: 'Your fighters keep coming to me, Dane. Ask yourself why the door is open.' },
          ]],
        ),
      };
    case 'brother':
      return {
        title: 'THE BROTHER',
        film: true,
        shots: [
          shot('locker', [oneton(180, 1), dane(320, -1)], [
            { who: 'oneton', text: 'Am I a fighter or a product?' },
            { who: 'dane', text: 'You are a fighter.' },
            { who: 'oneton', text: 'That is what a promoter says.' },
            { who: 'dane', text: 'That is what a promoter says.' },
            { who: 'oneton', text: 'Ray says I am a son of a gun. I think it is a compliment. In Moncton it might not be.' },
          ], 'THE LOCKER ROOM'),
        ],
        choices: answers(
          ['"You\'re family. Ray thinks so too."', [
            { who: 'dane', text: 'You are family. Ask Ray. He made you soup for two years.' },
            { who: 'oneton', text: 'Family does not get booked against family.' },
            { who: 'dane', text: 'Zenith booked it. Not me.' },
            { who: 'oneton', text: 'You did not say no.' },
            { who: null, text: 'He wraps his own hands. He does it the way Ray taught him: over the knuckles, under the thumb.' },
          ]],
          ['"Win tonight and you\'re a product AND a fighter."', [
            { who: 'dane', text: 'Win tonight and you are both. That is the dream, kid.' },
            { who: 'oneton', text: 'Whose dream?' },
          ]],
          ['"You\'re a product. So am I. So is Mateo."', [
            { who: 'dane', text: 'You are a product. So am I. So is Mateo. The only one in this building who is not for sale is Ray.' },
            { who: 'oneton', text: 'Then why is Ray the one who always loses?' },
            { who: null, text: 'He says it quietly. He does not seem to want an answer. Later you will wish you had given him one.' },
          ]],
        ),
      };
    case 'crew':
      return {
        title: 'THE WHARF',
        film: true,
        shots: [
          shot('street', [han(save, 190, 1), dane(310, -1)], [
            { who: null, text: 'Three in the morning outside Ray\'s. Han is sitting on the step where Ray used to smoke the one cigarette Marie allowed him.' },
            { who: 'han', text: 'My dad fished out of Shediac. Lobster. He never saw me fight. He was always on the boat.' },
          ], '3:00 A.M.'),
          { ...shot('street', [npc('marc', 'MARC TIBULAR', 190, 1, { look: MARC_TIBULAR }), npc('han15', 'HAN, 15', 290, -1, { look: HAN_15 })], [
            { who: null, text: 'Shediac wharf. Twelve years ago. A boat called the MARIE-ANNE, named for an aunt he never met.' },
            { who: 'marc', text: 'You go to your uncle\'s this summer. Ray will teach you to keep your hands up. I can only teach you to keep your feet dry.' },
            { who: 'han15', text: 'Come watch me, when I fight.' },
            { who: 'marc', text: 'First fight you have, I am in the front row. In my boots. Smelling like bait.' },
            { who: null, text: 'He never made it. The MARIE-ANNE went out in a November gale and came back without him. Ray drove up the next morning and did not leave for a month.' },
          ], 'SHEDIAC WHARF  /  TWELVE YEARS AGO'), flashback: true },
          shot('street', [han(save, 190, 1), dane(310, -1)], [
            { who: 'han', text: 'Ray was in the front row for him. Every fight. In the cardigan. Smelling like soup.' },
            { who: 'han', text: 'Twice now, I did not get there in time.' },
          ], '3:00 A.M.'),
        ],
        choices: answers(
          ['"You got there. He knew you came."', [
            { who: 'dane', text: 'You got there, Han. He knew you came. He spent his last minute telling you to look after the kid.' },
            { who: 'han', text: '...Mateo.' },
            { who: 'dane', text: 'Mateo.' },
            { who: null, text: 'Han stands up. His knee is already bothering him. He does not mention it to anybody.' },
          ]],
          ['"Then be there for these three."', [
            { who: 'dane', text: 'Then be there for these three. Every one of them. Front row. Your fists.' },
            { who: 'han', text: 'Ray would hate this.' },
            { who: 'dane', text: 'Ray would hate it and sell tickets.' },
            { who: 'han', text: 'Ha. ...Yeah. He would.' },
          ]],
          ['"Grief is a gameplan. Use it."', [
            { who: 'dane', text: 'Grief is a gameplan. Use it. Hit them like they hit him.' },
            { who: 'han', text: 'That is not how he taught me.' },
            { who: 'dane', text: 'He is not here.' },
            { who: null, text: 'Han looks at you like he is seeing who 1ton learned it from.' },
          ]],
        ),
      };
    case 'bucket': {
      const legacy = storyChapter(save).id === 'legacy';
      return {
        title: legacy ? 'THE APRON' : 'THE BUCKET',
        film: true,
        shots: [
          shot('gym', [bigMateo(save, 180, 1), han(save, 300, -1, legacy ? {} : { pose: 'headDown' })], [
            { who: null, text: legacy ? 'The warehouse ring, the night before. Han and Mateo sit on the apron, legs hanging, like they did when Mateo was twelve and Han was the one with the belt.' : 'Ray\'s bucket, on the bench in the locker room. Mateo has not touched it. Han, on crutches, is staring at it.' },
            { who: 'mateo', text: legacy ? 'Are you nervous?' : 'He used to fill it with ice from the soup freezer. It always smelled a bit like onions.' },
            { who: 'han', text: legacy ? 'Every single time. Ray said the day you are not nervous is the day you should retire.' : 'He did that to me too. I thought every corner smelled like onions until I was twenty.' },
          ], legacy ? 'THE NIGHT BEFORE' : 'THE LOCKER ROOM'),
        ],
        choices: answers(
          ['MATEO: "I\'m doing this for him."', [
            { who: 'mateo', text: 'I am doing this for him.' },
            { who: 'han', text: 'Do it for you. He would have wanted that. He always said the fighters who fight for somebody else fight scared.' },
            { who: 'mateo', text: 'Hands up. Chin down.' },
            { who: 'han', text: 'Eat something.' },
          ]],
          ['MATEO: "Tell me about the first time he taped your hands."', [
            { who: 'mateo', text: 'Tell me about the first time he taped your hands.' },
            { who: 'han', text: 'I was fifteen and crying because of my dad and he did not say anything. He just taped them. Over the knuckles, under the thumb. Then he said: "Now you hit something."' },
            { who: 'mateo', text: 'What did you hit?' },
            { who: 'han', text: 'Him. By accident. He laughed for ten minutes.' },
          ]],
          ['MATEO: "What if I lose?"', [
            { who: 'mateo', text: 'What if I lose?' },
            { who: 'han', text: 'Then it is Monday. Six a.m. And I will be there, and so will the soup.' },
            { who: null, text: 'Mateo picks up the bucket. It smells like onions. He laughs, and then he does not, and Han puts an arm around him and neither of them says anything for a while.' },
          ]],
        ),
      };
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------- the beats between the fights

/** Mateo at twelve (game one): the hoodie three sizes too big, a mop, the stare. For flashbacks. */
const MATEO_12 = { ...CAST.mateo };
const npcTyler = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor =>
  npc('tyler', 'TYLER VANCE', x, facing, { look: { ...CAST.gordon, hairStyle: 3, hairColor: 0x8a6a3a, build: 1, outfit: { top: 0x3a3a44, bottom: 0x22222a, bulk: 1, hands: CAST.gordon.skin } }, ...o });
const npcZac = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor =>
  npc('zac', 'ZAC BUNA', x, facing, { look: { ...CAST.producer, hairStyle: 1, beard: 3, build: 1, outfit: { top: 0xf0f0f0, bottom: 0x1a1a22, bulk: 1, shortSleeves: true, hands: CAST.producer.skin } }, ...o });

export function beatScene(save: StorySave, id: string): Cutscene | null {
  switch (id) {
    case 'first_day':
      return {
        title: 'SIX A.M.',
        film: true,
        shots: [
          shot('gym', [ray(150, 1), oneton(270, -1, { enter: 'right' }), npcTyler(400, -1, { pose: 'headDown' })], [
            { who: null, text: 'Ray\'s Boxing & Soup. 5:58 a.m. Ray has been here since four. Tyler Vance is mopping. Tyler Vance is always mopping.' },
            { who: 'oneton', text: 'I am here for training. Dane sent me.' },
            { who: 'ray', text: 'You are two minutes early. Nobody is ever early. Sit down. Eat this.' },
            { who: 'oneton', text: 'It is six in the morning. That is soup.' },
            { who: 'ray', text: 'It is Marie\'s soup. It does not know what time it is.' },
            { who: 'tyler', text: 'Just eat it, man. He will stand there until you do. He did it to me for a year.' },
            { who: 'oneton', text: 'You are Tyler Vance. Trust Fund. I wrote about you. I said you had "the chin of a man who has never been told no".' },
            { who: 'tyler', text: 'I have been told no a lot since then. Mostly by him.' },
            { who: 'ray', text: 'Hands up. Chin down. Spoon in. Then we will see what the beard can do.' },
          ], 'DAY ONE'),
        ],
      };
    case 'soup_lesson':
      return {
        title: 'MARIE\'S WAY',
        film: true,
        shots: [
          shot('gym', [ray(170, 1), han(save, 280, -1), oneton(390, -1)], [
            { who: null, text: 'Sunday. The gym is closed. Ray is teaching the two of them to make the soup, because, he says, "every fighter should be able to feed somebody".' },
            { who: 'ray', text: 'Onions first. Slow. You do not rush onions and you do not rush a jab.' },
            { who: 'han', text: 'He has told me that every Sunday since I was fifteen.' },
            { who: 'ray', text: 'And every Sunday you rush the onions.' },
            { who: 'oneton', text: 'My mother put chile in everything. Can we put chile in it?' },
            { who: null, text: 'Ray looks at him for a long moment. The kitchen goes very quiet.' },
            { who: 'ray', text: '...A little. Marie would have liked that. Do not tell anybody.' },
            { who: 'han', text: 'In fourteen years he has never changed the recipe.' },
            { who: 'oneton', text: 'I am writing that down.' },
            { who: 'ray', text: 'You write everything down. Write this: you are family now. That means you wash the pot.' },
          ], 'SUNDAY'),
        ],
      };
    case 'mop_years':
      return {
        title: 'THE KID AT THE DOOR',
        film: true,
        shots: [
          shot('gym', [han(save, 170, 1), mateo(290, -1)], [
            { who: 'mateo', text: 'Do you remember the first time I came in?' },
            { who: 'han', text: 'You stood at the door for a week.' },
          ], 'NOW'),
          { ...shot('gym', [npc('han21', 'HAN, 21', 160, 1, { look: { ...CAST.ray, skin: 0xe2b392, hairStyle: 9, hairColor: 0x6a4a2a, beard: 5, build: 1, outfit: undefined, trunks: 0xc8202a, trim: 0xf2f2f2, glove: 0xc8202a } }), npc('mateo12', 'MATEO, 12', 280, -1, { look: MATEO_12 }), ray(380, -1)], [
            { who: null, text: 'Seven years ago. A twelve-year-old in a hoodie three sizes too big, and the stare of somebody who has already been in a few fights.' },
            { who: 'mateo12', text: 'Ray says you could teach me. Ray says you are not that good yet, but you are cheap.' },
            { who: 'han21', text: 'Ray says a lot of things.' },
            { who: 'ray', text: 'Give the kid a mop. If he is still here in a month, give him gloves.' },
          ], 'SEVEN YEARS AGO'), flashback: true },
          shot('gym', [han(save, 170, 1), mateo(290, -1)], [
            { who: 'mateo', text: 'I was still here in a month.' },
            { who: 'han', text: 'You were still here in a day. You slept on the bench. Ray pretended not to notice and left you a blanket.' },
            { who: 'mateo', text: 'He left me soup too.' },
            { who: 'han', text: 'He always leaves soup.' },
          ], 'NOW'),
        ],
      };
    case 'tower_photo':
      // chapter six: the first real crack, and the only one anybody sees coming
      return {
        title: 'THE PHOTO',
        film: true,
        shots: [
          shot('warehouse', [dane(150, 1), bradie(270, -1)], [
            { who: 'bradie', text: 'I was not going to show you this.' },
            { who: null, text: 'A phone. A photo taken through a rainy windshield. 1ton, at eleven at night, walking into the Zenith tower through the staff entrance. Verity Kane is holding the door.' },
            { who: 'dane', text: 'He could be doing an interview.' },
            { who: 'bradie', text: 'At the staff entrance? At eleven? In a suit?' },
            { who: 'dane', text: '1ton does not own a suit.' },
            { who: 'bradie', text: 'He does now. It fits him really well. That is the bit that scared me.' },
          ], 'ELEVEN P.M.'),
          shot('gym', [ray(170, 1), oneton(290, -1)], [
            { who: null, text: 'The next morning, 1ton is at the gym at six like always. He hugs Ray a little too long.' },
            { who: 'ray', text: 'You all right, son?' },
            { who: 'oneton', text: 'Of course. Why?' },
            { who: 'ray', text: 'You never call me "sir". You called me "sir" twice.' },
          ], 'SIX A.M.'),
        ],
      };
    case 'last_dinner':
      return {
        title: 'SUNDAY DINNER',
        film: true,
        shots: [
          shot('gym', [ray(130, 1), han(save, 220, -1), mateo(300, -1), dane(390, -1)], [
            { who: null, text: 'Sunday dinner. A folding table in the middle of the ring, a tablecloth Marie bought in 1991, and everybody who matters. Almost.' },
            { who: 'ray', text: 'I set a place for 1ton.' },
            { who: 'dane', text: 'He is not coming, Ray.' },
            { who: 'ray', text: 'I know. I set it anyway. That is what you do.' },
            { who: 'mateo', text: 'Tell the Butch story.' },
            { who: 'han', text: 'Not the Butch story.' },
            { who: 'ray', text: 'The mullet. You have to understand the mullet. You could hide a CAT in that mullet.' },
            { who: null, text: 'They laugh until Mateo spills the soup. Nobody minds. Han takes a photo. Later it is the only photo anybody has of that night.' },
            { who: 'ray', text: 'Look at this. Two champions and a promoter at my table. Marie would not believe it.' },
            { who: 'han', text: 'She would. She always said you would fill this place.' },
          ], 'THE LAST SUNDAY'),
        ],
      };
    case 'tuesday_class':
      return {
        title: 'TUESDAY CLASS',
        film: true,
        shots: [
          shot('gym', [npcZac(160, 1), bigMateo(save, 280, -1), han(save, 390, -1, { pose: 'headDown' })], [
            { who: null, text: 'Zac Buna still runs the Tuesday jiu-jitsu class. Since the funeral, nobody has missed one.' },
            { who: 'zac', text: 'Cesar is long. He will want to keep it standing. So we do not keep it standing.' },
            { who: 'mateo', text: 'Han is fighting Cesar.' },
            { who: 'zac', text: 'Han is fighting Cesar. You are learning it anyway. Ray always made two people learn every gameplan. "In case," he said.' },
            { who: 'han', text: 'In case of what?' },
            { who: 'zac', text: 'He never said. He just made soup for two.' },
          ], 'TUESDAY'),
        ],
      };
    default:
      return null;
  }
}

// ---------------------------------------------------------------- fights

export function fightIntro(save: StorySave, def: StoryFightDef): Cutscene {
  if (def.id === 'final') {
    return {
      title: 'THE BUYBACK',
      film: true,
      shots: [
        shot('cage', [bigMateoFight(save, 180, 1), daniel(260, -1), oneton(340, -1, { enter: 'right' })], [
          { who: null, text: 'The Old Dome. Eighteen thousand people. One cage. One contract. One very bad idea.' },
          { who: 'daniel', text: 'I want a clean fight. A clean fight, a clean cage and a clean exit. I have a car waiting.' },
          { who: 'mateo', text: 'Daniel Stinkovich? I thought you were banned. Han told me about the bank records.' },
          { who: 'daniel', text: 'Zenith appealed it. On my behalf. Out of the goodness of their hearts.' },
          { who: 'oneton', text: 'You ready, kid?' },
          { who: 'mateo', text: 'I have been ready since I was twelve.' },
        ], 'MAIN EVENT  /  LIGHT HEAVYWEIGHT TITLE  /  FIVE ROUNDS'),
      ],
    };
  }
  const p = def.player === 'han' ? hanFight(save, 180, 1) : def.player === 'mateo' ? bigMateoFight(save, 180, 1) : oneTonFight(save, 180, 1);
  const o =
    def.opponent === 'cuchillo' || def.opponent === 'cuchillo_rematch' ? cuchillo(save, def.opponent === 'cuchillo_rematch', 320, -1)
      : def.opponent === 'brick' ? brick(save, 320, -1)
        : def.opponent === 'mateo_spar' || def.opponent === 'mateo_betrayal' ? mateoFight(save, def.opponent === 'mateo_betrayal', 320, -1)
          : def.opponent === 'auditor' ? auditor(320, -1)
            : def.opponent === 'duke' ? dukeFight(save, 320, -1)
              : def.opponent === 'rico' ? ricoFight(save, 320, -1)
                : def.opponent === 'cesar' || def.opponent === 'cesar_rematch' ? cesarFight(save, 320, -1)
                  : def.opponent === 'han' ? fighterActor('hanboss', 'HAN TIBULAR', buildHan(save, true), 320, -1, { scale: 1.26 })
                    : chairman(320, -1);
  const lines: Line[] =
    def.opponent === 'cuchillo' ? [
      { who: 'cuchillo', text: 'You wrote about my cousin. You called him "a man with a plan and no hands."' },
      { who: 'oneton', text: 'He had no hands.' },
      { who: 'cuchillo', text: 'He had hands! They were just not good ones.' },
      { who: null, text: 'The bell. The Warehouse. Four hundred people, three of them related to the referee.' },
    ]
      : def.opponent === 'brick' ? [
        { who: 'brick', text: 'I brought a permit.' },
        { who: 'han', text: 'I brought a belt.' },
        { who: 'brick', text: 'That is not a permit.' },
        { who: 'han', text: 'It is in about four minutes.' },
      ]
        : def.opponent === 'mateo_spar' ? [
          { who: 'mateo', text: 'No hard shots.' },
          { who: 'oneton', text: 'No hard feelings.' },
          { who: 'mateo', text: 'That is not the same thing.' },
        ]
          : def.opponent === 'auditor' ? [
            { who: 'auditor', text: 'I have a checklist.' },
            { who: 'oneton', text: 'I have a beard.' },
            { who: 'auditor', text: 'That is not on the checklist.' },
            { who: 'oneton', text: 'It is now.' },
          ]
            : def.opponent === 'chairman' ? [
              { who: 'chairman', text: 'I have never lost a board meeting.' },
              { who: 'oneton', text: 'This is a fight.' },
              { who: 'chairman', text: 'Same thing.' },
            ]
              : def.opponent === 'mateo_betrayal' ? [
                { who: 'mateo', text: 'You do not have to do this.' },
                { who: 'oneton', text: 'I know.' },
                { who: 'mateo', text: 'Then do not.' },
                { who: 'oneton', text: 'I know.' },
              ] : def.opponent === 'duke' ? [
                { who: 'duke', text: 'Security usually handles this part.' },
                { who: 'han', text: 'Security is not here.' },
              ] : def.opponent === 'rico' ? [
                { who: 'rico', text: 'I did not bring the payphone.' },
                { who: 'han', text: 'The police did. It is in a bag with your name on it.' },
              ] : def.opponent === 'cesar' ? [
                { who: 'cesar', text: 'They sent the kid.' },
                { who: 'mateo', text: 'The kid mopped up after you every time you trained at Ray\'s.' },
                { who: 'cesar', text: 'I never trained at Ray\'s.' },
                { who: 'mateo', text: 'Then you never learned to keep your hands up.' },
              ] : def.opponent === 'cesar_rematch' ? [
                { who: 'cesar', text: 'Round two, kid.' },
                { who: 'mateo', text: 'Round two was where I finished you last time.' },
              ] : def.opponent === 'han' ? [
                { who: 'hanboss', text: 'Ninety-five overall, kid.' },
                { who: 'mateo', text: 'I know. I did the math.' },
                { who: 'hanboss', text: 'Mexican math?' },
                { who: 'mateo', text: 'Maritime math. It is meaner.' },
              ] : [
                { who: null, text: 'The bell.' },
              ];
  return {
    title: def.name,
    film: true,
    // Cesar's fight was Han's: the knee goes first
    shots: [...(def.id === 'crew_cesar' ? hanInjury(save) : []), shot('cage', [p, o], [...lines, { who: null, text: def.stakes }], def.hook)],
  };
}

// ---------------------------------------------------------------- exports

export function chapterIntro(save: StorySave): Cutscene {
  const ch = storyChapter(save);
  switch (ch.id) {
    case 'back_row': return introBackRow(save);
    case 'mexican_math': return introMexicanMath(save);
    case 'brick_by_brick': return introBrick(save);
    case 'sparring_partner': return introSparring(save);
    case 'audit': return introAudit(save);
    case 'the_board': return introBoard(save);
    case 'rematch': return introRematch(save);
    case 'brother': return introBrother(save);
    case 'buyback': return introBuyback(save);
    case 'legacy': return introLegacy(save);
    default: return introBackRow(save);
  }
}

export function chapterOutro(save: StorySave): Cutscene {
  const ch = storyChapter(save);
  switch (ch.id) {
    case 'back_row': return outroBackRow(save);
    case 'mexican_math': return outroMexicanMath(save);
    case 'brick_by_brick': return outroBrick(save);
    case 'sparring_partner': return outroSparring(save);
    case 'audit': return outroAudit(save);
    case 'the_board': return outroBoard(save);
    case 'rematch': return outroRematch(save);
    case 'brother': return outroBrother(save);
    case 'buyback': return outroBuyback(save);
    case 'legacy': return outroLegacy(save);
    default: return outroBackRow(save);
  }
}

export function storyEndingScene(save: StorySave): Cutscene {
  const won = save.flags.finalWinner === 'player';
  if (won) {
    return {
      title: 'AFTER THE BELL',
      film: true,
      shots: [
        shot('gym', [dane(130, 1), han(save, 230, 1), bigMateo(save, 330, -1)], [
          { who: null, text: 'Ray\'s Boxing & Soup. Monday. Six a.m. The CBFC sign is leaning against the soup pot, waiting for a wall.' },
          { who: 'dane', text: 'Zenith sent the paperwork. The company is ours. The board meeting took seven minutes.' },
          { who: 'han', text: 'That is Ray\'s pot. Marie\'s recipe.' },
          { who: 'mateo', text: 'I know. I mopped around it for nine years.' },
          { who: 'dane', text: 'What happens now?' },
          { who: 'han', text: 'Hands up. Chin down. Eat something.' },
        ], 'AFTER THE BELL'),
      ],
    };
  }
  return {
    title: 'AFTER THE BELL',
    film: true,
    shots: [
      shot(won ? 'cage' : 'roof', won ? [dane(200, 1), ray(310, 1), mateo(390, 1)] : [oneton(200, 1), verity(310, -1), lenny(400, -1)], won ? [
        { who: null, text: 'The cage empties. The lights stay on. Ray sits on the apron and does not say anything for a long time.' },
        { who: 'ray', text: 'You bought it back.' },
        { who: 'dane', text: 'I bought a building.' },
        { who: 'ray', text: 'That is what a promotion is. The rest is paperwork and soup.' },
        { who: 'mateo', text: 'What happens now?' },
        { who: 'dane', text: 'Now we answer the question.' },
      ] : [
        { who: null, text: 'The roof of the Old Dome. The city is below. The contract is above. 1ton is holding both.' },
        { who: 'verity', text: 'Congratulations, Mr. Morales. You are the face of the buyback.' },
        { who: 'oneton', text: 'I am the face of the question.' },
        { who: 'lenny', text: 'The question has a merchandising plan.' },
        { who: 'oneton', text: 'Of course it does.' },
      ], 'AFTER THE BELL'),
    ],
  };
}
