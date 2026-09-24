// import React, { useCallback, useEffect, useMemo, useState } from "react";
// import axios from "axios";
// import { API, setToken, getToken, clearToken, authHeader } from "./tenantApi";

// function TenantLogin({ onLoggedIn }) {
//   const [step, setStep] = useState(1);
//   const [phone, setPhone] = useState("");
//   const [otp, setOtp] = useState("");
//   const [devCode, setDevCode] = useState("");

//   const reqOtp = async () => {
//     if (!phone) return alert("Enter phone number");
//     const res = await axios.post(`${API}/tenant/auth/request-otp`, { phone });
//     if (res.data?.devCode) setDevCode(res.data.devCode); // visible in dev
//     setStep(2);
//   };

//   const verify = async () => {
//     const res = await axios.post(`${API}/tenant/auth/verify`, { phone, code: otp });
//     setToken(res.data.token);
//     onLoggedIn();
//   };

//   return (
//     <div className="container py-5" style={{ maxWidth: 420 }}>
//       <h3 className="mb-3 fw-bold text-center">Tenant Login</h3>
//       {step === 1 && (
//         <>
//           <label className="form-label">Phone</label>
//           <input
//             className="form-control mb-3"
//             value={phone}
//             onChange={(e) => setPhone(e.target.value)}
//           />
//           <button className="btn btn-primary w-100" onClick={reqOtp}>
//             Request OTP
//           </button>
//         </>
//       )}
//       {step === 2 && (
//         <>
//           <label className="form-label">Enter OTP</label>
//           <input
//             className="form-control mb-3"
//             value={otp}
//             onChange={(e) => setOtp(e.target.value)}
//           />
//           <button className="btn btn-success w-100" onClick={verify}>
//             Verify
//           </button>
//           {devCode && <div className="small text-muted mt-2">Dev OTP: {devCode}</div>}
//         </>
//       )}
//     </div>
//   );
// }

// function Money({ v = 0 }) {
//   return <>₹{Number(v || 0).toLocaleString("en-IN")}</>;
// }

// export default function TenantDashboard() {
//   const [authed, setAuthed] = useState(!!getToken());
//   const [me, setMe] = useState(null);
//   const [rents, setRents] = useState(null);
//   const [ann, setAnn] = useState([]);
//   const [leaveDate, setLeaveDate] = useState("");
//   const [docFiles, setDocFiles] = useState([]);
//   const [payAmount, setPayAmount] = useState("");

//   const fetchAll = useCallback(async () => {
//     const h = { headers: authHeader() };
//     const [a, b, c] = await Promise.all([
//       axios.get(`${API}/tenant/me`, h),
//       axios.get(`${API}/tenant/rents`, h),
//       axios.get(`${API}/tenant/announcements`, h),
//     ]);
//     setMe(a.data);
//     setRents(b.data);
//     setAnn(c.data || []);
//   }, []);

//   // ✅ Hook is always called; internal logic handles nulls
//   const currentMonthPaid = useMemo(() => {
//     if (!rents?.rents?.length) return false;
//     const now = new Date();
//     const m = now.getMonth();
//     const y = now.getFullYear();
//     return rents.rents.some((r) => {
//       if (!r?.date) return false;
//       const d = new Date(r.date);
//       return d.getMonth() === m && d.getFullYear() === y && Number(r.rentAmount) > 0;
//     });
//   }, [rents]);

//   useEffect(() => {
//     if (!authed) return;
//     fetchAll().catch(() => {
//       clearToken();
//       setAuthed(false);
//     });
//   }, [authed, fetchAll]);

//   async function uploadDocs() {
//     if (!docFiles.length) return;
//     const fd = new FormData();
//     docFiles.forEach((f) => fd.append("documents", f));
//     await axios.post(`${API}/tenant/docs`, fd, {
//       headers: { ...authHeader(), "Content-Type": "multipart/form-data" },
//     });
//     setDocFiles([]);
//     await fetchAll();
//   }

//   async function requestLeave() {
//     if (!leaveDate) return alert("Pick a date");
//     await axios.post(
//       `${API}/tenant/leave`,
//       { leaveDate },
//       { headers: authHeader() }
//     );
//     alert("Leave request submitted.");
//     setLeaveDate("");
//     await fetchAll();
//   }

//   const upiQrUrl = `${API}/tenant/upi-qr?amount=${encodeURIComponent(
//     payAmount || 0
//   )}&note=${encodeURIComponent("Hostel Rent")}`;

//   // ✅ Early return AFTER hooks
//   if (!authed) return <TenantLogin onLoggedIn={() => setAuthed(true)} />;

//   return (
//     <div className="container py-4">
//       <div className="d-flex justify-content-between align-items-center mb-3">
//         <h4 className="fw-bold mb-0">Welcome, {me?.name || "Tenant"}</h4>
//         <button
//           className="btn btn-outline-secondary btn-sm"
//           onClick={() => {
//             clearToken();
//             setAuthed(false);
//           }}
//         >
//           Logout
//         </button>
//       </div>

//       {/* Top cards */}
//       <div className="row g-3 mb-4">
//         <div className="col-md-3">
//           <div className="bg-white border rounded p-3 text-center">
//             <div className="text-muted">Room / Bed</div>
//             <div className="fw-bold">
//               {me?.roomNo || "—"} / {me?.bedNo || "—"}
//             </div>
//           </div>
//         </div>
//         <div className="col-md-3">
//           <div className="bg-white border rounded p-3 text-center">
//             <div className="text-muted">Deposit</div>
//             <div className="fw-bold text-success">
//               <Money v={me?.depositAmount} />
//             </div>
//           </div>
//         </div>
//         <div className="col-md-3">
//           <div className="bg-white border rounded p-3 text-center">
//             <div className="text-muted">This Year Due</div>
//             <div className="fw-bold text-danger">
//               <Money v={rents?.totalDue} />
//             </div>
//           </div>
//         </div>
//         <div className="col-md-3">
//           <div className="bg-white border rounded p-3 text-center">
//             <div className="text-muted">Current Month</div>
//             <div
//               className={`fw-bold ${
//                 currentMonthPaid ? "text-success" : "text-warning"
//               }`}
//             >
//               {currentMonthPaid ? "Paid" : "Pending"}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Announcements */}
//       <div className="card mb-4">
//         <div className="card-header fw-bold">Announcements</div>
//         <div className="card-body">
//           {ann?.length ? (
//             ann.map((a, i) => (
//               <div key={i} className="mb-3">
//                 <div className="fw-semibold">{a.title}</div>
//                 {a.createdAt && (
//                   <div className="text-muted small">
//                     {new Date(a.createdAt).toLocaleString()}
//                   </div>
//                 )}
//                 <div>{a.body}</div>
//                 <hr />
//               </div>
//             ))
//           ) : (
//             <div className="text-muted">No announcements</div>
//           )}
//         </div>
//       </div>

//       <div className="row g-4">
//         {/* Rent History */}
//         <div className="col-lg-7">
//           <div className="card h-100">
//             <div className="card-header fw-bold">
//               Rent History ({rents?.currentYear || new Date().getFullYear()})
//             </div>
//             <div className="card-body table-responsive">
//               <table className="table table-striped align-middle">
//                 <thead>
//                   <tr>
//                     <th>Month</th>
//                     <th>Date</th>
//                     <th>Mode</th>
//                     <th>Amount</th>
//                     <th>Status</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {Array.from({ length: 12 }, (_, i) => {
//                     const y = rents?.currentYear || new Date().getFullYear();
//                     const md = new Date(y, i, 1);
//                     const rec = rents?.rents?.find((r) => {
//                       if (!r?.date) return false;
//                       const d = new Date(r.date);
//                       return d.getMonth() === i && d.getFullYear() === y;
//                     });
//                     const isFuture = md > new Date();
//                     const joining = me?.joiningDate ? new Date(me.joiningDate) : null;
//                     const rentStart = joining
//                       ? new Date(joining.getFullYear(), joining.getMonth() + 1, 1)
//                       : null;

//                     return (
//                       <tr key={i}>
//                         <td>
//                           {md.toLocaleString("default", {
//                             month: "long",
//                             year: "numeric",
//                           })}
//                         </td>
//                         <td>
//                           {rec ? new Date(rec.date).toLocaleDateString("en-GB") : "—"}
//                         </td>
//                         <td>{rec ? rec.paymentMode || "Cash" : "—"}</td>
//                         <td>{rec ? <Money v={rec.rentAmount} /> : "—"}</td>
//                         <td>
//                           {rentStart && md < rentStart ? (
//                             <span className="badge bg-secondary">N/A</span>
//                           ) : rec ? (
//                             <span className="badge bg-success">Paid</span>
//                           ) : isFuture ? (
//                             <span className="badge bg-warning text-dark">Upcoming</span>
//                           ) : (
//                             <span className="badge bg-danger">Pending</span>
//                           )}
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>

//         {/* Pay + Leave + Documents */}
//         <div className="col-lg-5">
//           {/* Quick Pay */}
//           <div className="card mb-4">
//             <div className="card-header fw-bold">Pay via UPI</div>
//             <div className="card-body">
//               <div className="mb-3">
//                 <label className="form-label">Amount (₹)</label>
//                 <input
//                   className="form-control"
//                   value={payAmount}
//                   onChange={(e) => setPayAmount(e.target.value)}
//                 />
//               </div>
//               <div className="d-flex flex-column align-items-center">
//                 <img src={upiQrUrl} alt="UPI QR" style={{ width: 220, height: 220 }} />
//                 <a
//                   className="btn btn-outline-primary mt-2"
//                   href={`${API}/tenant/upi-intent?amount=${encodeURIComponent(
//                     payAmount || 0
//                   )}&note=Hostel%20Rent`}
//                 >
//                   Open UPI App
//                 </a>
//               </div>
//             </div>
//           </div>

//           {/* Leave Request */}
//           <div className="card mb-4">
//             <div className="card-header fw-bold">Leave Request</div>
//             <div className="card-body">
//               <div className="mb-2 text-muted small">
//                 Leave Date (proposed). Admin will review &amp; confirm.
//               </div>
//               <input
//                 type="date"
//                 className="form-control mb-2"
//                 value={leaveDate}
//                 onChange={(e) => setLeaveDate(e.target.value)}
//               />
//               <button className="btn btn-warning" onClick={requestLeave}>
//                 Submit Leave Request
//               </button>
//               {me?.leaveRequestDate && (
//                 <div className="mt-2 small">
//                   Last requested:{" "}
//                   <strong>
//                     {new Date(me.leaveRequestDate).toLocaleDateString("en-GB")}
//                   </strong>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Documents */}
//           <div className="card">
//             <div className="card-header fw-bold">Documents</div>
//             <div className="card-body">
//               <input
//                 type="file"
//                 multiple
//                 className="form-control mb-2"
//                 onChange={(e) => setDocFiles(Array.from(e.target.files || []))}
//               />
//               <button
//                 className="btn btn-success mb-3"
//                 onClick={uploadDocs}
//                 disabled={!docFiles.length}
//               >
//                 Upload
//               </button>
//               {me?.documents?.length ? (
//                 <ul className="list-group">
//                   {me.documents.map((d, i) => (
//                     <li
//                       key={i}
//                       className="list-group-item d-flex justify-content-between align-items-center"
//                     >
//                       <span>{d.relation || "Self"} — {d.fileName}</span>
//                       {d.url && (
//                         <a
//                           className="btn btn-sm btn-outline-primary"
//                           href={d.url}
//                           target="_blank"
//                           rel="noreferrer"
//                         >
//                           View
//                         </a>
//                       )}
//                     </li>
//                   ))}
//                 </ul>
//               ) : (
//                 <div className="text-muted">No documents uploaded</div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
