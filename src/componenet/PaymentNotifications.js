// src/components/PaymentNotifications.js
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function PaymentNotifications() {
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        // was: /api/tenant-payments/reports
        `/api/payments/notifications`,
        { params: { status: statusFilter, limit: 50 } }
      );
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, [statusFilter]);

  const markAllRead = async () => {
    await axios.post(
      // was: /api/tenant-payments/read-all
      `/api/payments/notifications/read-all`,
      { status: statusFilter }
    );
    fetchReports();
  };

  const markOneRead = async (id) => {
    await axios.patch(
      // was: /api/tenant-payments/:id/read
      `/api/payments/notifications/${id}/read`
    );
    fetchReports();
  };

  const approve = async (id) => {
    await axios.post(
      // was: /api/tenant-payments/approve/:id
      `/api/payments/approve/${id}`
    );
    fetchReports();
  };

  const reject = async (id) => {
    await axios.post(
      // was: /api/tenant-payments/reject/:id
      `/api/payments/reject/${id}`
    );
    fetchReports();
  };

  return (
    <div style={{ background:"#0b1220", color:"#e5e7eb", borderRadius:12, boxShadow:"0 12px 40px rgba(0,0,0,.35)" }}>
      <div style={{ padding:12, borderBottom:"1px solid rgba(255,255,255,.08)" }}>
        <div style={{ fontWeight:800, fontSize:14 }}>Payment Notifications</div>
        <div style={{ marginTop:8, display:"flex", gap:8 }}>
          {["pending","approved","rejected","all"].map(s => (
            <button
              key={s}
              onClick={()=>setStatusFilter(s)}
              style={{
                padding:"6px 10px",
                borderRadius:8,
                border:"1px solid rgba(255,255,255,.15)",
                background: statusFilter===s?"#111827":"transparent",
                color:"#e5e7eb",
                cursor:"pointer",
                fontSize:12
              }}
            >
              {s}
            </button>
          ))}
          <button
            onClick={markAllRead}
            style={{ marginLeft:"auto", padding:"6px 10px", borderRadius:8, border:"1px solid rgba(255,255,255,.15)", background:"transparent", color:"#e5e7eb", cursor:"pointer", fontSize:12 }}
          >
            Mark all read
          </button>
        </div>
      </div>

      <div style={{ maxHeight:420, overflowY:"auto" }}>
        {loading ? (
          <div style={{ padding:12 }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding:12, color:"#94a3b8" }}>No notifications.</div>
        ) : (
          items.map(n => (
            <div key={n._id} style={{ padding:12, borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", gap:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:13 }}>
                  {n.tenantName || "Tenant"} • Room {n.roomNo || "—"}
                </div>
                <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>
                  Amount ₹{Number(n.amount||0).toLocaleString("en-IN")} • {n.month && n.year ? `${n.month}/${n.year}` : "No month"}
                </div>
                {n.note && <div style={{ fontSize:12, color:"#cbd5e1", marginTop:4 }}>{n.note}</div>}
                <div style={{ marginTop:8, display:"flex", gap:8 }}>
                  {!n.read && (
                    <button onClick={()=>markOneRead(n._id)} style={btn("transparent")}>Mark read</button>
                  )}
                  {n.status==="pending" && (
                    <>
                      <button onClick={()=>approve(n._id)} style={btn("#16a34a")}>Approve</button>
                      <button onClick={()=>reject(n._id)} style={btn("#ef4444")}>Reject</button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ fontSize:11, color:"#94a3b8" }}>
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function btn(bg) {
  return {
    padding:"6px 10px",
    border:"none",
    borderRadius:8,
    background:bg,
    color:"#fff",
    cursor:"pointer",
    fontSize:12
  };
}
