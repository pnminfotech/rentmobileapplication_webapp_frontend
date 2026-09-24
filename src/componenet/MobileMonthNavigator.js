import React, { useRef } from "react";
import "./MobileMonthNavigator.css";

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

function getRangeLabel(visibleMonths = []) {
  const months = (Array.isArray(visibleMonths) ? visibleMonths : []).filter(Boolean);
  if (!months.length) return "No months";
  if (months.length === 1) return getMonthLabel(months[0]);
  return `${getMonthLabel(months[0])} - ${getMonthLabel(months[months.length - 1])}`;
}

function MobileMonthNavigator({
  visibleMonths = [],
  title = "Rent Months",
  onPrev,
  onNext,
  canPrev = true,
  canNext = true,
  rightActionLabel = "",
  rightActionIcon = null,
  onRightAction,
}) {
  const rangeLabel = getRangeLabel(visibleMonths);
  const touchStartX = useRef(null);

  const movePrev = (event) => {
    if (!canPrev) return;
    onPrev?.(event);
  };

  const moveNext = (event) => {
    if (!canNext) return;
    onNext?.(event);
  };

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches?.[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current == null) return;
    const endX = event.changedTouches?.[0]?.clientX ?? touchStartX.current;
    const deltaX = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(deltaX) < 45) return;
    if (deltaX < 0) moveNext(event);
    else movePrev(event);
  };

  const handleWheel = (event) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) < 35) return;
    if (delta > 0) moveNext(event);
    else movePrev(event);
  };

  return (
    <div
      className={`mobile-month-nav ${canPrev ? "can-prev" : ""} ${canNext ? "can-next" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      role="group"
      aria-label={`${title}: ${rangeLabel}`}
    >
      <div className="mobile-month-nav-center">
        <div className="mobile-month-nav-eyebrow">{title}</div>
        <div className="mobile-month-nav-label">{rangeLabel}</div>
      </div>

      <div
        className="mobile-month-nav-strip"
        aria-label="Swipe horizontally to navigate months"
      >
        {(Array.isArray(visibleMonths) ? visibleMonths : []).filter(Boolean).map((month) => (
          <span className="mobile-month-nav-chip" key={`${month.y}-${month.m}`}>
            {getMonthLabel(month)}
          </span>
        ))}
      </div>

      <div className="mobile-month-nav-actions">
        {rightActionLabel ? (
          <button
            type="button"
            className="mobile-month-nav-pill"
            onClick={onRightAction}
            title={rightActionLabel}
          >
            {rightActionIcon}
            <span>{rightActionLabel}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default MobileMonthNavigator;
