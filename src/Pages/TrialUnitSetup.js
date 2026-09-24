import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BedDouble, DoorOpen, LogOut, Store, Utensils } from "lucide-react";

import { clearAuthSession } from "../authStorage";
import { getAppBootstrap, saveOnboardingUnits } from "../saasApi";
import { getPostLoginPath } from "../utils/saasNavigation";

function countText(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 5);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function UnitCard({ Icon, label, helper, value, onChange }) {
  return (
    <div className="trial-unit-card">
      <div className="trial-unit-icon">
        <Icon size={24} />
      </div>
      <div className="trial-unit-copy">
        <label className="trial-unit-label">{label}</label>
        <div className="trial-unit-helper">{helper}</div>
      </div>
      <input
        className="trial-unit-input"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(countText(event.target.value))}
        placeholder="0"
      />
    </div>
  );
}

export default function TrialUnitSetup() {
  const navigate = useNavigate();
  const [bootstrap, setBootstrap] = useState(null);
  const [form, setForm] = useState({ beds: "", rooms: "", shops: "" });
  const [canteenEnabled, setCanteenEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const units = useMemo(() => ({
    beds: Number(form.beds || 0),
    rooms: Number(form.rooms || 0),
    shops: Number(form.shops || 0),
  }), [form.beds, form.rooms, form.shops]);
  const totalUnits = units.beds + units.rooms + units.shops;

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setError("");
        const data = await getAppBootstrap();
        if (!mounted) return;
        if (data.user?.role === "superadmin" || data.user?.role === "superAdmin") {
          navigate("/superadmin", { replace: true });
          return;
        }
        if (data.access?.needsUnitSetup) {
          setBootstrap(data);
          return;
        }
        if (data.access?.expired || data.access?.needsPayment || !data.access?.canUseSystem) {
          navigate("/subscription-expired", { replace: true });
          return;
        }
        if (!data.access?.needsUnitSetup) {
          navigate(getPostLoginPath(data), { replace: true });
          return;
        }
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load trial setup.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function logout() {
    clearAuthSession();
    navigate("/login", { replace: true });
  }

  async function saveUnits() {
    if (!totalUnits) return setError("Enter at least one bed, room, or shop.");

    try {
      setSaving(true);
      setError("");
      await saveOnboardingUnits({
        units,
        canteenEnabled: canteenEnabled && units.beds > 0,
      });
      window.alert("Units saved. Your trial workspace is ready.");
      navigate("/admin", { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || "";
      if (status === 402) {
        navigate("/subscription-expired", { replace: true });
        return;
      }
      if (/already configured/i.test(message)) {
        navigate("/admin", { replace: true });
        return;
      }
      setError(message || "Unable to save units.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  const organization = bootstrap?.organization || {};
  const subscription = bootstrap?.subscription || {};

  return (
    <div className="trial-setup-page">
      <style>{`
        .trial-setup-page {
          min-height: 100vh;
          padding: 28px;
          background: #eaf1f8;
          color: #0f172a;
          font-family: Poppins, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .trial-shell {
          width: min(1180px, 100%);
          margin: 0 auto;
        }
        .trial-header {
          min-height: 86px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 8px 24px rgba(30, 58, 138, 0.08);
        }
        .trial-eyebrow {
          color: #1e3a8a;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .trial-title {
          margin: 5px 0 4px;
          color: #08295f;
          font-size: 28px;
          line-height: 1.15;
          font-weight: 900;
        }
        .trial-subtitle {
          margin: 0;
          color: #607086;
          font-size: 14px;
          font-weight: 600;
        }
        .trial-logout {
          min-height: 40px;
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #d7e2ef;
          border-radius: 8px;
          background: #fff;
          color: #1e3a8a;
          font-weight: 800;
          box-shadow: 0 5px 16px rgba(15, 23, 42, 0.06);
        }
        .trial-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 330px;
          gap: 18px;
          align-items: start;
        }
        .trial-panel {
          border: 0;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 12px 30px rgba(30, 58, 138, 0.09);
          overflow: hidden;
        }
        .trial-panel-body {
          padding: 20px;
        }
        .trial-section-title {
          margin: 0 0 14px;
          color: #08295f;
          font-size: 17px;
          font-weight: 900;
        }
        .trial-section-text {
          margin: -7px 0 16px;
          color: #607086;
          font-size: 13px;
          font-weight: 600;
        }
        .trial-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        .trial-unit-card {
          min-height: 132px;
          padding: 16px;
          display: grid;
          grid-template-columns: 46px minmax(0, 1fr);
          gap: 12px;
          border: 1px solid #dce6f2;
          border-radius: 12px;
          background: #fbfdff;
        }
        .trial-unit-icon {
          width: 46px;
          height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #e9f2ff;
          color: #1e3a8a;
        }
        .trial-unit-copy {
          min-width: 0;
        }
        .trial-unit-label {
          display: block;
          margin: 0;
          color: #08295f;
          font-size: 15px;
          font-weight: 900;
        }
        .trial-unit-helper {
          margin-top: 3px;
          color: #607086;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.35;
        }
        .trial-unit-input {
          grid-column: 1 / -1;
          width: 100%;
          min-height: 42px;
          padding: 0 12px;
          border: 1px solid #d7e2ef;
          border-radius: 8px;
          background: #fff;
          color: #0f172a;
          font-size: 16px;
          font-weight: 800;
          outline: none;
        }
        .trial-unit-input:focus {
          border-color: #1e3a8a;
          box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.12);
        }
        .trial-canteen {
          margin-top: 16px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid #dce6f2;
          border-radius: 12px;
          background: #f8fbff;
          text-align: left;
          width: 100%;
        }
        .trial-canteen-icon {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #1e3a8a;
        }
        .trial-canteen-copy {
          flex: 1;
          min-width: 0;
        }
        .trial-canteen-title {
          color: #08295f;
          font-size: 14px;
          font-weight: 900;
        }
        .trial-canteen-text {
          margin-top: 3px;
          color: #607086;
          font-size: 12px;
          font-weight: 700;
        }
        .trial-toggle {
          width: 48px;
          height: 28px;
          padding: 3px;
          border-radius: 14px;
          background: #d7e2ef;
          flex: 0 0 auto;
        }
        .trial-toggle-dot {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          transition: transform 0.16s ease;
        }
        .trial-toggle.is-active {
          background: #1e3a8a;
        }
        .trial-toggle.is-active .trial-toggle-dot {
          transform: translateX(20px);
        }
        .trial-summary {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .trial-summary-item {
          min-height: 72px;
          padding: 13px;
          border-radius: 12px;
          background: #eef6ff;
          border: 1px solid #dce6f2;
        }
        .trial-summary-label {
          color: #607086;
          font-size: 12px;
          font-weight: 800;
        }
        .trial-summary-value {
          margin-top: 4px;
          color: #0f172a;
          font-size: 20px;
          font-weight: 900;
        }
        .trial-error {
          margin-top: 14px;
          padding: 12px;
          border-radius: 10px;
          background: #fee2e2;
          color: #991b1b;
          font-weight: 800;
        }
        .trial-footer {
          margin-top: 16px;
        }
        .trial-primary {
          width: 100%;
          min-height: 44px;
          padding: 0 20px;
          border: 0;
          border-radius: 8px;
          background: #1e3a8a;
          color: #fff;
          font-size: 14px;
          font-weight: 900;
          box-shadow: 0 12px 24px rgba(30, 58, 138, 0.22);
        }
        .trial-primary:hover:not(:disabled) {
          background: #172f70;
          color: #fff;
        }
        .trial-primary:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        @media (max-width: 860px) {
          .trial-setup-page {
            padding: 18px 12px;
          }
          .trial-header {
            flex-direction: column;
            align-items: stretch;
          }
          .trial-grid,
          .trial-summary,
          .trial-layout {
            grid-template-columns: 1fr;
          }
          .trial-logout {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="trial-shell">
        {!bootstrap && error ? (
          <div className="trial-panel">
            <div className="trial-panel-body">
              <div className="trial-error" style={{ marginTop: 0 }}>{error}</div>
              <button className="trial-primary mt-3" type="button" onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          </div>
        ) : null}

        {bootstrap ? (
        <>
        <div className="trial-header">
          <div>
            <div className="trial-eyebrow">Trial setup</div>
            <h1 className="trial-title">Set property units</h1>
            <p className="trial-subtitle">
              {organization.name || "Your account"} has free access until {formatDate(subscription.endDate)}.
            </p>
          </div>
          <button className="trial-logout" type="button" onClick={logout}>
            <LogOut size={17} />
            Logout
          </button>
        </div>

        <div className="trial-layout">
        <div className="trial-panel trial-main">
          <div className="trial-panel-body">
            <h2 className="trial-section-title">Unit allocation</h2>
            <p className="trial-section-text">Enter the total capacity you want to start with. These units will be reserved first and can be named later from Units.</p>
            <div className="trial-grid">
              <UnitCard
                Icon={BedDouble}
                label="Hostel beds"
                helper="Beds for PG or hostel tenants."
                value={form.beds}
                onChange={(value) => setForm((current) => ({ ...current, beds: value }))}
              />
              <UnitCard
                Icon={DoorOpen}
                label="Residential rooms"
                helper="Rooms or flats rented as full units."
                value={form.rooms}
                onChange={(value) => setForm((current) => ({ ...current, rooms: value }))}
              />
              <UnitCard
                Icon={Store}
                label="Commercial shops"
                helper="Shop or commercial rental units."
                value={form.shops}
                onChange={(value) => setForm((current) => ({ ...current, shops: value }))}
              />
            </div>

            {units.beds > 0 ? (
              <button
                className="trial-canteen"
                type="button"
                onClick={() => setCanteenEnabled((value) => !value)}
              >
                <span className="trial-canteen-icon"><Utensils size={23} /></span>
                <span className="trial-canteen-copy">
                  <span className="trial-canteen-title">Canteen available</span>
                  <span className="trial-canteen-text d-block">Enable only if hostel meals are managed in this property.</span>
                </span>
                <span className={`trial-toggle ${canteenEnabled ? "is-active" : ""}`}>
                  <span className="trial-toggle-dot" />
                </span>
              </button>
            ) : null}

            {error ? <div className="trial-error">{error}</div> : null}
          </div>
        </div>

        <aside className="trial-panel trial-side">
          <div className="trial-panel-body">
            <h2 className="trial-section-title">Setup summary</h2>
            <p className="trial-section-text">This trial account remains active until {formatDate(subscription.endDate)}.</p>
            <div className="trial-summary">
              <div className="trial-summary-item">
                <div className="trial-summary-label">Total units</div>
                <div className="trial-summary-value">{totalUnits.toLocaleString("en-IN")}</div>
              </div>
              <div className="trial-summary-item">
                <div className="trial-summary-label">Beds</div>
                <div className="trial-summary-value">{units.beds.toLocaleString("en-IN")}</div>
              </div>
              <div className="trial-summary-item">
                <div className="trial-summary-label">Rooms</div>
                <div className="trial-summary-value">{units.rooms.toLocaleString("en-IN")}</div>
              </div>
              <div className="trial-summary-item">
                <div className="trial-summary-label">Shops</div>
                <div className="trial-summary-value">{units.shops.toLocaleString("en-IN")}</div>
              </div>
            </div>
            <div className="trial-footer">
            <button className="trial-primary" type="button" onClick={saveUnits} disabled={saving}>
              {saving ? "Saving..." : "Start using system"}
            </button>
            </div>
          </div>
        </aside>
        </div>
        </>
        ) : null}
      </div>
    </div>
  );
}
