import React from "react";
import "./RentTracker.css";

function RentSummaryCards({
  totalBeds,
  occupiedBeds,
  vacantBeds,
  pendingRents,
  upcomingRents,
  canteenDues = 0,
  canteenTenants = 0,
  trackerType = "bed",
  onVacantClick,
  onPendingClick,
  onUpcomingClick,
  onCanteenDuesClick,
  onCanteenTenantsClick,
}) {
  const totalLabel =
    trackerType === "shop" ? "Total Shops" : trackerType === "room" ? "Total Rooms" : "Total Beds";
  const vacantLabel =
    trackerType === "shop" ? "Vacant Shops" : trackerType === "room" ? "Vacant Rooms" : "Vacant Beds";
  const vacantTitle =
    trackerType === "shop"
      ? "Click to view vacant shops"
      : trackerType === "room"
        ? "Click to view vacant rooms"
        : "Click to view vacant beds";
  const cardColumnClass = "col-xl col-lg-4 col-sm-6";
  const showCanteenCards = trackerType === "bed";
  const rowClassName = `row g-3 mb-2 summary-row rent-summary-row ${
    showCanteenCards ? "rent-summary-row--seven" : "rent-summary-row--five"
  }`;

  return (
    <div className={rowClassName}>
      <div className={cardColumnClass}>
        <div className="summary-card blue">
          <div className="summary-left">
            <div className="summary-icon">🛏️</div>
            <div className="summary-text">
              <div className="summary-title">{totalLabel}</div>
            </div>
          </div>
          <div className="summary-number">{totalBeds}</div>
        </div>
      </div>

      <div className={cardColumnClass}>
        <div className="summary-card green">
          <div className="summary-left">
            <div className="summary-icon">🛌</div>
            <div className="summary-text">
              <div className="summary-title">Occupied</div>
            </div>
          </div>
          <div className="summary-number">{occupiedBeds}</div>
        </div>
      </div>

      <div className={cardColumnClass}>
        <div
          className="summary-card orange"
          role={onVacantClick ? "button" : undefined}
          style={onVacantClick ? { cursor: "pointer" } : undefined}
          onClick={onVacantClick}
          title={onVacantClick ? vacantTitle : undefined}
        >
          <div className="summary-left">
            <div className="summary-icon">🛌</div>
            <div className="summary-text">
              <div className="summary-title">{vacantLabel}</div>
            </div>
          </div>
          <div className="summary-number">{vacantBeds}</div>
        </div>
      </div>

      <div className={cardColumnClass}>
        <div
          className="summary-card red"
          role={onPendingClick ? "button" : undefined}
          style={onPendingClick ? { cursor: "pointer" } : undefined}
          onClick={onPendingClick}
          title={onPendingClick ? "Click to view pending tenants" : undefined}
        >
          <div className="summary-left">
            <div className="summary-icon">⏳</div>
            <div className="summary-text">
              <div className="summary-title">Pending Rents</div>
            </div>
          </div>
          <div className="summary-number">{pendingRents}</div>
        </div>
      </div>

      <div className={cardColumnClass}>
        <div
          className="summary-card purple"
          role={onUpcomingClick ? "button" : undefined}
          style={onUpcomingClick ? { cursor: "pointer" } : undefined}
          onClick={onUpcomingClick}
          title={onUpcomingClick ? "Click to view upcoming rents" : undefined}
        >
          <div className="summary-left">
            <div className="summary-icon">🗓️</div>
            <div className="summary-text">
              <div className="summary-title">Upcoming Rents</div>
            </div>
          </div>
          <div className="summary-number">{upcomingRents}</div>
        </div>
      </div>

      {showCanteenCards && (
        <div className={cardColumnClass}>
          <div
            className="summary-card red"
            role={onCanteenDuesClick ? "button" : undefined}
            style={onCanteenDuesClick ? { cursor: "pointer" } : undefined}
            onClick={onCanteenDuesClick}
            title={onCanteenDuesClick ? "Click to view canteen dues" : undefined}
          >
            <div className="summary-left">
              <div className="summary-icon">🚪</div>
              <div className="summary-text">
                <div className="summary-title">Canteen Dues</div>
              </div>
            </div>
            <div className="summary-number">{canteenDues}</div>
          </div>
        </div>
      )}

      {showCanteenCards && (
        <div className={cardColumnClass}>
          <div
            className="summary-card green"
            role={onCanteenTenantsClick ? "button" : undefined}
            style={onCanteenTenantsClick ? { cursor: "pointer" } : undefined}
            onClick={onCanteenTenantsClick}
            title={onCanteenTenantsClick ? "Click to view canteen tenants" : undefined}
          >
            <div className="summary-left">
              <div className="summary-icon">🍽️</div>
              <div className="summary-text">
                <div className="summary-title">Canteen Tenants</div>
              </div>
            </div>
            <div className="summary-number">{canteenTenants}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RentSummaryCards;
