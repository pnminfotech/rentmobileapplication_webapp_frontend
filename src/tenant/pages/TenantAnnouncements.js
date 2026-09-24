import React, { useState } from "react";
import axios from "axios";
import { API, authHeader } from "../tenantApi";

export default function TenantLeave({ me, onChanged }) {
  const [leaveDate, setLeaveDate] = useState("");
  const card = { background:"#fff", borderRadius:14, boxShadow:"0 8px 30px rgba(16,24,40,.06)", padding:16, marginBottom:16 };

  const submit = async () => {
    if (!leaveDate) return alert("Pick a date");
    await axios.post(`${API}/tenant/leave`, { leaveDate }, { headers: authHeader() });
    setLeaveDate(""); onChanged && onChanged();
    alert("Leave request submitted");
  };

  return (
    <div style={card}>
      <h5 style={{ margin:0, marginBottom:10 }}>Leave Request</h5>
      <div style={{ color:"#6b7280", fontSize:12, marginBottom:8 }}>
        Proposed leave date. Admin will review & confirm.
      </div>
      <input type="date" value={leaveDate} onChange={e=>setLeaveDate(e.target.value)} style={{ marginBottom:10 }}/>
      <button onClick={submit} style={btnWarn}>Submit</button>
      {me?.leaveRequestDate && (
        <div style={{ marginTop:10, fontSize:12 }}>
          Last requested: <b>{new Date(me.leaveRequestDate).toLocaleDateString("en-GB")}</b>
        </div>
      )}
    </div>
  );
}
const btnWarn = { padding:"8px 12px", border:0, borderRadius:10, background:"#f59e0b", color:"#fff", cursor:"pointer" };
