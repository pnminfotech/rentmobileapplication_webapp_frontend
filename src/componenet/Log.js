import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaUser } from "react-icons/fa";
import logo from "../image/mutkehostel.png";
import bgImage from "../image/hostelbg.png";
import "../stylecss/LoginRegister.css";
import { getAppBootstrap, requestSaasLoginEmailCode, resendSaasLoginEmailCode, resetSaasLoginSecurityPin, setupSaasLoginSecurityPin, verifySaasLoginEmailCode, verifySaasLoginSecurityPin } from "../saasApi";
import { getPostLoginPath } from "../utils/saasNavigation";
// import { API, setToken } from "../tenant/tenantApi";
// Single API base
// const API = (process.env.REACT_APP_API_BASE || "    http://localhost:8000/api").replace(/\/+$/, "");
// const setTenantToken = (t) => localStorage.setItem("tenantToken", t);
import { API, setToken } from "../tenant/tenantApi";
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
  const [loginMessage, setLoginMessage] = useState("");
  const [loginChallengeId, setLoginChallengeId] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [loginMaskedEmail, setLoginMaskedEmail] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [loginPinStage, setLoginPinStage] = useState("");
  const [loginSecurityPin, setLoginSecurityPin] = useState("");
  const [loginSecurityPinConfirm, setLoginSecurityPinConfirm] = useState("");

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
    setLoginMessage("");
    setLoginNotice("");

    const data = await requestSaasLoginEmailCode(loginEmail.trim());
    setLoginChallengeId(data.challengeId);
    setLoginMaskedEmail(data.email || "your registered email");
    setLoginCode("");
  } catch (error) {
    console.error(
      "SaaS login failed:",
      error.response?.data || error
    );

    setLoginMessage(
      error.response?.data?.message ||
        "Unable to send the verification code. Please check your email address."
    );
  }
}

async function handleVerifyLoginCode(e) {
  e.preventDefault();
  if (!/^\d{6}$/.test(loginCode)) {
    setLoginMessage("Enter the 6-digit code sent to your email.");
    return;
  }

  try {
    const resetPinAfterCode = loginPinStage === "reset-code";
    setLoginMessage("");
    setLoginNotice("");
    const data = await verifySaasLoginEmailCode(loginChallengeId, loginCode);
    if (resetPinAfterCode) {
      setLoginPinStage("reset");
      setLoginCode("");
      return;
    }
    if (data.requiresSecurityPin || data.requiresSecurityPinSetup) {
      setLoginPinStage(data.requiresSecurityPinSetup ? "setup" : "verify");
      setLoginSecurityPin("");
      setLoginSecurityPinConfirm("");
      return;
    }
    const bootstrap = await getAppBootstrap();
    navigate(getPostLoginPath(bootstrap), { replace: true });
  } catch (error) {
    setLoginMessage(error.response?.data?.message || "Unable to verify the code. Please try again.");
  }
}

async function handleForgotLoginSecurityPin() {
  try {
    setLoginMessage("");
    setLoginNotice("");
    const data = await resendSaasLoginEmailCode(loginChallengeId);
    setLoginMaskedEmail(data.email || loginMaskedEmail);
    setLoginCode("");
    setLoginPinStage("reset-code");
    setLoginNotice("A new OTP was sent to your registered email.");
  } catch (error) {
    setLoginMessage(error.response?.data?.message || "Unable to send a reset OTP. Please try again.");
  }
}

async function handleVerifyLoginSecurityPin(e) {
  e.preventDefault();
  if (!/^\d{4,8}$/.test(loginSecurityPin)) {
    setLoginMessage("Enter your 4 to 8 digit security PIN.");
    return;
  }
  if ((loginPinStage === "setup" || loginPinStage === "reset") && loginSecurityPin !== loginSecurityPinConfirm) {
    setLoginMessage("Security PINs do not match.");
    return;
  }
  try {
    setLoginMessage("");
    setLoginNotice("");
    if (loginPinStage === "setup") await setupSaasLoginSecurityPin(loginChallengeId, loginSecurityPin);
    else if (loginPinStage === "reset") await resetSaasLoginSecurityPin(loginChallengeId, loginSecurityPin);
    else await verifySaasLoginSecurityPin(loginChallengeId, loginSecurityPin);
    const bootstrap = await getAppBootstrap();
    navigate(getPostLoginPath(bootstrap), { replace: true });
  } catch (error) {
    setLoginMessage(error.response?.data?.message || "Unable to verify the security PIN. Please try again.");
  }
}

async function handleResendLoginCode() {
  try {
    setLoginMessage("");
    setLoginNotice("");
    const data = await resendSaasLoginEmailCode(loginChallengeId);
    setLoginMaskedEmail(data.email || loginMaskedEmail);
    setLoginCode("");
    setLoginNotice("A new sign-in code has been sent.");
  } catch (error) {
    setLoginMessage(error.response?.data?.message || "Unable to resend the code. Please try again.");
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
        {/* <div className="row">
          <div className="col-md-12 mt-0 d-flex">
            <img src={logo} alt="logo" style={{ height: "50px" }} />
          </div>
        </div> */}

        <div className="container">
          <center>
            <div className="auth-box" style={{ maxWidth: "800px", marginTop: "50px" }}>
              <h2
                style={{
                  color: "#07226c",
                  // fontSize: "42px",
                  marginBottom: "22px",
                  fontWeight: 800,
                }}
              >   
               Re<span style={{ color: "#ffc107" }}>nt {" "}</span>Man
                <span style={{ color: "#ffc107" }}>ager</span>
               
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
                    <form onSubmit={loginPinStage === "reset-code" ? handleVerifyLoginCode : loginPinStage ? handleVerifyLoginSecurityPin : loginChallengeId ? handleVerifyLoginCode : handleLogin} className="" style={box1}>
                      <h3 style={{ color: "#1e3a8a", textAlign: "center" }}>{loginPinStage === "reset-code" ? "Verify reset OTP" : loginPinStage ? "Confirm security PIN" : loginChallengeId ? "Verify your email" : "Admin sign in"}</h3>
                      {!loginChallengeId ? <>
                        <div className="form-group text-start">
                          <label>Email address:</label>
                          <div className="input-group">
                            <input
                              type="email"
                              className="form-control"
                              placeholder="Enter your registered email"
                              value={loginEmail}
                              onChange={(e) => setLoginEmail(e.target.value)}
                              required
                            />
                          <span className="input-group-text">
                            <FaUser />
                          </span>
                        </div>
                      </div>
                      </> : loginPinStage === "reset-code" ? <>
                        <p className="text-muted">Enter the new 6-digit OTP sent to {loginMaskedEmail} before resetting your PIN.</p>
                        <label>Reset OTP:</label>
                        <input type="text" className="form-control" placeholder="6-digit OTP" value={loginCode} onChange={(e) => setLoginCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
                      </> : loginPinStage ? <>
                        <p className="text-muted">{loginPinStage === "setup" ? "Create a 4 to 8 digit PIN for future superadmin sign-ins." : loginPinStage === "reset" ? "Create a new security PIN. Your verified email OTP allows this reset." : "Enter the security PIN saved in your superadmin profile."}</p>
                        <label>Security PIN:</label>
                        <input type="password" className="form-control" value={loginSecurityPin} onChange={(e) => setLoginSecurityPin(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" autoComplete="off" maxLength={8} required />
                        {(loginPinStage === "setup" || loginPinStage === "reset") && <><label className="mt-2">Confirm security PIN:</label><input type="password" className="form-control" value={loginSecurityPinConfirm} onChange={(e) => setLoginSecurityPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" autoComplete="off" maxLength={8} required /></>}
                      </> : <>
                        <p className="text-muted">Enter the 6-digit code sent to {loginMaskedEmail}. It expires in 10 minutes.</p>
                        <label>Email verification code:</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="6-digit code"
                          value={loginCode}
                          onChange={(e) => setLoginCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          required
                        />
                      </>}

                      <button type="submit" className="back-btn btn" style={{ backgroundColor: "#1e3a8a", color: "#fff" }}>
                        {loginPinStage === "setup" ? "Set PIN and sign in" : loginPinStage === "reset" ? "Reset PIN and sign in" : loginPinStage === "reset-code" ? "Verify reset OTP" : loginPinStage ? "Verify PIN" : loginChallengeId ? "Verify code" : "Send OTP"}
                      </button>
                      {loginMessage && <p className="text-danger mt-2">{loginMessage}</p>}
                      {loginNotice && <p className="text-success mt-2">{loginNotice}</p>}
                      {loginChallengeId && !loginPinStage && <div className="d-flex gap-2 mt-3">
                        <button type="button" className="btn btn-link p-0" onClick={handleResendLoginCode}>Send a new code</button>
                        <button type="button" className="btn btn-link p-0" onClick={() => { setLoginChallengeId(""); setLoginCode(""); setLoginMessage(""); setLoginNotice(""); }}>Back to sign in</button>
                      </div>}
                      {loginPinStage === "verify" && <button type="button" className="btn btn-link p-0 mt-3" onClick={handleForgotLoginSecurityPin}>Forgot security PIN? Send a new OTP</button>}
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
                      onClick={() => {
                        if (isLogin) {
                          navigate("/register-business");
                          return;
                        }
                        setIsLogin(true);
                      }}
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
