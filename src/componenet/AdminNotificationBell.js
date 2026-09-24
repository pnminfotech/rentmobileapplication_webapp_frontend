// src/components/AdminNotificationBell.js
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const monthLabel = (m, y) => (m && y ? `${String(m).padStart(2, "0")}/${y}` : "—");

export default function AdminNotificationBell({
  apiOrigin = process.env.REACT_APP_API_ORIGIN || "    http://localhost:8000/",
  pollMs = 20000,
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const panelRef = useRef(null);

  const URLS = {
    list: `${apiOrigin}/api/notifications`,
    read: (id) => `${apiOrigin}/api/notifications/${id}/read`,
    readAll: `${apiOrigin}/api/notifications/read-all`,
    approve: (id) => `${apiOrigin}/api/notifications/${id}/approve`,
    reject: (id) => `${apiOrigin}/api/notifications/${id}/reject`,
  };

  const fetchItems = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await axios.get(URLS.list, { params: { status, limit: 40 } });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr("Failed to load notifications");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); /* eslint-disable-next-line */ }, [status, apiOrigin]);

  useEffect(() => {
    if (!pollMs) return;
    const t = setInterval(fetchItems, pollMs);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [pollMs, status, apiOrigin]);

  const unreadCount = items.filter((x) => !x.read && x.status === "pending").length;

  const markRead = async (id) => { await axios.patch(URLS.read(id)); fetchItems(); };
  const markAllRead = async () => { await axios.post(URLS.readAll, { status }); fetchItems(); };
  const approve = async (id) => { await axios.post(URLS.approve(id)); fetchItems(); };
  const reject = async (id) => { await axios.post(URLS.reject(id)); fetchItems(); };

  // close on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      {/* Bell */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 40, height: 40, borderRadius: 999, border: "1px solid #e5e7eb",
          background: "#fff", display: "grid", placeItems: "center", cursor: "pointer"
        }}
        title="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5m6 0v1a3 3 0 1 1-6 0v-1h6Z"
            stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -6, right: -6, background: "#ef4444",
            color: "#fff", borderRadius: 999, fontSize: 10, padding: "2px 6px", fontWeight: 800
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-out panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed", top: 12, right: 12, width: 420, maxWidth: "94vw",
            background: "#0b1220", color: "#e5e7eb", borderRadius: 12,
            boxShadow: "0 24px 80px rgba(0,0,0,.5)", zIndex: 9999, overflow: "hidden"
          }}
        >
          <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,.1)", display: "flex", gap: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 14, flex: 1 }}>Notifications</div>
            {["pending", "approved", "rejected", "all"].map((s) => (
              <button key={s}
                onClick={() => setStatus(s)}
                style={{
                  padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)",
                  background: status === s ? "#111827" : "transparent", color: "#e5e7eb", cursor: "pointer", fontSize: 12
                }}>
                {s}
              </button>
            ))}
            <button onClick={markAllRead}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "transparent", color: "#e5e7eb" }}>
              Mark all
            </button>
          </div>

          {err && <div style={{ padding: 10, background: "#7f1d1d" }}>{err}</div>}

          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 12 }}>Loading…</div>
            ) : items.length === 0 ? (
              <div style={{ padding: 16, color: "#94a3b8" }}>No notifications.</div>
            ) : (
              items.map((n) => (
                <div key={n._id} style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontWeight: 700 }}>
                      {n.type.toUpperCase()} • {n.tenantName || "Tenant"} (Room {n.roomNo || "—"}{n.bedNo ? ` / Bed ${n.bedNo}` : ""})
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
                      {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                    </div>
                  </div>

                  {/* Body per type */}
                  {n.type === "payment" ? (
                    <div style={{ marginTop: 6, fontSize: 13 }}>
                      <div>{fmtINR(n?.payload?.amount)} • {monthLabel(n?.payload?.month, n?.payload?.year)}</div>
                      {n?.payload?.utr && <div>UTR: <b>{n.payload.utr}</b></div>}
                      {n?.payload?.note && <div>Note: {n.payload.note}</div>}
                      {n?.payload?.receiptUrl && (
                        <div style={{ marginTop: 6 }}>
                          <a href={n.payload.receiptUrl} target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>
                            View Receipt
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ marginTop: 6, fontSize: 13 }}>
                      Leave date: <b>{n?.payload?.leaveDate ? new Date(n.payload.leaveDate).toLocaleDateString() : "—"}</b>
                    </div>
                  )}

                  {/* Status row */}
                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {!n.read && (
                      <button onClick={() => markRead(n._id)}
                        style={{ padding: "6px 10px", border: "1px solid rgba(255,255,255,.25)", borderRadius: 8, background: "transparent", color: "#e5e7eb" }}>
                        Mark read
                      </button>
                    )}
                    {n.status === "pending" && (
                      <>
                        <button onClick={() => approve(n._id)}
                          style={{ padding: "6px 10px", borderRadius: 8, background: "#16a34a", color: "#fff", border: "none" }}>
                          Approve
                        </button>
                        <button onClick={() => reject(n._id)}
                          style={{ padding: "6px 10px", borderRadius: 8, background: "#ef4444", color: "#fff", border: "none" }}>
                          Reject
                        </button>
                      </>
                    )}
                    <span style={{
                      marginLeft: "auto", padding: "2px 8px", borderRadius: 999,
                      background: n.status === "approved" ? "#16a34a" : n.status === "rejected" ? "#ef4444" : "#f59e0b",
                      color: "#0b1220", fontWeight: 800, fontSize: 12
                    }}>
                      {n.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
