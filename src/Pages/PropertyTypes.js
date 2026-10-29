import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAppBootstrap, savePropertyTypes } from "../saasApi";
import { getPostLoginPath } from "../utils/saasNavigation";
import "./PropertyTypes.css";

export const PROPERTY_TYPES = [
  { value: "bed", label: "Hostel", description: "Manage rooms and beds" },
  { value: "room", label: "Residential Room", description: "Manage residential rooms and flats" },
  { value: "shop", label: "Commercial Shop", description: "Manage commercial shops" },
];

export function PropertyTypePicker({ initialTypes = [], onSaved }) {
  const [types, setTypes] = useState(initialTypes);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => setTypes(initialTypes), [initialTypes]);

  async function save() {
    if (!types.length) return setMessage("Select at least one property type.");
    try {
      setSaving(true); setMessage("");
      await savePropertyTypes(types);
      if (onSaved) await onSaved();
      else setMessage("Property types saved.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to save property types.");
    } finally { setSaving(false); }
  }

  return <div className="property-type-picker">
    <div className="property-type-choices">{PROPERTY_TYPES.map((type) => <label className={`property-type-choice ${types.includes(type.value) ? "is-selected" : ""}`} key={type.value}>
      <input type="checkbox" checked={types.includes(type.value)} onChange={(event) => setTypes((current) => event.target.checked ? [...current, type.value] : current.filter((value) => value !== type.value))} />
      <span><strong>{type.label}</strong><small>{type.description}</small></span>
    </label>)}</div>
    {message && <p role="alert" className="property-type-message">{message}</p>}
    <button type="button" className="property-type-save" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save property types"}</button>
  </div>;
}

export default function PropertyTypes() {
  const navigate = useNavigate();
  const [bootstrap, setBootstrap] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { getAppBootstrap().then((data) => {
    if (!data.access?.needsPropertySelection) navigate(getPostLoginPath(data), { replace: true });
    else setBootstrap(data);
  }).catch(() => setError("Unable to load property types. Please try again.")); }, [navigate]);
  return <main className="property-types-page"><section className="property-types-card">
    <h1>Choose your property types</h1>
    <p>Select all that apply. You can add other property types later from your profile.</p>
    {error && <p role="alert">{error}</p>}
    {bootstrap && <PropertyTypePicker initialTypes={bootstrap.organization?.selectedPropertyTypes || []} onSaved={() => navigate("/admin", { replace: true })} />}
  </section></main>;
}
