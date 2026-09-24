import React from "react";
const Money = ({ v=0 }) => <>₹{Number(v||0).toLocaleString("en-IN")}</>;

export default function TenantRent({ rents }) {
  const y = rents?.currentYear || new Date().getFullYear();
  const card = { background:"#fff", borderRadius:14, boxShadow:"0 8px 30px rgba(16,24,40,.06)", padding:16, marginBottom:16 };

  return (
    <div style={card}>
      <h5 style={{ margin:0, marginBottom:10 }}>Rent — {y}</h5>
      <div style={{ overflowX:"auto" }}>
        <table className="table" style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr><th>Month</th><th>Date</th><th>Mode</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {Array.from({length:12},(_,i)=>{
              const md = new Date(y,i,1);
              const rec = rents?.rents?.find(r=>{
                if(!r?.date) return false;
                const d = new Date(r.date);
                return d.getMonth()===i && d.getFullYear()===y;
              });
              const isFuture = md>new Date();
              return (
                <tr key={i}>
                  <td>{md.toLocaleString("default",{month:"long"})}</td>
                  <td>{rec ? new Date(rec.date).toLocaleDateString("en-GB") : "—"}</td>
                  <td>{rec ? (rec.paymentMode||"Cash") : "—"}</td>
                  <td>{rec ? <Money v={rec.rentAmount}/> : "—"}</td>
                  <td>{rec ? <span className="badge bg-success">Paid</span> : isFuture ? <span className="badge bg-warning text-dark">Upcoming</span> : <span className="badge bg-danger">Pending</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
