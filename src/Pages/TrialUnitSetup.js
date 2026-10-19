import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BedDouble, CircleCheck, DoorOpen, Layers3, LogOut, Store, Utensils } from "lucide-react";

import { clearAuthSession } from "../authStorage";
import { api } from "../api";
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

function UnitCard({ Icon, label, helper, tone, value, onChange }) {
  const inputId = `trial-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className={`trial-unit-card trial-tone-${tone}`}>
      <div className="trial-unit-heading">
        <div className="trial-unit-icon"><Icon size={25} /></div>
        <div className="trial-unit-copy">
          <label className="trial-unit-label" htmlFor={inputId}>{label}</label>
          <div className="trial-unit-helper">{helper}</div>
        </div>
      </div>
      <input
        id={inputId}
        className="trial-unit-input"
        type="number"
        min="0"
        max="99999"
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
  const [canteenSkipped, setCanteenSkipped] = useState(false);
  const [mealOption, setMealOption] = useState("meal_package");
  const [mealAmounts, setMealAmounts] = useState({ breakfast: "", lunch: "", dinner: "" });
  const [packageAmount, setPackageAmount] = useState("");
  const [packageBillingMethod, setPackageBillingMethod] = useState("fixed_monthly");
  const [includedMeals, setIncludedMeals] = useState(["breakfast", "lunch", "dinner"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const units = useMemo(() => ({
    beds: Number(form.beds || 0),
    rooms: Number(form.rooms || 0),
    shops: Number(form.shops || 0),
  }), [form.beds, form.rooms, form.shops]);
  const totalUnits = units.beds + units.rooms + units.shops;
  const packageName = includedMeals.length
    ? includedMeals.map((meal) => meal.charAt(0).toUpperCase() + meal.slice(1)).join(" + ")
    : "Custom meal package";

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
    if (canteenEnabled && units.beds > 0 && !canteenSkipped) {
      if (mealOption === "meal_package" && Number(packageAmount || 0) <= 0) {
        return setError("Enter the monthly amount for the meal package.");
      }
      if (mealOption === "per_meal" && !Object.values(mealAmounts).some((amount) => Number(amount || 0) > 0)) {
        return setError("Enter a price for at least one meal.");
      }
    }

    try {
      setSaving(true);
      setError("");
      if (canteenEnabled && units.beds > 0 && !canteenSkipped) {
        const prices = Object.fromEntries(Object.entries(mealAmounts).map(([meal, amount]) => [meal, Number(amount || 0)]));
        const { data } = await api.put("/canteen-attendance/settings", {
          activeModes: [mealOption],
          fullPackage: { monthlyAmount: 0, billingMethod: "fixed_monthly", includedMeals: [] },
          perMeal: mealOption === "per_meal" ? prices : { breakfast: 0, lunch: 0, dinner: 0 },
          mealPackage: {
            name: packageName,
            monthlyAmount: mealOption === "meal_package" ? Number(packageAmount || 0) : 0,
            billingMethod: mealOption === "meal_package" ? packageBillingMethod : "fixed_monthly",
            includedMeals,
          },
          guestMeal: { breakfast: 0, lunch: 0, dinner: 0 },
        });
        if (!data?.settings?.isConfigured) throw new Error("Meal service could not be saved. Check the meal prices and try again.");
      }
      await saveOnboardingUnits({
        units,
        canteenEnabled: canteenEnabled && units.beds > 0,
      });
      window.alert(canteenEnabled && !canteenSkipped
        ? "Units saved. Your trial workspace is ready with the selected meal option."
        : "Units saved. Your trial workspace is ready.");
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
      setError(message || err.message || "Unable to save units.");
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
          padding: clamp(20px, 3vw, 48px);
          background: #f3f7fc;
          color: #0f172a;
          font-family: Poppins, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .trial-setup-page * { box-sizing: border-box; }
        .trial-shell {
          width: 100%;
          margin: 0 auto;
        }
        .trial-header {
          min-height: 148px;
          padding: 28px 34px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 24px;
          border: 1px solid #dce6f2;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 10px 28px rgba(30, 58, 138, 0.06);
        }
        .trial-eyebrow {
          color: #1e3a8a;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .trial-title {
          margin: 8px 0 8px;
          color: #08295f;
          font-size: clamp(29px, 2.5vw, 38px);
          line-height: 1.15;
          font-weight: 900;
        }
        .trial-subtitle {
          margin: 0;
          color: #607086;
          font-size: 15px;
          font-weight: 500;
        }
        .trial-logout {
          min-height: 46px;
          padding: 0 18px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #d7e2ef;
          border-radius: 10px;
          background: #fff;
          color: #1e3a8a;
          font-weight: 800;
          cursor: pointer;
        }
        .trial-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 0 0 auto;
        }
        .trial-header-main {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          min-width: 0;
        }
        .trial-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 24px;
          align-items: start;
        }
        .trial-panel {
          border: 1px solid #dce6f2;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 10px 28px rgba(30, 58, 138, 0.06);
          overflow: hidden;
        }
        .trial-panel-body {
          padding: 30px;
        }
        .trial-section-title {
          margin: 0 0 8px;
          color: #08295f;
          font-size: 22px;
          font-weight: 800;
        }
        .trial-section-text {
          margin: 0 0 26px;
          color: #607086;
          font-size: 14px;
          line-height: 1.6;
          font-weight: 500;
        }
        .trial-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        .trial-unit-card {
          min-height: 92px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border: 1px solid #dce6f2;
          border-radius: 12px;
          background: #fbfdff;
        }
        .trial-unit-heading {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }
        .trial-unit-icon {
          width: 52px;
          height: 52px;
          flex: 0 0 52px;
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
          font-size: 16px;
          font-weight: 800;
        }
        .trial-unit-helper {
          margin-top: 5px;
          color: #607086;
          font-size: 13px;
          font-weight: 500;
          line-height: 1.45;
        }
        .trial-unit-input {
          width: 122px;
          flex: 0 0 122px;
          min-height: 48px;
          padding: 0 16px;
          border: 1px solid #d7e2ef;
          border-radius: 8px;
          background: #fff;
          color: #0f172a;
          font-size: 18px;
          font-weight: 800;
          outline: none;
        }
        .trial-unit-input::placeholder { color: #8190a4; opacity: 1; }
        .trial-unit-input:focus {
          border-color: #1e3a8a;
          box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.12);
        }
        .trial-canteen {
          margin-top: 18px;
          padding: 18px 20px;
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
          font-size: 16px;
          font-weight: 800;
        }
        .trial-canteen-text {
          margin-top: 3px;
          color: #607086;
          font-size: 13px;
          font-weight: 500;
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
        .trial-meal-options {
          margin-top: 16px;
          padding: 20px;
          border: 1px solid #dce6f2;
          border-radius: 12px;
          background: #f8fbff;
        }
        .trial-meal-title { margin: 0 0 5px; color: #08295f; font-size: 17px; font-weight: 800; }
        .trial-meal-description { margin: 0 0 16px; color: #607086; font-size: 13px; }
        .trial-meal-choices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .trial-meal-choice {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 14px; border: 1px solid #d7e2ef; border-radius: 10px;
          background: #fff; color: #08295f; cursor: pointer;
        }
        .trial-meal-choice.is-selected { border-color: #1e3a8a; background: #eef6ff; }
        .trial-meal-choice input { margin-top: 4px; accent-color: #1e3a8a; }
        .trial-meal-choice strong { display: block; font-size: 14px; }
        .trial-meal-choice small { display: block; margin-top: 4px; color: #607086; line-height: 1.4; }
        .trial-meal-fields { margin-top: 16px; }
        .trial-meal-fields label { display: block; color: #08295f; font-size: 13px; font-weight: 700; }
        .trial-meal-fields input {
          width: 100%; min-height: 44px; margin-top: 6px; padding: 0 12px;
          border: 1px solid #d7e2ef; border-radius: 8px; background: #fff; color: #0f172a;
        }
        .trial-meal-amounts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .trial-meal-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .trial-meal-chip {
          padding: 8px 12px; border: 1px solid #d7e2ef; border-radius: 8px;
          background: #fff; color: #607086; cursor: pointer;
        }
        .trial-meal-chip.is-selected { border-color: #1e3a8a; background: #e9f2ff; color: #1e3a8a; font-weight: 700; }
        .trial-meal-skip {
          min-height: 42px; margin-top: 16px; padding: 0 14px;
          border: 1px solid #1e3a8a; border-radius: 8px;
          background: #fff; color: #1e3a8a; font-weight: 700; cursor: pointer;
        }
        .trial-meal-skipped { margin: 0; color: #607086; font-size: 13px; }
        .trial-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .trial-summary-item {
          min-height: 86px;
          padding: 15px;
          border-radius: 12px;
          background: #eef6ff;
          border: 1px solid #dce6f2;
        }
        .trial-summary-item:first-child {
          grid-column: 1 / -1;
          background: #e8f2ff;
        }
        .trial-summary-label {
          color: #607086;
          font-size: 13px;
          font-weight: 800;
        }
        .trial-summary-value {
          margin-top: 4px;
          color: #08295f;
          font-size: 25px;
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
          margin-top: 20px;
        }
        .trial-primary {
          width: 100%;
          min-height: 50px;
          padding: 0 20px;
          border: 0;
          border-radius: 8px;
          background: #1e3a8a;
          color: #fff;
          font-size: 15px;
          font-weight: 800;
          box-shadow: 0 12px 24px rgba(30, 58, 138, 0.22);
          cursor: pointer;
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
            padding: 24px;
          }
          .trial-layout {
            grid-template-columns: 1fr;
          }
          .trial-header-actions { width: 100%; }
          .trial-header-actions .trial-logout { flex: 1; justify-content: center; }
          .trial-header-main { flex-direction: column; gap: 16px; }
        }
        @media (max-width: 520px) {
          .trial-panel-body { padding: 22px 18px; }
          .trial-title { font-size: 29px; }
          .trial-unit-card { align-items: stretch; flex-direction: column; gap: 14px; }
          .trial-unit-input { width: 100%; flex-basis: auto; }
          .trial-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .trial-meal-choices, .trial-meal-amounts { grid-template-columns: 1fr; }
        }

        .trial-setup-page { padding: 12px clamp(20px, 2.6vw, 48px) 36px; background: #edf7ff; color: #082663; }
        .trial-header { min-height: 116px; padding: 16px 26px; margin-bottom: 20px; border-color: #d5e8fd; border-radius: 13px; box-shadow: 0 9px 24px rgba(51, 110, 180, .08); }
        .trial-eyebrow { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #d7edff; color: #0754c5; line-height: 1; letter-spacing: 0; }
        .trial-title { margin: 5px 0 3px; font-size: clamp(27px, 2vw, 34px); }
        .trial-subtitle { color: #50658e; font-size: 14px; }
        .trial-logout { border-color: #b9d8ff; color: #09266e; }
        .trial-layout { grid-template-columns: minmax(0, 1fr) 296px; gap: 14px; }
        .trial-content-column { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
        .trial-panel { border-color: #d3e7fc; border-radius: 13px; box-shadow: 0 9px 24px rgba(51, 110, 180, .08); }
        .trial-panel-body { padding: 20px 25px; }
        .trial-main .trial-section-title, .trial-main .trial-section-text, .trial-meal-options .trial-meal-title, .trial-meal-options .trial-meal-description { text-align: center; }
        .trial-section-title, .trial-meal-title { color: #09266e; font-size: 23px; }
        .trial-section-text, .trial-meal-description { margin-bottom: 14px; color: #50658e; font-size: 14px; }
        .trial-grid { gap: 8px; }
        .trial-unit-card { min-height: 73px; padding: 10px 14px; border-radius: 11px; }
        .trial-tone-beds { border-color: #c5e4ff; background: #e3f3ff; }
        .trial-tone-rooms { border-color: #fce9a7; background: #fff6d7; }
        .trial-tone-shops { border-color: #ffd2dc; background: #ffebf0; }
        .trial-unit-icon, .trial-summary-icon { width: 52px; height: 52px; flex: 0 0 52px; display: flex; align-items: center; justify-content: center; border-radius: 12px; }
        .trial-tone-beds .trial-unit-icon, .trial-summary-item:nth-child(2) .trial-summary-icon { background: #cae9ff; color: #005bd0; }
        .trial-tone-rooms .trial-unit-icon, .trial-summary-item:nth-child(3) .trial-summary-icon { background: #ffe8a1; color: #b98100; }
        .trial-tone-shops .trial-unit-icon, .trial-summary-item:nth-child(4) .trial-summary-icon { background: #ffd2dc; color: #ae2255; }
        .trial-unit-label { color: #09266e; font-size: 16px; }
        .trial-unit-helper { color: #50658e; font-size: 13px; }
        .trial-unit-input { width: 124px; flex-basis: 124px; min-height: 50px; border-color: #bddcff; color: #09266e; }
        .trial-canteen { min-height: 74px; margin-top: 8px; padding: 10px 14px; border-color: #388aff; background: #dffaff; border-radius: 11px; cursor: pointer; }
        .trial-canteen:hover { background: #d1f4fa; }
        .trial-canteen-icon { width: 52px; height: 52px; border-radius: 12px; background: #bdf2f5; color: #08758b; }
        .trial-canteen-title { color: #09266e; }
        .trial-canteen-text { color: #50658e; }
        .trial-toggle { width: 78px; height: 36px; padding: 4px; border-radius: 18px; }
        .trial-toggle-dot { width: 28px; height: 28px; }
        .trial-toggle.is-active { background: #0758d4; }
        .trial-toggle.is-active .trial-toggle-dot { transform: translateX(42px); }
        .trial-meal-options { margin: 0; padding: 0; background: #fff; }
        .trial-meal-options .trial-panel-body { padding-top: 12px; padding-bottom: 12px; }
        .trial-meal-title { margin-bottom: 2px; }
        .trial-meal-choice { min-height: 82px; justify-content: center; align-items: center; border-color: #c9e2ff; background: #eff7ff; }
        .trial-meal-choice.is-selected { border-color: #beaaff; background: #f1ecff; }
        .trial-meal-choice input { width: 22px; height: 22px; margin: 0; }
        .trial-meal-choice strong { color: #09266e; font-size: 15px; }
        .trial-meal-choice small { color: #50658e; font-size: 13px; }
        .trial-meal-fields input { border-color: #bddcff; }
        .trial-meal-chips { justify-content: center; }
        .trial-meal-chip { min-width: 115px; background: #e5f2ff; border-color: #d1e7ff; color: #0754c5; }
        .trial-meal-chip.is-selected { background: #cfe6ff; color: #0754c5; }
        .trial-meal-skip { display: block; min-height: 34px; margin: 10px auto 0; border-color: #5595ff; color: #0754c5; }
        .trial-side .trial-panel-body { padding: 17px 18px; }
        .trial-side .trial-section-text { margin-bottom: 18px; }
        .trial-summary { gap: 9px; }
        .trial-summary-item { min-height: 92px; display: flex; align-items: center; gap: 12px; padding: 12px; border: 0; background: #e4f3ff; }
        .trial-summary-item:first-child { background: #e4f3ff; }
        .trial-summary-item:nth-child(3) { background: #fff6dc; }
        .trial-summary-item:nth-child(4) { background: #ffebf0; }
        .trial-summary-item:first-child .trial-summary-icon { background: #cae9ff; color: #005bd0; }
        .trial-summary-item:nth-child(2) { grid-column: 1 / 2; }
        .trial-summary-item:nth-child(4) { grid-column: 1 / 2; }
        .trial-summary-label { color: #09266e; font-size: 13px; }
        .trial-summary-value { margin-top: 3px; color: #09266e; font-size: 25px; }
        .trial-primary { display: flex; align-items: center; justify-content: center; gap: 9px; background: #1746b3; }
        @media (max-width: 860px) {
          .trial-setup-page { padding: 16px 12px 32px; }
          .trial-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 520px) {
          .trial-panel-body { padding: 18px 15px; }
          .trial-unit-input { width: 100%; flex-basis: auto; }
          .trial-summary-item:nth-child(4) { grid-column: auto; }
          .trial-meal-choice { justify-content: flex-start; }
        }
        .trial-content-column { display: block; }
        .trial-main .trial-panel-body { padding: 16px 24px 18px; }
        .trial-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .trial-grid.has-canteen { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .trial-unit-card, .trial-canteen {
          min-height: 156px; margin: 0; padding: 14px;
          display: flex; flex-direction: column; align-items: stretch;
          justify-content: space-between; gap: 12px; border: 0; border-radius: 12px;
        }
        .trial-unit-heading { align-items: flex-start; gap: 12px; }
        .trial-unit-icon, .trial-canteen-icon { width: 56px; height: 56px; flex: 0 0 56px; }
        .trial-unit-copy { padding-top: 6px; }
        .trial-unit-helper, .trial-canteen-text { line-height: 1.4; }
        .trial-unit-input { align-self: center; width: min(165px, 100%); min-height: 49px; flex: 0 0 49px; margin: 0; }
        .trial-canteen { background: #dff7ff; }
        .trial-canteen-top { display: flex; align-items: flex-start; gap: 12px; text-align: left; }
        .trial-canteen-copy { padding-top: 6px; }
        .trial-canteen .trial-toggle { align-self: flex-end; }
        .trial-meal-options {
          margin: 22px 0 0; padding: 16px 0 0;
          border: 0; border-top: 1px solid #d6e9fc;
          border-radius: 0; background: transparent;
        }
        .trial-meal-title, .trial-meal-description { text-align: center; }
        .trial-meal-title { font-size: 23px; }
        .trial-meal-choices { margin-top: 10px; }
        .trial-meal-choice { min-height: 94px; }
        .trial-meal-fields { margin-top: 12px; }
        .trial-meal-fields input { min-height: 43px; }
        @media (max-width: 1250px) {
          .trial-grid.has-canteen { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 700px) {
          .trial-grid, .trial-grid.has-canteen { grid-template-columns: 1fr; }
          .trial-unit-card, .trial-canteen { min-height: 128px; }
          .trial-meal-choices { grid-template-columns: 1fr; }
        }
        .trial-main .trial-panel-body { padding: 14px 20px 18px; }
        .trial-summary {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin: 12px 0;
        }
        .trial-summary-item,
        .trial-summary-item:first-child,
        .trial-summary-item:nth-child(2),
        .trial-summary-item:nth-child(4) {
          grid-column: auto;
        }
        .trial-summary-item { min-height: 78px; }
        .trial-summary-item .trial-summary-icon { flex: 0 0 52px; }
        .trial-meal-options { margin-top: 16px; padding-top: 8px; }
        .trial-meal-choice { min-height: 72px; }
        .trial-footer { display: flex; justify-content: flex-end; margin-top: 12px; }
        .trial-primary { width: min(210px, 100%); min-height: 46px; }
        @media (max-width: 1000px) {
          .trial-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 520px) {
          .trial-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .trial-summary-item { gap: 8px; padding: 10px; }
          .trial-summary-item .trial-summary-icon { width: 42px; height: 42px; flex-basis: 42px; }
          .trial-footer .trial-primary { width: 100%; }
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
          <div className="trial-header-main">
            <div>
              <div className="trial-eyebrow">Trial setup</div>
              <h1 className="trial-title">Set property units</h1>
              <p className="trial-subtitle">
                {organization.name || "Your account"} has free access until {formatDate(subscription.endDate)}.
              </p>
            </div>
          </div>
          <div className="trial-header-actions">
            <button className="trial-logout" type="button" onClick={logout}>
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </div>

        <div className="trial-panel trial-main">
          <div className="trial-panel-body">
            <h2 className="trial-section-title">Unit allocation</h2>
            <p className="trial-section-text">Enter the total capacity you want to start with. These units will be reserved first and can be named later from Units.</p>
            <div className="trial-summary" aria-label="Unit allocation summary">
              <div className="trial-summary-item">
                <div className="trial-summary-icon"><Layers3 size={24} /></div>
                <div><div className="trial-summary-label">Total units</div><div className="trial-summary-value">{totalUnits.toLocaleString("en-IN")}</div></div>
              </div>
              <div className="trial-summary-item">
                <div className="trial-summary-icon"><BedDouble size={23} /></div>
                <div><div className="trial-summary-label">Beds</div><div className="trial-summary-value">{units.beds.toLocaleString("en-IN")}</div></div>
              </div>
              <div className="trial-summary-item">
                <div className="trial-summary-icon"><DoorOpen size={23} /></div>
                <div><div className="trial-summary-label">Rooms</div><div className="trial-summary-value">{units.rooms.toLocaleString("en-IN")}</div></div>
              </div>
              <div className="trial-summary-item">
                <div className="trial-summary-icon"><Store size={23} /></div>
                <div><div className="trial-summary-label">Shops</div><div className="trial-summary-value">{units.shops.toLocaleString("en-IN")}</div></div>
              </div>
            </div>
            <div className={`trial-grid ${units.beds > 0 ? "has-canteen" : ""}`}>
              <UnitCard
                Icon={BedDouble}
                tone="beds"
                label="Hostel beds"
                helper="Beds for PG or hostel tenants."
                value={form.beds}
                onChange={(value) => setForm((current) => ({ ...current, beds: value }))}
              />
              <UnitCard
                Icon={DoorOpen}
                tone="rooms"
                label="Residential rooms"
                helper="Rooms or flats rented as full units."
                value={form.rooms}
                onChange={(value) => setForm((current) => ({ ...current, rooms: value }))}
              />
              <UnitCard
                Icon={Store}
                tone="shops"
                label="Commercial shops"
                helper="Shop or commercial rental units."
                value={form.shops}
                onChange={(value) => setForm((current) => ({ ...current, shops: value }))}
              />
            {units.beds > 0 ? (
              <button
                className="trial-canteen"
                type="button"
                onClick={() => { setCanteenEnabled((value) => !value); setCanteenSkipped(false); }}
                aria-pressed={canteenEnabled}
              >
                <span className="trial-canteen-top">
                  <span className="trial-canteen-icon"><Utensils size={23} /></span>
                  <span className="trial-canteen-copy">
                    <span className="trial-canteen-title">Canteen available</span>
                    <span className="trial-canteen-text d-block">Enable only if hostel meals are managed in this property.</span>
                  </span>
                </span>
                <span className={`trial-toggle ${canteenEnabled ? "is-active" : ""}`}>
                  <span className="trial-toggle-dot" />
                </span>
              </button>
            ) : null}
            </div>

            {canteenEnabled && units.beds > 0 ? (
              <section className="trial-meal-options">
                <h3 className="trial-meal-title">Meal service options</h3>
                <p className="trial-meal-description">Choose how meals will be managed, or add these details later.</p>
                {canteenSkipped ? (
                  <>
                    <p className="trial-meal-skipped">Meal details skipped. You can add them later from the canteen area.</p>
                    <button className="trial-meal-skip" type="button" onClick={() => setCanteenSkipped(false)}>Choose meal options</button>
                  </>
                ) : (
                  <>
                    <div className="trial-meal-choices">
                      {[
                        ["per_meal", "Per-meal pricing", "Charge separately for breakfast, lunch and dinner"],
                        ["meal_package", "Meal package", "Create a monthly package for selected meals"],
                      ].map(([value, title, description]) => (
                        <label className={`trial-meal-choice ${mealOption === value ? "is-selected" : ""}`} key={value}>
                          <input type="radio" name="trial-meal-option" value={value} checked={mealOption === value} onChange={() => setMealOption(value)} />
                          <span><strong>{title}</strong><small>{description}</small></span>
                        </label>
                      ))}
                    </div>
                    {mealOption === "per_meal" ? (
                      <div className="trial-meal-fields trial-meal-amounts">
                        {[["breakfast", "Breakfast"], ["lunch", "Lunch"], ["dinner", "Dinner"]].map(([key, label]) => (
                          <label key={key}>{label}
                            <input inputMode="decimal" value={mealAmounts[key]} onChange={(event) => setMealAmounts((current) => ({ ...current, [key]: event.target.value.replace(/[^0-9.]/g, "") }))} placeholder="₹ amount" />
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="trial-meal-fields">
                        <label>Monthly package amount
                          <input inputMode="decimal" value={packageAmount} onChange={(event) => setPackageAmount(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="₹ monthly amount" />
                        </label>
                        <label>Billing method
                          <select value={packageBillingMethod} onChange={(event) => setPackageBillingMethod(event.target.value)}>
                            <option value="fixed_monthly">Fixed monthly</option>
                            <option value="attendance_day">Attendance day wise</option>
                          </select>
                        </label>
                        <div className="trial-meal-fields"><label>Included meals</label>
                          <div className="trial-meal-chips">
                            {[["breakfast", "Breakfast"], ["lunch", "Lunch"], ["dinner", "Dinner"]].map(([key, label]) => (
                              <button className={`trial-meal-chip ${includedMeals.includes(key) ? "is-selected" : ""}`} type="button" aria-pressed={includedMeals.includes(key)} key={key} onClick={() => setIncludedMeals((current) => current.includes(key) ? current.filter((meal) => meal !== key) : [...current, key])}>{label}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <button className="trial-meal-skip" type="button" onClick={() => setCanteenSkipped(true)}>Skip for now — add later</button>
                  </>
                )}
              </section>
            ) : null}

            {error ? <div className="trial-error" role="alert">{error}</div> : null}
            <div className="trial-footer">
              <button className="trial-primary" type="button" onClick={saveUnits} disabled={saving}>
                <CircleCheck size={20} /> {saving ? "Saving..." : "Finish setup"}
              </button>
            </div>
          </div>
        </div>
        </>
        ) : null}
      </div>
    </div>
  );
}
