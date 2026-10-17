/**
 * Englische Wissens-Seiten (17.10.2026) — dieselben Antworten wie in
 * build-wissen.mjs, in der Reihenfolge der deutschen SEITEN. Neue oder
 * geaenderte deutsche Antwort → hier im selben Zug nachziehen, sonst haelt
 * scripts/sprachen-check.mjs die Auslieferung an.
 *
 * Preise kommen 1:1 von /en/pricing/ (gleiche Betraege wie /preise/, US-Schreibweise).
 * `de` verbindet jede Seite mit ihrem deutschen Slug.
 */
export const PREISE_EN = {
  komplett: { einmalig: "€1,547.00", monat: "€464.10" },
  laufend: { monat: "€523.60" },
  starthilfe: { einmalig: "€446.25" },
  profil: { einmalig: "€1,297.10" },
  start: "plus a one-time €523.60 to get started",
  beitraege: 10,
};
const P = PREISE_EN;

export const SEITEN_EN = [
  {
    de: "was-kostet-social-media-betreuung",
    slug: "social-media-management-cost",
    titel: "How much does social media management cost for coaches and B2B?",
    emWort: "cost",
    kurz: "How much does social media management cost?",
    beschreibung:
      "Concrete prices for professional Instagram management: full package from €1,547 one-time plus €464.10 a month, ongoing management from €523.60 a month plus a one-time €523.60 to get started.",
    antwort:
      "In Germany, professional social media management for small and mid-sized businesses typically costs between €400 and €2,000 a month, depending on how much of the work you hand off. At social2scale, the complete setup costs " +
      P.komplett.einmalig + " one-time and " + P.komplett.monat +
      " a month after that; if you only hand off the ongoing content, you pay from " + P.laufend.monat + " a month (" + P.start + ").",
    abschnitte: [
      {
        h: "What the price is made of",
        p: [
          "The biggest cost isn’t the posting, it’s everything that comes before it: positioning, visual style, copy concept and a plan that fits your audience. That’s why serious providers separate a one-time setup from ongoing management.",
          "At social2scale, the one-time part covers your profile setup including branding and positioning. Monthly management covers " + P.beitraege +
          " finished posts, publishing on schedule, a hashtag strategy for every post and forwarding incoming inquiries.",
        ],
      },
      {
        h: "The three usual models compared",
        liste: [
          ["Hand off everything", "Setup plus ongoing management. " + P.komplett.einmalig + " one-time, then " + P.komplett.monat + " a month. For anyone starting from zero or who doesn’t want to deal with it at all."],
          ["Hand off only the ongoing work", "Your profile is already in place; the content is missing. From " + P.laufend.monat + " a month, " + P.start + "."],
          ["A one-time kickstart", "Nine designed posts including captions, after which you post yourself. From " + P.starthilfe.einmalig + " one-time; with profile, bio and branding " + P.profil.einmalig + "."],
        ],
      },
      {
        h: "How to spot prices that are too low",
        p: [
          "Offers under roughly €300 a month rarely cover more than scheduling ready-made templates. Anyone promising custom posts, image editing and management at that price is usually planning on very little time per client — or passing the work on.",
          "On the other hand, expensive doesn’t automatically mean better: large agencies factor in project management and a team. What matters is who actually does the work in the end and how many clients that same person looks after.",
        ],
      },
    ],
  },
  {
    de: "social-media-agentur-auswaehlen",
    slug: "choosing-a-social-media-agency",
    titel: "How do you recognize a good social media agency?",
    emWort: "good",
    kurz: "How do I choose an agency?",
    beschreibung:
      "Six verifiable criteria for choosing a social media agency — and the warning signs that show up on the intro call.",
    antwort:
      "You can recognize a good social media agency by four things you can check: it shows real results instead of follower counts, it tells you who specifically works on your account, it makes the impact measurable, and it is upfront about notice periods. An agency that can’t clearly answer any of these four questions on the intro call is rarely transparent.",
    abschnitte: [
      {
        h: "The six criteria",
        liste: [
          ["Who does the work?", "Ask which person writes and designs your posts. At small providers that’s the founders themselves; at large ones it’s often rotating junior staff."],
          ["How is success measured?", "Reach alone isn’t a metric. What tells you something is profile visits, inquiries through your profile and the calls that come out of them."],
          ["Are there examples from your niche?", "Content for coaches works differently than for mechanical engineering. Ask for accounts from a comparable field."],
          ["What happens if you’re not happy?", "Clear notice periods and a named contact person are a good sign; long minimum terms with no way out are not."],
          ["Who owns the content?", "Images, copy and logins have to stay with you — even after you stop working together."],
          ["How much work is left for you?", "Serious providers are honest about this. It never works completely without your input, but the difference between one briefing and weekly check-ins is huge."],
        ],
      },
      {
        h: "Warning signs on the intro call",
        p: [
          "Guaranteed follower numbers are the clearest warning sign — they can only be reached with bought or inactive accounts and damage your reach for good.",
          "Also a red flag: anyone who won’t talk about their own process, who only talks package prices without clarifying your goal, or who pushes you to sign right away.",
        ],
      },
    ],
  },
  {
    de: "wie-lange-bis-ergebnisse",
    slug: "how-long-until-results",
    titel: "How long does it take for social media to bring results?",
    emWort: "results",
    kurz: "When do the first results come?",
    beschreibung:
      "Realistic timeframes for building a social media presence: first reactions after two to four weeks, reliable inquiries usually from the third month.",
    antwort:
      "With consistent posting, the first visible reactions come after two to four weeks, and reliable inquiries usually start from the third month. This range applies to building a presence from scratch with about ten posts a month; existing profiles that already have an audience move faster.",
    abschnitte: [
      {
        h: "What happens when",
        liste: [
          ["Weeks 1 to 4", "Your profile gets found and understood. You see it in rising profile visits, hardly in followers."],
          ["Month 2", "People start to recognize you. The first messages come in, mostly from people in your own circle."],
          ["Months 3 to 4", "Posts regularly reach people outside your own network. From here on, inquiries become predictable instead of random."],
          ["Month 6 on", "The account carries itself: older posts keep getting found, and your audience grows without a fresh push every time."],
        ],
      },
      {
        h: "What shortens or lengthens the timeframe",
        p: [
          "Frequency has the biggest effect: if you post twice a month, it takes many times longer. For us, ten posts a month is the minimum: below that, there aren’t enough posts to see what resonates with your people.",
          "Frequent topic changes slow things down. A profile that tells a different story every month has to fight for attention with every single post — that’s why positioning at the start matters more than any individual post.",
        ],
      },
    ],
  },
  {
    de: "selbst-machen-oder-agentur",
    slug: "diy-or-agency",
    titel: "Should you do social media yourself or hand it off to an agency?",
    emWort: "yourself",
    kurz: "Do it yourself or hand it off?",
    beschreibung:
      "The honest math: when an agency is worth it and when doing it yourself makes more sense — with time spent and a cost comparison.",
    antwort:
      "Doing it yourself is worth it if you can reliably keep seven and a half to fifteen hours a month free and enjoy writing. Handing it off is worth it as soon as that time is missing or your working hour is worth more than the cost of management — at " +
      P.laufend.monat + " a month (" + P.start + "), that’s the case for most self-employed people from an hourly rate of about €60.",
    abschnitte: [
      {
        h: "The real time it takes to do it yourself",
        p: [
          "For ten posts a month, plan on seven and a half to fifteen hours — 45 to 90 minutes per post: finding topics, writing, designing, scheduling and replying to comments. The work doesn’t come in one block but is spread out — which makes it harder to plan in everyday life than the bare number of hours suggests.",
          "On top of that comes the learning curve at the start: image formats, how to structure copy and a recognizable look take a few attempts. That learning curve is the main reason many people stop again after two months.",
        ],
      },
      {
        h: "When which option makes more sense",
        liste: [
          ["Do it yourself", "If you like writing, have a clear topic and can reliably keep the time free. The upside: your voice stays completely your own."],
          ["Hand it off", "If time is short, your profile has already gone quiet several times, or you need a consistent presence without having to deal with it."],
          ["A mix", "Have it set up once, then carry on yourself. At social2scale, profile and branding for " + P.profil.einmalig + ", just the posts from " + P.starthilfe.einmalig + " one-time."],
        ],
      },
    ],
  },
  {
    de: "ablauf-zusammenarbeit",
    slug: "how-we-work-together",
    titel: "How does working with a social media agency work?",
    emWort: "working",
    kurz: "How does working together work?",
    beschreibung:
      "From the intro call to ongoing management: the four phases of social media management and what’s expected of you in each one.",
    antwort:
      "Social media management runs in four phases: intro call, a one-time briefing, building your profile and visual style, then ongoing management. Your own effort is almost entirely concentrated in the briefing at the start — after that, it’s limited to approvals.",
    abschnitte: [
      {
        h: "The four phases",
        liste: [
          ["1. Intro call", "About twenty minutes: clarify your goal, audience and starting point. After that, it’s clear whether working together makes sense and to what extent."],
          ["2. Briefing", "Once and in depth: what you stand for, who you want to reach, what should never appear. This is the part that decides the quality of every post that follows."],
          ["3. Setup", "Profile, positioning and visual style are created and agreed on. You see everything before it’s published."],
          ["4. Ongoing management", P.beitraege + " posts a month are created, scheduled and published; inquiries are forwarded to you."],
        ],
      },
      {
        h: "What’s expected of you",
        p: [
          "After the briefing, one thing is left above all: approvals. Depending on what you agree, you see every post in advance or only bigger topics — both are common, it just needs to be clear from the start.",
          "Your own photos help, but aren’t a must. They make a presence more personal than any stock imagery, which is why good providers ask for them instead of using standard images.",
        ],
      },
    ],
  },
];
