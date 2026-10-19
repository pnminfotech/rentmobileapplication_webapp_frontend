import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import { registerBusiness } from "../saasApi";
import bgImage from "../image/hostelbg.png";
import "./RegisterBusiness.css";

function cleanLoginId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 32);
}

export default function RegisterBusiness() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    loginId: "",
    email: "",
    phone: "",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loginIdNote, setLoginIdNote] = useState("");

  const setValue = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  async function submit(event) {
    event.preventDefault();

    const loginId = cleanLoginId(form.loginId);
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.replace(/\D/g, "");

    const nextErrors = {};
    if (!form.ownerName.trim()) nextErrors.ownerName = "Owner name is required.";
    if (!loginId) nextErrors.loginId = "Login ID is required.";
    if (!email) nextErrors.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Enter a valid email address, for example owner@gmail.com.";
    if (!phone) nextErrors.phone = "Phone number is required.";
    else if (phone.length !== 10) nextErrors.phone = `Phone number must be 10 digits. You entered ${phone.length}.`;
    if (!form.password) nextErrors.password = "Password is required.";
    else if (form.password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return setError("Please correct the highlighted fields.");

    try {
      setSaving(true);
      setError("");
      setFieldErrors({});
      setMessage("");
      await registerBusiness({
        businessName: form.businessName.trim() || `${form.ownerName.trim()} Property`,
        ownerName: form.ownerName.trim(),
        loginId,
        email,
        phone,
        password: form.password,
      });
      setMessage("Trial account created. Login with your Login ID and password, then set your unit counts.");
      window.setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create trial account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="business-register-page" style={{ backgroundImage: `url(${bgImage})` }}>
      <main className="business-register-shell">
        <h1 className="business-register-brand">Re<span>nt </span>Man<span>ager</span></h1>
        <div className="business-register-box">
          {/* <Link to="/login" className="business-register-back">&larr; Back to login</Link> */}
          <h2>Create trial account</h2>
          <p className="business-register-intro">Register now. Purchase a plan after 15 days.</p>

          <form onSubmit={submit} noValidate>
            <h3>Business details</h3>
            <div className="business-register-grid">
              <label>Business name 
                <input value={form.businessName} onChange={(e) => setValue("businessName", e.target.value)} placeholder="Example: Demo Hostel" autoComplete="organization" />
              </label>
              <label>Owner name <span className="business-register-required">*</span>
                <input className={fieldErrors.ownerName ? "has-error" : ""} aria-invalid={Boolean(fieldErrors.ownerName)} value={form.ownerName} onChange={(e) => setValue("ownerName", e.target.value)} placeholder="Owner full name" autoComplete="name" />
                {fieldErrors.ownerName ? <small className="business-register-field-error">{fieldErrors.ownerName}</small> : null}
              </label>
            </div>

            <h3>Login details</h3>
            <div className="business-register-grid">
              <label>Login ID <span className="business-register-required">*</span>
                <input className={fieldErrors.loginId ? "has-error" : ""} aria-invalid={Boolean(fieldErrors.loginId)} value={form.loginId} onChange={(e) => {
                  const cleaned = cleanLoginId(e.target.value);
                  setLoginIdNote(/[^a-zA-Z0-9._-]/.test(e.target.value) ? "Only letters, numbers, dot, underscore and hyphen are allowed." : "");
                  setValue("loginId", cleaned);
                }} placeholder="Create a login ID" autoComplete="username" />
                {fieldErrors.loginId ? <small className="business-register-field-error">{fieldErrors.loginId}</small> : null}
                {!fieldErrors.loginId && loginIdNote ? <small className="business-register-field-note">{loginIdNote}</small> : null}
              </label>
              <label>Password <span className="business-register-required">*</span>
                <span className="business-register-password">
                  <input className={fieldErrors.password ? "has-error" : ""} aria-invalid={Boolean(fieldErrors.password)} type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setValue("password", e.target.value)} placeholder="Minimum 8 characters" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
                </span>
                {fieldErrors.password ? <small className="business-register-field-error">{fieldErrors.password}</small> : null}
              </label>
              <label>Email <span className="business-register-required">*</span>
                <input className={fieldErrors.email ? "has-error" : ""} aria-invalid={Boolean(fieldErrors.email)} type="email" value={form.email} onChange={(e) => setValue("email", e.target.value)} placeholder="owner@example.com" autoComplete="email" />
                {fieldErrors.email ? <small className="business-register-field-error">{fieldErrors.email}</small> : null}
              </label>
              <label>Phone <span className="business-register-required">*</span>
                <input className={fieldErrors.phone ? "has-error" : ""} aria-invalid={Boolean(fieldErrors.phone)} value={form.phone} onChange={(e) => setValue("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit number" inputMode="tel" autoComplete="tel" />
                {fieldErrors.phone ? <small className="business-register-field-error">{fieldErrors.phone}</small> : null}
              </label>
            </div>

            <p className="business-register-note"><strong>15-day free access.</strong> After login, set your beds, rooms, and shops. When the trial ends, you can choose a plan.</p>
            {error ? <div className="business-register-alert error" role="alert">{error}</div> : null}
            {message ? <div className="business-register-alert success" role="status">{message}</div> : null}
            <button type="submit" className="business-register-submit" disabled={saving}>
              {saving ? "Creating..." : "Create trial account"}
            </button>
          </form>
          <p className="business-register-signin">Already have an account? <Link to="/login">Login here</Link></p>
        </div>
      </main>
    </div>
  );
}
