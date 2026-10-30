// src/components/LeaveNotificationBell.jsx
import React from "react";
import axios from "axios";

const adminAuthHeader = () => {
  const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function LeaveNotificationBell({ apiUrl = "    https://rentmobile-api.pnminfotech.com/api/" }) {
  const [items, setItems] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  const fetchLeaves = React.useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const { data } = await axios.get(`${apiUrl}admin/notifications/leave`, {
        params: { status: "pending", limit: 50 },
        headers: adminAuthHeader(),
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  React.useEffect(() => {
    fetchLeaves();
    const id = setInterval(fetchLeaves, 20000);
    return () => clearInterval(id);
  }, [fetchLeaves]);

  const approve = async (n) => {
    try {
      await axios.post(`${apiUrl}admin/leave/${n.requestId}/approve`, {}, { headers: adminAuthHeader() });
      setItems(prev => prev.filter(x => x._id !== n._id));
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Approve failed");
    }
  };

  const reject = async (n) => {
    try {
      await axios.post(`${apiUrl}admin/leave/${n.requestId}/reject`, {}, { headers: adminAuthHeader() });
      setItems(prev => prev.filter(x => x._id !== n._id));
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Reject failed");
    }
  };

  return (
    <div className="dropdown" style={{ position: "relative" }}>
      <button className="btn btn-light position-relative" onClick={() => setOpen(o => !o)} title="Leave notifications">
        <i className="bi bi-bell" style={{ fontSize: "1.2rem", backgroundColor:"#ffc107", padding:"4px", borderRadius:"25%" }} />
        {items.length > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: "0.7rem" }}>
            {items.length > 99 ? "99+" : items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="dropdown-menu dropdown-menu-end show p-2" style={{ minWidth:360, maxWidth:400, maxHeight:420, overflowY:"auto" }}>
          <div className="d-flex align-items-center justify-content-between px-2 mb-2">
            <strong>Leave requests</strong>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-secondary" onClick={fetchLeaves}>Refresh</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>

          {loading && <div className="text-muted px-2 py-1">Loading…</div>}
          {err && <div className="text-danger px-2 py-1">{err}</div>}

          {items.length === 0 && !loading ? (
            <div className="text-muted px-2 py-2">No new leave requests</div>
          ) : items.map(n => (
            <div key={n._id} className="border rounded p-2 mb-2 bg-white">
              <div className="d-flex justify-content-between">
                <div className="fw-semibold">
                  {n.tenantName || "Tenant"} • Room {n.roomNo ?? "—"} • Bed {n.bedNo ?? "—"}
                </div>
                <div className="small text-muted">
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                </div>
              </div>
              <div className="small text-muted mt-1">
                Leave date: <strong>{n.leaveDate ? new Date(n.leaveDate).toLocaleDateString() : "—"}</strong>
              </div>
              {n.note && <div className="small text-muted">Reason: {n.note}</div>}

              <div className="d-flex gap-2 mt-2">
                <button className="btn btn-sm btn-success" onClick={() => approve(n)}>Approve</button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => reject(n)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
