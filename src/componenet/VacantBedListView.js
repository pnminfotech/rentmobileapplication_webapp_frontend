import React from "react";
import { FaArrowLeft, FaBed, FaPlus } from "react-icons/fa";
import "./VacantBedListView.css";

function formatMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString("en-IN") : "0";
}

function VacantBedListView({
  beds = [],
  title = "Vacant Beds",
  subtitle = "Tap a bed to add a tenant",
  onAddTenant,
  onBack,
  trackerType = "bed",
}) {
  const bedList = Array.isArray(beds) ? beds : [];
  const isShop = trackerType === "shop";

  return (
    <section className="vacant-mobile-section">
      <div className="vacant-mobile-header">
        <button
          type="button"
          className="vacant-mobile-back"
          onClick={onBack}
          title="Back"
        >
          <FaArrowLeft />
        </button>

        <div>
          <h5 className="vacant-mobile-title">{title}</h5>
          <div className="vacant-mobile-subtitle">{subtitle}</div>
        </div>

        <div className="vacant-mobile-count">
          {bedList.length} {isShop ? "shops" : "beds"}
        </div>
      </div>

      <div className="vacant-mobile-list">
        {bedList.length ? (
          bedList.map((bed, index) => (
            <article
              key={`${bed.roomNo ?? "room"}-${bed.bedNo ?? "bed"}-${index}`}
              className="vacant-mobile-card"
            >
              <div className="vacant-mobile-card-main">
                <div className="vacant-mobile-card-top">
                  <div className="vacant-mobile-room">
                    <FaBed />
                    <span>
                      {isShop ? "Shop" : "Room"} {bed.roomNo || "-"}
                      {!isShop && bed.bedNo ? ` - Bed ${bed.bedNo}` : ""}
                    </span>
                  </div>
                  <span className="vacant-mobile-status">Vacant</span>
                </div>

                <div className="vacant-mobile-name">{bed.category || "Bed"}</div>
                <div className="vacant-mobile-meta">Floor: {bed.floorNo || "-"}</div>
                <div className="vacant-mobile-meta">
                  Price: Rs. {formatMoney(bed.price)}
                </div>
              </div>

              <button
                type="button"
                className="vacant-mobile-action"
                onClick={() => onAddTenant?.(bed.roomNo, bed.bedNo)}
              >
                <FaPlus />
                <span>Add Tenant</span>
              </button>
            </article>
          ))
        ) : (
          <div className="vacant-mobile-empty">No vacant beds found.</div>
        )}
      </div>
    </section>
  );
}

export default VacantBedListView;
