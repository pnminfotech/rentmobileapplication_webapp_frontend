import React, { useRef } from "react";
import {
  FaArrowLeft,
  FaBell,
  FaBed,
  FaCalendarAlt,
  FaDownload,
  FaEdit,
  FaExchangeAlt,
  FaHistory,
  FaInfoCircle,
  FaPhoneAlt,
  FaSignOutAlt,
  FaTrash,
  FaPlus,
  FaThLarge,
  FaEdit as FaEditSmall,
} from "react-icons/fa";
import MobileMonthNavigator from "./MobileMonthNavigator";
import "./RentTenantProfile.css";

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getInitials(name = "") {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "T";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getStatusTone(label = "") {
  const normalized = String(label).toLowerCase();
  if (!normalized || normalized === "-" || normalized === "N/A") return "empty";
  if (normalized.startsWith("paid")) return "paid";
  if (normalized.startsWith("due")) return "due";
  if (normalized.startsWith("pend")) return "pend";
  if (normalized.startsWith("upcoming")) return "upcoming";
  return "pend";
}

function getMonthWindow(visibleMonths = []) {
  return Array.isArray(visibleMonths) ? [...visibleMonths].slice(-3) : [];
}

function getAmountText(cell) {
  if (!cell) return "-";

  const label = String(cell.label || "").toLowerCase();
  const paid = toNum(cell.amountPaid);
  const expected = toNum(cell.expected);
  const outstanding = toNum(cell.outstanding);

  if (!label || label === "-" || label === "N/A") return "-";
  if (label.startsWith("paid")) {
    return `${paid.toLocaleString("en-IN")} / ${expected.toLocaleString("en-IN")}`;
  }
  if (label.startsWith("due")) return `${(outstanding || expected).toLocaleString("en-IN")}`;
  if (label.startsWith("pend")) {
    if (paid > 0 && expected > 0) {
      return `${paid.toLocaleString("en-IN")} / ${expected.toLocaleString("en-IN")}`;
    }
    return `${(outstanding || expected).toLocaleString("en-IN")}`;
  }
  if (label.startsWith("upcoming")) return `${expected.toLocaleString("en-IN")}`;
  return `${(paid || expected || outstanding).toLocaleString("en-IN")}`;
}

function getDateText(cell) {
  if (!cell) return "";

  const label = String(cell.label || "").toLowerCase();
  if (
    !label.startsWith("paid") &&
    !label.startsWith("pend") &&
    !label.startsWith("due") &&
    !label.startsWith("upcoming")
  ) {
    return "";
  }

  return cell.dateStr || "";
}

function getCanteenText(cell) {
  const amount = toNum(cell?.canteenAmount);
  if (amount <= 0) return "";
  return `+ ${amount.toLocaleString("en-IN")} Canteen`;
}

function RentTenantProfileViewCard({
  tenant,
  visibleMonths = [],
  getTenantPhotoMeta,
  photoTransformStyle,
  roomColorStyleMap = {},
  getMonthCell,
  onBack,
  onOpenDetails,
  onOpenAdmissionForm,
  onEditPhoto,
  onEditMonth,
  onPrevMonths,
  onNextMonths,
  canPrevMonths = true,
  canNextMonths = true,
  onOpenHistory,
  onEditCurrentMonth,
  onEditTenant,
  onDeleteTenant,
  onShiftTenant,
  onLeave,
  onHoliday,
  onOpenLeavedTenants,
  onOpenVacantBeds,
  onManageRooms,
  onAddTenant,
  onDownloadExcel,
}) {
  const monthSwipeStartX = useRef(null);
  if (!tenant) return null;

  const photoMeta = getTenantPhotoMeta ? getTenantPhotoMeta(tenant) : null;
  const roomStyle =
    roomColorStyleMap[String(tenant.roomNo ?? "").trim()] || {
      backgroundColor: "#5f7dfc",
      border: "1px solid #4c66d8",
      color: "#ffffff",
    };

  const monthWindow = getMonthWindow(visibleMonths);
  const activeMonth = monthWindow[monthWindow.length - 1];
  const activeCell = activeMonth
    ? getMonthCell?.(tenant, activeMonth.y, activeMonth.m)
    : null;
  const statusLabel = activeCell?.label || "Pending";
  const statusTone = getStatusTone(statusLabel);
  const canOpenAdmissionForm = typeof onOpenAdmissionForm === "function";

  const handleMonthTouchStart = (event) => {
    monthSwipeStartX.current = event.touches?.[0]?.clientX ?? null;
  };

  const handleMonthTouchEnd = (event) => {
    if (monthSwipeStartX.current == null) return;
    const endX = event.changedTouches?.[0]?.clientX ?? monthSwipeStartX.current;
    const deltaX = endX - monthSwipeStartX.current;
    monthSwipeStartX.current = null;

    if (Math.abs(deltaX) < 45) return;
    if (deltaX < 0 && canNextMonths) onNextMonths?.(event);
    if (deltaX > 0 && canPrevMonths) onPrevMonths?.(event);
  };

  const handleMonthWheel = (event) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) < 35) return;
    if (delta > 0 && canNextMonths) onNextMonths?.(event);
    if (delta < 0 && canPrevMonths) onPrevMonths?.(event);
  };

  return (
    <div className="rent-mobile-profile-screen">
      <div className="rent-mobile-profile-shell">
        <div className="rent-mobile-profile-topbar">
          <button type="button" className="rent-mobile-icon-btn" onClick={onBack} aria-label="Back">
            <FaArrowLeft />
          </button>
          <div className="rent-mobile-profile-topbar-title">Tenant Profile</div>
          <button type="button" className="rent-mobile-icon-btn" aria-label="Notifications">
            <FaBell />
          </button>
        </div>

        <div className="rent-mobile-launch-row">
          <button
            type="button"
            className="rent-mobile-leaved-btn"
            onClick={onOpenLeavedTenants}
          >
            <FaSignOutAlt />
            <span>Leaved Tenants</span>
          </button>

          <button
            type="button"
            className="rent-mobile-vacant-btn"
            onClick={onOpenVacantBeds}
          >
            <FaBed />
            <span>Vacant Beds</span>
          </button>
        </div>

        <MobileMonthNavigator
          visibleMonths={monthWindow}
          title="Rent Months"
          onPrev={onPrevMonths}
          onNext={onNextMonths}
          canPrev={canPrevMonths}
          canNext={canNextMonths}
        />

        <div className="rent-mobile-profile-card">
          <div className="rent-mobile-profile-head">
            <div
              className="rent-mobile-profile-avatar rent-mobile-profile-avatar-btn"
              role={canOpenAdmissionForm ? "button" : undefined}
              tabIndex={canOpenAdmissionForm ? 0 : undefined}
              onClick={() => onOpenAdmissionForm?.(tenant)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canOpenAdmissionForm) onOpenAdmissionForm?.(tenant);
              }}
              title={canOpenAdmissionForm ? "Open admission form" : undefined}
            >
              {photoMeta?.photoUrl ? (
                <img
                  src={photoMeta.photoUrl}
                  alt=""
                  style={
                    photoMeta.photoTransform
                      ? photoTransformStyle?.(photoMeta.photoTransform)
                      : undefined
                  }
                />
              ) : (
                getInitials(tenant.name)
              )}
              {photoMeta?.photoUrl && onEditPhoto ? (
                <button
                  type="button"
                  className="rent-mobile-photo-edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditPhoto?.(tenant);
                  }}
                  title="Edit photo position"
                  aria-label="Edit photo position"
                >
                  <FaEditSmall />
                </button>
              ) : null}
            </div>

            <div className="rent-mobile-profile-main">
              <div className="rent-mobile-profile-name">{tenant.name || "Tenant"}</div>
              <div className="rent-mobile-profile-sub">
                {/* <FaBed /> */}
                {/* <span>
                  Room {tenant.roomNo || "-"} {tenant.bedNo ? `- Bed ${tenant.bedNo}` : ""}
                </span> */}
              </div>
              <div className="rent-mobile-profile-sub">
                {/* <FaPhoneAlt /> */}
                <span>Deposit: Rs. {toNum(tenant.depositAmount).toLocaleString("en-IN")}</span>
              </div>
              {tenant.phoneNo ? (
                <div className="rent-mobile-profile-sub">
                  <FaPhoneAlt />
                  <span>{tenant.phoneNo}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rent-mobile-profile-pill-row">
            <span className="room-pill" style={roomStyle}>
              Room {tenant.roomNo || "-"}
              {tenant.bedNo ? ` - Bed ${tenant.bedNo}` : ""}
            </span>
            <span className={`rent-status-pill ${statusTone}`}>{statusLabel}</span>
          </div>

          <div
            className={`rent-mobile-profile-months rent-mobile-month-strip ${canPrevMonths ? "can-prev" : ""} ${canNextMonths ? "can-next" : ""}`}
            onTouchStart={handleMonthTouchStart}
            onTouchEnd={handleMonthTouchEnd}
            onWheel={handleMonthWheel}
            aria-label="Swipe horizontally to navigate months"
          >
            {monthWindow.map((month) => {
              const cell = month ? getMonthCell?.(tenant, month.y, month.m) : null;
              const monthTone = getStatusTone(cell?.label || "Pending");

              return (
                <button
                  key={`${tenant._id}-${month?.y}-${month?.m}`}
                  type="button"
                  className={`rent-month-card rent-month-card-clickable rent-month-card-profile ${monthTone}`}
                  onClick={() => onEditMonth?.(tenant, month)}
                >
                  <div className="rent-month-title">{month?.label || ""}</div>
                  <div className={`rent-month-status-btn ${monthTone}`}>
                    <span className="rent-month-status-label">{cell?.label || "-"}</span>
                    {getDateText(cell) ? (
                      <span className="rent-month-status-date">{getDateText(cell)}</span>
                    ) : null}
                  </div>
                  <div className="rent-month-range">{cell?.rangeText || "-"}</div>
                  <div className="rent-month-amount">{getAmountText(cell)}</div>
                  {getCanteenText(cell) ? (
                    <div className="rent-month-amount" style={{ color: "#198754" }}>
                      {getCanteenText(cell)}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="rent-mobile-profile-actions">
            <button type="button" className="rent-profile-action warn" onClick={() => onEditTenant?.(tenant)}>
              <FaEdit />
              <span>Edit Tenant</span>
            </button>
            <button type="button" className="rent-profile-action danger" onClick={() => onDeleteTenant?.(tenant)}>
              <FaTrash />
              <span>Delete Tenant</span>
            </button>
            {/* <button type="button" className="rent-profile-action primary" onClick={() => onOpenDetails?.(tenant)}>
              <FaInfoCircle />
              <span>Details</span>
            </button> */}
            {/* <button type="button" className="rent-profile-action secondary" onClick={() => onOpenHistory?.(tenant)}>
              <FaHistory />
              <span>History</span>
            </button> */}
            <button type="button" className="rent-profile-action warn" onClick={() => onEditCurrentMonth?.(tenant)}>
              <FaEdit />
              <span>Payment</span>
            </button>
            <button type="button" className="rent-profile-action ghost" onClick={() => onShiftTenant?.(tenant)}>
              <FaExchangeAlt />
              <span>Shift</span>
            </button>
            <button type="button" className="rent-profile-action danger" onClick={() => onLeave?.(tenant)}>
              <FaSignOutAlt />
              <span>Leave Tenant</span>
            </button>
           
          </div>
        </div>

        <div className="rent-mobile-bottom-bar">
          <button
            type="button"
            className="rent-mobile-bottom-action"
            onClick={onManageRooms}
          >
            <span className="rent-mobile-bottom-icon">
              <FaThLarge />
            </span>
            <span>Add Room</span>
          </button>

          <button
            type="button"
            className="rent-mobile-bottom-action"
            onClick={onAddTenant}
          >
            <span className="rent-mobile-bottom-icon">
              <FaPlus />
            </span>
            <span>Add Tenant</span>
          </button>

          <button
            type="button"
            className="rent-mobile-bottom-action"
            onClick={onDownloadExcel}
          >
            <span className="rent-mobile-bottom-icon">
              <FaDownload />
            </span>
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default RentTenantProfileViewCard;
