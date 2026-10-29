import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaFileExcel, FaHistory, FaTimes, FaUsers } from "react-icons/fa";
import { api } from "../api";
import { downloadUnitHistory } from "../utils/unitHistoryExport";
import "../Pages/UnitHistory.css";

const dateLabel = (value) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const amountLabel = (value) => value == null || value === "" ? "Not recorded" : `Rs. ${Number(value).toLocaleString("en-IN")}`;

export default function UnitHistoryModal({ room, bedNo, onClose }) {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadError, setDownloadError] = useState("");
  const type = room.propertyType === "shop" ? "Shop" : room.propertyType === "room" ? "Room" : "Hostel room";
  const unitBed = bedNo ? (room.beds || []).find((bed) => String(bed.bedNo).toLowerCase() === String(bedNo).toLowerCase()) : room.propertyType !== "bed" ? room.beds?.[0] : null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api.get(`/rooms/${encodeURIComponent(room._id)}/history`, { params: bedNo ? { bedNo } : {} })
      .then(({ data }) => { if (!cancelled) setHistory(data); })
      .catch((failure) => { if (!cancelled) setError(failure?.response?.data?.message || "Could not load unit history."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [room._id, bedNo]);

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const handleDownload = () => {
    try {
      setDownloadError("");
      downloadUnitHistory(history, room, bedNo);
    } catch (failure) {
      console.error("Unable to download unit history:", failure);
      setDownloadError("Could not download the Excel file. Please try again.");
    }
  };

  const content = (
    <div className="unit-history-backdrop" onClick={onClose}>
      <section className="unit-history-dialog" role="dialog" aria-modal="true" aria-labelledby="unit-history-title" onClick={(event) => event.stopPropagation()}>
        <header className="unit-history-header">
          <div>
            <h2 id="unit-history-title"><FaHistory /> Unit history</h2>
            <p>{[room.category, room.wingName && `Wing ${room.wingName}`, room.floorNo && `Floor ${room.floorNo}`, `${type} ${room.roomNo}`, bedNo && `Bed ${bedNo}`].filter(Boolean).join(" · ")}</p>
            <p>{[room.flatType && `Type: ${room.flatType}`, room.meterNo && `Meter: ${room.meterNo}`, unitBed?.price != null && `Unit rent: ${amountLabel(unitBed.price)}`].filter(Boolean).join(" · ")}</p>
          </div>
          <button type="button" className="unit-history-close" onClick={onClose} aria-label="Close unit history"><FaTimes /></button>
        </header>
        <div className="unit-history-body">
          {loading && <p className="unit-history-empty" role="status">Loading unit history...</p>}
          {error && <div className="alert alert-danger" role="alert">{error}</div>}
          {downloadError && <div className="alert alert-danger" role="alert">{downloadError}</div>}
          {!loading && !error && history && <>
            <div className="unit-history-summary">
              <div><FaUsers /><span><strong>{history.totalTenants}</strong> {history.totalTenants === 1 ? "tenant" : "tenants"}</span></div>
              <div><FaHistory /><span><strong>{history.totalStays}</strong> {history.totalStays === 1 ? "stay" : "stays"}</span></div>
            </div>
            <p className="unit-history-note">History includes available past and current tenant records. Older moves may be missing when their unit details were not recorded.</p>
            {history.records.length === 0 ? <p className="unit-history-empty">No tenant history is available for this unit yet.</p> : (
              <div className="unit-history-list">
                {history.records.map((record, index) => {
                  const details = record.tenantDetails || {};
                  const address = [details.houseNo, details.address, details.nearbyPlace, details.city, details.state, details.pincode].filter(Boolean).join(", ");
                  return <article className="unit-history-card" key={record._id || `${record.tenantId}-${index}`}>
                    <div className="unit-history-card-head">
                      <div><strong>{record.tenantName || "Tenant"}</strong><span>{record.phoneNo || "Phone not recorded"}</span></div>
                      <span className={`unit-history-status is-${String(record.status || "former").toLowerCase()}`}>{record.status}</span>
                    </div>
                    <div className="unit-history-grid">
                      {room.propertyType === "bed" && <div><span>Bed</span><strong>{record.bedNo || "Not recorded"}</strong></div>}
                      <div><span>Stay started</span><strong>{dateLabel(record.startedAt)}</strong></div>
                      <div><span>Stay ended</span><strong>{record.endedAt ? dateLabel(record.endedAt) : record.status === "Current" ? "Current" : "Not recorded"}</strong></div>
                      <div><span>Monthly rent</span><strong>{amountLabel(record.monthlyRent)}</strong></div>
                      <div><span>Deposit</span><strong>{amountLabel(record.depositAmount)}</strong></div>
                    </div>
                    {record.source === "existing_record" && <p className="unit-history-legacy">The start date comes from the tenant's joining date; their original unit start date may differ.</p>}
                    <details className="unit-history-details"><summary>More tenant details</summary>
                      <dl>
                        <div><dt>Joining date</dt><dd>{dateLabel(record.joiningDate)}</dd></div>
                        {details.dob && <div><dt>Date of birth</dt><dd>{dateLabel(details.dob)}</dd></div>}
                        <div><dt>Address</dt><dd>{address || "Not recorded"}</dd></div>
                        <div><dt>Rent cycle</dt><dd>{details.firstRentStatus === "ADVANCE_PAID" ? "Pay at joining" : details.firstRentStatus === "NOT_PAID" ? "Pay at month end" : "Not recorded"}</dd></div>
                        {details.familyMembers != null && <div><dt>Family members</dt><dd>{details.familyMembers}</dd></div>}
                        {details.shopName && <div><dt>Shop name</dt><dd>{details.shopName}</dd></div>}
                        {details.shopBusiness && <div><dt>Business</dt><dd>{details.shopBusiness}</dd></div>}
                        {details.companyAddress && <div><dt>Business address</dt><dd>{details.companyAddress}</dd></div>}
                        {details.relative1Name && <div><dt>{details.relative1Relation || "Contact"}</dt><dd>{[details.relative1Name, details.relative1Phone].filter(Boolean).join(" · ")}</dd></div>}
                        {details.relative2Name && <div><dt>{details.relative2Relation || "Contact"}</dt><dd>{[details.relative2Name, details.relative2Phone].filter(Boolean).join(" · ")}</dd></div>}
                        {details.hasCanteen && <div><dt>Canteen</dt><dd>Included</dd></div>}
                        {record.endReason && <div><dt>Reason</dt><dd>{record.endReason === "shifted" ? "Moved to another unit" : record.endReason === "left" ? "Tenant left" : record.endReason === "removed" ? "Tenant record removed" : "Unit unassigned"}</dd></div>}
                      </dl>
                    </details>
                  </article>;
                })}
              </div>
            )}
          </>}
        </div>
        <footer className="unit-history-footer">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button>
          <button type="button" className="btn btn-success" onClick={handleDownload} disabled={loading || Boolean(error) || !history}><FaFileExcel className="me-2" />Download Excel</button>
        </footer>
      </section>
    </div>
  );
  return createPortal(content, document.body);
}
