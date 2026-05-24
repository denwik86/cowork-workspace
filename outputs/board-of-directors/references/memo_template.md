# Board Memo — Bilingual Format Specification

Use this exact structure for every board memo the skill produces. Russian is the working language for the user; English is reserved for direct in-voice quotes from each member, because that is how they actually speak.

---

## Mandatory document structure

```
# Совет Директоров — Меморандум
**Тема:** <тема обсуждения, 1 строка>
**Дата:** <YYYY-MM-DD>
**Запросил:** <имя пользователя или "Founder">
**Состав совета:** Marc Bhargava (GC), Noah Pepper (Multiplier), Mark Leonard (Constellation), Eric Glyman (Ramp)

---

## 1. Контекст (что обсуждаем)
<2–4 предложения на русском: что за решение / материал на столе, что founder хочет от совета. Это парафраз входных материалов, не их повтор>

## 2. Голоса по отдельности

### 2.1 Marc Bhargava — Capital & Thesis Discipline
**Краткая позиция (RU, 2–4 предложения):**
<суть мнения Marc по этому вопросу — на русском>

**Что он сказал бы вслух (EN, 3–6 sentences in his voice, as direct first-person quote):**
> "<his actual voice, first person, English — using his characteristic vocabulary: Creation Strategy, AI-native, compounding, phase change, Act 1/2/3, named workflow, walked away from, gross retention, EBITDA uplift cohort-over-cohort>"

**Конкретные действия, которые он рекомендует (RU bullet list, 3–5 пунктов):**
- <action 1>
- <action 2>
- <action 3>

**Вопросы, которые он задаёт founder (RU bullet list, 3–5 вопросов):**
- <question 1>
- <question 2>

---

### 2.2 Noah Pepper — Operator War Stories
**Краткая позиция (RU, 2–4 предложения):**

**Что он сказал бы вслух (EN, 3–6 sentences in his voice):**
> "<his voice: scarred operator, specific incidents not principles, refers to actual workflows, real numbers, bookkeeper-in-the-chair examples, 9–18 month integration reality, staff-level churn, AI-on-dirty-data, P50/P90 SLAs>"

**Конкретные действия, которые он рекомендует (RU bullet list, 3–5 пунктов):**

**Вопросы, которые он задаёт founder (RU bullet list, 3–5 вопросов):**

---

### 2.3 Mark Leonard — Capital Allocation Conscience
**Краткая позиция (RU, 2–4 предложения):**

**Что он сказал бы вслух (EN, 3–6 sentences in his voice):**
> "<his voice: dry, precise, anti-bullshit, three sentences not three pages, words like 'hurdle rate', 'unlevered after-tax IRR', 'we will not', 'ROIC', 'fair value', 'compounding', 'decentralized', 'no synergies', 'walked away'>"

**Конкретные действия, которые он рекомендует (RU bullet list, 3–5 пунктов):**

**Вопросы, которые он задаёт founder (RU bullet list, 3–5 вопросов):**

---

### 2.4 Eric Glyman — Customer-Dollar P&L
**Краткая позиция (RU, 2–4 предложения):**

**Что он сказал бы вслух (EN, 3–6 sentences in his voice):**
> "<his voice: customer-dollar-savings-per-customer, ship in days not sprints, kill list, talent density, headcount-per-$1M-net-new-revenue, named AI workflow, hallucination rate budgeted, magic number, 'if we cut 30% tomorrow what goes first'>"

**Конкретные действия, которые он рекомендует (RU bullet list, 3–5 пунктов):**

**Вопросы, которые он задаёт founder (RU bullet list, 3–5 вопросов):**

---

## 3. Где совет расходится (Disagreements)
Структурированно, на русском:
- **<член A> vs <член B>:** <в чём суть расхождения, 1–2 предложения>
- **<член C> vs <член D>:** <...>
- **<общая зона согласия:>** <если есть>

## 4. Синтез — что делать (Decision)
На русском, 3 части:

**Что делать в ближайшие 30 дней:**
1. <action with owner if known>
2. <action>
3. <action>

**Что НЕ делать (явный no-go list):**
1. <thing not to do>
2. <thing not to do>

**Что измерять, чтобы понять, что мы правы:**
- <metric / KPI 1 + target>
- <metric / KPI 2 + target>
- <metric / KPI 3 + target>

## 5. Открытые вопросы для следующей сессии
- <unresolved question 1>
- <unresolved question 2>

---

*Disclaimer (одной строкой в подвале): Это синтезированные мнения, реконструкция голосов реальных людей на основе их публичных материалов до мая 2025 года. Прямые цитаты — стилизованные парафразы, не verbatim.*
```

---

## Tone and writing rules

1. **Each member's English block must be a direct first-person quote** — not "Marc would say that...". It is "<member name> says:" then `>` blockquote.
2. **Each member must use vocabulary native to them** (see persona files for the word lists). If Mark Leonard's quote uses the word "synergy" approvingly, the skill has failed.
3. **Each member must disagree with at least one other member** somewhere in the memo. If all four agree on everything, the board is not earning its keep — push harder on where the seams are.
4. **Section 3 (Disagreements) must be substantive.** Easy disagreement: "Marc wants to acquire faster, Mark says hurdle rate first." Hard disagreement: "Noah says the integration timeline is 18 months — Eric's customer-dollar metric requires showing impact in 90 days. These are in tension. Resolve by: ..."
5. **Section 4 (Decision) is the founder's takeaway.** It must be concrete, time-bounded, and measurable. Never end with "needs further discussion" alone — there must always be a 30-day next step.
6. **Russian sections are crisp and unornamented.** No corporate filler ("в рамках комплексного подхода"), no English business words in the Russian text where a Russian equivalent exists, no emoji.

## Bilingual rationale (why this format)
- The founder works primarily in Russian and wants speed of reading.
- The members are public figures whose voice is in English; translating their direct quote loses the texture that makes the advice useful.
- Russian for synthesis + English for in-voice quotes preserves both speed and authenticity.

## File save convention
Always save the final memo as Markdown to:
`/sessions/focused-blissful-thompson/mnt/outputs/board-memos/board_memo_<short-slug>_<YYYY-MM-DD>.md`

Provide a `computer://` link in the chat output to the saved file.
