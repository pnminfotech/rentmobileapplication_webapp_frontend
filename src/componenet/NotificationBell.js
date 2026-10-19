// src/components/NotificationBell.jsx
import React from "react";
import { API_BASE, api } from "../api";

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const mmYY = (m, y) => (m && y ? `${String(m).padStart(2, "0")}/${y}` : "—");

const axios = api;

export default function NotificationBell({
  apiUrl = `${API_BASE}/`,
  onApproved,
  onLeaveApproved,
}) {
  const [items, setItems] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  const isMobile = window.matchMedia("(max-width: 576px)").matches;


  const fetchAll = React.useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      // const payP = axios.get(`${apiUrl}payments/notifications`, {
      //   params: { status: "pending", limit: 50 },
      // });

      // const leaveP = axios.get(`${apiUrl}admin/notifications/leave`, {
      //   params: { status: "pending", limit: 50 },
      //   headers: adminAuthHeader(),
      // });

      // const [payRes, leaveRes] = await Promise.allSettled([payP, leaveP]);
const payP = axios.get(`${apiUrl}payments/notifications`, {
  params: { status: "pending", limit: 50 },
});

const leaveP = axios.get(`${apiUrl}admin/notifications/leave`, {
  params: { status: "pending", limit: 50 },
});

const attendanceP = axios.get(`${apiUrl}admin/notifications/attendance`);

const [payRes, leaveRes, attRes] = await Promise.allSettled([payP, leaveP, attendanceP]);

const payments =
  payRes.status === "fulfilled" && Array.isArray(payRes.value.data)
    ? payRes.value.data.map((p) => ({ ...p, type: "payment" }))
    : [];

const leaves =
  leaveRes.status === "fulfilled" && Array.isArray(leaveRes.value.data)
    ? leaveRes.value.data.map((l) => ({ ...l, type: "leave_request" }))
    : [];

const attendance =
  attRes.status === "fulfilled" && Array.isArray(attRes.value.data)
    ? attRes.value.data.map((a) => ({ ...a, type: "system" }))
    : [];

const combined = [...payments, ...leaves, ...attendance].sort(
  (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
);

setItems(combined);

      
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  React.useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 20000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // --- Payment approve/reject ---
  const approvePayment = async (notif) => {
    await axios.post(`${apiUrl}payments/approve/${notif._id}`);
    setItems((prev) => prev.filter((x) => x._id !== notif._id));

    const tenant = notif.tenantId || {};
    const pay = notif.paymentId || {};
    onApproved?.({
      type: "approved",
      tenantId: tenant._id,
      tenantName: tenant.name,
      roomNo: tenant.roomNo,
      bedNo: tenant.bedNo,
      amount: Number(pay.amount) || 0,
      year: Number(pay.year),
      month: Number(pay.month),
      utr: pay.utr || "",
      note: pay.note || "",
      paymentMode: pay.mode || pay.paymentMode || "Online",
      paymentDate: pay.paymentDate || notif.createdAt || new Date().toISOString(),
    });
  };

  const rejectPayment = async (notif) => {
    await axios.post(`${apiUrl}payments/reject/${notif._id}`);
    setItems((prev) => prev.filter((x) => x._id !== notif._id));
  };

  // --- Leave approve/reject ---
  const approveLeave = async (notif) => {
    const id = notif.requestId || notif._id;
    await axios.post(`${apiUrl}admin/leave/${id}/approve`, {});
    setItems((prev) => prev.filter((x) => x._id !== notif._id));

    const tenantId = notif.tenantId?._id || notif.tenantId;
    onLeaveApproved?.({
      tenantId,
      leaveDateISO: notif.leaveDate,
    });
  };

  const rejectLeave = async (notif) => {
    const id = notif.requestId || notif._id;
    await axios.post(`${apiUrl}admin/leave/${id}/reject`, {});
    setItems((prev) => prev.filter((x) => x._id !== notif._id));
  };

  // --- Mark seen (attendance/system) ---
 // --- Mark seen (attendance/system) ---
const markSeen = async (id) => {
  // Instantly remove from UI
  setItems((prev) => prev.filter((x) => x._id !== id));

  // Fire-and-forget backend call (no alert or blocking)
  try {
    await axios.post(`${apiUrl}admin/notifications/${id}/seen`, {});
    console.log("✅ Notification marked as seen:", id);
  } catch (e) {
    console.warn("⚠️ Failed to update read status on backend:", e?.response?.data?.message || e.message);
    // Don’t restore it back — we remove visually anyway
  }
};


  const panelStyle = isMobile
    ? {
        position: "fixed",
        left: 15,
        right: 15,
        top: 64,
        zIndex: 1055,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 20px 60px rgba(2,6,23,.25)",
        padding: 8,
        maxHeight: "65vh",
        overflowY: "auto",
      }
    : { minWidth: 360, maxWidth: 400, maxHeight: 420, overflowY: "auto" };

  const wrapText = { wordBreak: "break-word", overflowWrap: "anywhere" };

  return (
    <div className="dropdown" style={{ position: "relative" }}>
      <button
        className="btn position-relative"
        type="button"
        style={{ padding: 0, borderRadius: "none" }}
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
      >
        <i
          className="bi bi-bell"
          style={{
            fontSize: "1.2rem",
            backgroundColor: "#ffc107",
            padding: 4,
            borderRadius: "25%",
          }}
        />
        {items.length > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style={{ fontSize: "0.7rem" }}
          >
            {items.length > 99 ? "99+" : items.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className={isMobile ? "p-2" : "dropdown-menu dropdown-menu-end show p-2"}
          style={{
            ...panelStyle,
            ...(isMobile ? {} : { position: "absolute", right: 0, marginRight: 0 }),
          }}
        >
          {/* Header */}
          <div className="d-flex align-items-center justify-content-between px-2 mb-2" style={wrapText}>
            <strong>Notifications</strong>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-secondary" onClick={fetchAll}>
                ↻
              </button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
          </div>

          {loading && <div className="text-muted px-2 py-1">Loading…</div>}
          {err && <div className="text-danger px-2 py-1">{err}</div>}
          {items.length === 0 && !loading && (
            <div className="text-muted px-2 py-2">No new notifications</div>
          )}

          {items.map((n) => {
            const isLeave = n.type === "leave_request";
            const isAttendance = n.type === "system" && /^attendance_/.test(n?.payload?.kind || "");
            const when = n?.payload?.whenISO
              ? new Date(n.payload.whenISO).toLocaleString()
              : "";
            const where = n?.payload?.where || {};
            const mapUrl =
              where.lat && where.lng ? `https://maps.google.com/?q=${where.lat},${where.lng}` : null;

            const tenantObj = n.tenantId && typeof n.tenantId === "object" ? n.tenantId : {};
            const tenantName = n.tenantName || tenantObj.name || "Tenant";
            const roomNo = n.roomNo ?? tenantObj.roomNo ?? "—";
            const bedNo = n.bedNo ?? tenantObj.bedNo ?? "—";
            const pay = n.paymentId || {};

            return (
              <div key={n._id} className="border rounded p-2 mb-2 bg-white" style={wrapText}>
                <div className="d-flex justify-content-between align-items-baseline">
                  <div className="fw-semibold">
                    {tenantName} • Room {roomNo} • Bed {bedNo}
                  </div>
                  <div className="small text-muted">
                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                  </div>
                </div>

                {/* Attendance Notification */}
                {isAttendance ? (
                  <>
                    <div className="small text-muted mt-1">
                      {n.payload.kind === "attendance_late"
                        ? "Late reported:"
                        : n.payload.kind === "attendance_checkin"
                        ? "Check-In:"
                        : "Check-Out:"}{" "}
                      <b>{when || "—"}</b>
                      {mapUrl && (
                        <>
                          {" "}
                          —{" "}
                          <a href={mapUrl} target="_blank" rel="noreferrer">
                            map
                          </a>
                        </>
                      )}
                    </div>
                    {n.payload.reason && (
                      <div className="small text-muted">Reason: {n.payload.reason}</div>
                    )}
                    {where.accuracy && (
                      <div className="small text-muted">
                        Accuracy ±{Math.round(where.accuracy)} m
                      </div>
                    )}
                    <div className="d-flex gap-2 mt-2">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => markSeen(n._id)}
                      >
                        Acknowledge
                      </button>
                    </div>
                  </>
                ) : isLeave ? (
                  <>
                    <div className="small text-muted mt-1">
                      Leave request for{" "}
                      <strong>
                        {n.leaveDate ? new Date(n.leaveDate).toLocaleDateString() : "—"}
                      </strong>
                    </div>
                    {n.note && <div className="small text-muted">Reason: {n.note}</div>}
                    <div className="d-flex gap-2 mt-2">
                      <button className="btn btn-sm btn-success" onClick={() => approveLeave(n)}>
                        Approve
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => rejectLeave(n)}
                      >
                        Reject
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="small text-muted mt-1">
                      Payment: {fmtINR(pay.amount)} for {mmYY(pay.month, pay.year)}
                    </div>
                    {pay.utr && (
                      <div className="small">
                        UTR: <span className="text-dark">{pay.utr}</span>
                      </div>
                    )}
                    {pay.note && <div className="small text-muted">Note: {pay.note}</div>}
                    <div className="d-flex gap-2 mt-2">
                      <button className="btn btn-sm btn-success" onClick={() => approvePayment(n)}>
                        Approve
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => rejectPayment(n)}
                      >
                        Reject
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
