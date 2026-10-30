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
  FiShield,
  FiTag,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { MdBusiness, MdOutlinePendingActions } from "react-icons/md";

import { clearAuthSession } from "../authStorage";
import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  getAdminSubscriptionPlans,
  getAppBootstrap,
  getBillingTransactions,
  getOrganizations,
  getOrganizationSupportUnits,
  getReferralCodes,
  getSecurityPinStatus,
  getSystemAdminUsers,
  getSuperAdminDashboard,
  requestPasswordReset,
  requestSuperadminEmailChange,
  resendSuperadminEmailChangeCode,
  resetSecurityPin,
  saveSecurityPin,
  retireOrganizationUnit,
  updateOrganizationStatus,
  updateSubscriptionPlan,
  verifySuperadminEmailChange,
} from "../saasApi";
import { getNotifications, resolveAllNotifications, resolveNotification } from "../notificationApi";

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

function OrganizationTable({ title, organizations, emptyText, onChangeStatus, onManageUnits }) {
  const showActions = Boolean(onChangeStatus || onManageUnits);
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
                {showActions && <th>Actions</th>}
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
                    {showActions && <td className="text-nowrap">{onManageUnits && <button className="btn btn-sm btn-outline-primary me-1" onClick={() => onManageUnits(org)}>Manage units</button>}{onChangeStatus && <button className={`btn btn-sm ${org.status === "suspended" ? "btn-outline-success" : "btn-outline-danger"}`} onClick={() => onChangeStatus(org)}>{org.status === "suspended" ? "Reactivate" : "Suspend"}</button>}</td>}
                  </tr>
                );
              })}
              {!organizations.length ? (
                <tr>
                  <td colSpan={showActions ? "7" : "6"} className="text-muted text-center py-4">{emptyText}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children, action }) {
  return <div className="card border-0 shadow-sm mt-3"><div className="card-body p-3"><div className="d-flex justify-content-between align-items-center gap-2 mb-3"><h5 className="fw-bold mb-0">{title}</h5>{action}</div>{children}</div></div>;
}

export default function SuperAdminHome() {
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  const [dashboard, setDashboard] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [systemAdminUsers, setSystemAdminUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [plans, setPlans] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [bootstrap, setBootstrap] = useState(null);
  const [securityConfigured, setSecurityConfigured] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [planForm, setPlanForm] = useState(null);
  const [pinForm, setPinForm] = useState({ pin: "", confirm: "", currentPin: "", password: "", reset: false });
  const [emailForm, setEmailForm] = useState({ newEmail: "", password: "", challengeId: "", code: "", maskedEmail: "" });
  const [supportOrganization, setSupportOrganization] = useState(null);
  const [supportUnits, setSupportUnits] = useState([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportAction, setSupportAction] = useState("");

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

  async function loadSection(section = activeSection) {
    try {
      setError("");
      if (section === "plans") setPlans(await getAdminSubscriptionPlans());
      if (section === "transactions") setTransactions(await getBillingTransactions({ limit: 100 }));
      if (section === "referrals") setReferrals(await getReferralCodes());
      if (section === "notifications") setNotifications(await getNotifications({ status: "all", limit: 100 }));
      if (section === "users") {
        setUsersLoading(true);
        setSystemAdminUsers(await getSystemAdminUsers());
      }
      if (section === "profile" || section === "security") {
        const [account, pin] = await Promise.all([getAppBootstrap(), getSecurityPinStatus()]);
        setBootstrap(account); setSecurityConfigured(Boolean(pin.configured));
      }
    } catch (err) { setError(err.response?.data?.message || "Unable to load this section."); }
    finally { if (section === "users") setUsersLoading(false); }
  }

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

  async function selectSection(key) {
    setActiveSection(key); setOpen(false); setActionMessage("");
    await loadSection(key);
  }

  async function changeOrganizationStatus(org) {
    const securityPin = window.prompt(`Enter your security PIN to ${org.status === "suspended" ? "reactivate" : "suspend"} ${org.name}.`);
    if (!securityPin) return;
    try { await updateOrganizationStatus(org._id, org.status === "suspended" ? "active" : "suspended", securityPin); await load({ silent: true }); }
    catch (err) { setError(err.response?.data?.message || "Unable to update account status."); }
  }

  async function openSupportUnits(org) {
    try {
      setError("");
      setSupportOrganization(org);
      setSupportUnits([]);
      setSupportLoading(true);
      const units = await getOrganizationSupportUnits(org._id);
      setSupportUnits(Array.isArray(units) ? units : []);
    } catch (err) {
      setSupportOrganization(null);
      setError(err.response?.data?.message || "Unable to load organization units.");
    } finally {
      setSupportLoading(false);
    }
  }

  async function retireSupportUnit(unit) {
    if (!supportOrganization) return;
    const occupied = unit.occupancy === "occupied";
    const tenantNames = (unit.occupants || []).map((tenant) => tenant.name).filter(Boolean).join(", ");
    const confirmed = window.confirm(
      occupied
        ? `Remove occupied unit ${unit.label} today? The stay for ${tenantNames || "the tenant"} will end today and move to former tenant records. Rent, payments and documents will remain saved.`
        : `Remove vacant ${unit.label}?`
    );
    if (!confirmed) return;
    const securityPin = window.prompt("Enter your security PIN to confirm this unit reduction.");
    if (!securityPin) return;
    try {
      setError("");
      setSupportAction(unit.id);
      const result = await retireOrganizationUnit(supportOrganization._id, unit.unitId, {
        kind: unit.kind,
        bedNo: unit.bedNo || "",
        reason: "Customer requested a unit reduction through support",
        securityPin,
      });
      setActionMessage(result?.message || "Unit count updated.");
      await openSupportUnits(supportOrganization);
      await load({ silent: true });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update unit.");
    } finally {
      setSupportAction("");
    }
  }

  async function savePlan(event) {
    event.preventDefault();
    const form = planForm;
    const payload = { name: form.name, durationMonths: Number(form.durationMonths), baseAmount: Number(form.baseAmount || 0), discountPercent: Number(form.discountPercent || 0), currency: "INR", isActive: form.isActive !== false, unitPricing: { bedMonthly: Number(form.bedMonthly || 0), roomMonthly: Number(form.roomMonthly || 0), shopMonthly: Number(form.shopMonthly || 0) } };
    try { if (form._id) await updateSubscriptionPlan(form._id, payload); else await createSubscriptionPlan(payload); setPlanForm(null); await loadSection("plans"); }
    catch (err) { setError(err.response?.data?.message || "Unable to save plan."); }
  }

  async function removePlan(plan) {
    const securityPin = window.prompt(`Enter your security PIN to delete ${plan.name}.`); if (!securityPin) return;
    try { await deleteSubscriptionPlan(plan._id, securityPin); await loadSection("plans"); } catch (err) { setError(err.response?.data?.message || "Unable to delete plan."); }
  }

  async function savePin(event) {
    event.preventDefault();
    if (!/^\d{4,8}$/.test(pinForm.pin) || pinForm.pin !== pinForm.confirm) return setError("Enter matching 4 to 8 digit PINs.");
    try { if (pinForm.reset) await resetSecurityPin({ pin: pinForm.pin, password: pinForm.password }); else await saveSecurityPin({ pin: pinForm.pin, currentPin: pinForm.currentPin }); setActionMessage("Security PIN saved."); setPinForm({ pin: "", confirm: "", currentPin: "", password: "", reset: false }); await loadSection("security"); }
    catch (err) { setError(err.response?.data?.message || "Unable to save security PIN."); }
  }

  async function startEmailChange(event) {
    event.preventDefault();
    try { const data = await requestSuperadminEmailChange(emailForm.newEmail, emailForm.password); setEmailForm((current) => ({ ...current, challengeId: data.challengeId, maskedEmail: data.email || "your new email" })); setActionMessage("Verification code sent."); }
    catch (err) { setError(err.response?.data?.message || "Unable to start email change."); }
  }

  async function confirmEmailChange(event) {
    event.preventDefault();
    try { await verifySuperadminEmailChange(emailForm.challengeId, emailForm.code); clearAuthSession(); navigate("/login", { replace: true }); }
    catch (err) { setError(err.response?.data?.message || "Unable to update email."); }
  }

  const menuItems = [
    { key: "dashboard", label: "Dashboard", icon: <FiBarChart2 /> },
    { key: "trial", label: "Trial Accounts", icon: <MdOutlinePendingActions /> },
    { key: "renewed", label: "Renewed Accounts", icon: <FiCreditCard /> },
    { key: "users", label: "System Admin Users", icon: <FiUsers /> },
    { key: "transactions", label: "Transactions", icon: <FiCreditCard /> },
    { key: "plans", label: "Plans", icon: <FiPackage /> },
    { key: "referrals", label: "Referral Codes", icon: <FiTag /> },
    { key: "notifications", label: "Notifications", icon: <FiBell /> },
    { key: "profile", label: "Profile", icon: <FiUsers /> },
    { key: "security", label: "Security PIN", icon: <FiShield /> },
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
        onChangeStatus={changeOrganizationStatus}
        onManageUnits={openSupportUnits}
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
          onChangeStatus={changeOrganizationStatus}
          onManageUnits={openSupportUnits}
        />
      );
    }

    if (activeSection === "renewed") {
      return (
        <OrganizationTable
          title="Renewed and paid accounts"
          organizations={renewedOrganizations}
          emptyText="No renewed accounts found."
          onChangeStatus={changeOrganizationStatus}
          onManageUnits={openSupportUnits}
        />
      );
    }

    if (activeSection === "users") return <Panel title="System admin users" action={<span className="badge text-bg-light">{systemAdminUsers.length}</span>}>
      {usersLoading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>
      ) : (
        <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>System admin</th><th>Contact</th><th>Business / organization</th><th>Account status</th><th>Last login</th><th>Added</th></tr></thead><tbody>{systemAdminUsers.map((user) => <tr key={user._id}><td><div className="fw-semibold">{user.name || "-"}</div><div className="small text-muted">System admin</div></td><td><div>{user.email || "-"}</div><div className="small text-muted">{user.phone || "-"}</div></td><td><div className="fw-semibold">{user.organization?.name || "-"}</div></td><td><span className={`badge ${user.status === "active" ? "text-bg-success" : user.status === "suspended" ? "text-bg-danger" : "text-bg-light"} text-capitalize`}>{statusText(user.status)}</span></td><td>{formatDate(user.lastLoginAt)}</td><td>{formatDate(user.createdAt)}</td></tr>)}{!systemAdminUsers.length && <tr><td colSpan="6" className="text-center text-muted py-4">No system-admin users found.</td></tr>}</tbody></table></div>
      )}
    </Panel>;

    if (activeSection === "plans") return <Panel title="Subscription plans" action={<button className="btn btn-primary btn-sm" onClick={() => setPlanForm({ name: "", durationMonths: 12, bedMonthly: 0, roomMonthly: 0, shopMonthly: 0, baseAmount: 0, discountPercent: 0, isActive: true })}>Add plan</button>}>
      {planForm && <form onSubmit={savePlan} className="border rounded p-3 mb-3"><div className="row g-2">{[["name", "Plan name"], ["durationMonths", "Duration months"], ["bedMonthly", "Bed monthly price"], ["roomMonthly", "Room monthly price"], ["shopMonthly", "Shop monthly price"], ["baseAmount", "Base amount"], ["discountPercent", "Discount %"]].map(([key, label]) => <div className="col-12 col-md-4" key={key}><label className="form-label small">{label}</label><input required={key === "name"} type={key === "name" ? "text" : "number"} min="0" className="form-control" value={planForm[key]} onChange={(e) => setPlanForm({ ...planForm, [key]: e.target.value })} /></div>)}</div><div className="mt-3 d-flex gap-2"><button className="btn btn-primary">Save plan</button><button type="button" className="btn btn-outline-secondary" onClick={() => setPlanForm(null)}>Cancel</button></div></form>}
      <div className="table-responsive"><table className="table align-middle"><thead><tr><th>Plan</th><th>Duration</th><th>Unit pricing</th><th>Discount</th><th>Status</th><th /></tr></thead><tbody>{plans.map((plan) => <tr key={plan._id}><td><strong>{plan.name}</strong><div className="small text-muted">Base: {money(plan.baseAmount)}</div></td><td>{plan.durationMonths} months</td><td>Beds {money(plan.unitPricing?.bedMonthly)} · Rooms {money(plan.unitPricing?.roomMonthly)} · Shops {money(plan.unitPricing?.shopMonthly)}</td><td>{plan.discountPercent || 0}%</td><td>{plan.isActive ? "Active" : "Inactive"}</td><td className="text-nowrap"><button className="btn btn-sm btn-outline-primary me-1" onClick={() => setPlanForm({ ...plan, bedMonthly: plan.unitPricing?.bedMonthly || 0, roomMonthly: plan.unitPricing?.roomMonthly || 0, shopMonthly: plan.unitPricing?.shopMonthly || 0 })}>Edit</button><button className="btn btn-sm btn-outline-danger" onClick={() => removePlan(plan)}>Delete</button></td></tr>)}{!plans.length && <tr><td colSpan="6" className="text-center text-muted">No plans found.</td></tr>}</tbody></table></div></Panel>;
    if (activeSection === "referrals") return <Panel title="Referral codes"><div className="table-responsive"><table className="table align-middle"><thead><tr><th>Code</th><th>Owner</th><th>Discount</th><th>Reward</th><th>Used</th><th>Status</th></tr></thead><tbody>{referrals.map((item) => <tr key={item._id}><td><strong>{item.code}</strong></td><td>{item.ownerOrganizationId?.name || item.ownerOrganizationId?.ownerName || "Not assigned"}</td><td>{item.discountPercent || 0}%</td><td>{item.rewardCoins || 0} coins</td><td>{item.usedCount || 0}</td><td>{item.isActive ? "Active" : "Inactive"}</td></tr>)}{!referrals.length && <tr><td colSpan="6" className="text-center text-muted">No referral codes found.</td></tr>}</tbody></table></div></Panel>;
    if (activeSection === "transactions") return <Panel title="Billing transactions"><div className="table-responsive"><table className="table align-middle"><thead><tr><th>Date</th><th>Business</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead><tbody>{transactions.map((item) => <tr key={item._id}><td>{formatDate(item.createdAt)}</td><td>{item.organizationId?.name || item.organizationName || "-"}</td><td>{money(item.amount)}</td><td>{item.provider || item.paymentMethod || "-"}</td><td className="text-capitalize">{statusText(item.status)}</td></tr>)}{!transactions.length && <tr><td colSpan="5" className="text-center text-muted">No transactions found.</td></tr>}</tbody></table></div></Panel>;
    if (activeSection === "notifications") return <Panel title="Notifications" action={<button className="btn btn-outline-primary btn-sm" onClick={async () => { await resolveAllNotifications(); await loadSection("notifications"); }}>Mark all read and remove</button>}>{notifications.map((item) => <div key={item._id} className={`w-100 text-start border rounded p-3 mb-2 ${item.read ? "bg-light" : "bg-white"}`}><div className="d-flex align-items-start justify-content-between gap-3"><div><strong>{item.title || "Notification"}</strong><div className="small text-muted">{item.message || ""}</div><div className="small text-secondary mt-1">{formatDate(item.createdAt)}{item.read ? " · Read" : " · New"}</div></div><button className="btn btn-sm btn-outline-secondary flex-shrink-0" onClick={async () => { await resolveNotification(item._id); await loadSection("notifications"); }}>{item.read ? "Remove" : "Mark read & remove"}</button></div></div>)}{!notifications.length && <div className="text-muted text-center py-4">No notifications.</div>}</Panel>;
    if (activeSection === "profile") return <><Panel title="Superadmin profile"><div className="row g-3"><div className="col-md-6"><strong>{bootstrap?.user?.name || "Superadmin"}</strong><div>{bootstrap?.user?.email || "-"}</div><div className="text-muted text-capitalize">{bootstrap?.user?.role || "superadmin"}</div></div><div className="col-md-6"><button className="btn btn-outline-primary me-2" onClick={async () => { await requestPasswordReset(bootstrap?.user?.email); setActionMessage("Password reset link sent to your email."); }}>Send password reset</button><button className="btn btn-primary" onClick={() => setActiveSection("email")}>Change sign-in email</button></div></div></Panel>{activeSection === "email"}</>;
    if (activeSection === "security") return <Panel title="Security PIN"><p className="text-muted">{securityConfigured ? "Your PIN protects sensitive account actions and superadmin login." : "Set a PIN to protect sensitive actions and superadmin login."}</p><form onSubmit={savePin} className="row g-2"><div className="col-md-4"><input type="password" inputMode="numeric" className="form-control" placeholder="New 4–8 digit PIN" value={pinForm.pin} onChange={(e) => setPinForm({ ...pinForm, pin: e.target.value.replace(/\D/g, "").slice(0, 8) })} /></div><div className="col-md-4"><input type="password" inputMode="numeric" className="form-control" placeholder="Confirm PIN" value={pinForm.confirm} onChange={(e) => setPinForm({ ...pinForm, confirm: e.target.value.replace(/\D/g, "").slice(0, 8) })} /></div>{securityConfigured && <div className="col-md-4"><input type="password" className="form-control" placeholder={pinForm.reset ? "Account password" : "Current PIN"} value={pinForm.reset ? pinForm.password : pinForm.currentPin} onChange={(e) => setPinForm(pinForm.reset ? { ...pinForm, password: e.target.value } : { ...pinForm, currentPin: e.target.value.replace(/\D/g, "").slice(0, 8) })} /></div>}<div className="col-12"><button className="btn btn-primary me-2">Save PIN</button>{securityConfigured && <button type="button" className="btn btn-link" onClick={() => setPinForm({ ...pinForm, reset: !pinForm.reset })}>{pinForm.reset ? "Use current PIN" : "Forgot PIN? Use password"}</button>}</div></form></Panel>;
    if (activeSection === "email") return <Panel title="Change sign-in email"><form onSubmit={emailForm.challengeId ? confirmEmailChange : startEmailChange} className="row g-2">{!emailForm.challengeId ? <><div className="col-md-6"><input className="form-control" type="email" required placeholder="New email address" value={emailForm.newEmail} onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })} /></div><div className="col-md-6"><input className="form-control" required type="password" placeholder="Current password" value={emailForm.password} onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })} /></div></> : <div className="col-md-6"><p className="small text-muted">Enter the code sent to {emailForm.maskedEmail}.</p><input className="form-control" required maxLength="6" placeholder="6-digit code" value={emailForm.code} onChange={(e) => setEmailForm({ ...emailForm, code: e.target.value.replace(/\D/g, "").slice(0, 6) })} /></div>}<div className="col-12"><button className="btn btn-primary">{emailForm.challengeId ? "Verify and update email" : "Send verification code"}</button>{emailForm.challengeId && <button type="button" className="btn btn-link" onClick={async () => { await resendSuperadminEmailChangeCode(emailForm.challengeId); setActionMessage("New code sent."); }}>Resend code</button>}</div></form></Panel>;

    return renderDashboard();
  };

  return (
    <div
      className="d-flex sa-layout"
      style={{
        minHeight: "100vh",
        fontFamily: "Poppins, sans-serif",
        backgroundColor: "#f8f9fa",
      }}
    >
      <style>{`
        .sa-topbar { display:none; }
        .sa-layout { width:100%; overflow-x:hidden; }
        .sa-nav-item.is-active { background: rgba(255,255,255,0.16); }
        nav.sa-drawer { left:0; overflow-y:auto; }
        .sa-mobile-drawer-head { display:none; }
        main.sa-shell { width:calc(100% - 250px); min-width:0; overflow-x:hidden; }
        .sa-page-header { min-width:0; }
        .sa-page-header > div { min-width:0; }
        .sa-page-header h1 { overflow-wrap:anywhere; }
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
          .sa-mobile-drawer-head { display:flex; align-items:center; justify-content:space-between; margin:-2px 0 14px; }
          main.sa-shell{
            width:100% !important;
            margin-left: 0 !important;
            padding-top: 72px !important;
          }
        }
        @media (max-width: 575.98px){
          main.sa-shell { padding-left:12px !important; padding-right:12px !important; }
          .sa-page-header { flex-direction:column; align-items:stretch !important; gap:12px !important; }
          .sa-page-header .btn { width:100%; justify-content:center; }
          .sa-topbar { padding-left:12px; padding-right:12px; }
          nav.sa-drawer { width:min(280px, 86vw) !important; }
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
        <div className="sa-mobile-drawer-head">
          <strong>Control Center</strong>
          <button className="sa-iconbtn" onClick={() => setOpen(false)} aria-label="Close menu">
            <FiX size={22} />
          </button>
        </div>

        <ul className="list-unstyled mt-3" style={{ textAlign: "left" }}>
          {menuItems.map((item) => (
            <li
              key={item.key}
              onClick={() => {
                selectSection(item.key);
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
        <div className="d-flex align-items-start justify-content-between gap-3 mb-3 px-2 sa-page-header">
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
        {supportOrganization ? (
          <div className="modal d-block" role="dialog" aria-modal="true" style={{ backgroundColor: "rgba(15, 23, 42, 0.48)" }}>
            <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title mb-1">Support: reduce units</h5>
                    <div className="small text-muted">{supportOrganization.name}</div>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setSupportOrganization(null)} aria-label="Close" />
                </div>
                <div className="modal-body">
                  <p className="small text-muted mb-3">
                    Removing an occupied unit ends the current tenant's stay today and moves them to former tenant records. Their documents, rent and payment history remain saved.
                  </p>
                  {supportLoading ? (
                    <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>
                  ) : !supportUnits.length ? (
                    <div className="alert alert-light border mb-0">No configured units are available for this account.</div>
                  ) : (
                    <div className="list-group">
                      {supportUnits.map((unit) => {
                        const occupied = unit.occupancy === "occupied";
                        const tenantNames = (unit.occupants || []).map((tenant) => tenant.name).filter(Boolean).join(", ");
                        const unitType = unit.propertyType === "bed" ? "bed" : unit.propertyType === "shop" ? "shop" : "room";
                        return (
                          <div key={unit.id} className="list-group-item d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
                            <div>
                              <div className="fw-semibold">{unit.label}</div>
                              <div className={`small ${occupied ? "text-danger" : "text-success"}`}>
                                {occupied ? `Occupied${tenantNames ? ` · ${tenantNames}` : ""}` : `Vacant ${unitType}`}
                              </div>
                            </div>
                            <button
                              className={`btn btn-sm ${occupied ? "btn-outline-danger" : "btn-outline-secondary"}`}
                              onClick={() => retireSupportUnit(unit)}
                              disabled={Boolean(supportAction)}
                            >
                              {supportAction === unit.id ? "Updating..." : "Remove"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setSupportOrganization(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {actionMessage && <div className="alert alert-success mt-3">{actionMessage}</div>}
      </main>
    </div>
  );
}
