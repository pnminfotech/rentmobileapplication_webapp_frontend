import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiCheckCircle,
  FiCopy,
  FiCreditCard,
  FiDollarSign,
  FiGift,
  FiInfo,
  FiPlus,
  FiShare2,
  FiShield,
  FiUser,
  FiUsers,
} from "react-icons/fi";

import {
  completeMockSaasPayment,
  createSaasPayment,
  getAppBootstrap,
  getSaasPaymentStatus,
  getSystemSecurityPinStatus,
  getWalletSummary,
  requestSubscriptionUpgrade,
  resetSystemSecurityPin,
  saveSystemSecurityPin,
} from "../saasApi";
import "./ProfileSettings.css";

const unitFields = [
  { key: "beds", label: "Beds" },
  { key: "rooms", label: "Rooms" },
  { key: "shops", label: "Shops" },
];

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const number = (value) => Number(value || 0).toLocaleString("en-IN");
const money = (value, currency = "INR") => `${currency === "INR" ? "Rs." : currency} ${number(value)}`;
const titleCase = (value) => String(value || "-").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function WalletEntry({ entry }) {
  const credited = entry.direction === "credit";
  return (
    <div className="profile-wallet-entry">
      <strong className={credited ? "credit" : "debit"}>{credited ? "+" : "-"}{number(entry.coins)} coins</strong>
      <div><b>{entry.type === "referral_reward" ? "Referral reward" : entry.type === "upgrade_discount_used" ? "Package upgrade" : entry.type === "renewal_discount_used" ? "Subscription renewal" : credited ? "Coins earned" : "Coins used"}</b><span>{entry.description || `${number(entry.balanceAfter)} coin balance`}</span></div>
      <small>{formatDate(entry.createdAt)}</small>
    </div>
  );
}

export default function ProfileSettings() {
  const [bootstrap, setBootstrap] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [pinConfigured, setPinConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeUnits, setUpgradeUnits] = useState({ beds: "", rooms: "", shops: "" });
  const [useWallet, setUseWallet] = useState(true);
  const [walletFilter, setWalletFilter] = useState("all");
  const [referralCopied, setReferralCopied] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [pinForm, setPinForm] = useState({ pin: "", confirm: "", currentPin: "", password: "", reset: false });
  const [savingPin, setSavingPin] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const [account, walletData, pin] = await Promise.all([
        getAppBootstrap(),
        getWalletSummary().catch(() => null),
        getSystemSecurityPinStatus().catch(() => ({ configured: false })),
      ]);
      setBootstrap(account);
      setWallet(walletData);
      setPinConfigured(Boolean(pin?.configured));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const subscription = bootstrap?.subscription || {};
  const organization = bootstrap?.organization || {};
  const user = bootstrap?.user || {};
  const units = subscription.units || organization.unitAllocation || {};
  const isTrial = Number(subscription.amount || 0) === 0 && !subscription.planId && String(subscription.status || "").toLowerCase() === "active";
  const walletBalance = Number(wallet?.balance || 0);
  const walletEntries = useMemo(() => Array.isArray(wallet?.entries) ? wallet.entries : [], [wallet]);
  const earnedCoins = useMemo(() => walletEntries.filter((entry) => entry.direction === "credit").reduce((sum, entry) => sum + Number(entry.coins || 0), 0), [walletEntries]);
  const usedCoins = useMemo(() => walletEntries.filter((entry) => entry.direction === "debit").reduce((sum, entry) => sum + Number(entry.coins || 0), 0), [walletEntries]);
  const entries = useMemo(() => walletFilter === "all" ? walletEntries : walletEntries.filter((entry) => entry.direction === walletFilter), [walletEntries, walletFilter]);
  const referral = wallet?.referralCode;
  const totalUnits = unitFields.reduce((sum, { key }) => sum + Number(units[key] || 0), 0);

  const changeUpgradeUnit = (key, value) => setUpgradeUnits((current) => ({
    ...current,
    [key]: String(value || "").replace(/\D/g, ""),
  }));

  const scrollToProfileSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openWalletUpgrade = () => {
    setShowUpgrade(true);
    window.setTimeout(() => scrollToProfileSection("profile-upgrade"), 0);
  };

  const copyReferralCode = async () => {
    if (!referral?.code) return;
    try {
      await navigator.clipboard.writeText(referral.code);
      setReferralCopied(true);
      window.setTimeout(() => setReferralCopied(false), 1800);
    } catch {
      setError("Unable to copy the referral code. Please copy it manually.");
    }
  };

  const shareReferralCode = async () => {
    if (!referral?.code) return;
    const text = `Join Rent Manager with referral code ${referral.code}.`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* Sharing was cancelled. */ }
      return;
    }
    await copyReferralCode();
    setNotice("Referral code copied. You can now share it.");
  };

  const waitForPayment = async (transactionId) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const latest = await getSaasPaymentStatus(transactionId);
      const status = String(latest?.transaction?.status || "").toLowerCase();
      if (["success", "failed", "cancelled", "canceled"].includes(status)) return status;
      await new Promise((resolve) => window.setTimeout(resolve, 2500));
    }
    return "pending";
  };

  const upgrade = async () => {
    const unitsToAdd = Object.fromEntries(unitFields.map(({ key }) => [key, Number(upgradeUnits[key] || 0)]));
    if (!Object.values(unitsToAdd).some(Boolean)) return setError("Enter at least one extra bed, room, or shop.");
    try {
      setUpgrading(true); setError(""); setNotice("");
      const result = await requestSubscriptionUpgrade({ units: unitsToAdd, useWallet });
      if (result?.trialUpgrade) {
        setNotice("Units added to your free trial.");
        setUpgradeUnits({ beds: "", rooms: "", shops: "" }); setShowUpgrade(false); await load(); return;
      }
      const transactionId = result?.transaction?._id;
      if (!transactionId) throw new Error("Upgrade payment could not be created.");
      const payment = await createSaasPayment({ transactionId });
      const provider = String(payment?.payment?.provider || "").toLowerCase();
      if (provider === "mock" && payment?.payment?.mockSuccessUrl) {
        await completeMockSaasPayment(transactionId);
        setNotice("Package upgraded. Your units are ready to use.");
      } else {
        const url = payment?.payment?.directPaymentUrl || payment?.payment?.paymentUrl || payment?.payment?.checkoutPageUrl;
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        const status = await waitForPayment(transactionId);
        setNotice(status === "success" ? "Package upgraded. Your units are ready to use." : status === "pending" ? "Payment is pending. Refresh this page after completing payment." : "Payment was not completed. Please try again.");
      }
      setUpgradeUnits({ beds: "", rooms: "", shops: "" }); setShowUpgrade(false); await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to start the upgrade payment.");
    } finally { setUpgrading(false); }
  };

  const savePin = async (event) => {
    event.preventDefault();
    if (!/^\d{4,8}$/.test(pinForm.pin)) return setError("Use a 4 to 8 digit security PIN.");
    if (pinForm.pin !== pinForm.confirm) return setError("The new PIN and confirmation do not match.");
    if (pinConfigured && !pinForm.reset && !/^\d{4,8}$/.test(pinForm.currentPin)) return setError("Enter your current security PIN.");
    if (pinConfigured && pinForm.reset && !pinForm.password) return setError("Enter your account password to reset the PIN.");
    try {
      setSavingPin(true); setError(""); setNotice("");
      if (pinConfigured && pinForm.reset) await resetSystemSecurityPin({ pin: pinForm.pin, password: pinForm.password });
      else await saveSystemSecurityPin({ pin: pinForm.pin, currentPin: pinForm.currentPin });
      setPinConfigured(true); setPinForm({ pin: "", confirm: "", currentPin: "", password: "", reset: false }); setNotice("Security PIN saved.");
    } catch (err) { setError(err.response?.data?.message || "Unable to save the security PIN."); }
    finally { setSavingPin(false); }
  };

  if (loading) return <div className="profile-page profile-loading"><div className="spinner-border text-primary" role="status" /></div>;

  return (
    <main className="profile-page">
      <div className="profile-shell">
        <header className="profile-header"><span>ACCOUNT SETTINGS</span><h1>Profile</h1><p>Manage your business, subscription, wallet and security.</p></header>
        {error && <div className="profile-message error">{error}</div>}
        {notice && <div className="profile-message success"><FiCheckCircle />{notice}</div>}

        <section className="profile-hero">
          <div className="profile-avatar">{String(user.name || user.email || "AD").slice(0, 2).toUpperCase()}</div>
          <div><h2>{user.name || "System admin"}</h2><p>{user.email || "-"}</p><b>{titleCase(user.role || "system admin")}</b></div>
        </section>

        <section className="profile-stat-grid" aria-label="Profile overview">
          <button type="button" className="profile-stat-card profile-stat-blue" onClick={() => scrollToProfileSection("profile-subscription")}><FiPlus /><div><span>Registered units</span><strong>{number(totalUnits)}</strong><small>View capacity</small></div></button>
          <button type="button" className="profile-stat-card profile-stat-green" onClick={() => scrollToProfileSection("profile-upgrade")}><FiCreditCard /><div><span>Subscription</span><strong>{titleCase(subscription.status || "active")}</strong><small>Manage plan</small></div></button>
          <button type="button" className="profile-stat-card profile-stat-amber" onClick={() => scrollToProfileSection("profile-wallet")}><FiDollarSign /><div><span>Wallet coins</span><strong>{number(walletBalance)}</strong><small>View activity</small></div></button>
          <button type="button" className="profile-stat-card profile-stat-purple" onClick={() => scrollToProfileSection("profile-security-pin")}><FiShield /><div><span>Security PIN</span><strong>{pinConfigured ? "Set" : "Not set"}</strong><small>{pinConfigured ? "Manage PIN" : "Set PIN"}</small></div></button>
        </section>

        <div className="profile-grid">
          <section className="profile-card"><h2><FiUser /> Account & business</h2><div className="profile-details"><p><span>Name</span><strong>{user.name || "System admin"}</strong></p><p><span>Phone</span><strong>{organization.phone || user.phone || "-"}</strong></p><p><span>Business</span><strong>{organization.name || "-"}</strong></p><p><span>Business type</span><strong>{titleCase(organization.businessType)}</strong></p><p><span>Created</span><strong>{formatDate(user.createdAt)}</strong></p><p><span>Owner</span><strong>{organization.ownerName || "-"}</strong></p></div></section>
          <section className="profile-card" id="profile-subscription"><h2><FiCreditCard /> Subscription</h2><div className="profile-subscription"><span className="profile-status">{titleCase(subscription.status || "active")}</span><p><span>Plan amount</span><strong>{money(subscription.amount, subscription.currency)}</strong></p><p><span>Valid until</span><strong>{formatDate(subscription.endDate)}</strong></p><p><span>Duration</span><strong>{subscription.durationMonths ? `${subscription.durationMonths} months` : "-"}</strong></p></div><div className="profile-unit-grid">{unitFields.map(({ key, label }) => <div key={key}><strong>{number(units[key])}</strong><span>{label}</span></div>)}</div></section>
        </div>

        <section className="profile-card profile-upgrade" id="profile-upgrade"><div className="profile-card-title"><div><h2><FiPlus /> {isTrial ? "Trial units" : "Upgrade units"}</h2><p>Add capacity whenever you need more beds, rooms, or shops.</p></div><button type="button" className="profile-outline-button" onClick={() => setShowUpgrade((value) => !value)}>{showUpgrade ? "Close" : "Add units"}</button></div><div className="profile-wallet-summary"><FiDollarSign /><div><span>Wallet balance</span><strong>{number(walletBalance)} coins</strong></div></div>{showUpgrade && <div className="profile-upgrade-form"><div className="profile-upgrade-inputs">{unitFields.map(({ key, label }) => <label key={key}>Extra {label.toLowerCase()}<input inputMode="numeric" value={upgradeUnits[key]} onChange={(event) => changeUpgradeUnit(key, event.target.value)} placeholder="0" /></label>)}</div>{!isTrial && <label className="profile-wallet-toggle"><input type="checkbox" checked={useWallet} disabled={!walletBalance} onChange={(event) => setUseWallet(event.target.checked)} /> Use wallet coins ({number(walletBalance)} available)</label>}<button type="button" className="profile-primary-button" onClick={upgrade} disabled={upgrading}>{upgrading ? "Starting payment…" : isTrial ? "Add trial units" : "Continue to payment"}</button></div>}</section>

        <div className="profile-grid">
          <section className="profile-card" id="profile-security-pin"><h2><FiShield /> Security PIN</h2><p className="profile-card-copy">Your PIN is required before deleting tenants, units, bills, and expenses.</p><form className="profile-pin-form" onSubmit={savePin}>{pinConfigured && !pinForm.reset && <label>Current security PIN<input type="password" inputMode="numeric" maxLength="8" value={pinForm.currentPin} onChange={(event) => setPinForm({ ...pinForm, currentPin: event.target.value.replace(/\D/g, "") })} /></label>}{pinConfigured && pinForm.reset && <label>Account password<input type="password" value={pinForm.password} onChange={(event) => setPinForm({ ...pinForm, password: event.target.value })} /></label>}<label>New security PIN<input type="password" inputMode="numeric" maxLength="8" placeholder="4 to 8 digits" value={pinForm.pin} onChange={(event) => setPinForm({ ...pinForm, pin: event.target.value.replace(/\D/g, "") })} /></label><label>Confirm security PIN<input type="password" inputMode="numeric" maxLength="8" value={pinForm.confirm} onChange={(event) => setPinForm({ ...pinForm, confirm: event.target.value.replace(/\D/g, "") })} /></label>{pinConfigured && <button className="profile-link-button" type="button" onClick={() => setPinForm({ ...pinForm, reset: !pinForm.reset, currentPin: "", password: "" })}>{pinForm.reset ? "Use current PIN" : "Forgot PIN? Reset with account password"}</button>}<button className="profile-primary-button" disabled={savingPin}>{savingPin ? "Saving…" : pinConfigured ? "Update PIN" : "Set security PIN"}</button></form></section>
          <section className="profile-wallet-page" id="profile-wallet">
            <header className="profile-wallet-header"><span>REWARDS &amp; REFERRALS</span><h2>Wallet</h2><p>Coins, referrals and reward history</p></header>
            <div className="profile-wallet-balance-card">
              <div><span>Available balance</span><strong>{number(walletBalance)} coins</strong><p>Use coins when upgrading your package</p></div>
              <div className="profile-wallet-balance-action"><FiDollarSign /><button type="button" onClick={openWalletUpgrade}>Upgrade package</button></div>
            </div>
            {referral?.code && <div className="profile-referral-card">
              <h3>Invite &amp; earn</h3><p>Earn {number(referral.rewardCoins || 100)} coins after your friend completes their first payment.</p>
              <div className="profile-referral-actions"><button type="button" className="profile-referral-code" onClick={copyReferralCode}>{referral.code}<FiCopy /></button><button type="button" className="profile-referral-share" onClick={shareReferralCode}><FiShare2 /> Share code</button></div>
              {referralCopied && <small className="profile-referral-copied">Referral code copied.</small>}
            </div>}
            <div className="profile-wallet-stats">
              <div><FiGift /><strong>{number(earnedCoins)}</strong><span>Earned</span></div>
              <div><FiDollarSign /><strong>{number(usedCoins)}</strong><span>Used</span></div>
              <div><FiUsers /><strong>{number(referral?.usedCount)}</strong><span>Referrals</span></div>
            </div>
            <div className="profile-wallet-history-heading"><h3>Reward history</h3><select value={walletFilter} onChange={(event) => setWalletFilter(event.target.value)} aria-label="Filter reward history"><option value="all">All activity</option><option value="credit">Coins earned</option><option value="debit">Coins used</option></select></div>
            <div className="profile-wallet-history">{entries.length ? entries.map((entry) => <WalletEntry entry={entry} key={entry._id || `${entry.createdAt}-${entry.coins}`} />) : <p className="profile-empty">No wallet activity for this filter.</p>}</div>
            <p className="profile-wallet-disclaimer"><FiInfo /> Coins have no cash value</p>
          </section>
        </div>
      </div>
    </main>
  );
}
