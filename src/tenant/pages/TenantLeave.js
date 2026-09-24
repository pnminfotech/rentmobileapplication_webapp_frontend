// // src/tenant/pages/TenantLeave.js
// import React, { useEffect, useMemo, useState } from "react";
// import axios from "axios";
// import { API, authHeader } from "../tenantApi";
// import { FaCalendarAlt } from "react-icons/fa";

// export default function TenantLeave() {
//   const [me, setMe] = useState(null);
//   const [leaveDate, setLeaveDate] = useState("");
//   const [note, setNote] = useState("");
//   const [submitting, setSubmitting] = useState(false);
//   const [errorMsg, setErrorMsg] = useState("");
//   const [history, setHistory] = useState([]);

//   useEffect(() => {
//     fetchTenant();
//     fetchHistory();
//   }, []);

//   // inject table styles once
//   useEffect(() => {
//     if (!document.head.querySelector('style[data-leave-table="1"]')) {
//       const styleEl = document.createElement("style");
//       styleEl.setAttribute("data-leave-table", "1");
//       styleEl.innerHTML = `
//         table thead th {
//           text-align: left;
//           background: #f1f5f9;
//           color: #0f172a;
//           font-weight: 700;
//           padding: 12px 14px;
//           border-bottom: 1px solid #e5e7eb;
//         }
//         table tbody td {
//           padding: 12px 14px;
//           color: #0f172a;
//           border-bottom: 1px solid #f1f5f9;
//         }
//         table tbody tr:nth-child(even) td {
//           background: #fafafa;
//         }
//         table tbody tr:last-child td {
//           border-bottom: none;
//         }
//       `;
//       document.head.appendChild(styleEl);
//     }
//   }, []);

//   const fetchTenant = async () => {
//     try {
//       const res = await axios.get(`${API}/tenant/me`, { headers: authHeader() });
//       setMe(res.data);
//     } catch {
//       setErrorMsg("Failed to load tenant profile.");
//     }
//   };

//   // const fetchHistory = async () => {
//   //   try {
//   //     const res = await axios.get(`${API}/leave/tenant/leave`, { headers: authHeader() });
//   //     setHistory(res.data || []);
//   //   } catch {
//   //     /* no-op */
//   //   }
//   // };
// // Fetch tenant leave history
// const fetchHistory = async () => {
//   try {
//     const token = localStorage.getItem("tenantToken");
//     if (!token) throw new Error("No token found, please login.");

//     const res = await axios.get(`${API}/tenant/leave`, {
//       headers: { Authorization: `Bearer ${token}` },
//     });
//     setHistory(res.data || []);
//   } catch (err) {
//     console.error("Error fetching leave history:", err);
//   }
// };

// // Submit leave request
// const submitLeave = async () => {
//   if (!leaveDate) return setErrorMsg("Please select a leaving date.");

//   const selected = new Date(leaveDate);
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);

//   if (selected <= today) return setErrorMsg("Leave date must be in the future.");

//   const diff = selected.getTime() - today.getTime();
//   if (diff < 30 * 24 * 60 * 60 * 1000)
//     return setErrorMsg("Leave date must be at least 30 days from today.");

//   try {
//     setSubmitting(true);
//     setErrorMsg("");

//     const token = localStorage.getItem("tenantToken");
//     if (!token) throw new Error("Missing token, please login again");

//     // Convert to ISO format (no timezone shift)
//     const safeISO = new Date(`${leaveDate}T12:00:00`).toISOString();

//     console.log("LEAVE POST URL =", `${API}/tenant/leave`, { leaveDate: safeISO, note });

//     await axios.post(
//       `${API}/tenant/leave`,
//       { leaveDate: safeISO, note: note.trim() },
//       { headers: { Authorization: `Bearer ${token}` } }
//     );

//     // Reset form
//     setLeaveDate("");
//     setNote("");
//     fetchTenant();
//     fetchHistory();
//   } catch (err) {
//     console.error(err);
//     setErrorMsg(err?.response?.data?.message || err.message || "Failed to submit leave request.");
//   } finally {
//     setSubmitting(false);
//   }
// };


//   // yyyy-mm-dd for <input type="date" min=...>
//   // const minDate = useMemo(() => {
//   //   const d = new Date();
//   //   d.setHours(0, 0, 0, 0);
//   //   d.setDate(d.getDate() + 30);
//   //   return d.toISOString().slice(0, 10);
//   // }, []);
//  const minDate = useMemo(() => {
//    const d = new Date();
//    d.setHours(0, 0, 0, 0);
//    d.setDate(d.getDate() + 30);
//    const yyyy = d.getFullYear();
//    const mm = String(d.getMonth() + 1).padStart(2, "0");
//    const dd = String(d.getDate()).padStart(2, "0");
//    return `${yyyy}-${mm}-${dd}`; // local-safe YYYY-MM-DD
//  }, []);
// //   const submitLeave = async () => {
// //     if (!leaveDate) return setErrorMsg("Please select a leaving date.");

// //     const selected = new Date(leaveDate);
// //     const today = new Date();
// //     today.setHours(0, 0, 0, 0);
// //     if (selected <= today) return setErrorMsg("Leave date must be in the future.");

// //     // 30-day check
// //     const diff = selected.getTime() - today.getTime();
// //     if (diff < 30 * 24 * 60 * 60 * 1000)
// //       return setErrorMsg("Leave date must be at least 30 days from today.");

// //     try {
// //       setSubmitting(true);
// //       setErrorMsg("");

// //       // await axios.post(
// //       //   `${API}/leave/tenant/leave`,
// //       //   { leaveDate, note: note.trim() },
// //       //   { headers: authHeader() }
// //       // );
// //  // Convert "YYYY-MM-DD" to an ISO that won't shift across timezones
// //  const safeISO = new Date(`${leaveDate}T12:00:00`).toISOString();

// // console.log("LEAVE POST URL =", `${API}/tenant/leave`, { leaveDate: safeISO, formId: me?._id });

// // await axios.post(
// //   `${API}/tenant/leave`,
// //   { leaveDate: safeISO, note: note.trim() },
// //   { headers: authHeader() }
// // );


// //       setLeaveDate("");
// //       setNote("");
// //       fetchTenant();
// //       fetchHistory();
// //     } catch (err) {
// //       console.error(err);
// //       setErrorMsg(err?.response?.data?.message || "Failed to submit leave request.");
      
// //     } finally {
// //       setSubmitting(false);
// //     }
// //   };

//   const rules = [
//     "Select a leaving date and add a reason. The admin will approve or reject your request.",
//     "Leave request must be submitted at least 30 days in advance.",
//     "If a tenant leaves without proper notice, a penalty fee may apply.",
//     "Leave request must be approved by admin before tenant can officially leave.",
//   ];

//   const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");
//   const badgeStyle = (s) => ({
//     padding: "3px 10px",
//     borderRadius: 999,
//     fontSize: 12,
//     fontWeight: 600,
//     color: "#fff",
//     background:
//       s === "approved"
//         ? "#16a34a"
//         : s === "rejected"
//         ? "#dc2626"
//         : s === "cancelled"
//         ? "#6b7280"
//         : "#f59e0b",
//   });

//   return (
//     <div style={container}>
//       <div style={card}>
//         <h2 style={{ marginBottom: 12 }}>Leave Request</h2>

//         {/* Rules - left aligned */}
//         <div style={rulesBox}>
//           <div style={rulesTitle}>Before you submit</div>
//           <ul style={rulesList}>
//             {rules.map((r, i) => (
//               <li key={i}>{r}</li>
//             ))}
//           </ul>
//         </div>

//         {/* Request form (full width like table) */}
//         <div style={{ display: "grid", gap: 12, maxWidth: "100%" }}>
//           <label style={label}>Leaving Date</label>
//           <div style={{ position: "relative" }}>
//             <input
//               type="date"
//               value={leaveDate}
//               onChange={(e) => setLeaveDate(e.target.value)}
//               min={minDate}
//               style={inputBox}
//             />
//             {/* <FaCalendarAlt style={{ position: "absolute", right: 10, top: 10, opacity: 0.6 }} /> */}
//           </div>

//           <small style={{ color: "#64748b", marginTop: -6 }}>
//             Must be at least 30 days from today.
//           </small>

//           <label style={label}>Reason / Note</label>
//           <textarea
//             rows={4}
//             value={note}
//             onChange={(e) => setNote(e.target.value)}
//             placeholder="Reason for leaving..."
//             style={textarea}
//           />

//           {errorMsg && <div style={errorStyle}>{errorMsg}</div>}

//           <button onClick={submitLeave} disabled={submitting} style={btnPrimary}>
//             {submitting ? "Submitting..." : "Submit Leave Request"}
//           </button>
//         </div>

//         {/* History table */}
//         <div style={{ marginTop: 28 }}>
//           <h3 style={{ fontSize: 18, marginBottom: 12, textAlign: "left" }}>Leave History</h3>
//           <div style={tableWrap}>
//             <table style={table}>
//               <thead>
//                 <tr>
//                   <th style={{ width: 140 }}>Leaving On</th>
//                   <th style={{ width: 160 }}>Requested</th>
//                   <th style={{ width: 120 }}>Status</th>
//                   <th style={{ minWidth: 280 }}>Note</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {history.length === 0 ? (
//                   <tr>
//                     <td colSpan={4} style={{ color: "#6b7280", textAlign: "center", padding: 16 }}>
//                       (No leave requests yet)
//                     </td>
//                   </tr>
//                 ) : (
//                   history.map((h) => (
//                     <tr key={h._id}>
//                       <td>{fmt(h.leaveDate)}</td>
//                       <td>{fmt(h.requestedAt)}</td>
//                       <td>
//                         <span style={badgeStyle(h.status)}>{h.status}</span>
//                       </td>
//                       <td style={noteCell}>{h.note || "—"}</td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//           <div style={tableHint}>Showing your leave requests (most recent first)</div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ---- styles ----
// const container = {
//   display: "flex",
//   justifyContent: "center",
//   padding: 20,
//   background: "#f6f7fb",
//   minHeight: "100vh",
// };

// const card = {
//   background: "#fff",
//   width: "100%",
//   maxWidth: 960,
//   borderRadius: 12,
//   boxShadow: "0 8px 24px rgba(0,0,0,.08)",
//   padding: 24,
// };

// // Rules block - left aligned with clear heading
// const rulesBox = {
//   background: "#f8fafc",
//   padding: 16,
//   borderRadius: 10,
//   marginBottom: 16,
//   border: "1px solid #e5e7eb",
//   textAlign: "left",
// };
// const rulesTitle = {
//   fontWeight: 700,
//   color: "#0f172a",
//   marginBottom: 8,
// };
// const rulesList = {
//   margin: 0,
//   paddingLeft: 18,
//   color: "#334155",
//   lineHeight: 1.75,
//   listStyleType: "disc",
// };

// const label = { fontSize: 14, color: "#475569" };
// const inputBox = {
//   width: "100%",
//   padding: "10px 40px 10px 12px",
//   borderRadius: 8,
//   border: "1px solid #e5e7eb",
//   outline: "none",
// };
// const textarea = {
//   width: "100%",
//   padding: 12,
//   borderRadius: 8,
//   border: "1px solid #e5e7eb",
//   outline: "none",
// };
// const btnPrimary = {
//   marginTop: 6,
//   padding: "12px 18px",
//   width: "100%",
//   background: "linear-gradient(135deg, #7c4dff, #6d5dfc)",
//   color: "#fff",
//   border: 0,
//   borderRadius: 10,
//   cursor: "pointer",
//   boxShadow: "0 8px 16px rgba(109,93,252,.25)",
// };
// const errorStyle = { color: "#b91c1c", fontSize: 13, marginTop: 4 };

// // Table styling—tight, readable, sized columns
// const tableWrap = {
//   overflowX: "auto",
//   borderRadius: 10,
//   border: "1px solid #e5e7eb",
//   boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
//   background: "#fff",
// };

// const table = {
//   width: "100%",
//   borderCollapse: "separate",
//   borderSpacing: 0,
//   fontSize: 14,
// };

// const noteCell = {
//   maxWidth: 420,
//   whiteSpace: "nowrap",
//   textOverflow: "ellipsis",
//   overflow: "hidden",
// };

// const tableHint = {
//   marginTop: 8,
//   fontSize: 12,
//   color: "#64748b",
// };

// src/tenant/TenantLeave.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createLeave, listLeaves } from "../tenantApi";

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN") : "—");

// ---- inline styles (match your sample) ----
const container = {
  display: "flex",
  justifyContent: "center",
  padding: 20,
  background: "#f6f7fb",
  minHeight: "100vh",
};

const card = {
  background: "#fff",
  width: "100%",
  maxWidth: 960,
  borderRadius: 12,
  boxShadow: "0 8px 24px rgba(0,0,0,.08)",
  padding: 24,
};

const rulesBox = {
  background: "#f8fafc",
  padding: 16,
  borderRadius: 10,
  marginBottom: 16,
  border: "1px solid #e5e7eb",
  textAlign: "left",
};
const rulesTitle = { fontWeight: 700, color: "#0f172a", marginBottom: 8 };
const rulesList = {
  margin: 0,
  paddingLeft: 18,
  color: "#334155",
  lineHeight: 1.75,
  listStyleType: "disc",
};

const label = { fontSize: 14, color: "#475569" };
const inputBox = {
  width: "100%",
  padding: "10px 40px 10px 12px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  outline: "none",
};
const textarea = {
  width: "100%",
  padding: 12,
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  outline: "none",
};
const btnPrimary = {
  marginTop: 6,
  padding: "12px 18px",
  width: "100%",
  background: "linear-gradient(135deg, #7c4dff, #6d5dfc)",
  color: "#fff",
  border: 0,
  borderRadius: 10,
  cursor: "pointer",
  boxShadow: "0 8px 16px rgba(109,93,252,.25)",
};
const errorStyle = { color: "#b91c1c", fontSize: 13, marginTop: 4 };

const tableWrap = {
  overflowX: "auto",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
  background: "#fff",
};
const table = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  fontSize: 14,
};
const noteCell = {
  maxWidth: 420,
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
};
const tableHint = { marginTop: 8, fontSize: 12, color: "#64748b" };

const badgeStyle = (s) => ({
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  color: "#fff",
  background:
    s === "approved"
      ? "#16a34a"
      : s === "rejected"
      ? "#dc2626"
      : s === "cancelled"
      ? "#6b7280"
      : "#f59e0b",
});

export default function TenantLeave() {
  // form state
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // table state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // inject table styles once (thead/tbody cells)
  useEffect(() => {
    if (!document.head.querySelector('style[data-leave-table="1"]')) {
      const styleEl = document.createElement("style");
      styleEl.setAttribute("data-leave-table", "1");
      styleEl.innerHTML = `
        table thead th {
          text-align: left;
          background: #f1f5f9;
          color: #0f172a;
          font-weight: 700;
          padding: 12px 14px;
          border-bottom: 1px solid #e5e7eb;
        }
        table tbody td {
          padding: 12px 14px;
          color: #0f172a;
          border-bottom: 1px solid #f1f5f9;
        }
        table tbody tr:nth-child(even) td { background: #fafafa; }
        table tbody tr:last-child td { border-bottom: none; }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  // min date = today + 30 days in local-safe YYYY-MM-DD
  const minDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 30);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listLeaves();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      // keep UI quiet; form errors show separately
      // console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // submit with validations (future & 30 days)
  const submit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!date || !reason.trim()) {
      setErrorMsg("Please select a date and enter a reason.");
      return;
    }

    const selected = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selected <= today) {
      setErrorMsg("Leave date must be in the future.");
      return;
    }

    const diff = selected.getTime() - today.getTime();
    if (diff < 30 * 24 * 60 * 60 * 1000) {
      setErrorMsg("Leave date must be at least 30 days from today.");
      return;
    }

    try {
      setSubmitting(true);
      // send stable midday ISO to avoid timezone shifts on server
      const safeISO = new Date(`${date}T12:00:00`).toISOString();
      await createLeave({ date: safeISO, reason: reason.trim() });
      setReason("");
      await load();
    } catch (e) {
      setErrorMsg(e?.message || "Failed to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  const rules = [
    "Select a leaving date and add a reason. The admin will approve or reject your request.",
    "Leave request must be submitted at least 30 days in advance.",
    "If a tenant leaves without proper notice, a penalty fee may apply.",
    "Leave request must be approved by admin before tenant can officially leave.",
  ];

  return (
    <div style={container}>
      <div style={card}>
        <h2 style={{ marginBottom: 12 }}>Leave Request</h2>

        {/* Rules (left aligned) */}
        <div style={rulesBox}>
          <div style={rulesTitle}>Before you submit</div>
          <ul style={rulesList}>
            {rules.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        {/* Request form */}
        <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: "100%" }}>
          <label style={label}>Leaving Date</label>
          <div style={{ position: "relative" }}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={minDate}
              style={inputBox}
            />
          </div>
          <small style={{ color: "#64748b", marginTop: -6 }}>
            Must be at least 30 days from today.
          </small>

          <label style={label}>Reason / Note</label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for leaving..."
            style={textarea}
          />

          {errorMsg && <div style={errorStyle}>{errorMsg}</div>}

          <button type="submit" disabled={submitting} style={btnPrimary}>
            {submitting ? "Submitting..." : "Submit Leave Request"}
          </button>
        </form>

        {/* History table */}
        <div style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: 18, marginBottom: 12, textAlign: "left" }}>Leave History</h3>

          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Leaving On</th>
                  <th style={{ width: 160 }}>Requested</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ minWidth: 280 }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ color: "#6b7280", textAlign: "center", padding: 16 }}>
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ color: "#6b7280", textAlign: "center", padding: 16 }}>
                      (No leave requests yet)
                    </td>
                  </tr>
                 ) : (
                  rows.map((h) => (
                    <tr key={h._id}>
                     <td>{fmt(h.date || h.leaveDate)}</td>
<td>{fmt(h.createdAt || h.requestedAt)}</td>
<td><span style={badgeStyle(h.status)}>{h.status}</span></td>
<td style={noteCell}>{h.reason ?? h.note ?? "—"}</td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={tableHint}>Showing your leave requests (most recent first)</div>
        </div>
      </div>
    </div>
  );
}
