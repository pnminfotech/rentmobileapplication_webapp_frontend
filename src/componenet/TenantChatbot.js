import React, { useMemo, useState, useEffect } from "react";
import { FaPaperPlane, FaTimes, FaGlobe, FaCog } from "react-icons/fa";
import Fuse from "fuse.js";
import rawIntents from "./json/chatbotIntents.json";
import "../Pages/TenantChatbot.css";

/* =========================
   Month-aware rent record parser
========================= */
const getYMFromRecord = (r) => {
  if (!r) return null;
  if (r.month) {
    const [mon, yy] = String(r.month).split("-");
    if (mon && yy) {
      const m = new Date(`${mon} 1, 20${yy}`).getMonth(); // 0..11
      const y = Number(`20${yy}`);
      if (Number.isFinite(m) && Number.isFinite(y)) return { y, m };
    }
  }
  if (r.date) {
    const d = new Date(r.date);
    if (!isNaN(d)) return { y: d.getFullYear(), m: d.getMonth() };
  }
  return null;
};

/* =========================
   Helpers
========================= */
const toNum = (v) => {
  if (v == null) return 0;
  const n = Number(String(v).replace(/[,₹\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const prettyCurrency = (n) => `₹${(toNum(n) || 0).toLocaleString("en-IN")}`;

const norm = (s) => (s || "").toLowerCase().trim();
const unique = (arr) => Array.from(new Set(arr));

const isLeft = (tenant, leaveDates) => {
  const iso = leaveDates?.[tenant._id];
  return iso && new Date(iso) < new Date();
};

function defaultExpectFromTenant(tenant, roomsData) {
  const keys = [
    "baseRent",
    "rent",
    "rentAmount",
    "expectedRent",
    "defaultRent",
    "monthlyRent",
    "price",
    "bedPrice",
  ];
  for (const k of keys) {
    const v = toNum(tenant?.[k]);
    if (v) return v;
  }
  if (roomsData && tenant?.roomNo && tenant?.bedNo) {
    const room = roomsData.find((r) => String(r.roomNo) === String(tenant.roomNo));
    const bed = room?.beds?.find((b) => String(b.bedNo) === String(tenant.bedNo));
    return toNum(bed?.price) || toNum(bed?.baseRent) || toNum(bed?.monthlyRent) || 0;
  }
  return 0;
}

/* =========================
   Guess short name from query
========================= */
function guessNameFromQuery(q) {
  let s = (q || "").toLowerCase();
  s = s.replace(/[^a-z0-9\s]/g, " ");
  s = s.replace(
    /\b(rent|status|due|pending|months?|deposit|phone|mobile|details|profile|update|edit|open|for|of|this|last|next|month|in|amount|joining|date|room|bed|vacant|beds|who|all|list)\b/g,
    " "
  );
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return null;
  return s.split(" ")[0];
}

/* =========================
   Due calculations
========================= */
function calculateDueThisYear(rents = [], joiningDateStr) {
  if (!joiningDateStr) return 0;
  const now = new Date();
  const y = now.getFullYear();
  const startOfYear = new Date(y, 0, 1);

  const join = new Date(joiningDateStr);
  const rentStart = new Date(join.getFullYear(), join.getMonth() + 1, 1);
  const start = rentStart > startOfYear ? rentStart : startOfYear;

  const paid = new Set(
    (rents || [])
      .filter((r) => toNum(r?.rentAmount) > 0)
      .map(getYMFromRecord)
      .filter(Boolean)
      .map(({ m, y }) => `${m}-${y}`)
  );

  const lastPaid = (rents || [])
    .filter((r) => toNum(r?.rentAmount) > 0 && getYMFromRecord(r))
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0];

  const rentAmount = lastPaid ? toNum(lastPaid.rentAmount) : 0;

  let dueCount = 0;
  const cur = new Date(start);
  while (cur <= now && cur.getFullYear() === y) {
    const key = `${cur.getMonth()}-${cur.getFullYear()}`;
    if (!paid.has(key)) dueCount++;
    cur.setMonth(cur.getMonth() + 1);
  }
  return rentAmount * dueCount;
}

function pendingMonthsFrom(joiningDateStr, rents = []) {
  if (!joiningDateStr) return [];
  const now = new Date();
  const y = now.getFullYear();
  const join = new Date(joiningDateStr);
  const start = new Date(join.getFullYear(), join.getMonth() + 1, 1);

  const paid = new Set(
    (rents || [])
      .filter((r) => toNum(r?.rentAmount) > 0)
      .map(getYMFromRecord)
      .filter(Boolean)
      .map(({ m, y }) => `${m}-${y}`)
  );

  const out = [];
  const cur = new Date(start);
  while (cur <= now) {
    const key = `${cur.getMonth()}-${cur.getFullYear()}`;
    if (cur.getFullYear() === y && !paid.has(key)) {
      out.push(cur.toLocaleString("default", { month: "long", year: "numeric" }));
    }
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

function isPaidForMonth(rents = [], monthIdx, year) {
  return (rents || []).some((r) => {
    const ym = getYMFromRecord(r);
    return ym && ym.m === monthIdx && ym.y === year && toNum(r.rentAmount) > 0;
  });
}

function buildEntities(formData, roomsData) {
  const names = unique(formData.map((t) => (t.name || "").trim()).filter(Boolean)).sort((a, b) =>
    a.localeCompare(b)
  );
  const rooms = unique((roomsData || []).map((r) => String(r.roomNo)));
  return { names, rooms };
}

/* =========================
   Strings
========================= */
function STR(lang) {
  return {
    greeting: "Hi! Ask about rent, dues, vacancies, deposits, phones, etc. Type ‘help’ for examples.",
    placeholder: "Ask about rent, due, vacancy… (try ‘help’)",
    didntGet: "I didn't get that. Type ‘help’ or try another phrasing.",
    whichMonth: "Which month? Try: this month / last month / next month / March",
    who: "Who?",
    whichRoom: "Which room? Try: “vacant beds in room 101”.",
    noActiveTenant: (n) => `I couldn't find an active tenant named “${n}”.`,
    roomNotFound: (r) => `Room ${r} not found.`,
    rentStatusTitle: (t) => `Rent status for ${t}`,
    labelRoomBed: (r, b) => `Room ${r} • Bed ${b}`,
    expectedMonthly: (amt) => `— Expected monthly: ${amt}`,
    thisYearDue: (amt, mcount) => `— This year due: ${amt} (${mcount} months)`,
    monthlyRentLine: (n, amt) => `${n}'s expected monthly rent: ${amt}`,
    joiningDateLine: (n, d) => `${n}'s joining date: ${d}`,
    roomLine: (n, r) => `${n}'s room: ${r || "—"}`,
    bedLine: (n, b) => `${n}'s bed: ${b || "—"}`,
    detailsTitle: (n) => `Details for ${n}`,
    pendingMonths: "— Pending months:",
    noPendingMonths: "— No pending months ✅",
    vacantTitle: (room) => `Vacant beds in room ${room}:`,
    vacantLine: (b, cat, price) => `• Bed ${b}${cat ? ` (${cat})` : ""}${price ? ` • ${price}` : ""}`,
    noVacant: (room) => `No vacant beds in room ${room}.`,
    leftLastMonthNone: "No one left last month.",
    leftLastMonthTitle: "Tenants who left last month:",
    leftLastMonthLine: (n, r, b, date) => `• ${n} (Room ${r} • Bed ${b}) on ${date}`,
    whoHasPendingTitle: (y) => `Tenants with pending rents (${y}):`,
    whoHasPendingLine: (n, amt, r, b) => `• ${n} — ${amt} (Room ${r} • Bed ${b})`,
    totalDue: (amt) => `— Total due: ${amt}`,
    count: (n) => `• Count: ${n}`,
    dueForYearLine: (n, amt, y) => `${n} has ${amt} due for ${y}.`,
    phoneLine: (n, p) => `${n}'s phone: ${p || "—"}`,
    depositLine: (n, amt) => `${n} deposited ${amt}.`,
    pendingForMonthTitle: (mh) => `Pending for ${mh}:`,
    pendingNone: "None ✅",
    paidForMonth: (n, mh) => `${n} has paid for ${mh}.`,
    pendingForTenantMonth: (n, amt, mh) => `${n} is pending ${amt} for ${mh}.`,
    helpTitle: "Examples:",
    helpBullets: [
      "rent status of Priya",
      "how much due for Akash",
      "pending months for Rohan",
      "vacant beds in room 101",
      "add tenant to room 302 bed 6",
      "add tenant to this bed",
      "update rent for Shweta this month",
      "phone of Pooja",
    ],
    sug: {
      pendingAllThis: "all pending this month",
      pendingAllLast: "all pending last month",
      pendingAllNext: "all pending next month",
      pendingAllFor: (m) => `all pending for ${m}`,
      pendingNameThis: (n) => `${n} pending this month`,
      pendingNameFor: (n, m) => `${n} pending for ${m}`,
    },
  };
}

/* =========================
   Normalizer
========================= */
function normalizeByLanguage(q) {
  let s = q.toLowerCase().trim();
  s = s.replace(/\bstetus\b/g, "status").replace(/\bstatuz\b/g, "status");
  return s;
}

/* =========================
   Month helpers
========================= */
const MONTHS = [
  ["january", "jan"],
  ["february", "feb"],
  ["march", "mar"],
  ["april", "apr"],
  ["may"],
  ["june", "jun"],
  ["july", "jul"],
  ["august", "aug"],
  ["september", "sep", "sept"],
  ["october", "oct"],
  ["november", "nov"],
  ["december", "dec"],
];

function matchMonthToken(q) {
  for (let i = 0; i < MONTHS.length; i++) {
    for (const t of MONTHS[i]) {
      const re = new RegExp(`\\b${t}\\b`, "i");
      if (re.test(q)) return i;
    }
  }
  return null;
}

function monthName(idx) {
  const d = new Date(new Date().getFullYear(), idx, 1);
  return d.toLocaleString("en-IN", { month: "long" });
}

function humanMonth(m, y) {
  return new Date(y, m, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

function parseTargetMonth(q, prevMonth = null) {
  const now = new Date();
  const lc = q.toLowerCase();

  if (/\bthis month\b/.test(lc)) return { month: now.getMonth(), year: now.getFullYear() };

  if (/\blast month\b/.test(lc)) {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { month: d.getMonth(), year: d.getFullYear() };
  }

  if (/\bnext month\b/.test(lc)) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { month: d.getMonth(), year: d.getFullYear() };
  }

  const mIdx = matchMonthToken(lc);
  if (mIdx !== null) return { month: mIdx, year: now.getFullYear() };

  return prevMonth;
}

/* =========================
   Extract room+bed from text
========================= */
function extractRoomBedFromText(q) {
  const lower = (q || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const room = lower.match(/\broom\s+(\d+)\b/)?.[1] || null;
  const bed = lower.match(/\bbed\s+([a-z0-9]+)\b/)?.[1] || null;
  return { room, bed };
}

/* =========================
   Duplicate-name picker helpers
========================= */
function tenantOptionLine(t, idx) {
  const last4 = (t.phoneNo || t.phone || "").toString().replace(/\D/g, "").slice(-4);
  const ph = last4 ? ` • Ph ****${last4}` : "";
  const roomBed = `Room ${t.roomNo ?? "-"} • Bed ${t.bedNo ?? "-"}`;
  return `${idx + 1}) ${t.name} (${roomBed}${ph})`;
}

function pickCandidateByUserReply(reply, candidates = []) {
  const r = norm(reply);

  if (/^\d+$/.test(r)) {
    const i = Number(r) - 1;
    if (i >= 0 && i < candidates.length) return candidates[i];
  }

  const rb = r.match(/^(\d+)\s*([a-z])$/i) || r.match(/^(\d+)\s*\/\s*([a-z])$/i);
  if (rb) {
    const room = rb[1];
    const bed = rb[2].toUpperCase();
    const hit = candidates.find(
      (t) => String(t.roomNo) === String(room) && String(t.bedNo || "").toUpperCase() === bed
    );
    if (hit) return hit;
  }

  const digits = r.replace(/\D/g, "");
  if (digits.length >= 4) {
    const hit = candidates.find((t) => {
      const p = String(t.phoneNo || t.phone || "").replace(/\D/g, "");
      return p === digits || p.endsWith(digits.slice(-4));
    });
    if (hit) return hit;
  }

  return null;
}

/* =========================
   Tenant finding (case-insensitive + duplicates)
========================= */
function findTenantByName(formData, leaveDates, nameOrQuery) {
  const active = formData.filter((t) => !isLeft(t, leaveDates));
  const q = norm(nameOrQuery);

  let exact = active.find((x) => norm(x.name) === q);
  if (exact) return { type: "single", tenant: exact };

  const starts = active.filter((x) => norm(x.name).startsWith(q));
  if (starts.length === 1) return { type: "single", tenant: starts[0] };
  if (starts.length > 1) return { type: "choose", candidates: starts };

  const contains = active.filter((x) => norm(x.name).includes(q));
  if (contains.length === 1) return { type: "single", tenant: contains[0] };
  if (contains.length > 1) return { type: "choose", candidates: contains };

  const fuse = new Fuse(active, {
    keys: ["name"],
    includeScore: true,
    threshold: 0.33,
    minMatchCharLength: 2,
  });
  const hits = fuse.search(nameOrQuery);
  if (hits?.length) return { type: "single", tenant: hits[0].item };

  return { type: "none" };
}

/* =========================
   Intent router (Fuse patterns)
========================= */
function expandPatterns(intentsJson, entities) {
  const rows = [];
  (Array.isArray(intentsJson) ? intentsJson : []).forEach((entry) => {
    const pats = entry.patterns || entry.examples || [];
    pats.forEach((p) => {
      rows.push({ intent: entry.intent, text: p, placeholders: true });
      if (p.includes("{name}"))
        entities.names.slice(0, 300).forEach((nm) =>
          rows.push({ intent: entry.intent, text: p.replace("{name}", nm), placeholders: false })
        );
      if (p.includes("{room}"))
        entities.rooms.forEach((rm) =>
          rows.push({ intent: entry.intent, text: p.replace("{room}", rm), placeholders: false })
        );
    });
  });
  return rows;
}

function makeRouter(patternRows) {
  const fuse = new Fuse(patternRows, {
    includeScore: true,
    minMatchCharLength: 2,
    threshold: 0.45,
    keys: ["text"],
  });

  return (q) => {
    const hits = fuse.search(q).slice(0, 5);
    if (!hits.length) return null;

    hits.sort((a, b) =>
      a.item.placeholders === b.item.placeholders
        ? a.score - b.score
        : a.item.placeholders
        ? 1
        : -1
    );

    return hits[0].item.intent;
  };
}

function extractEntities(q, entities, currentTenantName, contextTenant) {
  const room =
    q.match(/\broom\s+([A-Za-z0-9\-]+)\b/i)?.[1] ||
    entities.rooms.find((r) => q.includes(String(r))) ||
    null;

  const lower = q.toLowerCase();
  const cleanLower = lower.replace(/[^a-z0-9\s]/g, " ");

  let name = null;
  let best = 0;
  for (const n of entities.names) {
    const ln = n.toLowerCase();
    if (lower.includes(ln) && ln.length > best) {
      name = n;
      best = ln.length;
    }
  }

  if (!name) {
    const m = cleanLower.match(/\b(?:for|of)\s+([a-z0-9]+(?:\s+[a-z0-9]+){0,3})\b/i);
    if (m?.[1]) {
      const typed = m[1].trim();
      const bestMatch = entities.names.find((full) => full.toLowerCase().startsWith(typed));
      name = bestMatch || typed;
    }
  }

  if (!name) name = currentTenantName || contextTenant;

  return { name, room };
}

/* =========================
   Core intent handlers
========================= */
function listAllPendingForMonth(formData, roomsData, leaveDates, monthIdx, year, lang = "en") {
  const S = STR(lang);
  const active = formData.filter((t) => !isLeft(t, leaveDates));
  const rows = [];
  let total = 0;

  for (const t of active) {
    const paid = isPaidForMonth(t.rents, monthIdx, year);
    if (!paid) {
      const expect = defaultExpectFromTenant(t, roomsData);
      total += expect;
      rows.push(S.whoHasPendingLine(t.name, prettyCurrency(expect), t.roomNo, t.bedNo));
    }
  }

  const title = S.pendingForMonthTitle(humanMonth(monthIdx, year));
  return rows.length
    ? `${title}\n${rows.join("\n")}\n${S.totalDue(prettyCurrency(total))}\n${S.count(rows.length)}`
    : `${title}\n${S.pendingNone}`;
}

function oneTenantPendingForMonth(name, formData, roomsData, leaveDates, monthIdx, year, lang = "en") {
  const S = STR(lang);
  if (!name) return S.who;

  const lookup = findTenantByName(formData, leaveDates, name);
  if (lookup.type !== "single") return S.noActiveTenant(name);

  const t = lookup.tenant;
  const mh = humanMonth(monthIdx, year);
  const paid = isPaidForMonth(t.rents, monthIdx, year);
  if (paid) return S.paidForMonth(t.name, mh);

  const expect = defaultExpectFromTenant(t, roomsData);
  return S.pendingForTenantMonth(t.name, prettyCurrency(expect), mh);
}

function formatDetails(t, roomsData, lang) {
  const S = STR(lang);
  const expect = prettyCurrency(defaultExpectFromTenant(t, roomsData));
  const due = prettyCurrency(calculateDueThisYear(t.rents, t.joiningDate));
  const months = pendingMonthsFrom(t.joiningDate, t.rents);
  const join = t.joiningDate ? new Date(t.joiningDate).toLocaleDateString() : "—";

  const lines = [
    `${S.detailsTitle(t.name)}`,
    S.labelRoomBed(t.roomNo, t.bedNo),
    S.phoneLine(t.name, t.phoneNo),
    S.depositLine(t.name, prettyCurrency(t.depositAmount)),
    S.monthlyRentLine(t.name, expect),
    S.joiningDateLine(t.name, join),
    S.thisYearDue(due, months.length),
    months.length
      ? `${S.pendingMonths}\n${months.map((m, i) => `${i + 1}. ${m}`).join("\n")}`
      : S.noPendingMonths,
  ];
  return lines.join("\n");
}

/* =========================
   Action message builder
========================= */
function actionMsg(action, label, payload = {}) {
  return { kind: "action", action, label, payload };
}



function findFirstUnpaidMonthForTenantThisYear(t, year, leaveDates) {
  // if tenant left, don't open
  if (isLeft(t, leaveDates)) return null;

  const now = new Date();
  const endMonth = year === now.getFullYear() ? now.getMonth() : 11;

  // start month = next month after joining (your current logic)
  let startMonth = 0;
  let startYear = year;

  if (t?.joiningDate) {
    const join = new Date(t.joiningDate);
    if (!isNaN(join)) {
      const rentStart = new Date(join.getFullYear(), join.getMonth() + 1, 1);
      // if rentStart is in this year, start from there
      if (rentStart.getFullYear() === year) startMonth = rentStart.getMonth();
      // if rentStart is after this year, nothing pending for this year
      if (rentStart.getFullYear() > year) return null;
      // if rentStart is before this year, startMonth stays 0
    }
  }

  for (let m = startMonth; m <= endMonth; m++) {
    if (!isPaidForMonth(t.rents, m, year)) return { month: m, year };
  }
  return null;
}

/* =========================
   Intent Handler
========================= */

function handleIntent({
  intent,
  q,
  formData,
  roomsData,
  leaveDates,
  entities,
  lang,
  currentTenantName,
  context,
}) {
  const S = STR(lang);

  const withTenant = (fn) => {
    const { name } = extractEntities(q, entities, currentTenantName, context?.lastTenant);
    if (!name) return S.who;

    const lookup = findTenantByName(formData, leaveDates, name);
    if (lookup.type !== "single") return S.noActiveTenant(name);

    return fn(lookup.tenant);
  };

  const tm = parseTargetMonth(q, context?.lastMonth);

  const H = {
    help: () => `${S.helpTitle}\n\n${S.helpBullets.map((b, i) => `${i + 1}. ${b}`).join("\n\n")}`,

   rent_status: () =>
  withTenant((t) => {
    const expect = defaultExpectFromTenant(t, roomsData);
    const due = calculateDueThisYear(t.rents, t.joiningDate);
    const months = pendingMonthsFrom(t.joiningDate, t.rents);

    const infoText = [
      `${S.rentStatusTitle(t.name)} (${S.labelRoomBed(t.roomNo, t.bedNo)})`,
      S.expectedMonthly(prettyCurrency(expect)),
      S.thisYearDue(prettyCurrency(due), months.length),
      months.length
        ? `${S.pendingMonths}\n${months.map((m, i) => `${i + 1}. ${m}`).join("\n")}`
        : S.noPendingMonths,
    ].join("\n");

    // ✅ if no pending, just show text
    if (!months.length) return infoText;

    // ✅ choose which month to open
    const tm2 = parseTargetMonth(q, context?.lastMonth);
    const now = new Date();
    const year = (tm2?.year ?? now.getFullYear());
    const month = (tm2?.month ?? now.getMonth());

    // if user asked a month and it's unpaid -> use it
    let target = null;
    if (!isPaidForMonth(t.rents, month, year)) target = { month, year };

    // else pick first unpaid month in current year
    if (!target) target = findFirstUnpaidMonthForTenantThisYear(t, now.getFullYear(), leaveDates);

    // final fallback: open current month
    if (!target) target = { month: now.getMonth(), year: now.getFullYear() };

    return actionMsg(
      "open_update_rent",
      `${infoText}\n\n✅ Tap Open to add payment for ${humanMonth(target.month, target.year)}.`,
      { tenantId: t._id, month: target.month, year: target.year }
    );
  }),

    rent_amount: () =>
      withTenant((t) => S.monthlyRentLine(t.name, prettyCurrency(defaultExpectFromTenant(t, roomsData)))),

    joining_date: () =>
      withTenant((t) => S.joiningDateLine(t.name, t.joiningDate ? new Date(t.joiningDate).toLocaleDateString() : "—")),

    room_no_of: () => withTenant((t) => S.roomLine(t.name, t.roomNo)),
    bed_no_of: () => withTenant((t) => S.bedLine(t.name, t.bedNo)),
    deposit_of: () => withTenant((t) => S.depositLine(t.name, prettyCurrency(t.depositAmount))),
    phone_of: () => withTenant((t) => S.phoneLine(t.name, t.phoneNo)),
    details_of: () => withTenant((t) => formatDetails(t, roomsData, lang)),

    due_amount: () =>
      withTenant((t) =>
        S.dueForYearLine(t.name, prettyCurrency(calculateDueThisYear(t.rents, t.joiningDate)), new Date().getFullYear())
      ),

    pending_months: () =>
      withTenant((t) => {
        const months = pendingMonthsFrom(t.joiningDate, t.rents);
        return months.length
          ? `${t.name} — ${S.pendingMonths}\n${months.map((m, i) => `${i + 1}. ${m}`).join("\n")}`
          : S.noPendingMonths;
      }),

    pending_this_month_all: () => {
      const now = new Date();
      return listAllPendingForMonth(formData, roomsData, leaveDates, now.getMonth(), now.getFullYear(), lang);
    },

    pending_specific_month_all: () => {
      if (!tm) return S.whichMonth;
      return listAllPendingForMonth(formData, roomsData, leaveDates, tm.month, tm.year, lang);
    },

 pending_this_month_name: () => {
  const { name } = extractEntities(q, entities, currentTenantName, context?.lastTenant);
  const now = new Date();
  const lookup = findTenantByName(formData, leaveDates, name);
  if (lookup.type !== "single") return S.noActiveTenant(name);

  const t = lookup.tenant;
  const paid = isPaidForMonth(t.rents, now.getMonth(), now.getFullYear());
  const mh = humanMonth(now.getMonth(), now.getFullYear());

  if (paid) return S.paidForMonth(t.name, mh);

  const expect = defaultExpectFromTenant(t, roomsData);
  return actionMsg(
    "open_update_rent",
    `${S.pendingForTenantMonth(t.name, prettyCurrency(expect), mh)}\n\nTap Open to add payment.`,
    { tenantId: t._id, month: now.getMonth(), year: now.getFullYear() }
  );
},

pending_specific_month_name: () => {
  const { name } = extractEntities(q, entities, currentTenantName, context?.lastTenant);
  if (!tm) return S.whichMonth;

  const lookup = findTenantByName(formData, leaveDates, name);
  if (lookup.type !== "single") return S.noActiveTenant(name);

  const t = lookup.tenant;
  const mh = humanMonth(tm.month, tm.year);
  const paid = isPaidForMonth(t.rents, tm.month, tm.year);

  if (paid) return S.paidForMonth(t.name, mh);

  const expect = defaultExpectFromTenant(t, roomsData);
  return actionMsg(
    "open_update_rent",
    `${S.pendingForTenantMonth(t.name, prettyCurrency(expect), mh)}\n\nTap Open to add payment.`,
    { tenantId: t._id, month: tm.month, year: tm.year }
  );
},

    vacant_beds_in_room: () => {
      const { room } = extractEntities(q, entities, currentTenantName, context?.lastTenant);
      if (!room) return S.whichRoom;

      const activeSet = new Set(
        formData.filter((t) => !isLeft(t, leaveDates)).map((t) => `${t.roomNo}-${t.bedNo}`)
      );

      const roomObj = roomsData.find((r) => String(r.roomNo) === String(room));
      if (!roomObj) return S.roomNotFound(room);

      const vacant = (roomObj?.beds || []).filter((b) => !activeSet.has(`${room}-${b.bedNo}`));
      if (!vacant.length) return S.noVacant(room);

      return `${S.vacantTitle(room)}\n${vacant
        .map((b) => S.vacantLine(b.bedNo, b.category, b.price ? prettyCurrency(b.price) : ""))
        .join("\n")}`;
    },

    who_has_pending: () => {
      const y = new Date().getFullYear();
      const pending = formData
        .filter((t) => !isLeft(t, leaveDates))
        .map((t) => ({ t, due: calculateDueThisYear(t.rents, t.joiningDate) }))
        .filter((x) => x.due > 0)
        .sort((a, b) => b.due - a.due)
        .slice(0, 100);

      if (!pending.length) return `${S.whoHasPendingTitle(y)}\n${S.pendingNone}`;

      const total = pending.reduce((s, x) => s + toNum(x.due), 0);
      const lines = pending.map(({ t, due }) => S.whoHasPendingLine(t.name, prettyCurrency(due), t.roomNo, t.bedNo)).join("\n");
      return `${S.whoHasPendingTitle(y)}\n${lines}\n${S.totalDue(prettyCurrency(total))}`;
    },

    left_last_month: () => {
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonth = d.getMonth();
      const lastYear = d.getFullYear();

      const out = formData.filter((t) => {
        const iso = leaveDates?.[t._id];
        if (!iso) return false;
        const dt = new Date(iso);
        return dt.getFullYear() === lastYear && dt.getMonth() === lastMonth;
      });

      if (!out.length) return S.leftLastMonthNone;

      const lines = out
        .map((t) => {
          const iso = leaveDates?.[t._id];
          return S.leftLastMonthLine(t.name, t.roomNo, t.bedNo, iso ? new Date(iso).toLocaleDateString() : "—");
        })
        .join("\n");

      return `${S.leftLastMonthTitle}\n${lines}`;
    },

    // ✅ NEW: open rent update modal (returns button/action)
    open_update_rent: () =>
      withTenant((t) => {
        const tm2 = parseTargetMonth(q, context?.lastMonth);
        if (!tm2) return S.whichMonth;

        return actionMsg(
          "open_update_rent",
          `Open rent update for ${t.name} (${humanMonth(tm2.month, tm2.year)})`,
          { tenantId: t._id, month: tm2.month, year: tm2.year }
        );
      }),

    // ✅ NEW: open add tenant modal (returns button/action)
    open_add_tenant: () => {
      const { room, bed } = extractRoomBedFromText(q);

      const roomNo = room || context?.lastRoom;
      const bedNo = bed || context?.lastBed;

      if (!roomNo || !bedNo) {
        return "Tell room and bed: 'add tenant to room 302 bed 6' (or ask vacancy first, then say 'add tenant to this bed').";
      }

      return actionMsg("open_add_tenant", `Add tenant to Room ${roomNo} • Bed ${bedNo}`, {
        roomNo,
        bedNo,
      });
    },
  };

  return H[intent] ? H[intent]() : S.didntGet;
}

/* =========================
   Rule intent
========================= */
function ruleIntent(q) {
  const lower = q.toLowerCase();

  if (/\bhelp\b/.test(lower)) return "help";
  if (/\brent status\b|\bstatus\b/.test(lower)) return "rent_status";
  if (/\brent amount\b|\bmonthly rent\b|\bexpected rent\b/.test(lower)) return "rent_amount";
  if (/\bjoining date\b|\bjoin date\b|\bstart date\b/.test(lower)) return "joining_date";
  if (/\broom\b/.test(lower) && /\b(no|number)\b/.test(lower)) return "room_no_of";
  if (/\bbed\b/.test(lower) && /\b(no|number)\b/.test(lower)) return "bed_no_of";
  if (/\bdeposit\b/.test(lower)) return "deposit_of";
  if (/\bphone\b|\bmobile\b|\bcontact\b/.test(lower)) return "phone_of";
  if (/\ball details\b|\bfull details\b|\bprofile\b/.test(lower)) return "details_of";
  if (/\bdue\b/.test(lower)) return "due_amount";
  if (/\bpending months\b/.test(lower)) return "pending_months";
  if (/\bvacant\b/.test(lower) && /\broom\b/.test(lower)) return "vacant_beds_in_room";
  if (/\bwho has pending\b|\bwho pending\b/.test(lower)) return "who_has_pending";
  if (/\bwho left\b/.test(lower) && /\blast month\b/.test(lower)) return "left_last_month";
  if (/\ball pending this month\b/.test(lower)) return "pending_this_month_all";
  if (/\ball pending\b/.test(lower) && matchMonthToken(lower) !== null) return "pending_specific_month_all";

  // ✅ NEW
  if (/\b(update|edit)\s+rent\b/.test(lower)) return "open_update_rent";
  if (/\badd\s+tenant\b/.test(lower)) return "open_add_tenant";
  if (/\badd\s+new\s+tenant\b/.test(lower)) return "open_add_tenant";
  if (/\bshare\s+link\b/.test(lower) && /\b(add|tenant|bed)\b/.test(lower)) return "open_add_tenant";

  return null;
}

/* =========================
   Suggestions builder
========================= */
function buildPendingSuggestions({ lang, currentTenantName }) {
  const S = STR(lang).sug;
  const now = new Date();
  const items = [];
  items.push(S.pendingAllThis, S.pendingAllLast, S.pendingAllNext);
  for (let k = 1; k <= 6; k++) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const mName = monthName(d.getMonth());
    items.push(S.pendingAllFor(mName));
  }
  if (currentTenantName) {
    items.unshift(S.pendingNameThis(currentTenantName));
    for (let k = 1; k <= 2; k++) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      const mName = monthName(d.getMonth());
      items.push(S.pendingNameFor(currentTenantName, mName));
    }
  }
  return items;
}

/* =========================
   Component
========================= */
export default function TenantChatbot({
  formData = [],
  roomsData = [],
  leaveDates = {},
  onOpenEditRent,  // ✅ (tenantId, month, year)
  onOpenAddTenant, // ✅ (roomNo, bedNo)
}) {
  const [lang, setLang] = useState(() => localStorage.getItem("tenantChat.lang") || "en");
  const strings = STR(lang || "en");

  const [context, setContext] = useState({
    lastTenant: null,
    lastMonth: null,
    lastIntent: null,
    lastRoom: null,
    lastBed: null,
  });

  const [open, setOpen] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);

  const [log, setLog] = useState([{ role: "assistant", message: strings.greeting }]);
  const [input, setInput] = useState("");
  const [currentTenantName, setCurrentTenantName] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [activeSug, setActiveSug] = useState(0);

  const [disambiguation, setDisambiguation] = useState(null);

  const entities = useMemo(() => buildEntities(formData, roomsData), [formData, roomsData]);
  const router = useMemo(() => makeRouter(expandPatterns(rawIntents, entities)), [entities]);

  useEffect(() => {
    setLog([{ role: "assistant", message: STR(lang).greeting }]);
  }, [lang]);

  useEffect(() => {
    const raw = input;
    const q = normalizeByLanguage(raw);
    const hasPending = /\b(pending|due)\b/.test(q);
    if (raw.trim().length === 0) {
      setShowSug(false);
      return;
    }
    if (hasPending) {
      const items = buildPendingSuggestions({ lang: lang || "en", currentTenantName });
      const fuse = new Fuse(items, { includeScore: true, threshold: 0.45 });
      const filtered =
        raw.trim().toLowerCase() === "pending" || /pending\s*$/i.test(q) ? items : fuse.search(raw).map((r) => r.item);
      setSuggestions(filtered.slice(0, 10));
      setShowSug(true);
      setActiveSug(0);
    } else {
      setShowSug(false);
    }
  }, [input, lang, currentTenantName]);

  const insertSuggestion = (text) => {
    setInput(text);
    setShowSug(false);
  };

  const send = (forcedText) => {
    const raw = (forcedText ?? input).trim();
    if (!raw) return;

    const q = normalizeByLanguage(raw);
    const S = STR(lang || "en");

    // ✅ If waiting for selection (multiple same name)
    if (disambiguation?.candidates?.length) {
      const picked = pickCandidateByUserReply(raw, disambiguation.candidates);

      if (!picked) {
        const lines = disambiguation.candidates.slice(0, 10).map((t, i) => tenantOptionLine(t, i)).join("\n");
        const msg =
          `Multiple tenants found. Please choose one:\n${lines}\n\nReply with 1/2/3 or Room+Bed (101 A) or phone last 4 digits.`;

        setLog((prev) => [...prev, { role: "user", message: raw }, { role: "assistant", message: msg }]);
        setInput("");
        return;
      }

      const answer = handleIntent({
        intent: disambiguation.intent,
        q: disambiguation.q,
        formData,
        roomsData,
        leaveDates,
        entities,
        lang: lang || "en",
        currentTenantName: picked.name,
        context,
      });

      setCurrentTenantName(picked.name);

      setContext((prev) => ({
        ...prev,
        lastTenant: picked.name,
        lastMonth: disambiguation.tm || prev.lastMonth,
        lastIntent: disambiguation.intent || prev.lastIntent,
      }));

      setDisambiguation(null);

      setLog((prev) => [...prev, { role: "user", message: raw }, { role: "assistant", message: answer }]);
      setInput("");
      return;
    }

    // ✅ Normal routing
    let intent = ruleIntent(q, entities);
    if (!intent) intent = router(q);

    const tm = parseTargetMonth(q, context.lastMonth);

    // Find name entity
    const { name } = extractEntities(q, entities, currentTenantName, context.lastTenant);

    // Does this intent need a tenant?
    const intentNeedsTenant = [
      "rent_status",
      "rent_amount",
      "joining_date",
      "room_no_of",
      "bed_no_of",
      "details_of",
      "due_amount",
      "pending_months",
      "deposit_of",
      "phone_of",
      "pending_this_month_name",
      "pending_specific_month_name",
      "open_update_rent",
    ].includes(intent);

    // If tenant needed, lookup by name (case-insensitive + duplicates)
    if (intentNeedsTenant) {
      const nameGuess = name || guessNameFromQuery(q);
      const lookup = findTenantByName(formData, leaveDates, nameGuess || raw);

      if (lookup.type === "none") {
        setLog((prev) => [...prev, { role: "user", message: raw }, { role: "assistant", message: S.noActiveTenant(nameGuess || raw) }]);
        setInput("");
        return;
      }

      if (lookup.type === "choose") {
        const lines = lookup.candidates.slice(0, 10).map((t, i) => tenantOptionLine(t, i)).join("\n");
        const msg =
          `Multiple tenants found for “${nameGuess || raw}”. Please choose one:\n${lines}\n\nReply with 1/2/3 or Room+Bed (101 A) or phone last 4 digits.`;

        setDisambiguation({ candidates: lookup.candidates, intent, q, raw, tm, name: nameGuess || raw });

        setLog((prev) => [...prev, { role: "user", message: raw }, { role: "assistant", message: msg }]);
        setInput("");
        return;
      }

      setCurrentTenantName(lookup.tenant.name);
    }

    // ✅ Save lastRoom/lastBed when vacancy asked (so "this bed" works)
    let nextLastRoom = context.lastRoom;
    let nextLastBed = context.lastBed;

    if (intent === "vacant_beds_in_room") {
      const { room } = extractEntities(q, entities, currentTenantName, context.lastTenant);
      if (room) {
        const activeSet = new Set(
          formData.filter((t) => !isLeft(t, leaveDates)).map((t) => `${t.roomNo}-${t.bedNo}`)
        );
        const roomObj = roomsData.find((r) => String(r.roomNo) === String(room));
        if (roomObj) {
          const vacant = (roomObj?.beds || []).filter((b) => !activeSet.has(`${room}-${b.bedNo}`));
          if (vacant.length) {
            nextLastRoom = String(room);
            nextLastBed = String(vacant[0].bedNo); // first vacant bed
          }
        }
      }
    }

    const answer = intent
      ? handleIntent({
          intent,
          q,
          formData,
          roomsData,
          leaveDates,
          entities,
          lang: lang || "en",
          currentTenantName: currentTenantName || name,
          context: { ...context, lastMonth: tm || context.lastMonth, lastRoom: nextLastRoom, lastBed: nextLastBed },
        })
      : S.didntGet;

    setContext({
      lastTenant: name || context.lastTenant,
      lastMonth: tm || context.lastMonth,
      lastIntent: intent || context.lastIntent,
      lastRoom: nextLastRoom,
      lastBed: nextLastBed,
    });

    setLog((prev) => [...prev, { role: "user", message: raw }, { role: "assistant", message: answer }]);
    setInput("");
  };

  const onKeyDown = (e) => {
    if (showSug && suggestions.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSug((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSug((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        insertSuggestion(suggestions[0]);
        return;
      }
      if (e.key === "Enter") {
        if (activeSug >= 0 && activeSug < suggestions.length) {
          e.preventDefault();
          insertSuggestion(suggestions[activeSug]);
          return;
        }
      }
      if (e.key === "Escape") {
        setShowSug(false);
        return;
      }
    }
    if (e.key === "Enter") send();
  };

  const LanguagePicker = () => (
    <div style={{ padding: "14px" }}>
      <div className="d-flex align-items-center gap-2 mb-2">
        <FaGlobe />
        <strong>Select language</strong>
      </div>
      <div className="d-flex flex-wrap gap-2">
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={() => {
            setLang("en");
            localStorage.setItem("tenantChat.lang", "en");
            setShowLangPicker(false);
          }}
        >
          English
        </button>
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={() => {
            setLang("hi");
            localStorage.setItem("tenantChat.lang", "hi");
            setShowLangPicker(false);
          }}
        >
          हिन्दी
        </button>
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={() => {
            setLang("mr");
            localStorage.setItem("tenantChat.lang", "mr");
            setShowLangPicker(false);
          }}
        >
          मराठी
        </button>
      </div>
      <small className="text-muted d-block mt-2">You can change later from the settings icon.</small>
    </div>
  );

  return (
    <div style={{ maxWidth: open ? 480 : 76 }} className="chatbot" >
      <div className="card shadow" style={{ overflow: "hidden", borderRadius: 16 }}>
        <div
          className="card-header"
          style={{
            background: "#03091d",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: open ? "space-between" : "center",
            padding: open ? "10px 12px" : "8px 12px",
            minHeight: open ? 56 : 60,
          }}
          onClick={() => setOpen((o) => !o)}
        >
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 15, letterSpacing: 0.4 }}>Rent Saathi</span>

          {open && (
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-sm btn-light"
                title="Language"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLangPicker((v) => !v);
                }}
              >
                <FaCog />
              </button>

              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
          )}
        </div>

        {open && showLangPicker && <LanguagePicker />}

        {open && (
          <>
            <div className="card-body" style={{ height: 360, overflowY: "auto", background: "#f7f9fb" }}>
              {log.map((m, i) => {
                const isUser = m.role === "user";
                const msg = m.message;

                return (
    <div
  key={i}
  className={`d-flex mb-3 ${isUser ? "justify-content-end" : "justify-content-start"}`}
>
  {!isUser && <div className="chat-avatar assistant">🤖</div>}

  {/* ✅ wrapper gets different color */}
  <div className={`chat-wrap ${isUser ? "wrap-user" : "wrap-assistant"}`}>
    <div className={`chat-bubble ${isUser ? "user" : "assistant"}`}>
      {typeof msg === "string" ? (
        msg
      ) : msg?.kind === "action" ? (
        <div>
          <div style={{ marginBottom: 8, whiteSpace: "pre-wrap" }}>{msg.label}</div>

          <button
            className="btn btn-sm btn-primary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              setShowLangPicker(false);

              setTimeout(() => {
                if (msg.action === "open_update_rent") {
                  onOpenEditRent?.(msg.payload.tenantId, msg.payload.month, msg.payload.year);
                }
                if (msg.action === "open_add_tenant") {
                  onOpenAddTenant?.(msg.payload.roomNo, msg.payload.bedNo);
                }
              }, 0);
            }}
          >
            Open
          </button>
        </div>
      ) : (
        "…"
      )}
    </div>
  </div>

  {isUser && <div className="chat-avatar user">👤</div>}
</div>


                );
              })}
            </div>

            <div className="card-footer position-relative" style={{ background: "#fff" }}>
              <div className="input-group">
                <input
                  className="form-control"
                  placeholder={strings.placeholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                />
                <button className="btn btn-primary" onClick={() => send()} title="Send">
                  <FaPaperPlane />
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setLog([{ role: "assistant", message: STR(lang || "en").greeting }]);
                    setCurrentTenantName(null);
                    setInput("");
                    setShowSug(false);
                    setDisambiguation(null);
                    setContext({ lastTenant: null, lastMonth: null, lastIntent: null, lastRoom: null, lastBed: null });
                  }}
                  title="Clear"
                >
                  <FaTimes />
                </button>
              </div>

              {showSug && suggestions.length > 0 && (
                <div
                  className="shadow"
                  style={{
                    position: "absolute",
                    left: 12,
                    right: 84,
                    bottom: 58,
                    background: "#fff",
                    borderRadius: 10,
                    border: "1px solid #e6e6e6",
                    maxHeight: 220,
                    overflowY: "auto",
                    zIndex: 10,
                  }}
                >
                  {suggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertSuggestion(sug);
                      }}
                      onMouseEnter={() => setActiveSug(idx)}
                      style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        background: idx === activeSug ? "#eef5ff" : "white",
                      }}
                    >
                      {sug}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
