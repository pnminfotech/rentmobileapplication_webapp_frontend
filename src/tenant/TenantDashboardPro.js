import React, { useMemo } from "react";
import KPICards from "./components/KPICards";
import RentAreaChart from "./components/RentAreaChart";
import DuesMiniGrid from "./components/DuesMiniGrid";
import ReceiptsTable from "./components/ReceiptsTable";
import PaymentsCard from "./components/PaymentsCard";
import DocumentsPanel from "./components/DocumentsPanel";
import AnnouncementsPanel from "./components/AnnouncementsPanel";
import LeavePanel from "./components/LeavePanel";
import TicketsPanel from "./components/TicketsPanel";
import ProfileCard from "./components/ProfileCard";

/** ---------- Helpers: single source of truth for the period ---------- */
function fyRange(now = new Date()) {
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; // Apr = 3
  return {
    start: new Date(startYear, 3, 1, 0, 0, 0),          // Apr 1, 00:00
    end: new Date(startYear + 1, 3, 1, 0, 0, 0),        // next Apr 1, 00:00 (exclusive)
  };
}

function monthRange(now = new Date()) {
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0),
  };
}

function tenancyRange(joiningDate, now = new Date()) {
  const start = joiningDate ? new Date(joiningDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  return { start, end: now };
}

function clampRangeToJoin({ start, end }, joiningDate) {
  if (!joiningDate) return { start, end };
  const j = new Date(joiningDate);
  return { start: start < j ? j : start, end };
}

function monthsInRange({ start, end }) {
  // count billable months from start's month up to end's month (inclusive if end passed month boundary)
  let y = start.getFullYear(), m = start.getMonth();
  const lastY = end.getFullYear(), lastM = end.getMonth();
  let count = (lastY - y) * 12 + (lastM - m) + 1; // inclusive
  if (end.getDate() === 1 && end.getHours() === 0) count -= 1; // when 'end' is first day next month (exclusive)
  return Math.max(0, count);
}

function sumPaid(payments = [], { start, end }) {
  return payments
    .filter(p => p?.date && new Date(p.date) >= start && new Date(p.date) < end)
    .filter(p => (p.status || "success").toLowerCase() === "success")
    .reduce((a, b) => a + Number(b.rentAmount || b.amount || 0), 0);
}

function latestPayment(payments = []) {
  const ok = payments
    .filter(p => p?.date)
    .filter(p => (p.status || "success").toLowerCase() === "success")
    .sort((a,b) => new Date(b.date) - new Date(a.date));
  const p = ok[0];
  return p ? { amount: Number(p.rentAmount || p.amount || 0), date: p.date, mode: p.paymentMode || p.mode || "Cash" } : null;
}

function paidForMonth(payments = [], now = new Date(), baseRent = 0) {
  const { start, end } = monthRange(now);
  const paid = sumPaid(payments, { start, end });
  return paid >= Number(baseRent || 0); // consider paid if >= base rent
}

/** ---------- Calculation using the same rules everywhere ---------- */
function calcSummary({ me, rents, window = "month" }) {
  const now = new Date();
  let range;
  if (window === "fyear") range = fyRange(now);
  else if (window === "tenancy") range = tenancyRange(me?.joiningDate, now);
  else range = monthRange(now);

  range = clampRangeToJoin(range, me?.joiningDate);

  const baseRent = Number(me?.baseRent || 0);
  const billableMonths = monthsInRange(range);
  const billed = baseRent * billableMonths;

  // rents.rents is assumed to be an array of payment entries
  const payments = Array.isArray(rents?.rents) ? rents.rents : [];
  const paid = sumPaid(payments, range);
  const due = Math.max(0, billed - paid);

  return {
    window,
    range,
    deposit: Number(me?.depositAmount || 0),
    baseRent,
    due,
    monthStatus: paidForMonth(payments, now, baseRent) ? "Paid" : "Pending",
    lastPayment: latestPayment(payments),
    room: `${me?.roomNo || "—"} / ${me?.bedNo || "—"}`
  };
}

export default function TenantDashboardPro({
  me, rents, ann, tickets, refresh, loading, onLogout, window = "month" // "month" | "fyear" | "tenancy"
}) {
  const year = rents?.currentYear || new Date().getFullYear();

  const kpi = useMemo(() => calcSummary({ me, rents, window }), [me, rents, window]);

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0">Hi {me?.name || "Tenant"} 👋</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button className="btn btn-outline-danger btn-sm" onClick={onLogout}>Logout</button>
        </div>
      </div>

      <KPICards kpi={kpi} />

      <div className="row g-4 mt-1">
        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-header fw-bold">Rent Trend ({year})</div>
            <div className="card-body">
              <RentAreaChart rents={rents} year={year} baseRent={me?.baseRent} />
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-header fw-bold">Dues Overview</div>
            <div className="card-body">
              <DuesMiniGrid
                rents={rents}
                year={year}
                joiningDate={me?.joiningDate}
                baseRent={me?.baseRent}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-xl-7">
          <ReceiptsTable rents={rents} />
        </div>
        <div className="col-xl-5">
          <PaymentsCard baseRent={me?.baseRent} />
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-lg-7">
          <DocumentsPanel me={me} onChanged={refresh} />
          <LeavePanel me={me} onChanged={refresh} />
          <TicketsPanel tickets={tickets} onChanged={refresh} />
        </div>
        <div className="col-lg-5">
          <AnnouncementsPanel ann={ann} />
          <ProfileCard me={me} />
        </div>
      </div>
    </div>
  );
}
