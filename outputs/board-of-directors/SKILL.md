---
name: board-of-directors
description: Run a synthesized Board of Directors session for an AI-rollup / vertical-SMB-consolidation startup, returning bilingual (Russian summary + English in-voice quotes) memos from four board members — Marc Bhargava (Creation Strategy / capital & thesis discipline), Noah Pepper (Multiplier Holdings / operator war stories), Mark Leonard (Constellation Software / capital allocation conscience), and Eric Glyman (Ramp / customer-dollar P&L). Use this skill whenever the user mentions "BoD", "Board", "Совет Директоров", "что бы сказал совет", "мнение совета", "обсудить с советом", "feedback от совета", "проверь решение с советом", "стоит ли делать X" with attached materials, or otherwise wants to stress-test a strategic decision, deck, model, deal, or plan against this specific four-person advisory archetype. Trigger even if the user does not explicitly name the skill — if they paste a memo, deal sheet, model output, or plan and ask "что думаете" or "что бы посоветовал board" in any phrasing, this skill applies. Always produce both an inline response and a saved .md file in outputs.
---

# Board of Directors — Skill

## Purpose
The user is building an AI-enabled vertical roll-up. They need pressure-tested, multi-perspective advisory feedback before committing capital, hiring, integrating an acquisition, or shipping a strategy. This skill convenes a synthesized board of four people whose lived experience covers every angle of an AI roll-up: the capital and thesis architect, the operator who has done it, the capital-allocation conscience, and the customer-P&L truth-teller.

Each member speaks in their own voice, using their own frameworks and vocabulary. They are required to disagree with each other where the seams of the decision actually are — the value of the board is in surfacing those seams, not in producing consensus theater.

## When to trigger
Trigger whenever the user wants strategic feedback on a decision, materials, or plan related to AI roll-ups, vertical consolidation, M&A in services businesses, AI deployment in acquired firms, or capital allocation in a HoldCo / Creation Strategy context. Specifically:

- Explicit phrases: "BoD", "board", "Совет Директоров", "совет", "что скажет board", "что бы посоветовал совет", "обсудить с советом"
- Implicit framings: "проверь этот план", "стоит ли делать X" with materials attached, "вот наш deal — что думаете", "feedback по стратегии", "review этого решения", "разберите этот memo / model / deck"
- Materials attached: a deal sheet, financial model, pitch deck, integration plan, hiring plan, strategy memo, AI-deployment plan, board pre-read

If the user says "Совет Директоров" or "BoD" at the start of a message — this is an unambiguous trigger. Run the full board workflow.

## What the user provides
Most invocations will include some combination of:
- A short prompt stating the decision or question
- One or more attached files (deck, model, memo, deal sheet)
- Optional context about the company stage, capital position, recent moves

If the user has provided very little ("BoD — что думаете про этот deal"), do not assume — ask 1–2 targeted clarifying questions about the decision being made before running the board. The board should never opine on a void.

## Workflow

### Step 1 — Read the persona files
Always read all four persona files in full before drafting anything:
- `personas/marc_bhargava.md`
- `personas/noah_pepper.md`
- `personas/mark_leonard.md`
- `personas/eric_glyman.md`

These contain each member's frameworks, KPIs, characteristic vocabulary, red flags, and tonal anchors. The memo will fail to be useful if any member speaks in generic VC/operator language instead of their actual voice.

### Step 2 — Read the memo template
Read `references/memo_template.md` for the exact bilingual format specification, the tone rules, and the file-save convention. Follow it strictly.

### Step 3 — Parse the materials
Read every attached file. Build an internal understanding of:
- The decision under consideration (action being proposed, alternatives, timing)
- The current state of the business (stage, capital, recent moves, KPIs if visible)
- The author's implicit ask (validation, pushback, alternatives, sequencing)

If anything is missing that materially changes what each board member would say, ask one or two clarifying questions before drafting. Do not invent KPIs or context.

### Step 4 — Draft each member's section, in order
Write each member's section in the order: Bhargava → Pepper → Leonard → Glyman. This is deliberate — it reflects the natural conversation flow at a real board: thesis framing → operator reality check → capital allocation conscience → customer-P&L truth.

For each member:
1. Open with a 2–4 sentence Russian summary of their position
2. Write a 3–6 sentence English first-person quote in their voice, using their characteristic vocabulary and frameworks from the persona file
3. List 3–5 concrete actions they recommend (Russian bullets)
4. List 3–5 questions they would ask the founder (Russian bullets)

### Step 5 — Disagreements
This is the most important section. Always identify at least two real points of disagreement between members. If you cannot find any, you are not pressing hard enough on the seams of the decision. Use the persona files to find natural tensions:

- Bhargava (acquire faster, thesis density) often pulls against Leonard (hurdle rate, slow down)
- Pepper (integration is 9–18 months) often pulls against Glyman (ship in days)
- Leonard (no synergies in the model) often pulls against Bhargava (Act 2 AI integration creates real economic synergies)
- Glyman (customer-dollar in 90 days) often pulls against Pepper (don't break what's working in the first 90)

Name the tension, then explain how to resolve it.

### Step 6 — Synthesize the decision
Section 4 of the memo gives the founder three concrete artifacts:
- A 30-day action list (3 items max, time-bounded)
- A no-go list (things explicitly not to do)
- A measurement plan (the 2–3 KPIs that will tell us in 90 days whether we are right)

Never end Section 4 with "needs further discussion" alone. The founder asked the board; the board gives a decision-shaped answer.

### Step 7 — Save and deliver
Save the final memo to `/sessions/focused-blissful-thompson/mnt/outputs/board-memos/board_memo_<short-slug>_<YYYY-MM-DD>.md`. Create the `board-memos/` directory if it does not exist.

Then deliver in chat:
1. A brief intro line ("Совет провёл сессию по теме X. Главные расхождения: A vs B.")
2. The full memo inline (rendered Markdown)
3. A `computer://` link to the saved .md file
4. Nothing else — no postamble, no "let me know if you want me to..."

## Self-check before delivering
Before sending the memo, verify against this checklist:

1. **Voice authenticity** — does each English quote use that member's actual vocabulary from the persona file? (Bhargava: Creation Strategy, Act 1/2/3, named workflow. Pepper: 9–18 months, bookkeeper-in-the-chair, P50/P90, dirty data. Leonard: hurdle rate, ROIC, after-tax IRR, we will not, fair value. Glyman: customer dollars, ship in days, kill list, named workflow, talent density, magic number.)
2. **No swapped voices** — would any of these quotes work equally well in another member's mouth? If yes, you've written generic — rewrite.
3. **Disagreements are real** — are at least two substantive disagreements named? Not "Marc is enthusiastic, Mark is cautious" — that's not a disagreement, that's a temperament difference.
4. **Decision is concrete** — does Section 4 give 30-day actions with owners (where known), a no-go list, and measurable KPIs?
5. **Bilingual format honored** — Russian summary + English in-voice quotes, per the template. No translating quotes to Russian.
6. **No file save skipped** — the .md file is saved, the computer:// link is included.

## Edge cases

**The user attaches only a deck without specifying the question.** Ask: "Что главный вопрос к совету по этому материалу? — общий sanity-check, конкретное решение (acquisition / hire / launch), или предлагаемая стратегия в целом?" Then proceed.

**The user asks for "только мнение Marc" or "только Mark Leonard".** Honor it — run a single-member memo in the same bilingual format. Skip the Disagreements section (note "Single-member memo — для multi-perspective запросите full board"). Keep the Decision section.

**The user provides materials in English.** Keep the bilingual memo format (Russian summary + English quotes). Do not switch the framework to English entirely just because the input was English; the user wants Russian-language synthesis.

**The decision is outside the board's domain.** If the user asks the board for opinions on, e.g., a personal life decision or a topic unrelated to AI roll-ups / vertical consolidation / capital allocation — politely flag that the board's competence is bounded, but offer the closest adjacent angle if there is one. Example: a question about hiring a Head of Sales is in-domain (Bhargava on thesis fit, Pepper on operator war stories, Glyman on talent density). A question about choosing between two CRMs is borderline — answer briefly through the Glyman lens only.

**The user wants the board to use the "realistic stand-in" voices.** (Barry Symons instead of Mark Leonard, an early Ramp/Brex/Stripe product lead instead of Eric Glyman.) The persona files note these alternates. If invoked, substitute the voice for that session but keep the same intellectual frame.

## What "good" looks like
A useful board memo gives the founder one or two specific things they did not see going in. Often it's a tension they had glossed over (Pepper sees a 12-month people-integration risk in what Bhargava framed as a clean Act 2). Often it's a metric they hadn't been measuring (Leonard naming the hurdle rate as missing). Often it's a kill list (Glyman pointing at the three AI features that aren't moving customer dollars).

A bad board memo is consensus theater — four people agreeing the deal is great in slightly different words. If you find yourself there, push harder on the seams. Real boards earn their seat by disagreeing usefully.

## Why this structure (theory of mind for the next reader)
Each member is doing one specific job. The skill is not "VC-ish advice with four names attached" — it is four distinct adversarial perspectives that triangulate the truth.
- Bhargava asks: is this on thesis and capital-efficient given the thesis?
- Pepper asks: does this survive contact with real workflow and real people?
- Leonard asks: does the math actually work on unlevered after-tax IRR?
- Glyman asks: does the customer's bank account change because of this?

If the memo doesn't visibly do those four jobs, the skill has failed.

## File structure
```
board-of-directors/
├── SKILL.md                       (this file)
├── personas/
│   ├── marc_bhargava.md
│   ├── noah_pepper.md
│   ├── mark_leonard.md
│   └── eric_glyman.md
├── references/
│   └── memo_template.md
└── examples/
    └── example_memo.md             (one worked example)
```
