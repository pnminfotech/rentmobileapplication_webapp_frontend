import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBarChart2,
  FiBell,
  FiCreditCard,
  FiLogOut,
  FiMenu,
  FiPackage,
  FiRefreshCw,
  FiUsers,
} from "react-icons/fi";
import { MdBusiness, MdOutlinePendingActions } from "react-icons/md";

import { clearAuthSession } from "../authStorage";
import { getOrganizations, getSuperAdminDashboard } from "../saasApi";

const BRAND = "#1e3a8a";
const CARD_COLORS = ["#76b1d9", "#efe89e", "#ffe0e0", "#7897af", "#f5d4a0", "#cebaed"];

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function statusText(value) {
  return String(value || "-").replace(/_/g, " ");
}

function isTrialOrganization(org) {
  const subscription = org?.subscription || {};
  return Number(subscription.amount || 0) === 0 && !subscription.planId;
}

function getUnits(org) {
  return org?.subscription?.units || org?.unitAllocation || {};
}

function SummaryCard({ label, value, icon, color, onClick }) {
  return (
    <div className="col-6 col-md-4 col-lg-3 mb-2">
      <div
        className="card border-0 shadow-sm h-100"
        style={{
          backgroundColor: color,
          borderRadius: 12,
          padding: "10px 8px",
          cursor: onClick ? "pointer" : "default",
        }}
        onClick={onClick}
      >
        <div className="card-body text-center p-2">
          <div className="fs-5 mb-1">{icon}</div>
          <div className="small text-uppercase text-muted" style={{ fontSize: "0.75rem" }}>
            {label}
          </div>
          <div className="fw-semibold" style={{ fontSize: "1rem" }}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrganizationTable({ title, organizations, emptyText }) {
  return (
    <div className="card border-0 shadow-sm mt-3">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between gap-3 mb-2">
          <h5 className="fw-bold mb-0">{title}</h5>
          <span className="badge text-bg-light">{organizations.length}</span>
        </div>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Business</th>
                <th>Owner</th>
                <th>Units</th>
                <th>Subscription</th>
                <th>Ends</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => {
                const subscription = org.subscription || {};
                const units = getUnits(org);
                return (
                  <tr key={org._id || org.id}>
                    <td>
                      <div className="fw-semibold">{org.name || "-"}</div>
                      <div className="text-muted small">{org.email || org.phone || "-"}</div>
                    </td>
                    <td>{org.ownerName || "-"}</td>
                    <td className="text-nowrap">
                      {Number(units.beds || 0)} beds · {Number(units.rooms || 0)} rooms · {Number(units.shops || 0)} shops
                    </td>
                    <td>
                      <div className="fw-semibold">{isTrialOrganization(org) ? "Trial" : subscription.planId?.name || "Renewed"}</div>
                      <div className="text-muted small">{money(subscription.amount)}</div>
                    </td>
                    <td>{formatDate(subscription.endDate)}</td>
                    <td>
                      <span className={`badge text-capitalize ${org.status === "active" ? "text-bg-success" : org.status === "expired" ? "text-bg-danger" : "text-bg-light"}`}>
                        {statusText(org.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!organizations.length ? (
                <tr>
                  <td colSpan="6" className="text-muted text-center py-4">{emptyText}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminHome() {
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  const [dashboard, setDashboard] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");

  const trialOrganizations = useMemo(
    () => organizations.filter((org) => isTrialOrganization(org)),
    [organizations]
  );
  const renewedOrganizations = useMemo(
    () => organizations.filter((org) => !isTrialOrganization(org)),
    [organizations]
  );

  const totals = dashboard?.organizations || {};
  const revenue = dashboard?.revenue || {};
  const subscriptions = dashboard?.subscriptions || {};

  async function load({ silent = false } = {}) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");
      const [dashboardData, organizationData] = await Promise.all([
        getSuperAdminDashboard(),
        getOrganizations(),
      ]);
      setDashboard(dashboardData);
      setOrganizations(Array.isArray(organizationData) ? organizationData : []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load superadmin dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const onClick = (event) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onEsc = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function logout() {
    clearAuthSession();
    navigate("/login", { replace: true });
  }

  const menuItems = [
    { key: "dashboard", label: "Dashboard", icon: <FiBarChart2 /> },
    { key: "trial", label: "Trial Accounts", icon: <MdOutlinePendingActions /> },
    { key: "renewed", label: "Renewed Accounts", icon: <FiCreditCard /> },
    { key: "plans", label: "Plans", icon: <FiPackage /> },
    { key: "notifications", label: "Notifications", icon: <FiBell /> },
  ];

  const renderDashboard = () => (
    <>
      <section className="row g-2 mb-3 px-2">
        <SummaryCard label="Total accounts" value={totals.total || organizations.length || 0} color={CARD_COLORS[0]} icon={<MdBusiness />} />
        <SummaryCard label="Trial accounts" value={trialOrganizations.length} color={CARD_COLORS[1]} icon={<MdOutlinePendingActions />} onClick={() => setActiveSection("trial")} />
        <SummaryCard label="Renewed accounts" value={renewedOrganizations.length} color={CARD_COLORS[2]} icon={<FiCreditCard />} onClick={() => setActiveSection("renewed")} />
        <SummaryCard label="Active accounts" value={totals.active || 0} color={CARD_COLORS[3]} icon={<FiUsers />} />
        <SummaryCard label="Expired" value={totals.expired || 0} color={CARD_COLORS[4]} icon={<FiBell />} />
        <SummaryCard label="Active plans" value={subscriptions.active || 0} color={CARD_COLORS[5]} icon={<FiPackage />} />
        <SummaryCard label="Successful payments" value={revenue.successfulCount || 0} color={CARD_COLORS[0]} icon={<FiCreditCard />} />
        <SummaryCard label="Revenue" value={money(revenue.successfulAmount)} color={CARD_COLORS[1]} icon={<FiBarChart2 />} />
      </section>

      <section className="row g-3 mt-2 px-2">
        <div className="col-12 col-lg-6">
          <div className="bg-white p-3 rounded shadow-sm h-100">
            <h5 className="text-primary mb-2">Account status</h5>
            <div className="d-flex flex-column gap-3 mt-3">
              {[
                ["Active", totals.active || 0, "#10B981"],
                ["Pending payment", totals.pendingPayment || 0, "#F59E0B"],
                ["Suspended", totals.suspended || 0, "#6366F1"],
                ["Expired", totals.expired || 0, "#EF4444"],
              ].map(([label, value, color]) => (
                <div key={label}>
                  <div className="d-flex justify-content-between small fw-semibold mb-1">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                  <div className="progress" style={{ height: 8 }}>
                    <div
                      className="progress-bar"
                      style={{
                        width: `${Math.min(100, ((Number(value) || 0) / Math.max(1, Number(totals.total || organizations.length || 1))) * 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="bg-white p-3 rounded shadow-sm h-100">
            <h5 className="text-primary mb-2">Workspace summary</h5>
            <p className="text-muted mb-3">
              This panel follows the system-admin dashboard layout, but focuses on SaaS account health, trials, renewals, payments, and plan control.
            </p>
            <div className="row g-2">
              <div className="col-6">
                <div className="border rounded p-3">
                  <div className="text-muted small">Pending transactions</div>
                  <div className="fs-4 fw-bold">{revenue.pendingTransactions || 0}</div>
                </div>
              </div>
              <div className="col-6">
                <div className="border rounded p-3">
                  <div className="text-muted small">Expired subscriptions</div>
                  <div className="fs-4 fw-bold">{subscriptions.expired || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <OrganizationTable
        title="Latest accounts"
        organizations={(dashboard?.latestOrganizations || []).map((org) => organizations.find((item) => String(item._id) === String(org._id)) || org)}
        emptyText="No accounts yet."
      />
    </>
  );

  const renderSection = () => {
    if (loading) {
      return (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-5 text-center">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      );
    }

    if (error) {
      return <div className="alert alert-danger">{error}</div>;
    }

    if (activeSection === "trial") {
      return (
        <OrganizationTable
          title="Trial accounts"
          organizations={trialOrganizations}
          emptyText="No trial accounts found."
        />
      );
    }

    if (activeSection === "renewed") {
      return (
        <OrganizationTable
          title="Renewed and paid accounts"
          organizations={renewedOrganizations}
          emptyText="No renewed accounts found."
        />
      );
    }

    if (activeSection === "plans" || activeSection === "notifications") {
      return (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-2">{activeSection === "plans" ? "Plans" : "Notifications"}</h5>
            <p className="text-muted mb-0">
              This menu is ready in the dashboard shell. We can connect the full management screen in the next pass.
            </p>
          </div>
        </div>
      );
    }

    return renderDashboard();
  };

  return (
    <div
      className="d-flex"
      style={{
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
        backgroundColor: "#f8f9fa",
      }}
    >
      <style>{`
        .sa-topbar { display:none; }
        .sa-nav-item.is-active { background: rgba(255,255,255,0.16); }
        @media (max-width: 991.98px){
          .sa-topbar{
            display:flex;
            position: fixed; top:0; left:0; right:0; height:56px; z-index: 1040;
            align-items:center; justify-content:space-between;
            padding:12px 16px; background:${BRAND}; color:#fff;
            box-shadow:0 2px 10px rgba(0,0,0,0.2);
          }
          .sa-iconbtn{
            display:inline-flex; align-items:center; justify-content:center;
            padding:8px; border:0; border-radius:8px; background:transparent; color:#fff; cursor:pointer;
          }
          .sa-backdrop{
            position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1035;
          }
          nav.sa-drawer{
            transform: translateX(-100%);
            transition: transform .3s ease-in-out;
            top:56px;
            height: calc(100vh - 56px) !important;
          }
          nav.sa-drawer.open{ transform: translateX(0); }
          nav.sa-drawer .sa-desktop-heading{ display:none !important; }
          main.sa-shell{
            margin-left: 0 !important;
            padding-top: 72px !important;
          }
        }
      `}</style>

      <div className="sa-topbar">
        <button className="sa-iconbtn" onClick={() => setOpen(true)} aria-label="Open menu">
          <FiMenu size={22} />
        </button>
        <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>System Control Center</div>
        <span style={{ width: 24 }} />
      </div>

      {open && <div className="sa-backdrop" onClick={() => setOpen(false)} />}

      <nav
        ref={drawerRef}
        className={`position-fixed text-white p-3 sa-drawer ${open ? "open" : ""}`}
        style={{
          width: 250,
          height: "100vh",
          backgroundColor: BRAND,
          zIndex: 1045,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-center fw-bold mb-4 mt-2 sa-desktop-heading">Control Center</h2>

        <ul className="list-unstyled mt-3" style={{ textAlign: "left" }}>
          {menuItems.map((item) => (
            <li
              key={item.key}
              onClick={() => {
                setActiveSection(item.key);
                setOpen(false);
              }}
              className={`sa-nav-item mb-2 px-3 py-2 rounded ${activeSection === item.key ? "is-active" : ""}`}
              style={{ cursor: "pointer" }}
            >
              {item.icon} <span className="ms-2">{item.label}</span>
            </li>
          ))}
          <li
            onClick={logout}
            className="mb-2 px-3 py-2 rounded"
            style={{ cursor: "pointer" }}
          >
            <FiLogOut /> <span className="ms-2">Logout</span>
          </li>
        </ul>

        <div className="text-center text-white-50 small mt-4">
          <p>v1.0.0</p>
          <p>Rent Manager</p>
        </div>
      </nav>

      <main className="container-fluid sa-shell" style={{ marginLeft: 250, paddingTop: 24 }}>
        <div className="d-flex align-items-start justify-content-between gap-3 mb-3 px-2">
          <div>
            <div className="text-primary text-uppercase fw-bold small">System control center</div>
            <h1 className="fw-bold mt-1 mb-1">Superadmin dashboard</h1>
            <p className="text-muted mb-0">Manage trial, renewed, expired and payment accounts.</p>
          </div>
          <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={() => load({ silent: true })} disabled={refreshing}>
            <FiRefreshCw /> {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>

        {renderSection()}
      </main>
    </div>
  );
}
