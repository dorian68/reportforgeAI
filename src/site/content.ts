import { siteRuntimeConfig } from "./runtimeConfig";

export type MarketingNavItem = {
  label: string;
  href: string;
};

export type MarketingTabId = "overview" | "product" | "buyers" | "pricing";

export type MarketingTab = {
  id: MarketingTabId;
  label: string;
  href: string;
  eyebrow: string;
  title: string;
  summary: string;
  sections: MarketingNavItem[];
};

export type MarketingCta = {
  label: string;
  href: string;
  tone: "primary" | "secondary" | "ghost";
};

export type MarketingSignal = {
  label: string;
  value: string;
  detail: string;
};

export type WorkflowStep = {
  title: string;
  detail: string;
};

export type OutputChannel = {
  title: string;
  summary: string;
  benefit: string;
};

export type PersonaCard = {
  title: string;
  pain: string;
  promise: string;
  outcomes: string[];
};

export type UseCaseCard = {
  title: string;
  audience: string;
  whyExcel: string;
  result: string;
};

export type ComparisonRow = {
  capability: string;
  manual: string;
  genericAi: string;
  reportForge: string;
};

export type StoreShot = {
  label: string;
  title: string;
  detail: string;
  imageSrc: string;
};

export type PricingTier = {
  name: string;
  price: string;
  cadence: string;
  summary: string;
  recommended?: boolean;
  badge?: string;
  features: string[];
  cta: MarketingCta;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type LeadCapture = {
  eyebrow: string;
  title: string;
  summary: string;
  salesEmail: string;
  teamSizes: string[];
  note: string;
};

export const marketingSiteContent = {
  brand: {
    name: "ReportForge AI",
    category: "Excel-native reporting copilot",
    supportHref: "support.html",
  },
  tabs: [
    {
      id: "overview",
      label: "Workflow",
      href: "#workflow",
      eyebrow: "Operating flow",
      title: "Show how the product moves from spreadsheet selection to finished reporting.",
      summary:
        "Lead with the operating flow first so buyers understand why ReportForge lands faster than a BI rebuild.",
      sections: [
        { label: "Workflow", href: "#workflow" },
        { label: "Before / after", href: "#before-after" },
      ],
    },
    {
      id: "product",
      label: "Outputs",
      href: "#outputs",
      eyebrow: "Finished outputs",
      title: "Show buyers the reporting surfaces they actually pay for.",
      summary:
        "Dashboards, decks, web apps, and export paths should look productized, not like placeholders around a prompt.",
      sections: [
        { label: "Outputs", href: "#outputs" },
        { label: "Screens", href: "#screens" },
        { label: "Store assets", href: "#store-assets" },
        { label: "Security", href: "#security" },
      ],
    },
    {
      id: "buyers",
      label: "Buyers",
      href: "#buyers",
      eyebrow: "Commercial fit",
      title: "Map ReportForge to the teams that still run important reporting through Excel.",
      summary:
        "Make it obvious who buys, where it lands first, and why it beats manual reporting or generic AI tooling.",
      sections: [
        { label: "Personas", href: "#buyers" },
        { label: "Use cases", href: "#use-cases" },
        { label: "Comparison", href: "#comparison" },
      ],
    },
    {
      id: "pricing",
      label: "Pricing",
      href: "#pricing",
      eyebrow: "Commercial model",
      title: "Make the next step obvious without forcing a heavy sales motion.",
      summary:
        "The site should move from proof to pilot clearly: pricing, launch request, objections, then close.",
      sections: [
        { label: "Pricing", href: "#pricing" },
        { label: "Launch", href: "#launch-request" },
        { label: "FAQ", href: "#faq" },
        { label: "Close", href: "#closing" },
      ],
    },
  ] satisfies MarketingTab[],
  navigation: [
    { label: "Workflow", href: "#workflow" },
    { label: "Outputs", href: "#outputs" },
    { label: "Buyers", href: "#buyers" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
    { label: "Launch", href: "#launch-request" },
  ] satisfies MarketingNavItem[],
  hero: {
    eyebrow: "Reporting software for Excel-heavy teams",
    title: "Excel in. Decision-ready reporting out.",
    subtitle:
      "ReportForge turns workbook selections into polished dashboards, decks, web apps, and executive summaries without forcing a BI rebuild or rebuilding every review pack by hand.",
    primaryCta: {
      label: "Request a Pilot",
      href: "#launch-request",
      tone: "primary",
    } satisfies MarketingCta,
    secondaryCta: {
      label: "See the Outputs",
      href: "#outputs",
      tone: "secondary",
    } satisfies MarketingCta,
    tertiaryCta: {
      label: "Deployment Notes",
      href: "support.html",
      tone: "ghost",
    } satisfies MarketingCta,
  },
  signals: [
    {
      label: "Source",
      value: "Native Excel selection",
      detail: "The workflow starts inside the spreadsheet your team already trusts.",
    },
    {
      label: "Outputs",
      value: "Decks, dashboards, web apps",
      detail:
        "One reporting brief drives every delivery format instead of restarting in each tool.",
    },
    {
      label: "Control",
      value: "Deterministic + AI",
      detail: "Teams can keep a governed path even when AI is restricted or unavailable.",
    },
    {
      label: "Rollout",
      value: "Pilot-friendly",
      detail: "A team can prove value on one workbook before standardizing the motion.",
    },
  ] satisfies MarketingSignal[],
  workflow: {
    eyebrow: "How it works",
    title: "The reporting layer sits on top of the spreadsheet the team already uses.",
    summary:
      "Select the range, capture the reporting brief, shape the story once, then issue the outputs that managers, execs, clients, and operators actually consume.",
    steps: [
      {
        title: "Select the Excel range",
        detail: "Start with a real worksheet, not a blank BI project or a separate modelling tool.",
      },
      {
        title: "Capture the brief",
        detail:
          "Audience, decision, KPI priorities, report style, and required visuals are collected conversationally.",
      },
      {
        title: "Plan the storyline",
        detail:
          "The add-in creates a shared story plan so slides, dashboards, and web outputs feel coherent instead of repetitive.",
      },
      {
        title: "Ship multi-format outputs",
        detail:
          "Deliver workbook reporting, executive decks, HTML dashboards, Apps Script web apps, and email summaries from the same run.",
      },
    ] satisfies WorkflowStep[],
  },
  beforeAfter: {
    eyebrow: "Why teams switch",
    title: "Faster than rebuilding packs manually. Sharper than prompting a generic model.",
    before: [
      "Analysts build the same weekly or monthly pack from scratch in Excel and PowerPoint.",
      "Generic AI tools rewrite text but keep the structure repetitive and lightweight.",
      "BI projects are too slow when the team needs a decision pack before the next meeting.",
      "Client-facing reporting looks assembled, not designed.",
    ],
    after: [
      "A reusable brief and story plan shape every output before narrative polish happens.",
      "Slides, HTML dashboards, and web apps share the same business intent and message hierarchy.",
      "Teams get premium reporting surfaces without abandoning Excel.",
      "Leaders receive faster, cleaner, more decision-oriented deliverables.",
    ],
  },
  outputs: {
    eyebrow: "What ships",
    title: "One source selection. Multiple finished reporting surfaces.",
    items: [
      {
        title: "Workbook Report",
        summary:
          "Excel-native reporting sheets for the people who still need the spreadsheet as source of truth.",
        benefit:
          "Keeps the workflow credible for finance, sales, and operations teams that live in Excel.",
      },
      {
        title: "Executive Deck",
        summary: "A storyline-driven slide plan with export-ready deck and PDF paths.",
        benefit: "Reduces the hours lost rebuilding the same board pack every cycle.",
      },
      {
        title: "HTML Dashboard",
        summary:
          "A polished reporting surface with hierarchy, scorecards, trend blocks, and comparison panels.",
        benefit:
          "Makes the output feel closer to a product-grade dashboard than a stitched-together report.",
      },
      {
        title: "Apps Script Web App",
        summary:
          "A lightweight reporting web app scaffold with a stronger story, layout, and review experience.",
        benefit:
          "Useful for client sharing, field access, and quick internal distribution without a full web team.",
      },
      {
        title: "Email Summary",
        summary:
          "Decision-focused narrative for the people who need the headline before the meeting starts.",
        benefit: "Turns analysis into communication, not just artifacts.",
      },
    ] satisfies OutputChannel[],
  },
  personas: {
    eyebrow: "Who it is for",
    title: "Bought by teams that still run important reporting through Excel.",
    items: [
      {
        title: "Sales leadership",
        pain: "Weekly pipeline and revenue packs keep getting rebuilt manually from CRM exports and spreadsheet pivots.",
        promise:
          "Generate sharper review decks with KPI hierarchy, territory comparisons, and action pages.",
        outcomes: [
          "Faster weekly business reviews",
          "Less repetition in regional and product commentary",
          "Cleaner escalation of pipeline risks and growth pockets",
        ],
      },
      {
        title: "Finance and FP&A",
        pain: "Month-end and board materials stall because spreadsheet analysis and presentation packaging are disconnected.",
        promise:
          "Turn workbook analysis into board-ready finance packs without waiting for a BI sprint.",
        outcomes: [
          "Better variance narration",
          "Clearer target-versus-actual storytelling",
          "More disciplined executive summary structure",
        ],
      },
      {
        title: "Operations teams",
        pain: "Operational dashboards are dense but not presentation-ready for leadership or customers.",
        promise:
          "Move from status reporting to action-oriented operational reviews with stronger layout discipline.",
        outcomes: [
          "Cleaner KPI scorecards",
          "Stronger exception and anomaly sections",
          "Faster operating reviews with less manual formatting",
        ],
      },
      {
        title: "Consultants and agencies",
        pain: "Client reporting burns margin because every engagement needs custom formatting and deck production.",
        promise:
          "Create reusable reporting motions from client Excel files while keeping the deliverable premium.",
        outcomes: [
          "Higher delivery throughput",
          "More consistent client reporting",
          "A better bridge from analysis to presentation",
        ],
      },
      {
        title: "SMBs without a BI team",
        pain: "The business needs dashboards and deck packs, but the stack is still Excel plus a few exports.",
        promise:
          "Get decision-ready reporting without hiring a BI squad or redesigning the entire stack.",
        outcomes: [
          "Lower reporting overhead",
          "More executive-ready reporting from existing files",
          "A pragmatic path before a full BI program exists",
        ],
      },
      {
        title: "Enterprise reporting teams",
        pain: "BI covers core dashboards, but urgent one-off reporting still falls back to spreadsheets and rushed decks.",
        promise:
          "Standardize the Excel-to-decision-pack gap with deterministic workflows and optional managed AI.",
        outcomes: [
          "Better interim reporting between BI cycles",
          "Safer adoption through deterministic fallback",
          "A credible path to tenant-ready rollout",
        ],
      },
    ] satisfies PersonaCard[],
  },
  useCases: {
    eyebrow: "Use cases",
    title: "The strongest entry points are recurring reviews, not abstract AI experiments.",
    items: [
      {
        title: "Monthly executive review",
        audience: "CEO, COO, CFO",
        whyExcel:
          "The working file already sits in Excel and needs to become a decision pack fast.",
        result: "Story-led deck plus HTML dashboard for pre-read circulation.",
      },
      {
        title: "Board pack preparation",
        audience: "Finance, strategy, founder office",
        whyExcel: "Source models, variances, and commentary start in spreadsheets.",
        result: "More disciplined headlines, cleaner KPI flow, and less slide duplication.",
      },
      {
        title: "Weekly sales review",
        audience: "VP Sales, regional managers",
        whyExcel: "Teams export pipeline and bookings data into Excel every week.",
        result: "Sharper territory, segment, and product views with clear next actions.",
      },
      {
        title: "Operational performance dashboard",
        audience: "Operations, supply chain, service teams",
        whyExcel: "Teams need a dashboard surface without standing up a full BI project.",
        result: "KPI cards, trend panels, and exception blocks with executive readability.",
      },
      {
        title: "Client reporting pack",
        audience: "Consultants, agencies, account teams",
        whyExcel:
          "Client data arrives in spreadsheets and still needs a polished external deliverable.",
        result: "Deck, email summary, and lightweight web app from one source file.",
      },
      {
        title: "Finance close and variance pack",
        audience: "FP&A, controllers",
        whyExcel: "The close narrative is still anchored in workbook analysis.",
        result: "Variance-first storytelling and better target-versus-actual reporting.",
      },
      {
        title: "Investor or lender update",
        audience: "Founder, CFO, investor relations",
        whyExcel: "The model is already in Excel, but the presentation quality has to rise.",
        result: "Cleaner headline metrics, trend context, and action narrative.",
      },
      {
        title: "Field-ready web reporting",
        audience: "Regional teams, clients, franchise operators",
        whyExcel: "Teams need something shareable beyond a workbook attachment.",
        result:
          "Apps Script web app with dashboard-grade structure and lighter distribution friction.",
      },
    ] satisfies UseCaseCard[],
  },
  comparison: {
    eyebrow: "Why it wins",
    title: "Built for reporting quality, not just summary text.",
    rows: [
      {
        capability: "Starting point",
        manual: "Excel file plus manual formatting",
        genericAi: "Prompt-only text rewrite",
        reportForge: "Real Excel selection with a shared report brief",
      },
      {
        capability: "Story planning",
        manual: "Human dependent and inconsistent",
        genericAi: "Usually shallow or repetitive",
        reportForge: "Purpose-led page planning with anti-repetition guardrails",
      },
      {
        capability: "Multi-output consistency",
        manual: "Each output rebuilt separately",
        genericAi: "Text can diverge from structure",
        reportForge: "Slides, HTML, GAS, and email share one intent model",
      },
      {
        capability: "Adoption friction",
        manual: "Slow and labor intensive",
        genericAi: "Easy to try, hard to operationalize",
        reportForge: "Excel-native, deterministic, and rollout-friendly",
      },
      {
        capability: "Executive finish",
        manual: "Depends on analyst design skill",
        genericAi: "Often outline-like",
        reportForge: "Built for finished reporting surfaces and clearer hierarchy",
      },
    ] satisfies ComparisonRow[],
  },
  storeShots: {
    eyebrow: "Store and sales assets",
    title: "Reusable product surfaces for Microsoft Store, outbound, and live demos.",
    items: [
      {
        label: "Screenshot 01",
        title: "Excel taskpane intake",
        detail:
          "Shows the conversational brief, KPI priorities, and story planning flow directly inside Excel.",
        imageSrc: "assets/reportforge-store-shot-01.png",
      },
      {
        label: "Screenshot 02",
        title: "Executive deck preview",
        detail: "Shows message-led slides, KPI cards, trend panels, and recommendation framing.",
        imageSrc: "assets/reportforge-store-shot-02.png",
      },
      {
        label: "Screenshot 03",
        title: "HTML dashboard surface",
        detail:
          "Shows a premium dashboard composition that looks closer to a reporting product than a template export.",
        imageSrc: "assets/reportforge-store-shot-03.png",
      },
    ] satisfies StoreShot[],
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Start with a pilot. Expand when the reporting motion sticks.",
    tiers: [
      {
        name: "Starter",
        price: "$0",
        cadence: "Single analyst",
        summary:
          "Best for first installs, internal testing, and proving the Excel-to-output motion.",
        badge: "PLG entry",
        features: [
          "Deterministic workbook reporting",
          "HTML preview and slide planning",
          "Single-user setup",
          "Basic reusable templates",
        ],
        cta: {
          label: "Start With Starter",
          href: "#launch-request",
          tone: "secondary",
        },
      },
      {
        name: "Pro",
        price: "$39",
        cadence: "per user / month",
        summary:
          "Best for analysts, consultants, and operators who need polished outputs every week.",
        features: [
          "Conversational reporting intake",
          "Executive deck, PDF, HTML, JSON, and GAS outputs",
          "AI enhancement with OpenAI-compatible providers",
          "Saved reporting templates and stronger export workflow",
        ],
        cta: { label: "Choose Pro", href: "#launch-request", tone: "primary" },
      },
      {
        name: "Team",
        price: "$249",
        cadence: "per workspace / month",
        summary:
          "Best for multi-analyst teams standardizing recurring reporting across a function.",
        recommended: true,
        badge: "Recommended",
        features: [
          "Five creator seats included",
          "Shared reporting cadence and rollout pack",
          "Brand and template alignment support",
          "Priority onboarding for recurring management reporting",
        ],
        cta: { label: "Launch Team Plan", href: "#launch-request", tone: "primary" },
      },
      {
        name: "Enterprise",
        price: "Custom",
        cadence: "managed rollout",
        summary:
          "Best for Microsoft 365 deployment, managed AI, and institution-grade operating controls.",
        badge: "High-ACV",
        features: [
          "Managed AI relay and security review path",
          "Tenant rollout and packaging support",
          "Private deployment guidance for Google-connected outputs",
          "Pilot-to-rollout commercialization support",
        ],
        cta: { label: "Discuss Enterprise", href: "#launch-request", tone: "ghost" },
      },
    ] satisfies PricingTier[],
  },
  leadCapture: {
    eyebrow: "Request a pilot",
    title: "Tell us where reporting is breaking today.",
    summary:
      "We only need enough context to route the conversation well. Start with the essentials and add reporting detail if you want us to tailor the pilot.",
    salesEmail: siteRuntimeConfig.salesEmail,
    teamSizes: ["1", "2-5", "6-20", "21-50", "50+"],
    note: "Set REPORTFORGE_SITE_LEAD_ENDPOINT for live lead capture and REPORTFORGE_SALES_EMAIL for direct mail routing.",
  } satisfies LeadCapture,
  faq: {
    eyebrow: "FAQ",
    title: "The objections commercial buyers ask first.",
    items: [
      {
        question: "Is this a replacement for Power BI?",
        answer:
          "No. ReportForge covers the gap between spreadsheet analysis and polished decision-ready reporting. It is strongest when a team lives in Excel and needs faster reporting outputs without waiting for a full BI build.",
      },
      {
        question: "Does it still work when AI is disabled?",
        answer:
          "Yes. Deterministic generation remains available by default. The AI layer is additive, not required for the product to run.",
      },
      {
        question: "What makes it different from generic AI report generators?",
        answer:
          "The product does not stop at text polishing. It captures a report brief, plans the story, applies anti-repetition guardrails, and then generates multiple output formats from the same structure.",
      },
      {
        question: "Is the data sent to a backend by default?",
        answer:
          "The add-in is designed to stay client-side by default. Session-only handling is used for API keys and tokens, and a same-origin managed relay is available when teams want centralized AI access.",
      },
      {
        question: "Who gets value fastest?",
        answer:
          "Teams already using Excel for management reporting, client reporting, sales reviews, finance packs, and operational updates see the fastest adoption because the workflow fits their existing habits.",
      },
      {
        question: "Can this be sold through the Microsoft Store?",
        answer:
          "Yes. The product is already packaged as an Excel Office add-in and the marketing site here is structured to support Microsoft Store merchandising and product-led onboarding.",
      },
    ] satisfies FaqItem[],
  },
  closing: {
    eyebrow: "Next step",
    title: "Prove it on one workbook. Standardize it across the team.",
    summary:
      "The fastest path is still simple: start from one real workbook, prove the reporting lift, then expand into recurring management reporting and governed deployment.",
    primaryCta: {
      label: "Request a Pilot",
      href: "#launch-request",
      tone: "primary",
    } satisfies MarketingCta,
    secondaryCta: {
      label: "Read Deployment Notes",
      href: "support.html",
      tone: "secondary",
    } satisfies MarketingCta,
  },
} as const;

export function getRecommendedPricingTier(): PricingTier | undefined {
  return marketingSiteContent.pricing.tiers.find((tier) => tier.recommended);
}
