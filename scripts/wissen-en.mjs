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
          ["1. Intro call", "About 45 minutes: clarify your goal, audience and starting point. After that, it’s clear whether working together makes sense and to what extent."],
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
  {
    de: "ki-fuer-social-media-nutzen",
    slug: "using-ai-for-social-media",
    geprueft: "2026-11-09",
    stand: "Last reviewed: November 9, 2026",
    titel: "How do I use AI well for social media?",
    emWort: "AI",
    kurz: "Using AI well",
    beschreibung:
      "Where AI really helps with social media, where it hurts and how to get started: ideas, drafts, subtitles and analysis, without everything sounding the same.",
    antwort:
      "AI helps most with the parts of social media that repeat: collecting ideas, writing first drafts, reshaping copy and subtitling videos. What it can’t replace is your experience, your point of view and your judgement of what fits you. The best split: AI writes the draft, you give it your voice.",
    abschnitte: [
      {
        h: "What AI is good at today",
        liste: [
          ["Ideas", "Collect the questions your clients ask you and let AI suggest topics from them. The best posts answer a real question."],
          ["First drafts", "A caption, an outline for a carousel, three options for the opening line. You pick and rewrite instead of staring at an empty field."],
          ["Repurposing", "Turn a text into a reel script, a reel into a story, a post into a newsletter. One idea, several formats."],
          ["Video", "Generate subtitles automatically and get editing suggestions. That’s where video saves the most time."],
          ["Analysis", "Have comments and messages summarised: which questions keep coming up? Those become your next topics."],
        ],
      },
      {
        h: "Where AI hurts you",
        p: [
          "Without guidance, AI writes copy that sounds like everyone else. Post like that and you become interchangeable, which is the opposite of what your own presence is for.",
          "AI sometimes makes up facts, figures and sources. Check anything that sounds like a fact yourself before it goes live. With health, legal and money topics that counts twice: promises you aren’t allowed to make remain your responsibility, no matter who wrote the text.",
          "With images, made-up people and places quickly look fake. Your own photos of you and your work build more trust than any generated picture.",
        ],
      },
      {
        h: "How to get started",
        liste: [
          ["1. Give context", "Tell the AI who you are, who you work for and how you talk. Add two or three of your own texts as examples."],
          ["2. Ask for options", "Don’t ask for the finished post, ask for three approaches. You decide which one fits you."],
          ["3. Read it out loud", "Read the draft out loud. Anything you’d never say goes, or gets rewritten in your words."],
        ],
      },
      {
        h: "How we do it at social2scale",
        p: [
          "We use our own AI tools for the legwork, such as drafts, subtitles and editing. Every post still goes through a person and only builds on statements you have confirmed yourself. That way your presence stays yours, even with AI helping.",
        ],
      },
    ],
  },
  {
    de: "was-posten-damit-kunden-kommen",
    slug: "what-to-post-to-win-clients",
    geprueft: "2026-11-09",
    stand: "Last reviewed: November 9, 2026",
    titel: "What and when should I post to win clients?",
    emWort: "post",
    kurz: "What and when to post",
    beschreibung:
      "Which posts turn followers into inquiries, how to find the right time in your own insights and how a post leads to an inquiry without being pushy.",
    antwort:
      "Post what answers your ideal clients’ questions and shows how you work. Consistency matters more than the perfect time, and your own Instagram insights show when your followers are online. For a post to turn into an inquiry, it needs a clear, simple next step at the end.",
    abschnitte: [
      {
        h: "Three kinds of posts that sell together",
        liste: [
          ["Know-how", "You answer a question your audience really has. It shows you know your stuff, and it gets saved and shared."],
          ["Behind the scenes", "How you work, who you are, what drives you. People buy from people they trust."],
          ["Offer", "What exactly you offer, for whom and how to get started. Without these posts, nobody knows they can buy from you."],
        ],
      },
      {
        h: "When to post",
        p: [
          "There is no time that works for everyone. With a professional account, Instagram shows you in your insights on which days and at which hours your followers are most active. Start there and check after a few weeks which posts did better.",
          "Rhythm matters more than the hour: two or three posts a week that you can keep up beat a week of daily posts followed by a month of silence. In our management it’s ten posts a month.",
        ],
      },
      {
        h: "From post to inquiry",
        p: [
          "Every post needs an ending that fits its topic: a question for your readers, a reason to save it or an invitation to message you. The smaller the step, the more likely people take it. Sending a direct message with a keyword is easier for many than filling in a form.",
          "It only gets pushy when every post tries to sell. Once you have helped, you have earned the right to say what you offer.",
        ],
      },
    ],
  },
  {
    de: "reichweite-und-community-aufbauen",
    slug: "building-reach-and-community",
    geprueft: "2026-11-09",
    stand: "Last reviewed: November 9, 2026",
    titel: "How do I build reach and a real community on social media?",
    emWort: "community",
    kurz: "Reach and community",
    beschreibung:
      "Where reach comes from, why replies matter more than follower counts and why bought followers do more harm than good.",
    antwort:
      "Reach comes from posts that get saved, shared and watched to the end. A community comes from you replying, asking questions and having conversations. Both need a clear topic: people who know what you stand for come back and bring others with them.",
    abschnitte: [
      {
        h: "Where reach comes from",
        liste: [
          ["Reels", "They are also shown to people who don’t follow you yet. The first sentence decides whether someone stays."],
          ["Carousels", "Great for saving, because they explain something people will need again later."],
          ["A clear topic", "If you talk about something different every month, each post has to fight for attention from scratch. A topic people connect with you carries every post."],
        ],
      },
      {
        h: "How followers become a community",
        p: [
          "Reply to comments and messages, and ask questions people enjoy answering. In stories, polls and question stickers help, because one tap is enough to answer.",
          "A community isn’t an audience, it’s a conversation. Someone who sees their question turned into a post stays and tells others.",
        ],
      },
      {
        h: "Real followers instead of big numbers",
        p: [
          "Bought followers don’t see your posts, don’t react and don’t buy. Instagram’s terms of use prohibit inauthentic activity. And the more followers never react, the weaker your posts perform.",
          "A thousand people who care about your topic are worth more than ten thousand who happen to be there.",
        ],
      },
    ],
  },
];
