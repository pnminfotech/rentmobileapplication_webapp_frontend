import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearAuthSession, getAuthToken, getAuthUser } from "../authStorage";
import { useDashboardMenuItems } from "./dashboardMenuItems";
import "./DashboardNavigation.css";

const excludedPaths = new Set(["/", "/login", "/register", "/register-business", "/form", "/tenant-intake", "/form-submitted", "/trial-unit-setup", "/subscription-expired", "/superadmin", "/admin", "/maindashboard", "/maindashbaord"]);

export default function DashboardNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const dashboardMenuItems = useDashboardMenuItems();

  useEffect(() => {
    setOpen(false);
    setOpenSubmenu(null);
  }, [location.pathname, location.key]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const user = getAuthUser();
  if (!getAuthToken() || !user || user.role === "superadmin" || user.role === "superAdmin" || excludedPaths.has(location.pathname) || location.pathname.startsWith("/tenant/")) return null;

  const goTo = (item) => {
    navigate(item.path, item.state ? { state: item.state } : undefined);
    setOpen(false);
  };

  return (
    <>
      <header className="dashboard-nav-bar">
        <button type="button" className="dashboard-nav-toggle" aria-label="Open navigation menu" aria-expanded={open} aria-controls="dashboard-navigation" onClick={() => setOpen(true)}>
          <span aria-hidden="true">☰</span><span>Menu</span>
        </button>
      </header>
      {open && <div className="dashboard-nav-backdrop" onClick={() => setOpen(false)} />}
      <nav id="dashboard-navigation" className={`dashboard-nav-drawer${open ? " is-open" : ""}`} aria-label="Main dashboard navigation" aria-hidden={!open}>
        <div className="dashboard-nav-header"><strong>Hostel Manager</strong><button type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)}>×</button></div>
        <ul>
          {dashboardMenuItems.map((item) => (
            <li key={item.label}>
              {item.children ? (
                <>
                  <button type="button" className="dashboard-nav-item" aria-expanded={openSubmenu === item.label} onClick={() => setOpenSubmenu((value) => value === item.label ? null : item.label)}>
                    {item.icon}<span>{item.label}</span><span className="dashboard-nav-chevron">{openSubmenu === item.label ? "⌃" : "⌄"}</span>
                  </button>
                  {openSubmenu === item.label && <ul className="dashboard-nav-submenu">{item.children.map((child) => <li key={child.label}><button type="button" onClick={() => goTo(child)}>{child.label}</button></li>)}</ul>}
                </>
              ) : <button type="button" className="dashboard-nav-item" onClick={() => goTo(item)}>{item.icon}<span>{item.label}</span></button>}
            </li>
          ))}
          <li><button type="button" className="dashboard-nav-item" onClick={() => { clearAuthSession(); setOpen(false); navigate("/"); }}><span aria-hidden="true">↪</span><span>Logout</span></button></li>
        </ul>
      </nav>
    </>
  );
}
