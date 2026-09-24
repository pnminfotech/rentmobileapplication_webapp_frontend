

import React, { useEffect, useState } from "react";
import axios from "axios";
import { API, authHeader } from "../tenantApi";
import { FaExternalLinkAlt, FaUpload } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

/** ---- OFFICIAL LINKS (Pune) ---- */
const OFFICIAL = {
  city: "https://www.punepolice.gov.in/",
  rural: "https://puneruralpolice.gov.in/tenant-info",
  pdf: "https://citizen.mahapolice.gov.in/Citizen/downloadPdf/06_Personal%20Information%20Of%20TenantTemporary%20Resident%20(English).pdf",
  igr: "https://leaveandlicense.igrmaharashtra.gov.in/",
};

const UPLOAD_ROUTE = "/tenant/documents";

/* ---------------- Inline Styles (compact & centered) ---------------- */
const styles = {
  section: {
    maxWidth: 1100,            // normal, not too wide
    margin: "0 auto",
    padding: "16px 16px 20px",
    boxSizing: "border-box",
  },
  stack: { display: "flex", flexDirection: "column", gap: 16 },

  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  h1: { fontSize: 22, fontWeight: 700, margin: 0 },
  pMuted: { color: "#555", margin: "6px 0 0", lineHeight: 1.35, fontSize: 14 },
  status: { fontSize: 12, marginTop: 6 },

  btn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #1d4ed8",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },

  // Responsive rows: stay horizontal when there's room, wrap when not.
  rowTwo: { display: "flex", flexWrap: "wrap", gap: 12, width: "100%" },
  rowThree: { display: "flex", flexWrap: "wrap", gap: 12, width: "100%" },

  // Two-col cards: 50% each on wide screens, stack below ~1040px
  twoColCard: {
    flex: "1 1 520px",
    minWidth: 300,
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 14,
    background: "#fafbff",
    height: "100%",
    boxSizing: "border-box",
  },

  // Three-col cards: thirds on wide, wrap to 2 or 1 as space shrinks
  threeColCard: {
    flex: "1 1 340px",
    minWidth: 260,
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 14,
    background: "#f9fafd",
    height: "100%",
    boxSizing: "border-box",
  },

  h2: { fontSize: 16, fontWeight: 600, margin: 0 },
  h3: { fontSize: 15, fontWeight: 600, margin: 0 },
  sub: { color: "#666", fontSize: 13, marginTop: 6, lineHeight: 1.4 },
  cardBtnRow: { marginTop: 10, display: "flex", alignItems: "center", gap: 8 },

  ackBox: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 14,
  },
  ackHeader: { fontSize: 16, fontWeight: 700, margin: "0 0 10px" },
  ackRow: { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" },
  label: { fontSize: 13, fontWeight: 600, marginBottom: 4 },
  field: { display: "block", flex: "1 1 260px", minWidth: 240 },
  input: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "7px 10px",
    boxSizing: "border-box",
    fontSize: 14,
  },
  save: {
    padding: "8px 12px",
    borderRadius: 10,
    background: "#111827",
    color: "#fff",
    border: 0,
    cursor: "pointer",
    fontSize: 14,
  },
  submit: {
    padding: "8px 12px",
    borderRadius: 10,
    background: "#2563eb",
    color: "#fff",
    border: 0,
    cursor: "pointer",
    fontSize: 14,
  },
  tip: { fontSize: 12, color: "#6b7280", marginTop: 8 },
  msgOk: { fontSize: 13, color: "#059669", marginTop: 10 },
};

export default function TenantPoliceVerification() {
  const [guide, setGuide] = useState(null);
  const [pv, setPv] = useState(null);
  const [ackNumber, setAckNumber] = useState("");
  const [ackDate, setAckDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const base = `${API}/police-verification`;
  const h = () => ({ headers: authHeader() });

  const flash = (t) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 1800);
  };

  const safeGet = async (url) => {
    try {
      const r = await axios.get(url, h());
      return r?.data ?? null;
    } catch {
      return null;
    }
  };

  const load = async () => {
    const g = await safeGet(`${base}/guide`);
    setGuide(g);

    const me = await safeGet(`${base}/me`);
    if (me) {
      setPv(me);
      setAckNumber(me.ackNumber || "");
      setAckDate(me.ackDate ? String(me.ackDate).slice(0, 10) : "");
    } else {
      setPv(null);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureDraft = async () => {
    if (!pv) {
      try {
        const res = await axios.post(`${base}/me/init`, {}, h());
        setPv(res.data);
      } catch {}
    }
  };

  const saveAck = async () => {
    try {
      await ensureDraft();
      setBusy(true);
      await axios.put(`${base}/me/ack`, { ackNumber, ackDate }, h());
      await load();
      flash("Acknowledgement saved");
    } catch {
      flash("Could not save (backend not ready?)");
    } finally {
      setBusy(false);
    }
  };

  const submitToAdmin = async () => {
    try {
      if (!pv) return;
      setBusy(true);
      await axios.post(`${base}/me/submit`, {}, h());
      await load();
      flash("Submitted to admin");
    } catch {
      flash("Submit failed (backend not ready?)");
    } finally {
      setBusy(false);
    }
  };

  const openNewTab = (url) => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <div style={styles.section}>
      <div style={styles.stack}>
        {/* Header */}
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.h1}>{guide?.header || "Police Verification – Pune"}</h1>
            <p style={styles.pMuted}>
              {guide?.intro ||
                "Use the official portals below (City or Rural). After completion, upload the receipt and save your acknowledgement here."}
            </p>
            {pv && (
              <p style={styles.status}>
                Status: <span style={{ fontWeight: 600 }}>{pv.status}</span>
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => navigate(UPLOAD_ROUTE)}
              className="btn btn-outline-dark"
              title="Go to your Upload Documents page"
            >
              <FaUpload /> Upload Receipt
            </button>
          </div>
        </div>

        {/* Official Links (compact two-column row) */}
        <div style={styles.rowTwo}>
          <div style={styles.twoColCard}>
            <h2 style={styles.h2}>Pune City Police</h2>
            <p style={styles.sub}>For properties within Pune City Commissionerate limits.</p>
            <div style={styles.cardBtnRow}>
              <button onClick={() => openNewTab(OFFICIAL.city)} style={styles.btnPrimary}>
                Open City Portal <FaExternalLinkAlt />
              </button>
            </div>
          </div>

          <div style={styles.twoColCard}>
            <h2 style={styles.h2}>Pune Rural Police</h2>
            <p style={styles.sub}>
              For properties in Pune district <em>outside</em> city limits (SP Pune Rural).
            </p>
            <div style={styles.cardBtnRow}>
              <button onClick={() => openNewTab(OFFICIAL.rural)} style={styles.btnPrimary}>
                Open Rural Tenant Info <FaExternalLinkAlt />
              </button>
            </div>
          </div>
        </div>

        {/* Info row (compact three-column row) */}
        <div style={styles.rowThree}>
          <div style={styles.threeColCard}>
            <h3 style={styles.h3}>Tenant/Temporary Resident Form (PDF)</h3>
            <p style={styles.sub}>State-level form (English). Some PS still refer to this.</p>
            <div style={styles.cardBtnRow}>
              <button onClick={() => openNewTab(OFFICIAL.pdf)}  className="btn btn-outline-dark">
                Download PDF
              </button>
               <p style={styles.tip}>Tip: Verify jurisdiction & carry ID/address proofs.</p>
            </div>
           
          </div>

          {/* <div style={styles.threeColCard}>
            <h3 style={styles.h3}>IGR e-Registration → Leave & Licence 2.0</h3>
            <p style={styles.sub}>
              Register Leave & Licence online; data is integrated with Police (CCTNS) in many areas.
            </p>
            <div style={styles.cardBtnRow}>
              <button onClick={() => openNewTab(OFFICIAL.igr)} style={styles.btn}>
                Open IGR
              </button>
            </div>
          </div> */}

          <div style={styles.threeColCard}>
            <h3 style={styles.h3}>Upload Receipt (Redirect)</h3>
            <p style={styles.sub}>
              Finished on the official portal? Upload your acknowledgement/receipt here.
            </p>
            <div style={styles.cardBtnRow}>
              <button onClick={() => navigate(UPLOAD_ROUTE)} className="btn btn-outline-dark">
                Go to Upload Documents
              </button>
            </div>
          </div>
        </div>

        {/* Acknowledgement */}
        {/* <div style={styles.ackBox}>
          <h2 style={styles.ackHeader}>Acknowledgement</h2>
          <div style={styles.ackRow}>
            <label style={{ ...styles.field }}>
              <div style={styles.label}>Ack Number</div>
              <input
                style={styles.input}
                value={ackNumber}
                onChange={(e) => setAckNumber(e.target.value)}
                placeholder="e.g., MH-123456"
              />
            </label>

            <label style={{ ...styles.field }}>
              <div style={styles.label}>Ack Date</div>
              <input
                type="date"
                style={styles.input}
                value={ackDate}
                onChange={(e) => setAckDate(e.target.value)}
              />
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveAck} disabled={busy} style={styles.save}>
                Save
              </button>
              <button
                onClick={submitToAdmin}
                disabled={busy || !ackNumber}
                style={styles.submit}
              >
                Submit to Admin
              </button>
            </div>
          </div>
          {msg && <div style={styles.msgOk}>{msg}</div>}
        </div> */}

        {/* Help */}
        {guide?.helpText && (
          <div style={styles.ackBox}>
            <h2 style={styles.h3}>Help</h2>
            <p style={{ color: "#374151", marginTop: 6, fontSize: 14 }}>{guide.helpText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
