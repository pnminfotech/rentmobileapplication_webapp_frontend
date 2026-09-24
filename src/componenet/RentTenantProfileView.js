import React from "react";
import {
  FaArrowLeft,
  FaBell,
  FaBed,
  FaCalendarAlt,
  FaEdit,
  FaExchangeAlt,
  FaHistory,
  FaInfoCircle,
  FaPhoneAlt,
  FaSignOutAlt,
  FaTrash,
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
  if (!normalized || normalized === "-" || normalized === "—") return "empty";
  if (normalized.startsWith("paid")) return "paid";
  if (normalized.startsWith("due")) return "due";
  if (normalized.startsWith("pend")) return "pend";
  if (normalized.startsWith("upcoming")) return "upcoming";
  return "pend";
}

function getMonthLabel(month) {
  if (!month) return "";
  if (month.label) return month.label;
  if (typeof month.y === "number" && typeof month.m === "number") {
    return new Date(month.y, month.m, 1).toLocaleString("default", {
      month: "short",
      year: "numeric",
    });
  }
  return "";
}

function isBeforeFirstBillMonth(tenant, month) {
  const joinDate = tenant?.joiningDate ? new Date(tenant.joiningDate) : null;
  if (!joinDate || Number.isNaN(joinDate.getTime()) || !month) return false;

  const firstBillMonth = new Date(joinDate.getFullYear(), joinDate.getMonth() + 1, 1);
  const cellMonth = new Date(month.y, month.m, 1);
  return cellMonth < firstBillMonth;
}

function buildPlaceholderCell() {
  return {
    label: "-",
    dateStr: "-",
    amountPaid: 0,
    expected: 0,
    outstanding: 0,
  };
}

function getAmountText(cell) {
  if (!cell) return "-";

  const label = String(cell.label || "").toLowerCase();
  if (label === "-" || label === "—") return "-";
  const paid = toNum(cell.amountPaid);
  const expected = toNum(cell.expected);
  const outstanding = toNum(cell.outstanding);

  if (label.startsWith("paid")) return `${paid.toLocaleString("en-IN")}`;
  if (label.startsWith("due")) return ` ${(outstanding || expected).toLocaleString("en-IN")}`;
  if (label.startsWith("pend")) {
    if (paid > 0 && expected > 0) {
      return `${paid.toLocaleString("en-IN")} /${expected.toLocaleString("en-IN")}`;
    }
    return `${(outstanding || expected).toLocaleString("en-IN")}`;
  }
  if (label.startsWith("upcoming")) return `${expected.toLocaleString("en-IN")}`;

  return `${(paid || expected || outstanding).toLocaleString("en-IN")}`;
}

function getNoteText(cell) {
  if (!cell) return "";

  const label = String(cell.label || "").toLowerCase();
  if (label === "-" || label === "—") return "";
  if (cell.dateStr && (label.startsWith("paid") || label.startsWith("due") || label.startsWith("upcoming"))) {
    return cell.dateStr;
  }
  if (label.startsWith("pend") && toNum(cell.outstanding) > 0) {
    return `${toNum(cell.outstanding).toLocaleString("en-IN")}`;
  }
  return cell.note || "";
}

function getTenantMonthWindow(visibleMonths = []) {
  return Array.isArray(visibleMonths) ? [...visibleMonths].slice(-3) : [];
}

function RentTenantProfileView({
  tenant,
  visibleMonths = [],
  getTenantPhotoMeta,
  photoTransformStyle,
  roomColorStyleMap = {},
  getMonthCell,
  getCycleRangeStr,
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
}) {
  if (!tenant) return null;

  const photoMeta = getTenantPhotoMeta ? getTenantPhotoMeta(tenant) : null;
  const roomStyle =
    roomColorStyleMap[String(tenant.roomNo ?? "").trim()] || {
      backgroundColor: "#5f7dfc",
      border: "1px solid #4c66d8",
      color: "#ffffff",
    };

  const monthWindow = getTenantMonthWindow(visibleMonths);
  const months = monthWindow.map((month) => {
    const beforeStart = isBeforeFirstBillMonth(tenant, month);
    return {
      month,
      cell: beforeStart
        ? buildPlaceholderCell()
        : month
        ? getMonthCell?.(tenant, month.y, month.m)
        : buildPlaceholderCell(),
      beforeStart,
    };
  });

  const topCell = months[months.length - 1]?.cell || null;
  const statusLabel =
    topCell?.label || months.find((item) => item.cell?.label)?.cell?.label || "Pending";
  const tone = getStatusTone(statusLabel);
  const canOpenAdmissionForm = typeof onOpenAdmissionForm === "function";

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
          visibleMonths={visibleMonths}
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
              {photoMeta?.photoUrl ? (
                <button
                  type="button"
                  className="rent-mobile-photo-edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditPhoto?.(tenant);
                  }}
                  title="Edit photo position"
                >
                  ✎
                </button>
              ) : null}
            </div>

            <div className="rent-mobile-profile-main">
              <div className="rent-mobile-profile-name">{tenant.name || "Tenant"}</div>
              <div className="rent-mobile-profile-sub">
                {/* <FaBed />
                <span>
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
            <span className={`rent-status-pill ${tone}`}>{statusLabel}</span>
          </div>

         

          <div className="rent-mobile-profile-months rent-mobile-month-strip">
            {months.map(({ month, cell, beforeStart }) => {
              const monthLabel = beforeStart ? "-" : getMonthLabel(month);
              const monthTone = getStatusTone(cell?.label || "Pending");
              const cycleRangeStr = beforeStart
                ? "-"
                : month
                ? getCycleRangeStr?.(tenant, month.y, month.m)
                : "-";

              return (
                <div key={`${tenant._id}-${month?.y}-${month?.m}`} className={`rent-month-card ${monthTone}`}>
                  <div className="rent-month-title">{monthLabel}</div>
                  <button
                    type="button"
                    className={`rent-month-status-btn ${monthTone}`}
                    title="Update rent"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditMonth?.(tenant, month);
                    }}
                  >
                    <span className="rent-month-status-label">{cell?.label || "-"}</span>
                    {getNoteText(cell) ? (
                      <span className="rent-month-status-date">{getNoteText(cell)}</span>
                    ) : null}
                  </button>
                  {/* <div className="rent-month-edit-hint">Tap to edit</div> */}
                  <div className="rent-month-range">{cycleRangeStr || "-"}</div>
                  <div className="rent-month-amount">{getAmountText(cell)}</div>
               
                </div>
              );
            })}
          </div>

          <div className="rent-mobile-profile-actions">
            <button type="button" className=" rent-profile-action warn" onClick={() => onEditTenant?.(tenant)}>
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
              <span>Edit </span>
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
      </div>
    </div>
  );
}

export default RentTenantProfileView;
