import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAppBootstrap, saveBusinessProfile, savePropertyTypes } from "../saasApi";
import { getPostLoginPath } from "../utils/saasNavigation";
import "./PropertyTypes.css";

export const PROPERTY_TYPES = [
  { value: "bed", label: "Hostel", description: "Manage rooms and beds" },
  { value: "room", label: "Residential Room", description: "Manage residential rooms and flats" },
  { value: "shop", label: "Commercial Shop", description: "Manage commercial shops" },
];

export function PropertyTypePicker({ initialTypes = [], initialCanteenEnabled = false, showCanteenOption = true, onTypesChange, onBeforeSave, onSaved }) {
  const [types, setTypes] = useState(initialTypes);
  const [canteenEnabled, setCanteenEnabled] = useState(initialCanteenEnabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => setTypes(initialTypes), [initialTypes]);
  useEffect(() => setCanteenEnabled(initialCanteenEnabled), [initialCanteenEnabled]);

  function updateTypes(nextTypes) {
    setTypes(nextTypes);
    if (!nextTypes.includes("bed")) setCanteenEnabled(false);
    if (onTypesChange) onTypesChange(nextTypes);
  }

  async function save() {
    if (!types.length) return setMessage("Select at least one property type.");
    try {
      setSaving(true); setMessage("");
      if (onBeforeSave) await onBeforeSave();
      await savePropertyTypes(types, canteenEnabled && types.includes("bed"));
      if (onSaved) await onSaved();
      else setMessage("Property types saved.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to save property types.");
    } finally { setSaving(false); }
  }

  return <div className="property-type-picker">
    <div className="property-type-choices">{PROPERTY_TYPES.map((type) => <label className={`property-type-choice ${types.includes(type.value) ? "is-selected" : ""}`} key={type.value}>
      <input type="checkbox" checked={types.includes(type.value)} onChange={(event) => {
        const checked = event.target.checked;
        updateTypes(checked ? [...types, type.value] : types.filter((value) => value !== type.value));
      }} />
      <span><strong>{type.label}</strong><small>{type.description}</small></span>
    </label>)}</div>
    {showCanteenOption && types.includes("bed") && <label className="property-type-canteen-choice">
      <input type="checkbox" checked={canteenEnabled} onChange={(event) => setCanteenEnabled(event.target.checked)} />
      <span><strong>Enable canteen for this hostel</strong><small>Show meal settings, meal attendance, and canteen options for hostel tenants.</small></span>
    </label>}
    {message && <p role="alert" className="property-type-message">{message}</p>}
    <button type="button" className="property-type-save" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save property types"}</button>
  </div>;
}

export default function PropertyTypes() {
  const navigate = useNavigate();
  const [bootstrap, setBootstrap] = useState(null);
  const [businessProfile, setBusinessProfile] = useState({ businessName: "", ownerName: "" });
  const [error, setError] = useState("");
  useEffect(() => { getAppBootstrap().then((data) => {
    if (!data.access?.needsPropertySelection) navigate(getPostLoginPath(data), { replace: true });
    else {
      setBootstrap(data);
      setBusinessProfile({
        businessName: data.organization?.name === "New Business" ? "" : data.organization?.name || "",
        ownerName: data.organization?.ownerName === "Owner" ? "" : data.organization?.ownerName || data.user?.name || "",
      });
    }
  }).catch(() => setError("Unable to load property types. Please try again.")); }, [navigate]);
  return <main className="property-types-page"><section className="property-types-card">
    <h1>Choose your property types</h1>
    <p>Tell us about your business and choose the property types you manage. You can edit these details later in your profile.</p>
    {error && <p role="alert">{error}</p>}
    {bootstrap && <>
      <div className="property-type-profile-fields">
        <label>Business / hostel name<input type="text" maxLength={120} value={businessProfile.businessName} onChange={(event) => setBusinessProfile((current) => ({ ...current, businessName: event.target.value }))} placeholder="Enter your business name" required /></label>
        <label>Your name (system admin / owner)<input type="text" maxLength={120} value={businessProfile.ownerName} onChange={(event) => setBusinessProfile((current) => ({ ...current, ownerName: event.target.value }))} placeholder="Enter your name" required /></label>
      </div>
      <PropertyTypePicker
        initialTypes={bootstrap.organization?.selectedPropertyTypes || []}
        initialCanteenEnabled={Boolean(bootstrap.organization?.features?.canteenEnabled)}
        onBeforeSave={() => {
          if (!businessProfile.businessName.trim() || !businessProfile.ownerName.trim()) {
            throw new Error("Enter both your business name and your name.");
          }
          return saveBusinessProfile({
            businessName: businessProfile.businessName.trim(),
            ownerName: businessProfile.ownerName.trim(),
          });
        }}
        onSaved={() => navigate("/admin", { replace: true })}
      />
    </>}
  </section></main>;
}
