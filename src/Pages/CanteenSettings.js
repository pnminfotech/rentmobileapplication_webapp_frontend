import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiCoffee, FiGift, FiGrid, FiUser } from "react-icons/fi";
import { canteenApi, meals, needsCanteenAttendance } from "./canteenShared";
import "./canteen.css";

const initial = {
  activeModes: [],
  fullPackage: { monthlyAmount: "", billingMethod: "attendance_day", includedMeals: [...meals] },
  perMeal: { breakfast: "", lunch: "", dinner: "" },
  mealPackage: { name: "Lunch + Dinner", monthlyAmount: "", billingMethod: "attendance_day", includedMeals: ["lunch", "dinner"] },
  guestMeal: { breakfast: "", lunch: "", dinner: "" },
};
const planLabels = { per_meal: "Per meal pricing", meal_package: "Meal package monthly" };
const primaryMode = (settings) => (settings?.activeModes || []).find((mode) => planLabels[mode]) || "";

export default function CanteenSettings() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedSettings, setSavedSettings] = useState(null);

  useEffect(() => {
    let active = true;
    canteenApi.settings().then((settings) => {
      if (active) {
        if (!settings.enabled) {
          navigate("/profile", { replace: true });
          return;
        }
        setSavedSettings(settings);
        setForm({
        activeModes: settings.activeModes || [],
        fullPackage: { ...initial.fullPackage, ...settings.fullPackage },
        perMeal: { ...initial.perMeal, ...settings.perMeal },
        mealPackage: { ...initial.mealPackage, ...settings.mealPackage },
        guestMeal: { ...initial.guestMeal, ...settings.guestMeal },
        });
      }
    }).catch((err) => {
      if (!active) return;
      if (err.response?.status === 403) navigate("/profile", { replace: true });
      else setError(err.response?.data?.message || "Unable to load canteen settings.");
    })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [navigate]);

  const primary = form.activeModes.find((mode) => ["per_meal", "meal_package"].includes(mode));
  const update = (section, key, value) => setForm((previous) => ({ ...previous, [section]: { ...previous[section], [key]: value } }));
  const selectPrimary = (mode) => { setError(""); setForm((previous) => ({ ...previous, activeModes: [mode, ...(previous.activeModes.includes("guest_meal") ? ["guest_meal"] : [])] })); };
  const toggleMeal = (section, meal) => update(section, "includedMeals", form[section].includedMeals.includes(meal) ? form[section].includedMeals.filter((item) => item !== meal) : [...form[section].includedMeals, meal]);
  const money = (section, key, label) => <label className="canteen-field" key={key}><span className="canteen-field-label">{label}</span><span className="canteen-money"><span>₹</span><input type="number" min="0" step="0.01" value={form[section][key]} onChange={(event) => update(section, key, event.target.value)} placeholder="0" /></span></label>;
  const packageFields = (section) => <>
    {section === "mealPackage" && <label className="canteen-field"><span className="canteen-field-label">Package name</span><input value={form.mealPackage.name} onChange={(event) => update("mealPackage", "name", event.target.value)} /></label>}
    {money(section, "monthlyAmount", "Monthly amount")}
    <div className="canteen-field"><span className="canteen-field-label">Billing method</span><div className="canteen-choices">{[["attendance_day", "Attendance day wise"], ["fixed_monthly", "Fixed monthly"]].map(([value, label]) => <button type="button" key={value} className={form[section].billingMethod === value ? "selected" : ""} onClick={() => update(section, "billingMethod", value)}><FiCalendar /> {label}</button>)}</div></div>
    <div className="canteen-field"><span className="canteen-field-label">Included meals</span><div className="canteen-choices">{meals.map((meal) => <button type="button" key={meal} className={form[section].includedMeals.includes(meal) ? "selected" : ""} onClick={() => toggleMeal(section, meal)}><FiCheckCircle /> {meal[0].toUpperCase() + meal.slice(1)}</button>)}</div></div>
  </>;

  async function save(event) {
    event.preventDefault();
    if (!primary) return setError("Choose a meal billing option.");
    if (primary === "per_meal" && !meals.some((meal) => Number(form.perMeal[meal]) > 0)) return setError("Enter a price for at least one meal.");
    if (primary === "meal_package" && Number(form.mealPackage.monthlyAmount) <= 0) return setError("Enter a monthly amount for the meal package.");
    if (primary === "meal_package" && !form.mealPackage.includedMeals.length) return setError("Select at least one included meal.");
    if (form.activeModes.includes("guest_meal") && !meals.some((meal) => Number(form.guestMeal[meal]) > 0)) return setError("Enter a price for at least one guest meal, or turn off extra meal charges.");
    const previousPrimary = primaryMode(savedSettings);
    const previousBilling = previousPrimary === "meal_package" ? savedSettings?.mealPackage?.billingMethod : "";
    const nextBilling = primary === "meal_package" ? form.mealPackage.billingMethod : "";
    if (savedSettings?.isConfigured && (previousPrimary !== primary || (previousBilling && nextBilling && previousBilling !== nextBilling))) {
      const change = previousPrimary !== primary
        ? `${planLabels[previousPrimary] || "Current plan"} → ${planLabels[primary]}`
        : `${previousBilling === "fixed_monthly" ? "Fixed monthly" : "Attendance day wise"} → ${nextBilling === "fixed_monthly" ? "Fixed monthly" : "Attendance day wise"}`;
      if (!window.confirm(`Change canteen billing from ${change}?\n\nPreviously saved attendance stays in the record. Tenants with an individual billing plan keep that plan until you edit their tenant details. This change can affect current and future canteen amounts. Review tenant plans and dues after saving.`)) return;
    }
    setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        fullPackage: { ...form.fullPackage, monthlyAmount: Number(form.fullPackage.monthlyAmount || 0) },
        perMeal: Object.fromEntries(meals.map((meal) => [meal, Number(form.perMeal[meal] || 0)])),
        mealPackage: { ...form.mealPackage, monthlyAmount: Number(form.mealPackage.monthlyAmount || 0) },
        guestMeal: Object.fromEntries(meals.map((meal) => [meal, Number(form.guestMeal[meal] || 0)])),
      };
      const response = await canteenApi.saveSettings(payload);
      window.dispatchEvent(new Event("canteen-settings-changed"));
      window.alert("Canteen settings updated successfully.");
      navigate(needsCanteenAttendance(response.settings) ? "/canteen-attendance" : "/admin");
    } catch (err) { setError([err.response?.data?.message, err.response?.data?.error].filter(Boolean).join(" ") || "Unable to save canteen settings. Please try again."); }
    finally { setSaving(false); }
  }

  return <main className="canteen-page canteen-settings-page">
    <div className="canteen-header"><button type="button" className="canteen-back" onClick={() => navigate("/admin")}><FiArrowLeft /> Back</button><div><span className="canteen-eyebrow">CANTEEN MANAGEMENT</span><h1><span className="canteen-settings-title-icon"><FiGrid /></span>Meal service setup</h1><p>Choose meal plans, billing and charges.</p></div><span className="canteen-header-spacer" /></div>
    {loading ? <p>Loading canteen settings…</p> : <form onSubmit={save} className="canteen-settings-form">
      <section className="canteen-settings-card canteen-plan-card">
        <div className="canteen-settings-heading"><h2>Meal billing options</h2><p>Select one main billing method.</p></div>
        <div className="canteen-mode-grid">{[
          ["per_meal", "Per meal pricing", "Bill depends on marked attendance", <FiCoffee />],
          ["meal_package", "Meal package monthly", "Selected meals as a monthly package", <FiCalendar />],
        ].map(([value, title, description, icon]) => <button type="button" key={value} className={`canteen-mode ${primary === value ? "selected" : ""}`} onClick={() => selectPrimary(value)} aria-pressed={primary === value}><span className="canteen-mode-icon">{icon}</span><span className="canteen-mode-copy"><strong>{title}</strong><small>{description}</small></span><span className="canteen-mode-radio" aria-hidden="true" /></button>)}</div>
        {savedSettings?.isConfigured && primaryMode(savedSettings) !== primary && <p className="canteen-change-note" role="status">Billing type changed from {planLabels[primaryMode(savedSettings)]} to {planLabels[primary]}. Save to apply it. Existing tenants with an individual plan keep their assigned plan.</p>}
      </section>
      {primary && <section className="canteen-settings-card canteen-details-card">
        <div className="canteen-settings-heading canteen-settings-heading-icon"><span className="canteen-section-icon">{primary === "per_meal" ? <FiCoffee /> : <FiGift />}</span><div><h2>{primary === "per_meal" ? "Meal prices" : "Meal package"}</h2><p>{primary === "per_meal" ? "Set the price of each meal marked in attendance." : "Configure the package details, billing method and included meals for this plan."}</p></div></div>
        {primary === "per_meal" ? <div className="canteen-price-grid">{meals.map((meal) => money("perMeal", meal, `${meal[0].toUpperCase()}${meal.slice(1)} charge`))}</div> : <div className="canteen-package-fields">{packageFields("mealPackage")}</div>}
      </section>}
      <section className="canteen-settings-card canteen-guest-card">
        <div className="canteen-settings-heading canteen-settings-heading-icon"><span className="canteen-section-icon"><FiUser /></span><div><h2>Guest / extra meal charges</h2><p>Set optional charges for extra meals taken by guests or tenants outside the package.</p></div><label className="canteen-guest-toggle"><input type="checkbox" checked={form.activeModes.includes("guest_meal")} onChange={(event) => setForm((previous) => ({ ...previous, activeModes: event.target.checked ? [...previous.activeModes, "guest_meal"] : previous.activeModes.filter((mode) => mode !== "guest_meal") }))} /><span>Enable extra meal charges</span></label></div>
        {form.activeModes.includes("guest_meal") && <div className="canteen-price-grid">{meals.map((meal) => money("guestMeal", meal, `${meal[0].toUpperCase()}${meal.slice(1)} charge`))}</div>}
      </section>
      {error && <p role="alert" className="canteen-error">{error}</p>}
      <div className="canteen-settings-actions"><button type="button" className="canteen-back" onClick={() => navigate("/admin")}>Skip for now — add later</button><button type="submit" className="canteen-primary" disabled={saving}>{saving ? "Saving…" : "Save meal options"}</button></div>
    </form>}
  </main>;
}
