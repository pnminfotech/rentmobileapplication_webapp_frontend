// // import React, { useState } from "react";
// // import axios from "axios";
// // import { API, setToken } from "../tenantApi";

// // export default function TenantLogin({ onLoggedIn }) {
// //   const [step, setStep] = useState(1);
// //   const [phone, setPhone] = useState("");
// //   const [otp, setOtp] = useState("");
// //   const [devCode, setDevCode] = useState("");
// //   const [busy, setBusy] = useState(false);

// //   const box = {
// //     maxWidth: 420, margin: "48px auto", background: "#fff", padding: 20,
// //     borderRadius: 14, boxShadow: "0 8px 30px rgba(16,24,40,.06)"
// //   };
// //   const label = { fontSize: 13, color: "#6b7280", marginBottom: 6 };
// //   const input = {
// //     width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb",
// //     borderRadius: 10, outline: "none", marginBottom: 12
// //   };
// //   const btnPri = { width:"100%", padding:"10px 14px", border:0, borderRadius:10, background:"#4c7cff", color:"#fff", cursor:"pointer" };
// //   const btnSec = { ...btnPri, background:"#16a34a" };

// //   async function reqOtp() {
// //     if (!phone) return alert("Enter phone number");
// //     try {
// //       setBusy(true);
// //       const r = await axios.post(`${API}/tenant/auth/request-otp`, { phone });
// //       if (r.data?.devCode) setDevCode(r.data.devCode);
// //       setStep(2);
// //     } catch (e) {
// //       alert(e?.response?.data?.message || "Failed to request OTP");
// //     } finally {
// //       setBusy(false);
// //     }
// //   }

// //   async function verify() {
// //     if (!otp) return alert("Enter OTP");
// //     try {
// //       setBusy(true);
// //       const r = await axios.post(`${API}/tenant/auth/verify`, { phone, code: otp });
// //       setToken(r.data.token);
// //       onLoggedIn && onLoggedIn();
// //     } catch (e) {
// //       alert(e?.response?.data?.message || "Invalid OTP");
// //     } finally {
// //       setBusy(false);
// //     }
// //   }

// //   return (
// //     <div style={box}>
// //       <h3 style={{ margin:0, marginBottom:16, textAlign:"center" }}>Tenant Login</h3>

// //       {step === 1 && (
// //         <>
// //           <div style={label}>Phone</div>
// //           <input
// //             style={input}
// //             value={phone}
// //             onChange={(e)=>setPhone(e.target.value)}
// //             placeholder="Enter your phone number"
// //           />
// //           <button disabled={busy} style={btnPri} onClick={reqOtp}>
// //             {busy ? "Sending..." : "Send OTP"}
// //           </button>
// //         </>
// //       )}

// //       {step === 2 && (
// //         <>
// //           <div style={label}>Enter OTP</div>
// //           <input
// //             style={input}
// //             value={otp}
// //             onChange={(e)=>setOtp(e.target.value)}
// //             placeholder="6-digit code"
// //           />
// //           <button disabled={busy} style={btnSec} onClick={verify}>
// //             {busy ? "Verifying..." : "Verify"}
// //           </button>
// //           {devCode && (
// //             <div style={{marginTop:8, fontSize:12, color:"#64748b"}}>
// //               Dev OTP: <b>{devCode}</b>
// //             </div>
// //           )}
// //         </>
// //       )}
// //     </div>
// //   );
// // }


// // src/tenant/pages/TenantLogin.js
// import React, { useState } from "react";
// import { tenantHttp, setToken } from "../tenantApi";

// export default function TenantLogin({ onLoggedIn }) {
//   const [step, setStep] = useState(1);
//   const [phone, setPhone] = useState("");
//   const [otp, setOtp] = useState("");
//   const [devCode, setDevCode] = useState("");
//   const [otpId, setOtpId] = useState("");
//   const [busy, setBusy] = useState(false);

//   const box = {
//     maxWidth: 420, margin: "48px auto", background: "#fff", padding: 20,
//     borderRadius: 14, boxShadow: "0 8px 30px rgba(16,24,40,.06)"
//   };
//   const label = { fontSize: 13, color: "#6b7280", marginBottom: 6 };
//   const input = {
//     width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb",
//     borderRadius: 10, outline: "none", marginBottom: 12
//   };
//   const btnPri = { width:"100%", padding:"10px 14px", border:0, borderRadius:10, background:"#4c7cff", color:"#fff", cursor:"pointer" };
//   const btnSec = { ...btnPri, background:"#16a34a" };

//   async function reqOtp() {
//     if (!phone) return alert("Enter phone number");
//     setBusy(true);
//     try {
//       const r = await tenantHttp.post(`/tenant/auth/request-otp`, { phone });
//       const d = r.data || {};
//       if (d.devCode) setDevCode(String(d.devCode));
//       if (d.otpId) setOtpId(String(d.otpId));
//       setStep(2);
//     } catch (e) {
//       alert(e?.response?.data?.message || "Failed to request OTP");
//     } finally {
//       setBusy(false);
//     }
//   }

//   async function verify() {
//     if (!otp) return alert("Enter OTP");
//     setBusy(true);
//     try {
//       const payload = { phone, code: otp };
//       if (otpId) payload.otpId = otpId;
//       const r = await tenantHttp.post(`/tenant/auth/verify`, payload);
//       setToken(r.data.token);
//       if (onLoggedIn) {
//         onLoggedIn();
//       } else {
//         window.location.assign(`${process.env.PUBLIC_URL || ""}/tenant/home`);
//       }
//     } catch (e) {
//       alert(e?.response?.data?.message || "Invalid OTP");
//     } finally {
//       setBusy(false);
//     }
//   }

//   return (
//     <div style={box}>
//       <h3 style={{ margin:0, marginBottom:16, textAlign:"center" }}>Tenant Login</h3>

//       {step === 1 && (
//         <>
//           <div style={label}>Phone</div>
//           <input
//             style={input}
//             value={phone}
//             onChange={(e)=>setPhone(e.target.value)}
//             placeholder="Enter your phone number"
//             inputMode="tel"
//           />
//           <button disabled={busy} style={btnPri} onClick={reqOtp}>
//             {busy ? "Sending..." : "Send OTP"}
//           </button>
//         </>
//       )}

//       {step === 2 && (
//         <>
//           <div style={label}>Enter OTP</div>
//           <input
//             style={input}
//             value={otp}
//             onChange={(e)=>setOtp(e.target.value)}
//             placeholder="6-digit code"
//             inputMode="numeric"
//             maxLength={8}
//           />
//           <button disabled={busy} style={btnSec} onClick={verify}>
//             {busy ? "Verifying..." : "Verify"}
//           </button>
//           {(devCode || otpId) && (
//             <div style={{marginTop:8, fontSize:12, color:"#64748b"}}>
//               {devCode && <>Dev OTP: <b>{devCode}</b></>} {otpId && <>• otpId: <b>{otpId}</b></>}
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   );
// }




// // Log.js
// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import { FaUser, FaLock } from "react-icons/fa";
// import logo from "../image/mutkehostel.png";
// import bgImage from "../image/hostelbg.png";
// import "../stylecss/LoginRegister.css";

// // Single API base
// const API = (process.env.REACT_APP_API_BASE || "    http://localhost:8000/api").replace(/\/+$/, "");
// const setTenantToken = (t) => localStorage.setItem("tenantToken", t);

// // (Optional) helper to keep only digits
// const digitsOnly = (s) => String(s || "").replace(/\D/g, "");

// // Generate candidate phone formats. We will try them for request-otp until one works,
// // then reuse the exact working value for verify.
// function phoneCandidates(raw) {
//   const trimmed = String(raw || "").trim();
//   const d = digitsOnly(trimmed);
//   const last10 = d.slice(-10);

//   const candidates = [];
//   if (trimmed.startsWith("+")) candidates.push(trimmed); // user already typed E.164
//   if (last10) {
//     candidates.push(last10);         // 9876543210
//     candidates.push("+91" + last10); // +91xxxxxxxxxx (adjust/remove if not India)
//     candidates.push("0" + last10);   // 0xxxxxxxxxx
//   }
//   return [...new Set(candidates)];
// }

// // ---------- Tenant inline login (OTP) ----------
// function TenantLoginInline({ onLoggedIn }) {
//   const [step, setStep] = useState(1);
//   const [phone, setPhone] = useState("");
//   const [requestedPhone, setRequestedPhone] = useState(""); // exact phone sent for OTP
//   const [otp, setOtp] = useState("");
//   const [devCode, setDevCode] = useState("");
//   const [otpId, setOtpId] = useState("");
//   const [busy, setBusy] = useState(false);
//   const [expiresIn, setExpiresIn] = useState(null);
//   const [err, setErr] = useState("");

//   useEffect(() => {
//     if (!expiresIn) return;
//     const i = setInterval(() => setExpiresIn((s) => (s && s > 0 ? s - 1 : 0)), 1000);
//     return () => clearInterval(i);
//   }, [expiresIn]);

//   const box = {
//     maxWidth: 520,
//     margin: "0 auto",
//     background: "#ffffff6e",
//     padding: "24px 24px",
//     borderRadius: 8,
//     // border: "2px solid #2c3e50",
//   };
//   const label = { fontSize: 13, color: "#1f2937", marginBottom: 6, textAlign: "left" };
//   const input = {
//     width: "100%",
//     padding: "10px 12px",
//     border: "1px solid #e5e7eb",
//     borderRadius: 8,
//     outline: "none",
//     marginBottom: 12,
//     background: "#fff",
//   };
//   const btnPri = {
//     width: "100%",
//     padding: "10px 14px",
//     border: 0,
//     borderRadius: 8,
//     background: "#1e3a8a",
//     color: "#fff",
//     cursor: "pointer",
//     fontWeight: 600,
//   };
 
//   const btnSec = { ...btnPri, background: "#16a34a" };
//   const btnGhost = { ...btnPri, background: "transparent", color: "#1e3a8a", border: "1px solid #1e3a8a" };

//   async function reqOtp() {
//     setErr("");
//     setDevCode("");
//     setOtp("");
//     setOtpId("");
//     setExpiresIn(null);
//     setRequestedPhone("");

//     // Try multiple formats; remember the one that succeeds
//     const tries = phoneCandidates(phone);
//     if (tries.length === 0) {
//       setErr("Enter a valid phone number");
//       return;
//     }

//     setBusy(true);
//     try {
//       let success = false;
//       let lastErr;

//       for (const candidate of tries) {
//         try {
//           const r = await axios.post(
//             `${API}/tenant/auth/request-otp`,
//             { phone: candidate },
//             { headers: { "Content-Type": "application/json" } }
//           );

//           // success with this candidate
//           setRequestedPhone(candidate);

//           const d = r.data || {};
//           const maybeCode =
//             d.devCode ?? d.code ?? d.otp ?? d?.data?.devCode ?? d?.data?.code ?? d?.data?.otp;
//           if (maybeCode) setDevCode(String(maybeCode));

//           const maybeId = d.otpId ?? d.id ?? d?.data?.otpId ?? d?.data?.id;
//           if (maybeId) setOtpId(String(maybeId));

//           const exp = d.expiresIn ?? d.expirySeconds ?? d.ttl ?? d?.data?.expiresIn ?? d?.data?.ttl;
//           if (typeof exp === "number") setExpiresIn(exp);

//           success = true;
//           break;
//         } catch (e) {
//           lastErr = e;
//           // try next candidate
//         }
//       }

//       if (!success) {
//         console.error("request-otp failed for all candidates");
//         throw lastErr || new Error("Failed to request OTP");
//       }

//       setStep(2);
//     } catch (e) {
//       console.error("request-otp error:", e?.response?.status, e?.response?.data || e.message);
//       setErr(e?.response?.data?.message || "Failed to request OTP");
//     } finally {
//       setBusy(false);
//     }
//   }

//   async function verify() {
//     setErr("");
//     const outCode = String(otp || "").replace(/\s+/g, "");
//     if (!/^\d{4,8}$/.test(outCode)) {
//       setErr("Enter a valid OTP");
//       return;
//     }

//     const phoneForVerify = requestedPhone || (phoneCandidates(phone)[0] || "");

//     const payload = { phone: phoneForVerify, code: outCode };
//     if (otpId) payload.otpId = otpId; // in case backend needs it

//     setBusy(true);
//     try {
//       const r = await axios.post(`${API}/tenant/auth/verify`, payload, {
//         headers: { "Content-Type": "application/json" },
//       });
//       setTenantToken(r.data.token);
//       onLoggedIn && onLoggedIn();
//     } catch (e) {
//       console.error("verify failed:", e?.response?.status, e?.response?.data || e.message);
//       setErr(e?.response?.data?.message || "Invalid/expired code");
//     } finally {
//       setBusy(false);
//     }
//   }

//   const fillDevAndVerify = () => {
//     if (!devCode) return;
//     setOtp(String(devCode));
//     setTimeout(() => verify(), 0);
//   };

//   return (
//     <div style={box}>
//       <h3 style={{ margin: 0, marginBottom: 16, textAlign: "center", color: "#07226c" }}>
//         Tenant Login
//       </h3>

//       {step === 1 && (
//         <>
//           <div style={label}>Phone</div>
//           <input
//             style={input}
//             value={phone}
//             onChange={(e) => setPhone(e.target.value)}
//             placeholder="Enter your phone number"
//             inputMode="tel"
//           />
//           <button disabled={busy} style={btnPri} onClick={reqOtp}>
//             {busy ? "Sending..." : "Send OTP"}
//           </button>
//           {err && <div style={{ color: "#b91c1c", marginTop: 8 }}>{err}</div>}
//         </>
//       )}

//       {step === 2 && (
//         <>
//           <div style={label}>
//             Enter OTP {expiresIn !== null && `• expires in ${Math.max(0, expiresIn)}s`}
//           </div>
//           <input
//             style={input}
//             value={otp}
//             onChange={(e) => setOtp(e.target.value)}
//             placeholder="Code"
//             inputMode="numeric"
//             maxLength={8}
//           />
//           <button disabled={busy} style={btnSec} onClick={verify}>
//             {busy ? "Verifying..." : "Verify"}
//           </button>

//           <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
//             <button disabled={busy} style={btnGhost} onClick={reqOtp}>
//               Resend OTP
//             </button>
//             {!!devCode && (
//               <button disabled={busy} style={btnGhost} onClick={fillDevAndVerify}>
//                 Use Dev OTP ({devCode})
//               </button>
//             )}
//           </div>

//           <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
//             Phone used: <b>{requestedPhone || "-"}</b>
//             {otpId && <> • otpId: <b>{otpId}</b></>}
//           </div>

//           {err && <div style={{ color: "#b91c1c", marginTop: 8 }}>{err}</div>}
//         </>
//       )}
//     </div>
//   );
// }

// // =================== Main Log component ===================
// const Log = () => {
//   const [role, setRole] = useState("admin"); // "admin" | "tenant"
//   const [isLogin, setIsLogin] = useState(true); // only for admin section
//   const navigate = useNavigate();

//   // Admin Login State
//   const [loginEmail, setLoginEmail] = useState("");
//   const [loginPassword, setLoginPassword] = useState("");
//   const [loginMessage, setLoginMessage] = useState("");

//   // Admin Register State
//   const [username, setUsername] = useState("");
//   const [registerEmail, setRegisterEmail] = useState("");
//   const [registerPassword, setRegisterPassword] = useState("");
//   const [registerMessage, setRegisterMessage] = useState("");
//   const box1 = {
//     maxWidth: 520,
//     margin: "0 auto",
//     background: "#ffffff6e",
//     padding: "24px 24px",
//     borderRadius: 8,
//     // border: "2px solid #2c3e50",
//   };
//   async function handleLogin(e) {
//     e.preventDefault();
//     try {
//       const res = await fetch(`${API}/login`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
//       });

//       if (!res.ok) {
//         const text = await res.text();
//         console.error("Admin login failed:", res.status, text);
//         setLoginMessage(text || "Invalid credentials");
//         return;
//       }
//       const data = await res.json();
//       localStorage.setItem("authToken", data.token);
//       navigate("/maindashboard");
//     } catch (err) {
//       console.error(err);
//       setLoginMessage("An error occurred. Please try again.");
//     }
//   }

//   async function handleRegister(e) {
//     e.preventDefault();
//     try {
//       const response = await fetch(`${API}/register`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ username, email: registerEmail, password: registerPassword }),
//       });
//       const data = await response.json();
//       if (response.ok) {
//         setRegisterMessage("Registration successful! Please log in.");
//         setIsLogin(true);
//       } else {
//         setRegisterMessage(data.message || "Registration failed.");
//       }
//     } catch (error) {
//       setRegisterMessage("An error occurred. Please try again.");
//     }
//   }

//   return (
//     <div
//       style={{
//         backgroundImage: `url(${bgImage})`,
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//         minHeight: "100vh",
//         padding: "40px 0",
//       }}
//     >
//       <div className="container-fluid">
//         <div className="row">
//           <div className="col-md-12 mt-0 d-flex">
//             <img src={logo} alt="logo" style={{ height: "80px" }} />
//           </div>
//         </div>

//         <div className="container">
//           <center>
//             <div className="auth-box" style={{ maxWidth: "800px", marginTop: "50px" }}>
//               <h1
//                 style={{
//                   color: "#07226c",
//                   fontSize: "42px",
//                   marginBottom: "22px",
//                   fontWeight: 800,
//                 }}
//               >
//                 Hos<span style={{ color: "#ffc107" }}>tel</span> Paym
//                 <span style={{ color: "#ffc107" }}>ent</span>{" "}
//                 <span style={{ color: "#ffc107" }}>Man</span>agement{" "}
//                 <span style={{ color: "#ffc107" }}>Sys</span>tem
//               </h1>

//               <div className="btn-group mb-3" role="group" aria-label="Role switch">
//                 <button
//                   className={`btn ${role === "admin" ? "btn-primary" : "btn-outline-primary"}`}
//                   onClick={() => setRole("admin")}
//                 >
//                   Admin
//                 </button>
//                 <button
//                   className={`btn ${role === "tenant" ? "btn-primary" : "btn-outline-primary"}`}
//                   onClick={() => setRole("tenant")}
//                 >
//                   Tenant
//                 </button>
//               </div>

//               {role === "admin" && (
//                 <>
//                   {isLogin ? (
//                     <form
//                       onSubmit={handleLogin}
//                       className=""
//                       style={box1}
//                     >
//                       <div className="form-group text-start">
//                         <h3 style={{ color: "#1e3a8a", textAlign: "center" }}>Admin Login</h3>
//                         <label>Email Address:</label>
//                         <div className="input-group">
//                           <input
//                             type="email"
//                             className="form-control"
//                             placeholder="Enter email"
//                             value={loginEmail}
//                             onChange={(e) => setLoginEmail(e.target.value)}
//                             required
//                           />
//                           <span className="input-group-text">
//                             <FaUser />
//                           </span>
//                         </div>
//                       </div>

//                       <div className="form-group text-start">
//                         <label>Password:</label>
//                         <div className="input-group">
//                           <input
//                             type="password"
//                             className="form-control"
//                             placeholder="Enter password"
//                             value={loginPassword}
//                             onChange={(e) => setLoginPassword(e.target.value)}
//                             required
//                           />
//                           <span className="input-group-text">
//                             <FaLock />
//                           </span>
//                         </div>
//                       </div>

//                       <button type="submit" className="back-btn btn" style={{ backgroundColor: "#1e3a8a", color: "#fff" }}>
//                         Login
//                       </button>
//                       {loginMessage && <p className="text-danger mt-2">{loginMessage}</p>}
//                     </form>
//                   ) : (
//                     <form
//                       onSubmit={handleRegister}
//                       className=""
//                       style={box1}
//                     >
//                       <div className="form-group text-start">
//                         <h3 style={{ color: "#1e3a8a", textAlign: "center" }}>Register</h3>
//                         <label>Username</label>
//                         <input
//                           type="text"
//                           className="form-control"
//                           placeholder="Enter username"
//                           value={username}
//                           onChange={(e) => setUsername(e.target.value)}
//                           required
//                         />
//                       </div>
//                       <div className="form-group text-start">
//                         <label>Email Address</label>
//                         <input
//                           type="email"
//                           className="form-control"
//                           placeholder="Enter email"
//                           value={registerEmail}
//                           onChange={(e) => setRegisterEmail(e.target.value)}
//                           required
//                         />
//                       </div>
//                       <div className="form-group text-start">
//                         <label>Password</label>
//                         <input
//                           type="password"
//                           className="form-control"
//                           placeholder="Enter password"
//                           value={registerPassword}
//                           onChange={(e) => setRegisterPassword(e.target.value)}
//                           required
//                         />
//                       </div>
//                       <button type="submit" className="back-btn btn btn-primary" style={{ backgroundColor: "#07226c" }}>
//                         Register
//                       </button>
//                       {registerMessage && <p className="text-danger mt-2">{registerMessage}</p>}
//                     </form>
//                   )}

//                   <p className="mt-3 text-dark " style={{fontWeight: "bold"}}>
//                     {isLogin ? "Don't have an account?" : "Already have an account?" }
//                     <button
//                       className="btn btn-link"
//                       onClick={() => setIsLogin(!isLogin)}
//                       style={{ textDecoration: "none", paddingLeft: 5, color: "#07226c", fontWeight: "bolder" }}
//                     >
//                       {isLogin ? "Register here" : "Login here"}
//                     </button>
//                   </p>
//                 </>
//               )}

//               {role === "tenant" && <TenantLoginInline onLoggedIn={() => navigate("tenant")} />}
//             </div>
//           </center>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Log;



// Log.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaUser, FaLock } from "react-icons/fa";
import logo from "../../image/mutkehostel.png";
import bgImage from "../../image/hostelbg.png";
import "../../stylecss/LoginRegister.css";

// import { API, setToken } from "../tenant/tenantApi";
// Single API base
// const API = (process.env.REACT_APP_API_BASE || "    http://localhost:8000/api").replace(/\/+$/, "");
// const setTenantToken = (t) => localStorage.setItem("tenantToken", t);
import { API, setToken } from "../../tenant/tenantApi";
// (Optional) helper to keep only digits
const digitsOnly = (s) => String(s || "").replace(/\D/g, "");

// Generate candidate phone formats. We will try them for request-otp until one works,
// then reuse the exact working value for verify.
function phoneCandidates(raw) {
  const trimmed = String(raw || "").trim();
  const d = digitsOnly(trimmed);
  const last10 = d.slice(-10);

  const candidates = [];
  if (trimmed.startsWith("+")) candidates.push(trimmed); // user already typed E.164
  if (last10) {
    candidates.push(last10);         // 9876543210
    candidates.push("+91" + last10); // +91xxxxxxxxxx (adjust/remove if not India)
    candidates.push("0" + last10);   // 0xxxxxxxxxx
  }
  return [...new Set(candidates)];
}

// ---------- Tenant inline login (OTP) ----------
function TenantLoginInline({ onLoggedIn }) {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [requestedPhone, setRequestedPhone] = useState(""); // exact phone sent for OTP
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState("");
  const [otpId, setOtpId] = useState("");
  const [busy, setBusy] = useState(false);
  const [expiresIn, setExpiresIn] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!expiresIn) return;
    const i = setInterval(() => setExpiresIn((s) => (s && s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(i);
  }, [expiresIn]);

  const box = {
    maxWidth: 520,
    margin: "0 auto",
    background: "#ffffff6e",
    padding: "24px 24px",
    borderRadius: 8,
  };
  const label = { fontSize: 13, color: "#1f2937", marginBottom: 6, textAlign: "left" };
  const input = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    outline: "none",
    marginBottom: 12,
    background: "#fff",
  };
  const btnPri = {
    width: "100%",
    padding: "10px 14px",
    border: 0,
    borderRadius: 8,
    background: "#1e3a8a",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  };
  const btnSec = { ...btnPri, background: "#16a34a" };
  const btnGhost = { ...btnPri, background: "transparent", color: "#1e3a8a", border: "1px solid #1e3a8a" };

  async function reqOtp() {
    setErr("");
    setDevCode("");
    setOtp("");
    setOtpId("");
    setExpiresIn(null);
    setRequestedPhone("");

    // Try multiple formats; remember the one that succeeds
    const tries = phoneCandidates(phone);
    if (tries.length === 0) {
      setErr("Enter a valid phone number");
      return;
    }

    setBusy(true);
    try {
      let success = false;
      let lastErr;

      for (const candidate of tries) {
        try {
          const r = await axios.post(
            `${API}/tenant/auth/request-otp`,
            { phone: candidate },
            { headers: { "Content-Type": "application/json" } }
          );

          // success with this candidate
          setRequestedPhone(candidate);

          const d = r.data || {};
          const maybeCode =
            d.devCode ?? d.code ?? d.otp ?? d?.data?.devCode ?? d?.data?.code ?? d?.data?.otp;
          if (maybeCode) setDevCode(String(maybeCode));

          const maybeId = d.otpId ?? d.id ?? d?.data?.otpId ?? d?.data?.id;
          if (maybeId) setOtpId(String(maybeId));

          const exp = d.expiresIn ?? d.expirySeconds ?? d.ttl ?? d?.data?.expiresIn ?? d?.data?.ttl;
          if (typeof exp === "number") setExpiresIn(exp);

          success = true;
          break;
        } catch (e) {
          lastErr = e;
          // try next candidate
        }
      }

      if (!success) {
        console.error("request-otp failed for all candidates");
        throw lastErr || new Error("Failed to request OTP");
      }

      setStep(2);
    } catch (e) {
      console.error("request-otp error:", e?.response?.status, e?.response?.data || e.message);
      setErr(e?.response?.data?.message || "Failed to request OTP");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setErr("");
    const outCode = String(otp || "").replace(/\s+/g, "");
    if (!/^\d{4,8}$/.test(outCode)) {
      setErr("Enter a valid OTP");
      return;
    }

    const phoneForVerify = requestedPhone || (phoneCandidates(phone)[0] || "");

    const payload = { phone: phoneForVerify, code: outCode };
    if (otpId) payload.otpId = otpId; // in case backend needs it

    setBusy(true);
    try {
      const r = await axios.post(`${API}/tenant/auth/verify`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      // setTenantToken(r.data.token);
setToken(r.data.token);
      // ✅ Go to /tenant/home right away
      if (onLoggedIn) {
        onLoggedIn();
      } else {
        // fallback if no callback provided; respects basename via PUBLIC_URL
        window.location.assign(`${process.env.PUBLIC_URL || ""}/tenant/home`);
      }
    } catch (e) {
      console.error("verify failed:", e?.response?.status, e?.response?.data || e.message);
      setErr(e?.response?.data?.message || "Invalid/expired code");
    } finally {
      setBusy(false);
    }
  }

  const fillDevAndVerify = () => {
    if (!devCode) return;
    setOtp(String(devCode));
    setTimeout(() => verify(), 0);
  };

  return (
    <div style={box}>
      <h3 style={{ margin: 0, marginBottom: 16, textAlign: "center", color: "#07226c" }}>
        Tenant Login
      </h3>

      {step === 1 && (
        <>
          <div style={label}>Phone</div>
          <input
            style={input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone number"
            inputMode="tel"
          />
          <button disabled={busy} style={btnPri} onClick={reqOtp}>
            {busy ? "Sending..." : "Send OTP"}
          </button>
          {err && <div style={{ color: "#b91c1c", marginTop: 8 }}>{err}</div>}
        </>
      )}

      {step === 2 && (
        <>
          <div style={label}>
            Enter OTP {expiresIn !== null && `• expires in ${Math.max(0, expiresIn)}s`}
          </div>
          <input
            style={input}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Code"
            inputMode="numeric"
            maxLength={8}
          />
          <button disabled={busy} style={btnSec} onClick={verify}>
            {busy ? "Verifying..." : "Verify"}
          </button>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button disabled={busy} style={btnGhost} onClick={reqOtp}>
              Resend OTP
            </button>
            {!!devCode && (
              <button disabled={busy} style={btnGhost} onClick={fillDevAndVerify}>
                Use Dev OTP ({devCode})
              </button>
            )}
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
            Phone used: <b>{requestedPhone || "-"}</b>
            {otpId && <> • otpId: <b>{otpId}</b></>}
          </div>

          {err && <div style={{ color: "#b91c1c", marginTop: 8 }}>{err}</div>}
        </>
      )}
    </div>
  );
}

// =================== Main Log component ===================
const Log = () => {
  const [role, setRole] = useState("admin"); // "admin" | "tenant"
  const [isLogin, setIsLogin] = useState(true); // only for admin section
  const navigate = useNavigate();

  // Admin Login State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");

  // Admin Register State
  const [username, setUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerMessage, setRegisterMessage] = useState("");
  const box1 = {
    maxWidth: 520,
    margin: "0 auto",
    background: "#ffffff6e",
    padding: "24px 24px",
    borderRadius: 8,
  };

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Admin login failed:", res.status, text);
        setLoginMessage(text || "Invalid credentials");
        return;
      }
      const data = await res.json();
      localStorage.setItem("authToken", data.token);
      navigate("/maindashboard");
    } catch (err) {
      console.error(err);
      setLoginMessage("An error occurred. Please try again.");
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    try {
      const response = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email: registerEmail, password: registerPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        setRegisterMessage("Registration successful! Please log in.");
        setIsLogin(true);
      } else {
        setRegisterMessage(data.message || "Registration failed.");
      }
    } catch (error) {
      setRegisterMessage("An error occurred. Please try again.");
    }
  }

  return (
    <div
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        padding: "40px 0",
      }}
    >
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-12 mt-0 d-flex">
            <img src={logo} alt="logo" style={{ height: "80px" }} />
          </div>
        </div>

        <div className="container">
          <center>
            <div className="auth-box" style={{ maxWidth: "800px", marginTop: "50px" }}>
              <h2
                style={{
                  color: "#07226c",
                  fontSize: "42px",
                  marginBottom: "22px",
                  fontWeight: 800,
                }}
              >
                Hos<span style={{ color: "#ffc107" }}>tel</span> Paym
                <span style={{ color: "#ffc107" }}>ent</span>{" "}
                <span style={{ color: "#ffc107" }}>Man</span>agement{" "}
                <span style={{ color: "#ffc107" }}>Sys</span>tem
              </h2>

              <div className="btn-group mb-3" role="group" aria-label="Role switch">
                <button
                  className={`btn ${role === "admin" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setRole("admin")}
                >
                  Admin
                </button>
                <button
                  className={`btn ${role === "tenant" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setRole("tenant")}
                >
                  Tenant
                </button>
              </div>

              {role === "admin" && (
                <>
                  {isLogin ? (
                    <form onSubmit={handleLogin} className="" style={box1}>
                      <div className="form-group text-start">
                        <h3 style={{ color: "#1e3a8a", textAlign: "center" }}>Admin Login</h3>
                        <label>Email Address:</label>
                        <div className="input-group">
                          <input
                            type="email"
                            className="form-control"
                            placeholder="Enter email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                          />
                          <span className="input-group-text">
                            <FaUser />
                          </span>
                        </div>
                      </div>

                      <div className="form-group text-start">
                        <label>Password:</label>
                        <div className="input-group">
                          <input
                            type="password"
                            className="form-control"
                            placeholder="Enter password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                          />
                          <span className="input-group-text">
                            <FaLock />
                          </span>
                        </div>
                      </div>

                      <button type="submit" className="back-btn btn" style={{ backgroundColor: "#1e3a8a", color: "#fff" }}>
                        Login
                      </button>
                      {loginMessage && <p className="text-danger mt-2">{loginMessage}</p>}
                    </form>
                  ) : (
                    <form onSubmit={handleRegister} className="" style={box1}>
                      <div className="form-group text-start">
                        <h3 style={{ color: "#1e3a8a", textAlign: "center" }}>Register</h3>
                        <label>Username</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group text-start">
                        <label>Email Address</label>
                        <input
                          type="email"
                          className="form-control"
                          placeholder="Enter email"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group text-start">
                        <label>Password</label>
                        <input
                          type="password"
                          className="form-control"
                          placeholder="Enter password"
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          required
                        />
                      </div>
                      <button type="submit" className="back-btn btn btn-primary" style={{ backgroundColor: "#07226c" }}>
                        Register
                      </button>
                      {registerMessage && <p className="text-danger mt-2">{registerMessage}</p>}
                    </form>
                  )}

                  <p className="mt-3 text-dark " style={{ fontWeight: "bold" }}>
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button
                      className="btn btn-link"
                      onClick={() => setIsLogin(!isLogin)}
                      style={{ textDecoration: "none", paddingLeft: 5, color: "#07226c", fontWeight: "bolder" }}
                    >
                      {isLogin ? "Register here" : "Login here"}
                    </button>
                  </p>
                </>
              )}

              {/* ✅ navigate straight to /tenant/home after successful OTP */}
              {role === "tenant" && (
                <TenantLoginInline onLoggedIn={() => navigate("/tenant/home", { replace: true })} />
              )}
            </div>
          </center>
        </div>
      </div>
    </div>
  );
};

export default Log;

