// src/tenant/pages/TenantHome.js
import React, { useEffect, useMemo, useState } from "react";
import {
  FaRupeeSign,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowRight,
  FaReceipt,
  FaFileUpload,
  FaUserCheck,
  FaFileAlt,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
// import axios from "axios";
// import { API, authHeader } from "../tenantApi";
import { tenantHttp } from "../tenantApi";
/* ----------------------------- Utils ---------------------------------- */
const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toNum = (v) => {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace(/[,₹\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const formatINR = (v = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(toNumber(v));

const Money = ({ v = 0 }) => <>{formatINR(v)}</>;

const fmtDate = (d) => {
  try {
    if (!d) return "";
    const t = new Date(d);
    if (isNaN(t.getTime())) return "";
    return t.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
};

const monthName = (m) =>
  new Date(2000, m, 1).toLocaleString("en-IN", { month: "short" });

/* ---------- Month helpers (mirror admin/NewComponant) ------------------ */
// "Sep-25"  -> { y: 2025, m: 8 }
const parseMonthKey = (key) => {
  if (!key || typeof key !== "string") return null;
  const [mon, yy] = key.split("-");
  if (!mon || !yy) return null;
  const m = new Date(`${mon} 1, 20${yy}`).getMonth();
  const y = Number(`20${yy}`);
  if (!Number.isFinite(m) || !Number.isFinite(y)) return null;
  return { y, m };
};

// Prefer record.month; fallback to record.date
const getYMFromRecord = (r) => {
  if (!r) return null;
  if (r.month) {
    const pm = parseMonthKey(r.month);
    if (pm) return pm;
  }
  if (r.date) {
    const d = new Date(r.date);
    if (!isNaN(d)) return { y: d.getFullYear(), m: d.getMonth() };
  }
  return null;
};

const monthIndexToYM = (ym) => {
  if (!Number.isFinite(ym)) return null;
  return { y: Math.floor(ym / 12), m: ym % 12 };
};

const getFirstBillYM = (tenant) => {
  if (!tenant?.joiningDate) return null;

  if (tenant?.firstRentMonth) {
    const pm = parseMonthKey(tenant.firstRentMonth);
    if (pm) return pm.y * 12 + pm.m;
  }

  const joinDate = new Date(tenant.joiningDate);
  if (isNaN(joinDate)) return null;

  const isAdvance = tenant?.firstRentStatus === "ADVANCE_PAID";
  return joinDate.getFullYear() * 12 + joinDate.getMonth() + (isAdvance ? 0 : 1);
};

/* ---------- Due calc EXACTLY like admin/NewComponant ------------------- */
const calcDueAdminAligned = ({ joiningDate, rents }) => {
  if (!joiningDate) return 0;

  const now = new Date();
  const currentYear = now.getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);

  const joinDate = new Date(joiningDate);
  // start billing from the month AFTER joining
  const rentStart = new Date(joinDate.getFullYear(), joinDate.getMonth() + 1, 1);

  // pick whichever is later: Jan 1 of current year OR rentStart
  const startDate = rentStart > startOfYear ? rentStart : startOfYear;

  // Map of "m-y" for months that have any positive payment
  const paidMonths = new Set(
    (Array.isArray(rents) ? rents : [])
      .filter((r) => toNumber(r?.rentAmount) > 0)
      .map(getYMFromRecord)
      .filter(Boolean)
      .map(({ m, y }) => `${m}-${y}`)
  );

  // Last paid record (to get the amount multiplier)
  const lastPaid = (Array.isArray(rents) ? rents : [])
    .filter((r) => r?.date && toNumber(r?.rentAmount) > 0)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  const rentAmount = lastPaid ? toNumber(lastPaid.rentAmount) : 0;
  if (rentAmount <= 0) return 0;

  let dueCount = 0;
  const cursor = new Date(startDate);

  while (cursor <= now && cursor.getFullYear() === currentYear) {
    const key = `${cursor.getMonth()}-${cursor.getFullYear()}`;
    if (!paidMonths.has(key)) dueCount++;
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return rentAmount * dueCount;
};

/* --------------------------- Component -------------------------------- */
export default function TenantHome({
  me = {},
  rents = {},
  ann = [],
  refresh = () => {},
}) {
  const navigate = useNavigate();

  const colors = {
    primary: "#2563eb",
    success: "#16a34a",
    danger: "#dc2626",
    warning: "#f59e0b",
    lightBg: "#f9fafb",
    textMuted: "#6b7280",
  };

  const styles = {
    card: {
      background: "#ffffff",
      borderRadius: 16,
      boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
      padding: 18,
      marginBottom: 16,
      transition: "all 0.2s ease-in-out",
    },
    row: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
      gap: 16,
    },
    ghostBtn: {
      padding: "8px 12px",
      border: `1px solid ${colors.textMuted}33`,
      borderRadius: 10,
      background: "#fff",
      cursor: "pointer",
      color: colors.textMuted,
    },
    subtle: { color: colors.textMuted },
    pill: {
      display: "inline-block",
      padding: "4px 10px",
      fontSize: 12,
      borderRadius: 999,
      background: colors.lightBg,
      color: "#374151",
      marginLeft: 8,
    },
    kpiNumber: { fontWeight: 700, fontSize: 22 },
    kpiLabel: { fontSize: 13, color: colors.textMuted },
    cta: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "12px 14px",
      border: `1px solid ${colors.textMuted}22`,
      borderRadius: 12,
      cursor: "pointer",
      background: "#f1f5f9",
      fontWeight: 500,
      color: "#1e293b",
      transition: "all 0.2s ease-in-out",
    },
    ctaHover: { background: "#e2e8f0" },
  };

  // ---- Safe reads -------------------------------------------------------
  const hostel = me?.hostel && typeof me.hostel === "object" ? me.hostel : {};
  const roomNo = me?.roomNo ?? hostel?.roomNo ?? "—";
  const bedNo = me?.bedNo ?? hostel?.bedNo ?? "—";
  const deposit = me?.deposit ?? me?.depositAmount ?? 0;

  // Normalize rents list from props
  const rentList = Array.isArray(rents?.rents) ? rents.rents : [];

  // Last paid record (used as a final fallback + UI)
  const lastPaidRec = useMemo(() => {
    return [...rentList]
      .filter((r) => r && (r.date || r.month) && toNumber(r.rentAmount) > 0)
      .sort((a, b) => {
        const ad = getYMFromRecord(a);
        const bd = getYMFromRecord(b);
        const aKey = ad ? ad.y * 12 + ad.m : 0;
        const bKey = bd ? bd.y * 12 + bd.m : 0;
        return bKey - aKey;
      })[0];
  }, [rentList]);

  // Fetch rooms only when the tenant record itself does not already carry enough rent info.
  const [rooms, setRooms] = useState(null);
  useEffect(() => {
    if (
      toNum(me?.baseRent) ||
      toNum(me?.hostel?.baseRent) ||
      toNum(lastPaidRec?.rentAmount)
    ) {
      return;
    }

    tenantHttp
      .get(`/rooms`)
      .then((res) => setRooms(res.data || []))
      .catch(() => setRooms(null));
  }, [me?.baseRent, me?.hostel?.baseRent, lastPaidRec?.rentAmount]);

  // ===== Base rent priority (match TenantPayments)
  const baseRent = useMemo(() => {
    if (rooms && me?.roomNo != null && me?.bedNo != null) {
      const room = (rooms || []).find((r) => String(r.roomNo) === String(me.roomNo));
      const bed = room?.beds?.find((b) => String(b.bedNo) === String(me.bedNo));
      const fromRooms =
        toNum(bed?.price) || toNum(bed?.baseRent) || toNum(bed?.monthlyRent);
      if (fromRooms) return fromRooms;
    }
    if (toNum(me?.baseRent)) return toNum(me.baseRent);
    if (toNum(me?.hostel?.baseRent)) return toNum(me.hostel.baseRent);
    if (toNum(lastPaidRec?.rentAmount)) return toNum(lastPaidRec.rentAmount);
    const fromRents =
      rentList
        .map(
          (r) =>
            toNum(r?.expectedRent) ||
            toNum(r?.baseRent) ||
            toNum(r?.price)
        )
        .find((x) => x > 0) || 0;
    return fromRents;
  }, [rooms, me?.roomNo, me?.bedNo, me?.baseRent, me?.hostel?.baseRent, lastPaidRec, rentList]);

  // ===== IMPORTANT: Use the EXACT same due calc as admin =====
  const computedDue = useMemo(
    () =>
      calcDueAdminAligned({
        joiningDate: me?.joiningDate,
        rents: rentList,
      }),
    [me?.joiningDate, rentList]
  );

  const now = new Date();

  const firstBillYM = useMemo(
    () => getFirstBillYM(me),
    [me?.joiningDate, me?.firstRentMonth, me?.firstRentStatus]
  );

  const currentMonthPaid = useMemo(() => {
    const currentYM = now.getFullYear() * 12 + now.getMonth();
    if (firstBillYM != null && currentYM < firstBillYM) return false;

    if (!rentList.length) return false;
    const m = now.getMonth();
    const y = now.getFullYear();
    return rentList.some((r) => {
      const ym = getYMFromRecord(r);
      return ym && ym.m === m && ym.y === y && toNumber(r.rentAmount) > 0;
    });
  }, [rentList, firstBillYM]);

  const currentMonthState = useMemo(() => {
    const currentYM = now.getFullYear() * 12 + now.getMonth();

    if (firstBillYM != null && currentYM < firstBillYM) {
      return { label: "Not due yet", color: colors.primary, nextDueYM: firstBillYM };
    }

    if (currentMonthPaid) {
      return { label: "Paid", color: colors.success, nextDueYM: currentYM + 1 };
    }

    return { label: "Pending", color: colors.warning, nextDueYM: currentYM };
  }, [currentMonthPaid, firstBillYM]);

  const monthsPaidThisYear = useMemo(() => {
    const y = now.getFullYear();
    const set = new Set(
      rentList
        .filter((r) => toNumber(r?.rentAmount) > 0)
        .map(getYMFromRecord)
        .filter((v) => v && v.y === y)
        .map(({ m }) => m)
    );
    return set.size;
  }, [rentList]);

  const nextDueLabel = useMemo(() => {
    const next = monthIndexToYM(currentMonthState.nextDueYM);
    if (!next) return `${monthName(now.getMonth())} ${now.getFullYear()}`;
    return `${monthName(next.m)} ${next.y}`;
  }, [currentMonthState.nextDueYM]);

  const lastFive = useMemo(() => {
    const withSortKey = rentList.map((r) => {
      if (r?.date) return { r, key: new Date(r.date).getTime() || 0 };
      const ym = getYMFromRecord(r);
      if (ym) return { r, key: new Date(ym.y, ym.m, 1).getTime() };
      return { r, key: 0 };
    });
    return withSortKey
      .sort((a, b) => b.key - a.key)
      .slice(0, 5)
      .map(({ r }) => r);
  }, [rentList]);

  // Hard refresh handler (works even if `refresh` prop is a no-op)
  const handleRefresh = () => {
    if (typeof refresh === "function") {
      try { refresh(); } catch {}
    }
    // Force a real page reload using React Router v6
    navigate(0);
    // (Alternatively: window.location.reload();)
  };

  /* ----------------------------- UI ----------------------------------- */
  return (
    <>
      {/* Header / Welcome */}
      <div
        style={{
          ...styles.card,
          background: "linear-gradient(135deg,#e0f2fe,#f8fafc)",
          border: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div>
            <h5 style={{ margin: 0, color: "#1e293b" }}>
              Welcome, {me?.name || "Tenant"}
            </h5>
            <div style={styles.subtle}>
              Room {roomNo} / Bed {bedNo}
              {me?.status && (
                <span style={styles.pill}>
                  {String(me.status).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: 12, color: colors.textMuted }}>
            <button
              style={{
                ...styles.ghostBtn,
                borderColor: colors.primary,
                color: colors.primary,
              }}
              onClick={handleRefresh}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: 10,
          }}
        >
          {[
            { icon: <FaReceipt />, label: "View Payments", path: "/tenant/payments" },
            { icon: <FaRupeeSign />, label: "Rent Details", path: "/tenant/rent" },
            { icon: <FaFileUpload />, label: "Upload Docs", path: "/tenant/documents" },
            // { icon: <FaUserCheck />, label: "eKYC", path: "/tenant/ekyc" },
            { icon: <FaFileAlt />, label: "Leave Request", path: "/tenant/leave" },
          ].map((a, i) => (
            <div
              key={i}
              style={styles.cta}
              onClick={() => navigate(a.path)}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
            >
              {a.icon} {a.label}
              <FaArrowRight style={{ marginLeft: "auto", opacity: 0.6 }} />
            </div>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div style={styles.row}>
        {/* Due */}
        <div
          style={{
            ...styles.card,
            borderLeft: `6px solid ${
              computedDue > 0 ? colors.danger : colors.success
            }`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {computedDue > 0 ? (
              <FaExclamationTriangle color={colors.danger} />
            ) : (
              <FaCheckCircle color={colors.success} />
            )}
            <div style={{ fontWeight: 600 }}>Outstanding Due</div>
          </div>
          <div
            style={{
              ...styles.kpiNumber,
              color: computedDue > 0 ? colors.danger : colors.success,
            }}
          >
            <Money v={computedDue} />
          </div>
          <div style={styles.kpiLabel}>Next due: {nextDueLabel}</div>
          <div className="mt-2">
            <Link
              to="/tenant/payments"
              state={{ totalDue: computedDue, baseRent }}
              className="btn btn-sm btn-primary"
            >
              Pay / Report Payment
            </Link>
          </div>
        </div>

        {/* Deposit */}
        <div style={styles.card}>
          <div style={{ fontWeight: 600 }}>Security Deposit</div>
          <div style={styles.kpiNumber}>
            <Money v={deposit} />
          </div>
          <div style={styles.kpiLabel}>As per records</div>
        </div>

        {/* Base Rent */}
        <div style={styles.card}>
          <div style={{ fontWeight: 600 }}>Base Rent</div>
          <div style={styles.kpiNumber}>
            <Money v={baseRent} />
          </div>
          <div style={styles.kpiLabel}>Monthly</div>
        </div>

        {/* Current Month */}
        <div style={styles.card}>
          <div style={{ fontWeight: 600 }}>Current Month</div>
          <div
            style={{
              ...styles.kpiNumber,
              color: currentMonthState.color,
            }}
          >
            {currentMonthState.label}
          </div>
          <div style={styles.kpiLabel}>
            {currentMonthState.label === "Not due yet"
              ? "Billing starts from the first payable month after joining."
              : currentMonthPaid
                ? "Thanks for paying on time!"
                : "Please clear dues soon"}
          </div>
        </div>

        {/* Last Payment */}
        <div style={styles.card}>
          <div style={{ fontWeight: 600 }}>Last Payment</div>
          <div style={styles.kpiNumber}>
            {lastPaidRec ? <Money v={toNumber(lastPaidRec.rentAmount)} /> : "—"}
          </div>
          <div style={styles.kpiLabel}>
            {lastPaidRec?.date
              ? `on ${fmtDate(lastPaidRec.date)}`
              : "No payments recorded"}
          </div>
        </div>

        {/* Year Progress (commented out by you)
        <div style={styles.card}>
          <div style={{ fontWeight: 600 }}>
            {new Date().getFullYear()} Rent Progress
          </div>
          <div style={styles.kpiNumber}>
            {monthsPaidThisYear} / {now.getMonth() + 1} months
          </div>
          <div style={styles.kpiLabel}>Paid this year</div>
          <div className="progress mt-2" aria-label="Yearly rent progress">
            <div
              className="progress-bar"
              role="progressbar"
              style={{
                width: `${Math.min(
                  100,
                  (monthsPaidThisYear / (now.getMonth() + 1 || 1)) * 100
                ).toFixed(0)}%`,
              }}
            />
          </div>
        </div>
        */}
      </div>

      {/* Recent Payments */}
      <div style={styles.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <h5 style={{ margin: 0 }}>Recent Payments</h5>
          <Link to="/tenant/payments" className="btn btn-sm btn-outline-secondary">
            View all
          </Link>
        </div>

        {lastFive.length ? (
          <div className="table-responsive mt-2">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {lastFive.map((r, i) => (
                  <tr key={r?._id || r?.id || i}>
                    <td>{fmtDate(r?.date)}</td>
                    <td>
                      <Money v={toNumber(r?.rentAmount)} />
                    </td>
                    <td className="text-muted small">{r?.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ ...styles.subtle, marginTop: 6 }}>
            No payments found yet.
          </div>
        )}
      </div>

      {/* Announcements (left commented out as in your version)
      <div style={styles.card}>...</div>
      */}
    </>
  );
}
