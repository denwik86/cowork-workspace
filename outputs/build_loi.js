const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  LevelFormat, PageBreak
} = require('docx');
const fs = require('fs');

const NAVY = "1F2A4C";
const USABLE = 9360;

function h(text) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: NAVY })],
  });
}
function p(children, opts = {}) {
  return new Paragraph({ spacing: { after: 120 }, children, ...opts });
}
function t(text, opts = {}) { return new TextRun({ text, size: 22, ...opts }); }

// bullet paragraph
function bullet(runs) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 60 },
    children: Array.isArray(runs) ? runs : [t(runs)],
  });
}
// sub-item with bold lead label then text
function clause(num, bold, rest) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: num + " ", bold: true, size: 22 }),
      new TextRun({ text: bold, bold: true, size: 22 }),
      new TextRun({ text: rest, size: 22 }),
    ],
  });
}

function cell(runs, width, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: opts.shading ? { type: ShadingType.CLEAR, fill: opts.shading, color: "auto" } : undefined,
    children: [new Paragraph({ children: runs })],
  });
}

function twoColTable(rows, w1, w2, headerFill) {
  const trs = rows.map((r, i) => new TableRow({
    children: [
      cell([new TextRun({ text: r[0], bold: i === 0, size: 22 })], w1, { shading: i === 0 ? headerFill : undefined }),
      cell([new TextRun({ text: r[1], bold: i === 0, size: 22 })], w2, { shading: i === 0 ? headerFill : undefined }),
    ],
  }));
  return new Table({
    columnWidths: [w1, w2],
    width: { size: w1 + w2, type: WidthType.DXA },
    rows: trs,
  });
}

const children = [];

// Title
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 60 },
  children: [new TextRun({ text: "LETTER OF INTENT", bold: true, size: 40, color: NAVY })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 240 },
  children: [new TextRun({ text: "Non-Binding · Confidential · For Discussion Purposes Only", bold: true, italics: true, size: 20 })],
}));

// Header block
children.push(p([new TextRun({ text: "Date: ", bold: true, size: 22 }), t("[●] July 2026")]));
children.push(p([new TextRun({ text: "From: ", bold: true, size: 22 }), t("[Buyer SPV] (the “Buyer”)")]));
children.push(p([new TextRun({ text: "To: ", bold: true, size: 22 }), t("The Founders and Existing Shareholders of Animaccord Ltd. (the “Company”)")]));

// Intro
children.push(p([t("This Letter of Intent (“LOI”) sets out the non-binding proposed terms on which the Buyer would acquire a 25% shareholding in the Company. This LOI is intended to be the basis for good-faith negotiation of definitive documents. Save for the sections expressly marked as binding, no party shall have any legal obligation to complete the transaction.")]));

// Transaction at a glance
children.push(h("The Transaction At a Glance"));
children.push(twoColTable([
  ["Item", "Terms"],
  ["Initial stake", "Buyer acquires 25% of the Company on closing"],
  ["Purchase price", "USD 30,000,000 (thirty million US Dollars)"],
  ["Implied 100% equity value", "USD 120,000,000"],
  ["Sellers", "Expected to be existing financial-investor shareholders (UFG)"],
  ["Vehicle", "Buyer acquires through a Cyprus / BVI special purpose vehicle (the “SPV”)"],
], 3400, 5960, "DDE3EC"));

// Section 1
children.push(h("The Acquisition (25%)"));
children.push(clause("1.1", "Consideration.", " USD 30,000,000 in cash, payable at closing."));
children.push(clause("1.2", "Structure.", " Secondary purchase of 2,500 issued shares (representing 25% of the current 10,000-share cap table) from one or more Existing Shareholders (proposed source: exiting financial holder (UFG)). The parties may agree an alternative allocation among the Sellers."));
children.push(clause("1.3", "Buyer’s own funding.", " The consideration is funded by SPV equity contributions from the Buyer’s consortium."));

// Section 2 - Buyer's Named Rights (renumbered from 3)
children.push(h("Buyer’s Named Rights"));
children.push(clause("2.1", "Purpose.", " While the Buyer holds a minority stake, the Buyer requires meaningful minority protection to safeguard its investment. These rights are granted to the Buyer personally and by name in the amended SHA."));

children.push(clause("2.2", "Board representation.", ""));
children.push(bullet("15% – 30% Buyer holding → right to appoint 1 Director (of 5)"));
children.push(bullet("≥30% Buyer holding → right to appoint 2 Directors (of 5)"));
children.push(bullet("Buyer’s Directors shall be entitled to receive all Board papers and to participate fully in Board committees"));

children.push(clause("2.3", "Hard veto – Board Reserved Matter:", ""));
[
  "(a) approval or material modification (>10% variance) of the annual Budget or Business Plan",
  "(b) declaration or payment of any dividend or distribution while no dividend policy is in force",
  "(c) setting or changing remuneration of the Group CEO or Group CFO",
  "(d) incurring Financial Debt above 3x prior-year IFRS audited EBITDA",
  "(e) hiring or terminating any C-level executive or Key Manager",
  "(f) approval of annual capital expenditure exceeding USD 2M",
  "(g) entry into any exclusive licensing or distribution agreement with a term exceeding 24 months",
  "(h) any transaction outside the ordinary course",
].forEach(x => children.push(bullet(x)));

children.push(clause("2.4", "Additional Shareholder Reserved Matters.", ""));
[
  "(a) any related-party transaction with a value exceeding USD 50,000",
  "(b) any equity issuance below the price per share implied by this transaction (USD 120,000,000 equity value)",
  "(c) any amendment to the SHA or Articles that could adversely affect the Buyer’s Named Rights",
  "(d) any settlement of a material litigation (>USD 250,000)",
  "(e) any change to the Company’s auditor or accounting standards",
].forEach(x => children.push(bullet(x)));

children.push(clause("2.5", "Group CFO nomination.", " The Buyer shall have the right to nominate the Group CFO."));

children.push(clause("2.6", "Enhanced information rights.", " So long as the Buyer holds ≥5% of the issued shares:"));
[
  "Monthly: management P&L, cash flow, budget vs. actual – within 15 business days of month-end",
  "Quarterly: consolidated management accounts + rolling forecast – within 30 business days of quarter-end",
  "Annual: IFRS audited consolidated financials – within 180 days of financial year-end",
  "Board pack: delivered to Buyer’s Directors and one Buyer Board Observer no fewer than 5 business days before each meeting",
  "Immediate notice of: legal claims >USD 100,000; Key Manager changes; Key Client contract termination; any event with likely negative impact >USD 500,000",
  "Books-and-records inspection right on 10 business days’ notice, at Buyer’s expense",
].forEach(x => children.push(bullet(x)));

children.push(clause("2.7", "Preservation of existing minority protections:", ""));
[
  "Pre-emptive rights",
  "Right of first refusal",
  "Tag-along rights",
].forEach(x => children.push(bullet(x)));
children.push(bullet([
  new TextRun({ text: "Drag-along trigger. ", bold: true, size: 22 }),
  t("The Buyer shall have a personal, named right to trigger a drag-along on all other Shareholders (the “Enhanced Drag”) whenever the Buyer receives a bona fide, binding, arm’s-length third-party offer to purchase 100% of the Company’s issued share capital at an implied equity valuation of USD 250,000,000 or more"),
]));
children.push(bullet("Non-encumbrance protection"));

// Conditions to Closing
children.push(h("Conditions to Closing"));
children.push(p([t("Closing shall be subject to customary conditions, including:")]));
[
  "Satisfactory legal, financial, tax, commercial and IP due diligence",
  "No material adverse change since the last audited financials",
  "Confirmation of clean corporate registers, cap table, and no undisclosed equity-linked instruments",
  "Signing of the amended SHA on terms substantially reflecting this LOI",
  "Signing of the Share Purchase Agreement by the Buyer and the Sellers",
  "Deed of Adherence signed by any non-party existing shareholders",
].forEach(x => children.push(bullet(x)));

// Exclusivity
children.push(h("Exclusivity"));
children.push(p([t("For a period of ninety (90) days from the signature of this LOI (the “Exclusivity Period”), the Company and the Founders shall not, and shall procure that no Group Company or any Related Party shall, directly or indirectly:")]));
[
  "(a) solicit, initiate or encourage any proposal for the acquisition of any shares in the Company; or",
  "(b) enter into, continue or engage in any negotiation or discussion with any third party in relation to any such transaction; or",
  "(c) provide any confidential information regarding the Group to any third party for such purpose.",
].forEach(x => children.push(bullet(x)));
children.push(p([t("The Exclusivity Period may be extended by mutual written agreement.")]));

// Timeline
children.push(h("Indicative Timeline"));
children.push(twoColTable([
  ["Milestone", "Timing"],
  ["LOI signature", "Week 0"],
  ["Due diligence + negotiation of definitive documents", "Weeks 1 – 12"],
  ["Signing of SPA and amended SHA", "Weeks 12 – 14"],
  ["Regulatory clearances (if required)", "Weeks 12 – 15"],
  ["Closing", "Weeks 14 – 18 (target Q4 2026)"],
], 5960, 3400, "DDE3EC"));

// Costs
children.push(h("Costs and Expenses"));
children.push(p([t("Each party shall bear its own costs. If this LOI does not proceed to definitive documents by a longstop date to be mutually agreed, no party shall have any liability to any other, save in respect of confidentiality and exclusivity obligations.")]));

// Confidentiality
children.push(h("Confidentiality"));
children.push(p([t("The existence and terms of this LOI, and all discussions and materials in connection with it, are confidential. No party shall disclose the same to any third party without the other party’s prior written consent, save to their respective professional advisors on a strict need-to-know basis.")]));

// Governing law
children.push(h("Governing Law"));
children.push(p([t("This LOI (and any definitive documents resulting from it) shall be governed by the laws of England and Wales.")]));

// Non-binding
children.push(h("Non-Binding Nature"));
children.push(p([t("This LOI reflects the parties’ current mutual intentions. It is non-binding and does not create any legal obligation to complete the transaction, except for Exclusivity, Costs and Expenses, Confidentiality and Governing Law, which are binding upon signature.")]));
children.push(p([t("No party shall have any binding obligation to consummate the transaction unless and until the definitive Share Purchase Agreement and amended Shareholders’ Agreement are executed by all relevant parties.")]));

// Signatures
children.push(h("Signatures"));
children.push(p([new TextRun({ text: "For the Buyer / SPV:", bold: true, size: 22 })]));
["Name: ________________________________", "Title: _________________________________", "Date: _________________________________", "Signature: _____________________________"].forEach(x => children.push(p([t(x)], { spacing: { after: 40 } })));
children.push(p([new TextRun({ text: "For the Founders / Company:", bold: true, size: 22 })], { spacing: { before: 160, after: 120 } }));
["Name: ________________________________", "Title: _________________________________", "Date: _________________________________", "Signature: _____________________________"].forEach(x => children.push(p([t(x)], { spacing: { after: 40 } })));

const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 460, hanging: 260 } } } }],
    }],
  },
  styles: { default: { document: { run: { font: "Calibri" } } } },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("/sessions/tender-vigilant-bell/mnt/outputs/Animaccord_LOI_25pct.docx", buf);
  console.log("written");
});
