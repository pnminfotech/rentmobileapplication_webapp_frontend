// src/tenant/pages/TenantPayments.js
import { useEffect, useMemo, useState } from "react";
import { API, tenantHttp } from "../tenantApi";
import { useLocation } from "react-router-dom";

/* ----------------------- Constants & utils ----------------------- */
const MONTHS = [
  { n: 1,  label: "Jan" }, { n: 2,  label: "Feb" }, { n: 3,  label: "Mar" },
  { n: 4,  label: "Apr" }, { n: 5,  label: "May" }, { n: 6,  label: "Jun" },
  { n: 7,  label: "Jul" }, { n: 8,  label: "Aug" }, { n: 9,  label: "Sep" },
  { n: 10, label: "Oct" }, { n: 11, label: "Nov" }, { n: 12, label: "Dec" },
];

const toNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const moneyINR = (v = 0) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
function Money({ v = 0 }) { return <>{moneyINR(v)}</>; }
const fmtMonthYear = (m, y) =>
  (!m || !y ? "—" : `${MONTHS.find(x => x.n === Number(m))?.label || m} ${y}`);

// "Sep-25" -> { y: 2025, m: 8 }
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

// safest numeric
const toNum = (v) => {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace(/[,₹\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/* ---------- Admin-aligned due calc (same rules as TenantHome) ---------- */
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

/* ------------------------------ Component ------------------------------ */
export default function TenantPayments({ me: meProp, rents: rentsProp, refresh }) {
  const location = useLocation();
  const totalDueFromHome = location.state?.totalDue;
  const baseRentFromHome = location.state?.baseRent;

  const [me, setMe] = useState(meProp || null);
  const [rents, setRents] = useState(rentsProp || null);
  const [myPays, setMyPays] = useState([]);

  // rooms for deriving base rent like admin page
  const [rooms, setRooms] = useState(null);

  // Amount defaults to last paid amount or base rent
  const now = new Date();
  const [amount, setAmount] = useState("500");
  const [utr, setUTR] = useState("");
  const [note, setNote] = useState("");

  // Month/year the payment is for
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1); // 1..12
  const [selYear, setSelYear]   = useState(now.getFullYear());

  // SINGLE static QR (no query params so it won't re-generate)
  const [qrUrl] = useState(`${API}/tenant/upi-qr`);

  const card = {
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 8px 30px rgba(16,24,40,.06)",
    padding: 16,
    marginBottom: 16,
  };

  const needFetch = !me || !rents;

  useEffect(() => { if (meProp) setMe(meProp); }, [meProp]);
  useEffect(() => { if (rentsProp) setRents(rentsProp); }, [rentsProp]);

  const fetchPayments = async () => {
    try {
      const { data } = await tenantHttp.get(`/tenant/payments/my`);
      setMyPays(data || []);
    } catch {
      setMyPays([]);
    }
  };

  const fetchOwn = async () => {
    const [a, b] = await Promise.all([
      tenantHttp.get(`/tenant/me`),
      tenantHttp.get(`/tenant/rents`),
    ]);
    setMe(a.data);
    setRents(b.data);
  };

  // fetch payments + me/rents
  useEffect(() => {
    const go = async () => {
      await fetchPayments();
      if (needFetch) {
        await fetchOwn();
      }
    };
    go().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------- Paid/Unpaid month detection -------------------- */
  const rentList = Array.isArray(rents?.rents) ? rents.rents : [];

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

  // fetch rooms only when we still cannot derive the base rent locally
  useEffect(() => {
    if (toNum(me?.baseRent) || toNum(lastPaidRec?.rentAmount)) {
      return;
    }

    tenantHttp
      .get(`/rooms`)
      .then((res) => setRooms(res.data || []))
      .catch(() => setRooms(null));
  }, [me?.baseRent, lastPaidRec?.rentAmount]);

  // total due: prefer value passed from TenantHome; fallback to local calc
  const totalDue = useMemo(() => {
    if (typeof totalDueFromHome === "number" && !Number.isNaN(totalDueFromHome)) {
      return totalDueFromHome;
    }
    return calcDueAdminAligned({ joiningDate: me?.joiningDate, rents: rentList });
  }, [totalDueFromHome, me?.joiningDate, rentList]);

  // derive base rent from (router state) → rooms → me.baseRent → lastPaid
  const displayBaseRent = useMemo(() => {
    if (typeof baseRentFromHome === "number" && !Number.isNaN(baseRentFromHome)) {
      return baseRentFromHome;
    }
    if (rooms && me?.roomNo != null && me?.bedNo != null) {
      const room = (rooms || []).find(r => String(r.roomNo) === String(me.roomNo));
      const bed  = room?.beds?.find(b => String(b.bedNo) === String(me.bedNo));
      const fromRooms =
        toNum(bed?.price) ||
        toNum(bed?.baseRent) ||
        toNum(bed?.monthlyRent);
      if (fromRooms) return fromRooms;
    }
    if (toNum(me?.baseRent)) return toNum(me.baseRent);
    if (toNum(lastPaidRec?.rentAmount)) return toNum(lastPaidRec.rentAmount);
    return 0;
  }, [baseRentFromHome, rooms, me?.roomNo, me?.bedNo, me?.baseRent, lastPaidRec]);

  // amount defaulting uses displayBaseRent
  useEffect(() => {
    const pick = toNumber(lastPaidRec?.rentAmount) || displayBaseRent || 0;
    if (pick && (!amount || toNumber(amount) === 0)) {
      setAmount(String(pick));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayBaseRent, lastPaidRec]);

  // Map of "m-y" for months paid (any positive amount)
  const paidSet = useMemo(() => {
    const s = new Set();
    rentList
      .filter((r) => toNumber(r?.rentAmount) > 0)
      .map(getYMFromRecord)
      .filter(Boolean)
      .forEach(({ m, y }) => s.add(`${m}-${y}`));
    return s;
  }, [rentList]);

  // Current-year unpaid months starting from the month **after joining**
  const pendingMonths = useMemo(() => {
    if (!me?.joiningDate) return [];
    const today = new Date();
    const currentYear = today.getFullYear();

    const join = new Date(me.joiningDate);
    const rentStart = new Date(join.getFullYear(), join.getMonth() + 1, 1);
    const startOfYear = new Date(currentYear, 0, 1);
    const start = rentStart > startOfYear ? rentStart : startOfYear;

    const out = [];
    const cursor = new Date(start);
    while (cursor <= today && cursor.getFullYear() === currentYear) {
      const key = `${cursor.getMonth()}-${cursor.getFullYear()}`;
      if (!paidSet.has(key)) {
        out.push({ m: cursor.getMonth() + 1, y: cursor.getFullYear() }); // 1..12
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }, [me?.joiningDate, paidSet]);

  // Prefill selectors to earliest unpaid (else current)
  const firstBillYM = useMemo(
    () => getFirstBillYM(me),
    [me?.joiningDate, me?.firstRentMonth, me?.firstRentStatus]
  );

  useEffect(() => {
    const currentYM = now.getFullYear() * 12 + now.getMonth();

    if (pendingMonths.length) {
      setSelMonth(pendingMonths[0].m);
      setSelYear(pendingMonths[0].y);
    } else if (firstBillYM != null && currentYM < firstBillYM) {
      const ym = monthIndexToYM(firstBillYM);
      if (ym) {
        setSelMonth(ym.m + 1);
        setSelYear(ym.y);
      }
    } else {
      setSelMonth(now.getMonth() + 1);
      setSelYear(now.getFullYear());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMonths.length, firstBillYM]);

  const currentMonthPaid = useMemo(() => {
    const currentYM = now.getFullYear() * 12 + now.getMonth();
    if (firstBillYM != null && currentYM < firstBillYM) return false;

    const m = now.getMonth();
    const y = now.getFullYear();
    return paidSet.has(`${m}-${y}`);
  }, [paidSet, firstBillYM]);

  const currentMonthState = useMemo(() => {
    const currentYM = now.getFullYear() * 12 + now.getMonth();

    if (firstBillYM != null && currentYM < firstBillYM) {
      return { label: "Not due yet", color: "#2563eb", nextDueYM: firstBillYM };
    }

    if (currentMonthPaid) {
      return {
        label: "Paid",
        color: "#16a34a",
        nextDueYM: currentYM + 1,
      };
    }

    return {
      label: "Pending",
      color: "#f59e0b",
      nextDueYM: currentYM,
    };
  }, [currentMonthPaid, firstBillYM]);

  // years dropdown: current year down to current-2
  const years = useMemo(() => {
    const y0 = now.getFullYear();
    return [y0, y0 - 1, y0 - 2];
  }, [now]);

  /* ---------------------------- Actions -------------------------------- */
  const reportPayment = async () => {
    const amt = toNumber(amount);
    if (!amt) return alert("Enter amount");
    if (!selMonth || !selYear) return alert("Select month & year");

    const selectedYM = Number(selYear) * 12 + (Number(selMonth) - 1);
    if (firstBillYM != null && selectedYM < firstBillYM) {
      const first = monthIndexToYM(firstBillYM);
      const label = first ? fmtMonthYear(first.m + 1, first.y) : "the first bill month";
      return alert(`Billing for this tenant starts from ${label}. Please choose that month or later.`);
    }

    try {
      await tenantHttp.post(`/tenant/payments/report`, {
        amount: amt,
        month: Number(selMonth),
        year: Number(selYear),
        utr,
        note: note || `Rent for ${fmtMonthYear(selMonth, selYear)}`,
      });

      setUTR("");
      setNote("");

      if (typeof refresh === "function") await refresh();
      await Promise.all([
        fetchPayments(),
        needFetch ? fetchOwn() : Promise.resolve(),
      ]);

      alert(`Thanks! Payment reported for ${fmtMonthYear(selMonth, selYear)}. Admin will review & approve.`);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to report payment");
    }
  };

  /* ------------------------------ UI ----------------------------------- */
  return (
    <div style={{ padding: 4 }} className="tpay">
      {/* Responsive styles */}
      <style>{`
        .tpay .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .tpay .two-col {
          display: grid;
          grid-template-columns: 1.1fr .9fr;
          gap: 12px;
          margin-top: 12px;
        }
        .tpay .qr-img {
          width: 100%;
          max-width: 220px;
          height: auto;
          background: #fff;
          border-radius: 12px;
          border: 1px solid #eee;
        }
        .tpay .btn-chip {
          padding: 6px 10px;
          border-radius: 999px;
          cursor: pointer;
          background: #f1f5f9;
          border: 1px solid #dbe3f5;
        }
        .tpay .btn-chip--active {
          background: rgba(37,99,235,.08);
          border: 2px solid #2563eb;
        }
        .tpay .actions-inline {
          display: flex;
          gap: 12px;
          align-items: flex-end;
          flex-wrap: wrap;
        }
        .tpay .input {
          padding: 10px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          width: 100%;
          box-sizing: border-box;
        }

        /* Tablet */
        @media (max-width: 1024px) {
          .tpay .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Mobile */
        @media (max-width: 640px) {
          .tpay .kpi-grid {
            grid-template-columns: 1fr;
          }
          .tpay .two-col {
            grid-template-columns: 1fr;
          }
          .tpay .actions-inline > * {
            width: 100%;
          }
          .tpay .table-wrap {
            font-size: 13px;
          }
        }
      `}</style>

      <h3 style={{ margin: "8px 0 16px" }}>Bills & Payments</h3>

      {/* Top summary */}
      <div className="kpi-grid">
        <div style={card}>
          <div style={{ color: "#6b7280", fontSize: 12 }}>Room / Bed</div>
          <div style={{ fontWeight: 700 }}>{me?.roomNo || "—"} / {me?.bedNo || "—"}</div>
        </div>

        <div style={card}>
          <div style={{ color: "#6b7280", fontSize: 12 }}>Base Rent</div>
          <div style={{ fontWeight: 700 }}>
            <Money v={displayBaseRent} />
          </div>
        </div>

        <div style={card}>
          <div style={{ color: "#6b7280", fontSize: 12 }}>Total Due</div>
          <div style={{ fontWeight: 700 }}>
            <Money v={totalDue} />
          </div>
        </div>

        <div style={card}>
          <div style={{ color: "#6b7280", fontSize: 12 }}>Current Month</div>
          <div style={{ fontWeight: 700, color: currentMonthState.color }}>
            {currentMonthState.label}
          </div>
        </div>
      </div>

      {/* Pending months quick-pick */}
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Pending Months (current year)</div>
        {pendingMonths.length ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {pendingMonths.map(({ m, y }) => {
              const active = selMonth === m && selYear === y;
              return (
                <button
                  key={`${m}-${y}`}
                  onClick={() => { setSelMonth(m); setSelYear(y); }}
                  className={`btn-chip ${active ? "btn-chip--active" : ""}`}
                  title={`Select ${fmtMonthYear(m, y)}`}
                >
                  <span style={{ color: "#0b1220" }}>{fmtMonthYear(m, y)}</span>
                </button>
              );
            })}
          </div>
        ) : currentMonthState.label === "Not due yet" ? (
          <div style={{ color: "#6b7280" }}>
            Billing has not started yet for this tenant. The first payable month is already selected below.
          </div>
        ) : (
          <div style={{ color: "#6b7280" }}>No pending months for this year 🎉</div>
        )}
      </div>

      {/* Pay / Static QR + Month-Year */}
      <div className="two-col">
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Pay via UPI</div>

          <div className="actions-inline">
            <div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Amount (₹)</div>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                className="input"
                style={{ width: 180 }}
              />
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Month</div>
              <select
                value={selMonth}
                onChange={(e) => setSelMonth(Number(e.target.value))}
                className="input"
                style={{ width: 140 }}
              >
                {MONTHS.map(m => <option key={m.n} value={m.n}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Year</div>
              <select
                value={selYear}
                onChange={(e) => setSelYear(Number(e.target.value))}
                className="input"
                style={{ width: 120 }}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <img
              src={qrUrl}
              alt="UPI QR"
              className="qr-img"
            />
          </div>
          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>
            This QR is <b>static</b>. Open your UPI app after scanning and:
            <ul style={{ margin: "6px 0 0 18px" }}>
              <li>Enter amount: <b>{moneyINR(amount || 0)}</b></li>
              <li>Use note: <b>Hostel Rent {fmtMonthYear(selMonth, selYear)}</b></li>
            </ul>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Report Payment</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
            After paying via UPI, select the month/year, paste your UTR / Reference ID and a short note.
          </div>

          {/* Amount */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Amount (₹)</div>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
              className="input"
            />
          </div>

          {/* Month & Year */}
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Month</div>
              <select
                value={selMonth}
                onChange={(e) => setSelMonth(Number(e.target.value))}
                className="input"
              >
                {MONTHS.map(m => <option key={m.n} value={m.n}>{m.label}</option>)}
              </select>
            </div>
            <div style={{ width: 160 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Year</div>
              <select
                value={selYear}
                onChange={(e) => setSelYear(Number(e.target.value))}
                className="input"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* UTR / Note */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>UTR / Ref</div>
            <input
              value={utr}
              onChange={(e) => setUTR(e.target.value)}
              placeholder="e.g., 2309XXXXXXXX"
              className="input"
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Note (optional)</div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`Rent for ${fmtMonthYear(selMonth, selYear)}`}
              className="input"
            />
          </div>

          <button
            onClick={reportPayment}
            style={{ padding: "10px 14px", background: "#16a34a", color: "#fff", borderRadius: 10, border: 0, fontWeight: 700, cursor: "pointer", width: "100%" }}
          >
            Report Payment
          </button>
        </div>
      </div>

      {/* My payment reports */}
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>My Payment Reports</div>
        {myPays?.length ? (
          <div className="table-wrap" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#6b7280" }}>
                  <th style={{ padding: 8 }}>Reported At</th>
                  <th style={{ padding: 8 }}>For Month</th>
                  <th style={{ padding: 8 }}>Amount</th>
                  <th style={{ padding: 8 }}>UTR</th>
                  <th style={{ padding: 8 }}>Note</th>
                  <th style={{ padding: 8 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...myPays]
                  .sort((a, b) => {
                    const ay = Number(a.year || 0), by = Number(b.year || 0);
                    if (ay !== by) return by - ay;
                    const am = Number(a.month || 0), bm = Number(b.month || 0);
                    if (am !== bm) return bm - am;
                    return new Date(b.createdAt) - new Date(a.createdAt);
                  })
                  .map((p) => (
                  <tr key={p._id} style={{ borderTop: "1px solid #eef2f7" }}>
                    <td style={{ padding: 8 }}>{new Date(p.createdAt).toLocaleString()}</td>
                    <td style={{ padding: 8 }}>{fmtMonthYear(p.month, p.year)}</td>
                    <td style={{ padding: 8 }}><Money v={p.amount} /></td>
                    <td style={{ padding: 8 }}>{p.utr || "—"}</td>
                    <td style={{ padding: 8 }}>{p.note || "—"}</td>
                    <td style={{ padding: 8, fontWeight: 700 }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 12,
                          background:
                            p.status === "confirmed" ? "rgba(22,163,74,.1)"
                            : p.status === "rejected" ? "rgba(239,68,68,.1)"
                            : "rgba(245,158,11,.1)",
                          color:
                            p.status === "confirmed" ? "#166534"
                            : p.status === "rejected" ? "#991b1b"
                            : "#92400e",
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: "#6b7280" }}>No payments yet.</div>
        )}
      </div>
    </div>
  );
}
