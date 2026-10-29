import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SecurityPinStatusField, useSystemSecurityPinStatus } from "./SecurityPinSetup";

export default function SecurityPinDeleteDialog({ open, title, description, onClose, onDelete }) {
  const status = useSystemSecurityPinStatus(open);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
      setCreated(false);
    }
  }, [open]);

  const confirmDelete = async () => {
    if (!status.configured || deleting) return;
    if (!/^\d{4,8}$/.test(pin)) return setError("Enter your 4 to 8 digit security PIN.");
    try {
      setDeleting(true);
      setError("");
      await onDelete(pin);
      onClose();
    } catch (err) {
      if (err.response?.status === 428) {
        status.markUnconfigured();
        setError("Set a security PIN below to continue.");
      } else {
        setError(err.response?.data?.message || err.message || "Unable to delete this item.");
      }
    } finally {
      setDeleting(false);
    }
  };

  if (!open) return null;
  return createPortal(
    <div className="security-pin-delete-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) onClose(); }}>
      <section className="security-pin-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="security-pin-delete-title">
        <header><div><h2 id="security-pin-delete-title">{title}</h2><p>{description}</p></div><button type="button" className="security-pin-delete-close" onClick={onClose} aria-label="Close" autoFocus>×</button></header>
        <div className="security-pin-delete-body">
          {error && <p className="security-pin-delete-error" role="alert">{error}</p>}
          {created && <p className="security-pin-delete-success" role="status">Security PIN saved. Confirm the deletion below.</p>}
          <SecurityPinStatusField status={status} onRetry={status.refresh} onSaved={(value) => { status.markConfigured(); setPin(value); setCreated(true); }}>
            <label>Security PIN<input type="password" inputMode="numeric" autoComplete="off" maxLength={8} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="4 to 8 digits" /></label>
          </SecurityPinStatusField>
        </div>
        <footer><button type="button" className="security-pin-delete-cancel" onClick={onClose}>Cancel</button><button type="button" className="security-pin-delete-confirm" onClick={confirmDelete} disabled={!status.configured || deleting}>{deleting ? "Deleting..." : "Delete"}</button></footer>
      </section>
    </div>, document.body
  );
}
