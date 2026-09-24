// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { API, authHeader } from "../tenantApi";

// export default function AttendanceCard() {
//   const [form, setForm] = useState({ date: "", time: "", reason: "" });
//   const [records, setRecords] = useState([]);
//   const [busy, setBusy] = useState(false);
//   const [msg, setMsg] = useState("");

//   const getGPS = () =>
//     new Promise((resolve) => {
//       if (!navigator.geolocation) return resolve(null);
//       navigator.geolocation.getCurrentPosition(
//         (pos) => {
//           const { latitude: lat, longitude: lng, accuracy } = pos.coords || {};
//           resolve({ lat, lng, accuracy });
//         },
//         () => resolve(null),
//         { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
//       );
//     });

//   const post = async (path, body) => {
//     setBusy(true);
//     setMsg("");
//     try {
//       await axios.post(`${API}${path}`, body, {
//         headers: { ...authHeader(), "Content-Type": "application/json" },
//       });
//       setMsg("Saved successfully.");
//       await loadRecords();
//     } catch (e) {
//       setMsg(e?.response?.data?.message || e.message || "Failed");
//     } finally {
//       setBusy(false);
//     }
//   };

//   const loadRecords = async () => {
//     try {
//       const res = await axios.get(`${API}/tenant/attendance/list`, {
//         headers: authHeader(),
//       });
//       setRecords(res.data.attendance || []);
//     } catch (e) {
//       console.error("Failed to load records:", e);
//     }
//   };

//   useEffect(() => {
//     loadRecords();
//   }, []);

//   const sendLate = async () => {
//     if (!form.date || !form.time) return setMsg("Please select both date and time.");
//     await post("/tenant/attendance/late", form);
//     setForm({ date: "", time: "", reason: "" });
//   };

//   const checkIn = async () => {
//     const where = await getGPS();
//     await post("/tenant/attendance/check-in", where || {});
//   };

//   return (
//     <div className="card shadow-sm">
//       {/* HEADER with top-right Check-in button */}
//       <div className="card-header d-flex justify-content-between align-items-center">
//         <strong>Attendance</strong>
//         <button
//           className="btn btn-success btn-sm d-none d-md-inline-flex"
//           onClick={checkIn}
//           disabled={busy}
//           title="Check In with current location"
//         >
//           Check In (with GPS)
//         </button>
//       </div>

//       <div className="card-body">
//         {/* Mobile-only Check-in button (keeps UX easy on small screens) */}
//         <button
//           className="btn btn-success w-100 mb-3 d-md-none"
//           onClick={checkIn}
//           disabled={busy}
//         >
//           Check In (with GPS)
//         </button>

//         {/* Late Scheduling Form */}
//         <div className="mb-3">
//           <h6>Schedule a Late Check-in</h6>
//           <div className="row g-2 mb-2">
//             <div className="col">
//               <input
//                 type="date"
//                 className="form-control"
//                 value={form.date}
//                 onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
//               />
//             </div>
//             <div className="col">
//               <input
//                 type="time"
//                 className="form-control"
//                 value={form.time}
//                 onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
//               />
//             </div>
//           </div>
//           <input
//             className="form-control mb-2"
//             placeholder="Reason (optional)"
//             value={form.reason}
//             onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
//           />
//           <button className="btn btn-warning w-100" onClick={sendLate} disabled={busy}>
//             Submit Late Request
//           </button>
//         </div>

//         {!!msg && <div className="text-muted mt-2">{msg}</div>}
//         <div className="form-text mt-1">* Location requires HTTPS or localhost.</div>

//         <hr />

//         {/* Records Table */}
//         <h6>Recent Late / Attendance Records</h6>
//         <div className="table-responsive">
//           <table className="table table-sm align-middle mb-0">
//             <thead className="table-light">
//               <tr>
//                 <th>Date</th>
//                 <th>Scheduled Time</th>
//                 <th>Reason</th>
//                 <th>Status</th>
//                 <th>Check-in Time</th>
//                 <th>Location</th>
//               </tr>
//             </thead>
//             <tbody>
//               {records.map((r) => (
//                 <tr key={r._id}>
//                   <td>{r.dateKey}</td>
//                   <td>
//                     {r.scheduledAt
//                       ? new Date(r.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
//                       : "-"}
//                   </td>
//                   <td>{r.lateReason || "-"}</td>
//                   <td>
//                     {r.status === "pending" && <span className="badge bg-warning text-dark">Pending</span>}
//                     {r.status === "checked_in" && <span className="badge bg-success">Reached</span>}
//                     {r.status === "checked_out" && <span className="badge bg-secondary">Checked Out</span>}
//                   </td>
//                   <td>
//                     {r.checkIn?.at
//                       ? new Date(r.checkIn.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
//                       : "-"}
//                   </td>
//                   <td>
//                     {r.checkIn?.where
//                       ? `${r.checkIn.where.lat?.toFixed(4)}, ${r.checkIn.where.lng?.toFixed(4)}`
//                       : "-"}
//                   </td>
//                 </tr>
//               ))}
//               {records.length === 0 && (
//                 <tr>
//                   <td colSpan="6" className="text-center text-muted py-2">No attendance records yet.</td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }


import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { API, authHeader } from "../tenantApi";

export default function AttendanceCard() {
  const [form, setForm] = useState({ date: "", time: "", reason: "" });
  const [records, setRecords] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // ---------- helpers ----------
  const getGPS = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords || {};
          resolve({ lat, lng, accuracy });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });

  // Create today's YYYY-MM-DD in local time (matches your dateKey format)
  const todayKey = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }, []);

  // Show Check-In only if there's a pending late request for *today*
 const hasPendingToday = useMemo(
  () => records.some((r) => r.status === "pending"),
  [records]
);


  const post = async (path, body) => {
    setBusy(true);
    setMsg("");
    try {
      await axios.post(`${API}${path}`, body, {
        headers: { ...authHeader(), "Content-Type": "application/json" },
      });
      setMsg("Saved successfully.");
      await loadRecords();
    } catch (e) {
      setMsg(e?.response?.data?.message || e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const loadRecords = async () => {
    try {
      const res = await axios.get(`${API}/tenant/attendance/list`, {
        headers: authHeader(),
      });
      setRecords(res.data.attendance || []);
    } catch (e) {
      console.error("Failed to load records:", e);
    }
  };

  useEffect(() => { loadRecords(); }, []);

  // ---------- actions ----------
  const sendLate = async () => {
    if (!form.date || !form.time) return setMsg("Please select both date and time.");
    console.log("Sending Late Request body:", form);
    await post("/tenant/attendance/late", form);
    setForm({ date: "", time: "", reason: "" });
  };

  const checkIn = async () => {
    const where = await getGPS();
    await post("/tenant/attendance/check-in", where || {});
  };

  // ---------- UI ----------
  return (
    <div className="card shadow-sm">
      {/* Header with conditional Check-in button (desktop) */}
      <div className="card-header d-flex justify-content-between align-items-center">
        <strong>Attendance</strong>
        {hasPendingToday && (
          <button
            className="btn btn-success btn-sm d-none d-md-inline-flex"
            onClick={checkIn}
            disabled={busy}
            title="Check In with current location"
          >
            Check In (with GPS)
          </button>
        )}
      </div>

      <div className="card-body">
        {/* Mobile-only Check-in button, also conditional */}
        {hasPendingToday && (
          <button
            className="btn btn-success w-100 mb-3 d-md-none"
            onClick={checkIn}
            disabled={busy}
          >
            Check In (with GPS)
          </button>
        )}

        {/* Late Scheduling Form */}
        <div className="mb-3">
          <h6>Schedule a Late Check-in</h6>
          <div className="row g-2 mb-2">
            <div className="col">
              <input
                type="date"
                className="form-control"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="col">
              <input
                type="time"
                className="form-control"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              />
            </div>
          </div>
          <input
            className="form-control mb-2"
            placeholder="Reason (optional)"
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          />
          <button className="btn btn-warning w-100" onClick={sendLate} disabled={busy}>
            Submit Late Request
          </button>
        </div>

        {!!msg && <div className="text-muted mt-2">{msg}</div>}
        <div className="form-text mt-1">* Location requires HTTPS or localhost.</div>

        <hr />

        {/* Records Table */}
        <h6>Recent Late / Attendance Records</h6>
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Scheduled Time</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Check-in Time</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
                  <td>{r.dateKey}</td>
                  <td>
                    {r.scheduledAt
                      ? new Date(r.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "-"}
                  </td>
                  <td>{r.lateReason || "-"}</td>
                  <td>
                    {r.status === "pending" && <span className="badge bg-warning text-dark">Pending</span>}
                    {r.status === "checked_in" && <span className="badge bg-success">Reached</span>}
                    {r.status === "checked_out" && <span className="badge bg-secondary">Checked Out</span>}
                  </td>
                  <td>
                    {r.checkIn?.at
                      ? new Date(r.checkIn.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "-"}
                  </td>
                  <td>
                    {r.checkIn?.where
                      ? `${r.checkIn.where.lat?.toFixed(4)}, ${r.checkIn.where.lng?.toFixed(4)}`
                      : "-"}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-2">
                    No attendance records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
