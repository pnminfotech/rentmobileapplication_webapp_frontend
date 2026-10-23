import React from "react";
import { FaBed, FaDownload, FaHistory, FaUndo } from "react-icons/fa";
import "./LeavedTenantListView.css";

function parseDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const ymd = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  if (!value) return "-";
  const date = parseDate(value);
  if (!date) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getUndoAllowed(leaveDate) {
  if (!leaveDate) return false;
  const date = parseDate(leaveDate);
  if (!date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffInDays = (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  return diffInDays >= 0 && diffInDays <= 30;
}

function LeavedTenantListView({
  tenants = [],
  onOpenHistory,
  onUndo,
  onDownload,
  onBack,
}) {
  return (
    <section className="leaved-mobile-section">
      <div className="leaved-mobile-header">
        <button
          type="button"
          className="leaved-mobile-back"
          onClick={onBack}
          title="Back"
        >
          ←
        </button>
        <div>
          <h5 className="leaved-mobile-title">Leaved Tenants</h5>
          <div className="leaved-mobile-subtitle">Tap a tenant to open rent history</div>
        </div>
        <div className="leaved-mobile-count">{tenants.length} tenants</div>
      </div>

      {tenants.length === 0 ? (
        <div className="leaved-mobile-empty">
          <FaHistory />
          <strong>No former tenants found</strong>
          <span>Try clearing the search or selecting “All Records” to view older move-outs.</span>
        </div>
      ) : <div className="leaved-mobile-list">
        {tenants.map((tenant) => {
          const leaveDate = tenant?.leaveDate ? parseDate(tenant.leaveDate) : null;
          const undoAllowed = getUndoAllowed(tenant?.leaveDate);

          return (
            <article
              key={tenant._id}
              className={`leaved-mobile-card ${undoAllowed ? "undo-allowed" : "closed"}`}
              role="button"
              tabIndex={0}
              onClick={() => onOpenHistory?.(tenant)}
              onKeyDown={(e) => e.key === "Enter" && onOpenHistory?.(tenant)}
            >
              <div className="leaved-mobile-card-main">
                <div className="leaved-mobile-card-top">
                  <div className="leaved-mobile-room">
                    <FaBed />
                    <span>
                      Room {tenant.roomNo || "-"}
                      {tenant.bedNo ? ` - Bed ${tenant.bedNo}` : ""}
                    </span>
                  </div>
                  <span className={`leaved-mobile-status ${undoAllowed ? "undo" : "closed"}`}>
                    {undoAllowed ? "Undo open" : "Closed"}
                  </span>
                </div>

                <div className="leaved-mobile-name">{tenant.name || "Tenant"}</div>

                <div className="leaved-mobile-meta">
                  Joined: {formatDate(tenant.joiningDate)}
                </div>
                <div className="leaved-mobile-meta">
                  Left: {formatDate(tenant.leaveDate)}
                </div>
              </div>

              <div className="leaved-mobile-actions">
                <button
                  type="button"
                  className="leaved-mobile-action history"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenHistory?.(tenant);
                  }}
                >
                  <FaHistory />
                  <span>History</span>
                </button>

                <button
                  type="button"
                  className="leaved-mobile-action undo"
                  disabled={!undoAllowed}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (undoAllowed) onUndo?.(tenant._id);
                  }}
                  title={undoAllowed ? "Undo leave" : "Undo available for 30 days after leave date"}
                >
                  <FaUndo />
                  <span>Undo</span>
                </button>

                <button
                  type="button"
                  className="leaved-mobile-action download"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload?.(tenant);
                  }}
                >
                  <FaDownload />
                  <span>Download</span>
                </button>
              </div>

              {leaveDate ? (
                <div className="leaved-mobile-footer">
                  Leave date: {formatDate(leaveDate)}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>}
    </section>
  );
}

export default LeavedTenantListView;
