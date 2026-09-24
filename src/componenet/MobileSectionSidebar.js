import React, { useEffect, useMemo, useState } from "react";
import { FaSignOutAlt } from "react-icons/fa";
import "./MobileSectionSidebar.css";

function MobileSectionSidebar({
  open = false,
  activeKey = "",
  items = [],
  title = "Sections",
  brand = "Hostel Manager",
  subtitle = "Switch screen",
  footerVersion = "v1.0.0",
  footerText = "© Hostel Manager",
  theme = "blue",
  onSelect,
  onClose,
  onLogout,
}) {
  const findParentKeyForActive = useMemo(() => {
    const parent = (items || []).find((item) =>
      Array.isArray(item?.children) &&
      item.children.some((child) => child?.key === activeKey)
    );
    return parent?.key || "";
  }, [activeKey, items]);

  const [expandedGroups, setExpandedGroups] = useState(() => {
    const initial = {};
    (items || []).forEach((item) => {
      if (Array.isArray(item?.children) && item.children.length) {
        initial[item.key] = item.key === findParentKeyForActive;
      }
    });
    return initial;
  });

  useEffect(() => {
    if (!findParentKeyForActive) return;
    setExpandedGroups((prev) => ({
      ...prev,
      [findParentKeyForActive]: true,
    }));
  }, [findParentKeyForActive]);

  const handleToggleGroup = (event, key) => {
    event.preventDefault();
    event.stopPropagation();
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <>
      <div
        className={`mobile-section-overlay ${open ? "open" : ""}`}
        onClick={onClose}
      />

      <aside
        className={`mobile-section-sidebar mobile-section-sidebar--${theme} ${open ? "open" : ""}`}
      >
        <div className="mobile-section-sidebar-header">
          <div>
            {/* {title ? <div className="mobile-section-sidebar-eyebrow">{title}</div> : null} */}
            <h4 className="mobile-section-sidebar-title">{brand}</h4>
            {/* <div className="mobile-section-sidebar-subtitle">{subtitle}</div> */}
          </div>

          <button
            type="button"
            className="mobile-section-close"
            onClick={onClose}
            aria-label="Close sections menu"
          >
            ×
          </button>
        </div>

        <div className="mobile-section-list">
          {items.map((item) => {
            const hasChildren = Array.isArray(item?.children) && item.children.length > 0;
            const isExpanded = Boolean(expandedGroups[item.key]);

            if (!hasChildren) {
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`mobile-section-item ${activeKey === item.key ? "active" : ""}`}
                  onClick={() => {
                    onSelect?.(item.key);
                    onClose?.();
                  }}
                >
                  <span className="mobile-section-item-icon">{item.icon}</span>
                  <span className="mobile-section-item-label">{item.label}</span>
                </button>
              );
            }

            return (
              <div key={item.key} className={`mobile-section-group ${isExpanded ? "open" : ""}`}>
                <button
                  type="button"
                  className={`mobile-section-item mobile-section-group-toggle ${findParentKeyForActive === item.key ? "active" : ""}`}
                  onClick={(event) => handleToggleGroup(event, item.key)}
                  aria-expanded={isExpanded}
                >
                  <span className="mobile-section-item-icon">{item.icon}</span>
                  <span className="mobile-section-item-label">{item.label}</span>
                </button>

                {isExpanded ? (
                  <div className="mobile-section-sublist">
                    {item.children.map((child) => (
                      <button
                        key={child.key}
                        type="button"
                        className={`mobile-section-subitem ${activeKey === child.key ? "active" : ""}`}
                        onClick={() => {
                          onSelect?.(child.key);
                          onClose?.();
                        }}
                      >
                        <span className="mobile-section-subitem-label">{child.label}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mobile-section-sidebar-footer">
          {onLogout ? (
            <button
              type="button"
              className="mobile-section-logout-btn"
              onClick={() => {
                onClose?.();
                onLogout?.();
              }}
            >
              <span className="mobile-section-item-icon">
                <FaSignOutAlt />
              </span>
              <span className="mobile-section-item-label">Logout</span>
            </button>
          ) : null}
          <div className="mobile-section-version">{footerVersion}</div>
          <div className="mobile-section-copyright">{footerText}</div>
        </div>
      </aside>
    </>
  );
}

export default MobileSectionSidebar;
