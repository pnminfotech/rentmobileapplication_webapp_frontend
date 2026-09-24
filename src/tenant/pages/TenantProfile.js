import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { API, authHeader } from "../tenantApi";

/* ========= Brand (refined + accessible) ========= */
const colors = {
  pageBg: "#f7f8fc",
  text: "#0f172a",
  sub: "#64748b",
  line: "#e6e9f2",
  card: "#ffffff",
  // accents
  primary: "#6d5dfc",        // indigo-violet
  primarySoft: "rgba(109,93,252,.12)",
  success: "#10b981",        // emerald
  warning: "#f59e0b",        // amber
  danger: "#ef4444",         // red
  brand2: "#22c55e",         // green accent for chips
};

const shadow = "0 16px 40px rgba(15,23,42,.08)";

const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px 16px",
    background: `
      radial-gradient(1200px 600px at 100% -10%, rgba(109,93,252,.12), transparent 60%),
      radial-gradient(900px 500px at -10% 0%, rgba(34,197,94,.10), transparent 55%),
      ${colors.pageBg}
    `,
    color: colors.text,
    fontFamily: `Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
  },
  container: { maxWidth: 1000, margin: "0 auto" },

  /* Top banner */
  banner: {
    background: `linear-gradient(110deg, ${colors.card}, #fbfcff)`,
    borderRadius: 20,
    border: `1px solid ${colors.line}`,
    boxShadow: shadow,
    padding: 18,
    display: "flex",
    gap: 16,
    alignItems: "center",
    marginBottom: 18,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 14,
    objectFit: "cover",
    border: `1px solid ${colors.line}`,
    background: "#fff",
  },
  headingWrap: { flex: 1, minWidth: 0 },
  title: { margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: 0.2 },
  sub: { marginTop: 6, fontSize: 13, color: colors.sub },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 12px",
    fontSize: 12.5,
    fontWeight: 600,
    borderRadius: 999,
    background: "#fff",
    border: `1px solid ${colors.line}`,
  },
  chipStrong: {
    background: colors.primarySoft,
    border: `1px solid ${colors.primary}`,
    color: colors.primary,
  },

  /* Toolbar */
  toolbar: { display: "flex", gap: 10 },
  btn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${colors.line}`,
    background: "#fff",
    color: colors.text,
    cursor: "pointer",
    fontWeight: 600,
  },
  btnPri: {
    padding: "10px 14px",
    borderRadius: 10,
    border: 0,
    background: colors.primary,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: "0 10px 24px rgba(109,93,252,.35)",
  },

  /* Stat chips */
  statWrap: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(120px, 1fr))",
    gap: 10,
    minWidth: 320,
  },
  stat: {
    background: "#fff",
    border: `1px solid ${colors.line}`,
    borderRadius: 12,
    padding: 12,
  },
  statLabel: { fontSize: 12, color: colors.sub },
  statValue: { fontSize: 17, fontWeight: 800 },

  /* Section card */
  card: {
    background: colors.card,
    borderRadius: 16,
    border: `1px solid ${colors.line}`,
    boxShadow: shadow,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { margin: "0 0 12px 0", fontSize: 15, fontWeight: 700, letterSpacing: 0.2 },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12,
  },

  label: { fontSize: 12, color: colors.sub, marginBottom: 6 },
  read: {
    width: "100%",
    padding: "11px 12px",
    border: `1px dashed ${colors.line}`,
    borderRadius: 12,
    background: "#fafbff",
    color: colors.text,
  },
  input: {
    width: "100%",
    padding: "11px 12px",
    border: `1px solid ${colors.line}`,
    borderRadius: 12,
    outline: "none",
    fontSize: 14,
  },

  /* Docs */
  docGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 },
  docCard: {
    border: `1px solid ${colors.line}`,
    borderRadius: 12,
    overflow: "hidden",
    background: "#fff",
    color: colors.text,
    textDecoration: "none",
  },
  docImg: { width: "100%", height: 120, objectFit: "cover", display: "block", background: "#f3f4f7" },
  docMeta: { padding: 8, fontSize: 12.5 },
  docName: { fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

  toast: {
    position: "fixed",
    right: 16,
    bottom: 16,
    background: "#111827",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 10,
    zIndex: 50,
    fontSize: 14,
  },
};

/* Helpers */
const toDateInputValue = (val) => {
  if (!val) return "";
  const d = new Date(val);
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
};
const fmtDate = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-IN", { dateStyle: "medium" });
};
const fullUrl = (url) => (!url ? "" : /^https?:\/\//i.test(url) ? url : `${API}${url}`);

/* Subtle focus effect */
function FocusInput({ value, onChange, type = "text", name }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      style={{
        ...styles.input,
        borderColor: focused ? colors.primary : styles.input.borderColor,
        boxShadow: focused ? `0 0 0 3px ${colors.primarySoft}` : "none",
      }}
      type={type}
      name={name}
      value={value ?? ""}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

/* Load Poppins font (no CSS file needed) */
function useGoogleFont() {
  useEffect(() => {
    const id = "poppins-font-link";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

export default function TenantMyForm() {
  useGoogleFont();

  const [me, setMe] = useState(null);
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({});

  const avatarSrc = useMemo(() => {
    return (
      fullUrl(me?.avatarUrl) ||
      `https://api.dicebear.com/7.x/initials/svg?radius=12&fontFamily=Poppins&seed=${encodeURIComponent(
        me?.name || "Tenant"
      )}`
    );
  }, [me]);

  /* Load tenant */
  useEffect(() => {
    let alive = true;
    (async () => {
      setErr("");
      try {
        const r = await axios.get(`${API}/tenant/me`, { headers: authHeader() });
        if (!alive) return;
        const data = r.data || {};
        if (data.relativeAddress && !data.relativeAddress1) data.relativeAddress1 = data.relativeAddress;
        setMe(data);
        setForm({
          name: data.name || "",
          // email: data.email || "",
          dob: toDateInputValue(data.dob),
          address: data.address || "",
          companyAddress: data.companyAddress || "",
          dateOfJoiningCollege: toDateInputValue(data.dateOfJoiningCollege),
          relativeAddress1: data.relativeAddress1 || "",
          relative1Relation: data.relative1Relation || "Self",
          relative1Name: data.relative1Name || "",
          relative1Phone: data.relative1Phone || "",
          relative2Relation: data.relative2Relation || "Self",
          relative2Name: data.relative2Name || "",
          relative2Phone: data.relative2Phone || "",
          emergencyContact: data.emergencyContact || "",
          emergencyRelation: data.emergencyRelation || "",
        });
      } catch {
        if (!alive) return;
        setErr("Failed to load your details.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(""), 1800);
    return () => clearTimeout(t);
  }, [ok]);

  const save = async () => {
    setSaving(true);
    setErr("");
    try {
      const payload = {
        name: form.name,
        // email: form.email,
        dob: form.dob || null,
        address: form.address,
        companyAddress: form.companyAddress,
        dateOfJoiningCollege: form.dateOfJoiningCollege || null,
        relativeAddress1: form.relativeAddress1,
        relative1Relation: form.relative1Relation,
        relative1Name: form.relative1Name,
        relative1Phone: form.relative1Phone,
        relative2Relation: form.relative2Relation,
        relative2Name: form.relative2Name,
        relative2Phone: form.relative2Phone,
        emergencyContact: form.emergencyContact,
        emergencyRelation: form.emergencyRelation,
      };
      await axios.put(`${API}/tenant/profile`, payload, { headers: authHeader() });
      const r = await axios.get(`${API}/tenant/me`, { headers: authHeader() });
      setMe(r.data || {});
      setOk("Saved ✓");
      setEdit(false);
    } catch {
      setErr("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (!me) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={{ ...styles.card, textAlign: "center" }}>Loading…</div>
        </div>
      </div>
    );
    }

  /* little atoms */
  const ReadRow = ({ label, children }) => (
    <div>
      <div style={styles.label}>{label}</div>
      <div style={styles.read}>{children ?? "—"}</div>
    </div>
  );
  const EditRow = ({ label, name, type = "text" }) => (
    <div>
      <div style={styles.label}>{label}</div>
      <FocusInput
        type={type}
        name={name}
        value={form[name] ?? ""}
        onChange={(e) => setForm((s) => ({ ...s, [name]: e.target.value }))}
      />
    </div>
  );
  const Stat = ({ label, value, tone = "neutral" }) => {
    const chipTone =
      tone === "success"
        ? { borderColor: "#d1fae5", background: "#ecfdf5" }
        : tone === "warn"
        ? { borderColor: "#fef3c7", background: "#fffbeb" }
        : { borderColor: colors.line, background: "#fafbff" };
    return (
      <div style={{ ...styles.stat, ...chipTone }}>
        <div style={styles.statLabel}>{label}</div>
        <div style={styles.statValue}>{value ?? "—"}</div>
      </div>
    );
  };

  const docs = Array.isArray(me.documents) ? me.documents : [];

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Banner: Avatar + identity + stats + actions */}
        <div style={styles.banner}>
          {/* <img src={avatarSrc} alt="avatar" style={styles.avatar} /> */}
          <div style={styles.headingWrap} >
            <h2 style={styles.title}>{me.name || "—"}</h2>
            <div style={styles.sub}>
              {me.roomNo ? `Room ${me.roomNo}` : "—"} {me.bedNo ? " • Bed " + me.bedNo : ""}
            </div>
            <div style={styles.chipRow} >
              <span style={styles.chip}>📞 {me.phoneNo || "—"}</span>
              {/* <span style={{ ...styles.chip, ...styles.chipStrong }}>SR NO: {me.srNo ?? "—"}</span> */}
              {me?.ekyc?.status && (
                <span style={{ ...styles.chip, borderColor: colors.brand2, color: colors.brand2 }}>
                  ✅ eKYC: {String(me.ekyc.status).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* <div style={styles.statWrap}>
            <Stat label="Joining" value={fmtDate(me.joiningDate)} />
            <Stat label="Base Rent (₹)" value={me.baseRent} tone="warn" />
            <Stat label="Deposit (₹)" value={me.depositAmount} tone="success" />
          </div> */}

          <div style={styles.toolbar}>
            {!edit ? (
              <button style={styles.btn} onClick={() => setEdit(true)}>Edit</button>
            ) : (
              <>
                <button style={styles.btn} onClick={() => setEdit(false)}>Cancel</button>
                <button style={styles.btnPri} onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </>
            )}
          </div>
        </div>

        {err && (
          <div style={{ ...styles.card, borderColor: colors.danger, background: "#fff7f7", color: "#991b1b" }}>
            {err}
          </div>
        )}
        {ok && <div style={styles.toast}>{ok}</div>}

        {/* Account */}
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Account</div>
          <div style={styles.grid}>
            {edit ? (
              <>
                <EditRow label="Full Name" name="name" />
                {/* <EditRow label="Email" name="email" type="email" /> */}
                <EditRow label="Date of Birth" name="dob" type="date" />
              </>
            ) : (
              <>
                <ReadRow label="Full Name">{me.name}</ReadRow>
                {/* <ReadRow label="Email">{me.email}</ReadRow> */}
                 <ReadRow label="Phone (read-only)">{me.phoneNo}</ReadRow>
                <ReadRow label="Date of Birth">{fmtDate(me.dob)}</ReadRow>
               
              </>
            )}
          </div>
        </div>

        {/* Stay */}
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Stay Details</div>
          <div style={styles.grid}>
            <ReadRow label="Joining Date">{fmtDate(me.joiningDate)}</ReadRow>
            <ReadRow label="Room No.">{me.roomNo}</ReadRow>
            <ReadRow label="Bed No.">{me.bedNo}</ReadRow>
            <ReadRow label="Base Rent (₹)">{me.baseRent}</ReadRow>
            <ReadRow label="Rent Amount (₹)">{me.rentAmount}</ReadRow>
            <ReadRow label="Deposit (₹)">{me.depositAmount}</ReadRow>
          </div>
        </div>

        {/* Address */}
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Addresses</div>
          <div style={styles.grid}>
            {edit ? (
              <>
                <EditRow label="Current Address" name="address" />
                <EditRow label="Relative Address" name="relativeAddress1" />
                <EditRow label="Company / College" name="companyAddress" />
                <EditRow label="Date of Joining College/Office" name="dateOfJoiningCollege" type="date" />
              </>
            ) : (
              <>
                <ReadRow label="Current Address">{me.address}</ReadRow>
                <ReadRow label="Relative Address">{me.relativeAddress1 || me.relativeAddress}</ReadRow>
                <ReadRow label="Company / College">{me.companyAddress}</ReadRow>
                <ReadRow label="Date of Joining College/Office">{fmtDate(me.dateOfJoiningCollege)}</ReadRow>
              </>
            )}
          </div>
        </div>

        {/* Relatives / Emergency */}
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Relatives & Emergency</div>
          <div style={styles.grid}>
            {edit ? (
              <>
                <EditRow label="Relative 1: Relation" name="relative1Relation" />
                <EditRow label="Relative 1: Name" name="relative1Name" />
                <EditRow label="Relative 1: Phone" name="relative1Phone" />
                <EditRow label="Relative 2: Relation" name="relative2Relation" />
                <EditRow label="Relative 2: Name" name="relative2Name" />
                <EditRow label="Relative 2: Phone" name="relative2Phone" />
                <EditRow label="Emergency Contact" name="emergencyContact" />
                <EditRow label="Emergency Relation" name="emergencyRelation" />
              </>
            ) : (
              <>
                <ReadRow label="Relative 1: Relation">{me.relative1Relation}</ReadRow>
                <ReadRow label="Relative 1: Name">{me.relative1Name}</ReadRow>
                <ReadRow label="Relative 1: Phone">{me.relative1Phone}</ReadRow>
                <ReadRow label="Relative 2: Relation">{me.relative2Relation}</ReadRow>
                <ReadRow label="Relative 2: Name">{me.relative2Name}</ReadRow>
                <ReadRow label="Relative 2: Phone">{me.relative2Phone}</ReadRow>
                <ReadRow label="Emergency Contact">{me.emergencyContact}</ReadRow>
                <ReadRow label="Emergency Relation">{me.emergencyRelation}</ReadRow>
              </>
            )}
          </div>
        </div>

        {/* eKYC */}
        <div style={styles.card}>
          <div style={styles.sectionTitle}>eKYC</div>
          <div style={styles.grid}>
            <ReadRow label="Status">{me?.ekyc?.status || "not_started"}</ReadRow>
            <div>
              <div style={styles.label}>Selfie</div>
              {me?.ekyc?.selfieUrl ? (
                <img
                  src={fullUrl(me.ekyc.selfieUrl)}
                  alt="selfie"
                  style={{ width: "100%", maxWidth: 220, borderRadius: 12, border: `1px solid ${colors.line}` }}
                />
              ) : (
                <div style={styles.read}>—</div>
              )}
            </div>
          </div>
        </div>

        {/* Documents */}
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Documents</div>
          {docs.length ? (
            <div style={styles.docGrid}>
              {docs.map((d, i) => (
                <DocTile key={d._id || d.url || i} doc={d} />
              ))}
            </div>
          ) : (
            <div style={{ color: colors.sub }}>No documents uploaded.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocTile({ doc }) {
  const url = fullUrl(doc?.url);
  return (
    <a href={url} target="_blank" rel="noreferrer" title={doc?.fileName || "Document"} style={styles.docCard}>
      {url ? <img src={url} alt={doc?.fileName || "doc"} style={styles.docImg} /> : null}
      <div style={styles.docMeta}>
        <div style={styles.docName}>{doc?.fileName || "Document"}</div>
        <div style={{ color: colors.sub }}>
          {doc?.relation || "Self"} {doc?.size ? `• ${(doc.size / 1024).toFixed(0)} KB` : ""}
        </div>
      </div>
    </a>
  );
}
