import React from "react";
import {
  FaBed,
  FaEdit,
  FaExchangeAlt,
  FaHistory,
  FaPhoneAlt,
  FaPlus,
  FaUser,
} from "react-icons/fa";
import "./RentTracker.css";

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getStatusTone(label = "") {
  const normalized = String(label).toLowerCase();
  if (normalized.startsWith("paid")) return "paid";
  if (normalized.startsWith("due")) return "due";
  if (normalized.startsWith("pend")) return "pend";
  if (normalized.startsWith("upcoming")) return "upcoming";
  return "pend";
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

function RentMobileView({
  groupedRooms = [],
  roomsData = [],
  getTenantPhotoMeta,
  photoTransformStyle,
  roomColorStyleMap = {},
  getMonthCell,
  calculateDue,
  getCycleRangeStr,
  getRentStatusLabelForSort,
  onOpenTenant,
  onOpenHistory,
  onEditCurrentMonth,
  onShiftTenant,
  onMarkLeave,
  onMarkHoliday,
  onOpenDueMonths,
  onAddTenantForSlot,
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentLabel = now.toLocaleString("default", {
    month: "short",
    year: "numeric",
  });

  const occupiedBlocks = groupedRooms.filter((room) => (room.occupied || []).length);
  const vacantBlocks = groupedRooms.filter((room) => (room.vacant || []).length);

  return (
    <div className="rent-mobile-view">
      <div className="rent-mobile-shell">
        <section className="rent-mobile-section">
          <div className="rent-mobile-section-title">
            <div>
              <h5>Rent Cards</h5>
              <div className="rent-mobile-badge">{currentLabel}</div>
            </div>
            <div className="rent-mobile-badge">{occupiedBlocks.length} rooms</div>
          </div>

          {occupiedBlocks.length ? (
            occupiedBlocks.map((room) => (
              <div key={`mobile-room-${room.roomNo}`} className="rent-mobile-room">
                <div className="rent-mobile-room-head">
                  <div>
                    <div className="rent-mobile-room-title">Room {room.roomNo}</div>
                    <div className="rent-mobile-room-meta">
                      {room.occupied.length} occupied {room.vacant.length ? `| ${room.vacant.length} vacant` : ""}
                    </div>
                  </div>
                  <div className="rent-mobile-badge">Swipe free</div>
                </div>

                <div className="rent-mobile-list">
                  {(room.occupied || []).map((tenant) => {
                    const currentCell = getMonthCell
                      ? getMonthCell(tenant, currentYear, currentMonth)
                      : null;
                    const statusLabel =
                      currentCell?.label ||
                      (getRentStatusLabelForSort ? getRentStatusLabelForSort(tenant) : "") ||
                      "Pending";
                    const tone = getStatusTone(statusLabel);
                    const dueAmount = calculateDue
                      ? calculateDue(tenant.rents, tenant.joiningDate, tenant, roomsData)
                      : 0;
                    const cycleRange = getCycleRangeStr
                      ? getCycleRangeStr(tenant, currentYear, currentMonth)
                      : "";
                    const photoMeta = getTenantPhotoMeta ? getTenantPhotoMeta(tenant) : null;
                    const occupiedRoomStyle =
                      roomColorStyleMap[String(tenant.roomNo ?? "").trim()] || {
                        backgroundColor: "#5f7dfc",
                        border: "1px solid #4c66d8",
                        color: "#ffffff",
                      };

                    return (
                      <div
                        key={tenant._id}
                        className={`rent-mobile-card rent-mobile-card--${tone}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpenTenant && onOpenTenant(tenant)}
                        onKeyDown={(e) => e.key === "Enter" && onOpenTenant && onOpenTenant(tenant)}
                      >
                        <div className="rent-mobile-card-head">
                          <div className="rent-mobile-avatar">
                            {photoMeta?.photoUrl ? (
                              <img
                                src={photoMeta.photoUrl}
                                alt=""
                                style={photoMeta.photoTransform ? photoTransformStyle?.(photoMeta.photoTransform) : undefined}
                              />
                            ) : (
                              getInitials(tenant.name)
                            )}
                          </div>

                          <div>
                            <div className="rent-mobile-name">{tenant.name || "Tenant"}</div>
                            <div className="rent-mobile-sub">
                              <FaBed className="me-1" />
                              Room {tenant.roomNo || "—"} {tenant.bedNo ? `• Bed ${tenant.bedNo}` : ""}
                            </div>
                            <div className="rent-mobile-sub">
                              Deposit: ₹{toNum(tenant.depositAmount).toLocaleString("en-IN")}
                              {tenant.phoneNo ? (
                                <>
                                  {" "}
                                  • <FaPhoneAlt className="me-1" />
                                  {tenant.phoneNo}
                                </>
                              ) : null}
                            </div>
                            <div className="mt-2">
                              <span className="room-pill" style={occupiedRoomStyle}>
                                Room {tenant.roomNo || "—"}
                                {tenant.bedNo ? ` - Bed ${tenant.bedNo}` : ""}
                              </span>
                            </div>
                          </div>

                          <div className="rent-mobile-status-stack">
                            <span className={`rent-status-pill ${tone}`}>{statusLabel}</span>
                            <button
                              type="button"
                              className="rent-mobile-due-chip"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenDueMonths && onOpenDueMonths(tenant);
                              }}
                              title="Open due months"
                            >
                              Due ₹{toNum(dueAmount).toLocaleString("en-IN")}
                            </button>
                          </div>
                        </div>

                        <div className="rent-mobile-meta-row">
                          <span>{cycleRange || "Current month"}</span>
                          <span>{currentCell?.dateStr || statusLabel}</span>
                        </div>

                        <div className="rent-mobile-actions">
                          <button
                            type="button"
                            className="rent-mobile-action primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTenant && onOpenTenant(tenant);
                            }}
                          >
                            <FaUser className="me-1" /> View
                          </button>

                          <button
                            type="button"
                            className="rent-mobile-action secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenHistory && onOpenHistory(tenant);
                            }}
                          >
                            <FaHistory className="me-1" /> History
                          </button>

                          <button
                            type="button"
                            className="rent-mobile-action warn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditCurrentMonth && onEditCurrentMonth(tenant);
                            }}
                          >
                            <FaEdit className="me-1" /> Edit
                          </button>

                          <button
                            type="button"
                            className="rent-mobile-action ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onShiftTenant && onShiftTenant(tenant);
                            }}
                          >
                            <FaExchangeAlt className="me-1" /> Shift
                          </button>

                          {onMarkLeave ? (
                            <button
                              type="button"
                              className="rent-mobile-action ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkLeave(tenant);
                              }}
                            >
                              Leave
                            </button>
                          ) : null}

                          {onMarkHoliday ? (
                            <button
                              type="button"
                              className="rent-mobile-action ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkHoliday(tenant);
                              }}
                            >
                              Holiday
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="rent-mobile-empty">No occupied tenants found.</div>
          )}
        </section>

        <section className="rent-mobile-section">
          <div className="rent-mobile-section-title">
            <div>
              <h5>Vacant Beds</h5>
              <div className="rent-mobile-badge">
                {vacantBlocks.reduce((sum, room) => sum + (room.vacant || []).length, 0)} empty slots
              </div>
            </div>
          </div>

          {vacantBlocks.length ? (
            <div className="rent-mobile-vacant-list">
              {vacantBlocks.map((room) =>
                (room.vacant || []).map((slot) => {
                  const roomStyle =
                    roomColorStyleMap[String(slot.roomNo ?? "").trim()] || {
                      backgroundColor: "#5f7dfc",
                      border: "1px solid #4c66d8",
                      color: "#ffffff",
                    };

                  return (
                    <div key={`vacant-${slot.roomNo}-${slot.bedNo}`} className="rent-mobile-vacant-card">
                      <div className="rent-mobile-vacant-main">
                        <div className="rent-mobile-vacant-title">
                          Room {slot.roomNo} • Bed {slot.bedNo}
                        </div>
                        <div className="rent-mobile-vacant-sub">
                          Base Rent: ₹{toNum(slot.price).toLocaleString("en-IN")}
                        </div>
                          <span className="room-pill" style={roomStyle}>
                            Vacant
                          </span>
                      </div>

                      {onAddTenantForSlot ? (
                        <button
                          type="button"
                          className="rent-mobile-vacant-action"
                          onClick={() =>
                            onAddTenantForSlot(slot.roomNo, slot.bedNo)
                          }
                        >
                          <FaPlus className="me-1" /> Add Tenant
                        </button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="rent-mobile-empty">No vacant beds right now.</div>
          )}
        </section>
      </div>
    </div>
  );
}

export default RentMobileView;
