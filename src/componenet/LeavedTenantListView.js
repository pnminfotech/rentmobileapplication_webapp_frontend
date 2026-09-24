import React from "react";
import { FaBed, FaDownload, FaHistory, FaUndo } from "react-icons/fa";
import "./LeavedTenantListView.css";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getUndoAllowed(leaveDate) {
  if (!leaveDate) return false;
  const date = new Date(leaveDate);
  if (Number.isNaN(date.getTime())) return false;

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
  if (!Array.isArray(tenants) || tenants.length === 0) return null;

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

      <div className="leaved-mobile-list">
        {tenants.map((tenant) => {
          const leaveDate = tenant?.leaveDate ? new Date(tenant.leaveDate) : null;
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
      </div>
    </section>
  );
}

export default LeavedTenantListView;
