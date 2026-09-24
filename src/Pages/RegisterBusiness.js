import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { registerBusiness } from "../saasApi";

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

  const setValue = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function submit(event) {
    event.preventDefault();

    const loginId = cleanLoginId(form.loginId);
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.replace(/\D/g, "");

    if (!form.businessName.trim() || !form.ownerName.trim()) {
      return setError("Business name and owner name are required.");
    }
    if (!loginId) return setError("Create a login ID.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError("Enter a valid email address or leave email blank.");
    }
    if (phone && phone.length !== 10) return setError("Enter a valid 10-digit phone number.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");

    try {
      setSaving(true);
      setError("");
      setMessage("");
      await registerBusiness({
        businessName: form.businessName.trim(),
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
    <div className="min-vh-100 bg-light py-5">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="mb-4">
          <Link to="/login" className="text-decoration-none">&larr; Back to login</Link>
          <h1 className="fw-bold mt-3 mb-1">Create trial account</h1>
          <p className="text-muted mb-0">Register now. Purchase a plan after 15 days.</p>
        </div>

        <form onSubmit={submit} className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-3">Business details</h5>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Business name</label>
                <input className="form-control" value={form.businessName} onChange={(e) => setValue("businessName", e.target.value)} placeholder="Example: Demo Hostel" />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Owner name</label>
                <input className="form-control" value={form.ownerName} onChange={(e) => setValue("ownerName", e.target.value)} placeholder="Owner full name" />
              </div>
            </div>

            <h5 className="fw-bold mt-4 mb-3">Login details</h5>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Login ID</label>
                <input className="form-control" value={form.loginId} onChange={(e) => setValue("loginId", cleanLoginId(e.target.value))} placeholder="example_owner" />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Password</label>
                <input type="password" className="form-control" value={form.password} onChange={(e) => setValue("password", e.target.value)} placeholder="Minimum 8 characters" />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Email optional</label>
                <input type="email" className="form-control" value={form.email} onChange={(e) => setValue("email", e.target.value)} placeholder="owner@example.com" />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Phone optional</label>
                <input className="form-control" value={form.phone} onChange={(e) => setValue("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit number" />
              </div>
            </div>

            <div className="alert alert-primary mt-4 mb-0">
              <strong>15-day free access.</strong> After login, set beds, rooms, and shops once. After the trial ends, the system will ask for plan purchase.
            </div>

            {error ? <div className="alert alert-danger mt-3 mb-0">{error}</div> : null}
            {message ? <div className="alert alert-success mt-3 mb-0">{message}</div> : null}
          </div>
          <div className="card-footer bg-white border-0 p-4 pt-0">
            <button type="submit" className="btn btn-primary w-100 py-2 fw-bold" disabled={saving}>
              {saving ? "Creating..." : "Create trial account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
