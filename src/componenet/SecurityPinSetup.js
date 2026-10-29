import { useCallback, useEffect, useState } from "react";
import { getSystemSecurityPinStatus, saveSystemSecurityPin } from "../saasApi";
import "./SecurityPinSetup.css";

export function useSystemSecurityPinStatus(open) {
  const [status, setStatus] = useState({ loading: true, configured: null, error: "" });

  const refresh = useCallback(async () => {
    setStatus({ loading: true, configured: null, error: "" });
    try {
      const result = await getSystemSecurityPinStatus();
      setStatus({ loading: false, configured: Boolean(result?.configured), error: "" });
    } catch (error) {
      setStatus({ loading: false, configured: null, error: error.response?.data?.message || "Could not check your security PIN." });
    }
  }, []);

  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  return {
    ...status,
    refresh,
    markConfigured: () => setStatus({ loading: false, configured: true, error: "" }),
    markUnconfigured: () => setStatus({ loading: false, configured: false, error: "" }),
  };
}

export function SecurityPinStatusField({ status, onRetry, onSaved, children }) {
  if (status.loading) return <p className="security-pin-status">Checking your security PIN...</p>;
  if (status.error) return <div className="security-pin-status" role="alert">{status.error} <button type="button" onClick={onRetry}>Retry</button></div>;
  if (!status.configured) return <SecurityPinSetup onSaved={onSaved} />;
  return children;
}

export default function SecurityPinSetup({ onSaved }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (event) => {
    event.preventDefault();
    if (!/^\d{4,8}$/.test(pin)) return setError("Use a 4 to 8 digit security PIN.");
    if (pin !== confirm) return setError("The PINs do not match.");
    try {
      setSaving(true);
      setError("");
      await saveSystemSecurityPin({ pin });
      onSaved(pin);
      setPin("");
      setConfirm("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save the security PIN.");
    } finally {
      setSaving(false);
    }
  };

  return <form className="security-pin-setup" onSubmit={save}>
    <strong>Set a security PIN to continue</strong>
    <p>No security PIN is set for your account. Create one here, then confirm the deletion.</p>
    <label>New security PIN
      <input type="password" autoComplete="new-password" inputMode="numeric" maxLength={8} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="4 to 8 digits" required />
    </label>
    <label>Confirm security PIN
      <input type="password" autoComplete="new-password" inputMode="numeric" maxLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="Enter the PIN again" required />
    </label>
    {error && <p className="security-pin-setup-error" role="alert">{error}</p>}
    <button type="submit" disabled={saving}>{saving ? "Saving PIN..." : "Set security PIN"}</button>
  </form>;
}
