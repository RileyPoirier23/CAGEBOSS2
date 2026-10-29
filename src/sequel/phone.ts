/**
 * The phone: one call a week (Ray, Xavier, Verity, Gordon, Bradie, your mum), one bleet a week
 * on Bleeter (call somebody out, hype the card, subtweet Trent, post the soup), and the plug in
 * your DMs with three offers a week. Headless: it works on a promoter run or a Tales of Legacy save
 * through a small adapter. The screen is ui/sequel/phoneui.ts.
 */
import { clamp } from '../core/format';
import type { SeqRun, StorySave } from './types';

/** What a choice does: cash, hype (buzz / brand), heat, and the room's mood (locker / trust). */
export interface PhoneFx { cash?: number; hype?: number; heat?: number; mood?: number }

export interface PhoneOwner {
  key: string; // which week (the phone resets every week)
  cash: number;
  apply(fx: PhoneFx): void;
  flags: Record<string, number | string | boolean>;
  boss: string;
}

export function ownerForRun(run: SeqRun, boss: string): PhoneOwner {
  return {
    key: `w${run.week}`, cash: run.cash, flags: run.flags, boss,
    apply: (fx) => {
      run.cash += fx.cash ?? 0;
      run.buzz = clamp(run.buzz + (fx.hype ?? 0), 0, 100);
      run.heat = clamp(run.heat + (fx.heat ?? 0), 0, 100);
      run.locker = clamp(run.locker + (fx.mood ?? 0), 0, 100);
    },
  };
}

export function ownerForStory(save: StorySave): PhoneOwner {
  return {
    key: `c${save.chapter}w${save.week ?? 1}`, cash: save.cash, flags: save.flags, boss: 'Dane Whyte',
    apply: (fx) => {
      save.cash += fx.cash ?? 0;
      save.brand = clamp(save.brand + (fx.hype ?? 0), 0, 100);
      save.heat = clamp(save.heat + (fx.heat ?? 0), 0, 100);
      save.trust = clamp(save.trust + (fx.mood ?? 0), 0, 100);
    },
  };
}

export interface PhoneChoice { label: string; reply: string; fx: PhoneFx }
export interface PhoneCall { id: string; from: string; text: string; choices: PhoneChoice[] }

const CALLS: PhoneCall[] = [
  { id: 'ray', from: 'UNCLE RAY', text: 'It\'s Ray. Nothing is wrong. I made too much soup. Come and get some. Bring whoever looks hungry.', choices: [
    { label: 'Bring the whole roster', reply: 'Twelve fighters, one pot, Ray in heaven. The locker room has never been happier.', fx: { mood: 6, cash: -200 } },
    { label: '"Busy, Ray. Next week."', reply: '"Next week then." He says it like he believes you. He saves you a bowl anyway.', fx: { mood: -2 } },
  ] },
  { id: 'xavier', from: 'XAVIER "ALLSTAR" COCKETT', text: 'Partner! I have a fighter in a horse trailer who needs a card. He\'s good. He\'s also technically a ranch hand. Six hundred bucks and he\'s yours for a night.', choices: [
    { label: 'Book the ranch hand ($600)', reply: 'He shows up in chaps. The crowd loves him. Bradie sells forty T-shirts.', fx: { cash: -600, hype: 4 } },
    { label: 'Pass', reply: '"Your loss, partner." He sends a photo of the horse. The horse looks disappointed.', fx: {} },
  ] },
  { id: 'pete', from: 'XAVIER "ALLSTAR" COCKETT', text: 'Partner. Bad news. Commissioner Pete got into the office. He has eaten a contract. Your contract. The one with the purses in it.', choices: [
    { label: '"Print another one."', reply: 'You print another one. Pete eats that one too. Xavier says this is how he knows it\'s a good contract.', fx: { mood: 3, cash: -100 } },
    { label: '"Is the goat okay?"', reply: '"He\'s thriving." Xavier sends a photo. The goat looks pleased with himself. Bradie posts it. It does better than the fight.', fx: { hype: 5 } },
  ] },
  { id: 'verity', from: 'VERITY KANE (ZENITH)', text: 'A courtesy call. The commission has questions about your venue. We could make those questions go away. For a consideration.', choices: [
    { label: 'Pay the consideration ($8,000)', reply: 'The questions go away. A receipt arrives with the Zenith logo on it, which is either an accident or a threat.', fx: { cash: -8000, heat: -12 } },
    { label: '"Tell the commission to buy a ticket."', reply: 'She laughs. It isn\'t a nice laugh. The commission buys a ticket. Front row.', fx: { heat: 6, hype: 3 } },
  ] },
  { id: 'gordon', from: 'GORDON VANCE', text: 'The rent. You know the date. I know the date. The building knows the date.', choices: [
    { label: 'Pay early ($4,000)', reply: 'Gordon goes quiet. Then: "...Tyler says you\'re all right." He hangs up before you can answer.', fx: { cash: -4000, mood: 3, heat: -3 } },
    { label: '"The fifth is fine, Gordon."', reply: '"The fifth isn\'t fine." It\'s fine. It\'s always fine.', fx: { heat: 2 } },
  ] },
  { id: 'bradie', from: 'BRADIE', text: 'We hit ten thousand followers. Nine thousand are real. I want to do a "day in the life" video. You would be in it. Please be in it.', choices: [
    { label: 'Do the video', reply: 'It goes viral for the wrong reason (you eat soup like a raccoon). Views are views.', fx: { hype: 6, heat: 1 } },
    { label: '"No cameras in the office."', reply: 'Bradie films the office anyway, from the parking lot. It does okay.', fx: { hype: 2 } },
  ] },
  { id: 'mum', from: 'MUM', text: 'Are you eating? Your aunt saw you on the internet. She says you looked tired. Are you sleeping? Are you eating?', choices: [
    { label: '"Yes, Mum. I\'m eating."', reply: '"Ray says you aren\'t." She has Ray\'s number. Of course she has Ray\'s number.', fx: { mood: 2 } },
    { label: 'Let it ring', reply: 'She leaves a voicemail. It\'s four minutes long and mostly about soup.', fx: {} },
  ] },
];

/** This week's call (one a week; once answered, it's gone). */
export function callThisWeek(o: PhoneOwner): PhoneCall | null {
  if (o.flags[`call_${o.key}`]) return null;
  const h = [...o.key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return CALLS[h % CALLS.length];
}

export function answerCall(o: PhoneOwner, call: PhoneCall, i: number): string {
  const c = call.choices[i];
  o.flags[`call_${o.key}`] = call.id;
  o.apply(c.fx);
  return c.reply;
}

// ---------------------------------------------------------------- Bleeter

export interface Bleet { id: string; label: string; posts: string[]; replies: [string, string][]; fx: PhoneFx }

export const BLEETS: Bleet[] = [
  { id: 'callout', label: 'CALL OUT ZENITH', fx: { hype: 7, heat: 6 },
    posts: ['Zenith Holdings couldn\'t promote a fight in a phone box. Saturday. The warehouse. Bring a jacket, the roof leaks.', 'Trent from strategy replaced a cage with a lounge. I replaced a lounge with a cage. Saturday.'],
    replies: [['@ZenithHQ', 'We wish all independent venues the very best. (Legal is reading this.)'], ['@1ton', 'THE MATH IS MEXICAN AND THE MATH IS ON SATURDAY'], ['@SandwichCormier', 'i dont know what a phone box is but I\'m in']] },
  { id: 'hype', label: 'HYPE THE MAIN EVENT', fx: { hype: 4 },
    posts: ['Saturday\'s main event is the best fight in the city and it isn\'t close. Tickets at the door. Soup at the door.', 'Five rounds. Two people who don\'t like each other. One warehouse. Come.'],
    replies: [['@bradie', 'tickets are real and so is the soup'], ['@DailyClinch', 'We\'ll be there. We\'ll be in the back. We\'ll be judging.']] },
  { id: 'trent', label: 'SUBTWEET TRENT', fx: { hype: 5, heat: 4, mood: 2 },
    posts: ['Some people get a corner office by working. Some people get one in a seven-minute meeting. Anyway. Saturday.', 'Thinking about the stapler today. It\'s a good stapler. It\'s the only thing I took. Saturday.'],
    replies: [['@TrentStrategy', 'Hi! Love this energy. Let\'s align offline? 🙂'], ['@1ton', 'TRENT HAS NEVER BEEN PUNCHED AND YOU CAN TELL']] },
  { id: 'pete', label: 'POST THE GOAT', fx: { hype: 3, mood: 3 },
    posts: ['Commissioner Pete has reviewed Saturday\'s card and ruled it "baaa". Sanctioned.', 'Our most senior official, Commissioner Pete, would like to remind fans that he\'ll eat your ticket if you hold it near him.'],
    replies: [['@CommissionerPete', 'baaa'], ['@xaviercockett', 'HE IS IMPARTIAL'], ['@ZenithHQ', 'Zenith Holdings doesn\'t recognise this goat.'], ['@CommissionerPete', 'BAAA']] },
  { id: 'soup', label: 'POST THE SOUP', fx: { mood: 4, hype: 1 },
    posts: ['Ray made soup. That\'s the post.', 'The real main event: Ray\'s soup, Marie\'s recipe, a little chile nobody is supposed to know about.'],
    replies: [['@UncleRay', 'WHO TOLD YOU ABOUT THE CHILE'], ['@mateovarga', 'the chile was 1ton'], ['@1ton', 'i regret nothing'], ['@CommissionerPete', 'baa (wants soup)']] },
];

export const bleetedThisWeek = (o: PhoneOwner): boolean => !!o.flags[`bleet_${o.key}`];

export function postBleet(o: PhoneOwner, b: Bleet): { post: string; replies: [string, string][] } {
  o.flags[`bleet_${o.key}`] = b.id;
  o.apply(b.fx);
  const h = [...o.key].reduce((a, c) => (a * 17 + c.charCodeAt(0)) >>> 0, 3);
  return { post: b.posts[h % b.posts.length], replies: b.replies };
}

// ---------------------------------------------------------------- the plug

export interface PlugOffer { id: string; name: string; price: number; text: string; fx: PhoneFx; risk: number; caught: string }

export const PLUG: PlugOffer[] = [
  { id: 'commission', name: 'A GUY AT THE COMMISSION', price: 6000, text: 'he can lose a file. he cant lose two. dont ask me to lose two', fx: { heat: -14 }, risk: 0.15, caught: 'The guy at the commission gets caught losing a file. Your file. Heat up.' },
  { id: 'merch', name: 'BOOTLEG MERCH (A VAN OF IT)', price: 1500, text: 'shirts with ur logo. the logo is spelled right on most of them', fx: { cash: 7000, hype: 2 }, risk: 0.25, caught: 'Somebody reports the shirts. They\'re spelled CAGE BOS. Heat up.' },
  { id: 'tape', name: 'THE OTHER GUY\'S CAMP FOOTAGE', price: 3000, text: 'phone footage from his gym. hes favouring the left knee. u didnt get this from me', fx: { mood: 6 }, risk: 0.1, caught: 'The footage has a watermark. It\'s your phone number. Heat up.' },
  { id: 'supplements', name: '"SUPPLEMENTS"', price: 5000, text: 'all natural. naturally from a lab. the testers are slow this month', fx: { mood: 8, hype: 2 }, risk: 0.35, caught: 'A fighter pops on a random test. The "supplements" were exactly what they looked like. Heat way up.' },
  { id: 'tickets', name: 'A FEW HUNDRED "COMP" TICKETS', price: 0, text: 'i print them u sell them we split it. what could go wrong', fx: { cash: 4000 }, risk: 0.3, caught: 'Two people turn up with seat 14C. Then forty more. The fire marshal isn\'t amused.' },
];

/** The plug's three offers this week. */
export function plugOffers(o: PhoneOwner): PlugOffer[] {
  const h = [...o.key].reduce((a, c) => (a * 13 + c.charCodeAt(0)) >>> 0, 5);
  return [0, 1, 2].map((k) => PLUG[(h + k * 2) % PLUG.length]);
}

/** Buy from the plug: the effect, and maybe the consequences (rnd 0..1 decides). */
export function buyFromPlug(o: PhoneOwner, offer: PlugOffer, rnd: number): { ok: boolean; text: string } {
  if (o.flags[`plug_${o.key}_${offer.id}`]) return { ok: false, text: 'already handled it. stop texting me' };
  if (o.cash < offer.price) return { ok: false, text: 'u dont have it. come back when u have it' };
  o.flags[`plug_${o.key}_${offer.id}`] = true;
  o.apply({ ...offer.fx, cash: (offer.fx.cash ?? 0) - offer.price });
  if (rnd < offer.risk) {
    o.apply({ heat: offer.id === 'supplements' ? 25 : 12 });
    return { ok: true, text: offer.caught };
  }
  return { ok: true, text: 'done. delete this chat' };
}
