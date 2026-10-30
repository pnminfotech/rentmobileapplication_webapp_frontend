import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiArrowRight,
  FiBriefcase,
  FiCalendar,
  FiCamera,
  FiChevronRight,
  FiClock,
  FiCopy,
  FiCreditCard,
  FiCoffee,
  FiDatabase,
  FiExternalLink,
  FiFileText,
  FiGift,
  FiGrid,
  FiHome,
  FiInfo,
  FiLayers,
  FiPhone,
  FiPlus,
  FiRefreshCw,
  FiShare2,
  FiShield,
  FiTrash2,
  FiUser,
  FiUsers,
  FiUpload,
  FiX,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";

import {
  completeMockSaasPayment,
  createSaasPayment,
  getAppBootstrap,
  getOwnerDocuments,
  getSaasPaymentStatus,
  getSystemSecurityPinStatus,
  getWalletSummary,
  removeOwnerDocument,
  requestSubscriptionUpgrade,
  resetSystemSecurityPin,
  savePropertyTypes,
  saveCanteenFeature,
  saveBusinessProfile,
  saveSystemSecurityPin,
  saveUnitCounts,
  uploadOwnerDocument,
} from "../saasApi";
import { PropertyTypePicker } from "./PropertyTypes";
import "./ProfileSettings.css";

const unitFields = [
  { key: "beds", label: "Beds" },
  { key: "rooms", label: "Rooms" },
  { key: "shops", label: "Shops" },
];
const emptyPinForm = { pin: "", confirm: "", currentPin: "", password: "", reset: false };
const ownerDocumentFields = [
  { key: "photo", label: "Owner photo", hint: "A clear photo of the owner", Icon: FiCamera },
  { key: "aadhaar", label: "Aadhaar card", hint: "A readable image of the card", Icon: FiFileText },
  { key: "pan", label: "PAN card", hint: "A readable image of the card", Icon: FiCreditCard },
];
const emptyOwnerDocuments = { photo: null, aadhaar: null, pan: null };

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
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [upgradeUnits, setUpgradeUnits] = useState({ beds: "", rooms: "", shops: "" });
  const [useWallet, setUseWallet] = useState(true);
  const [walletFilter, setWalletFilter] = useState("all");
  const [referralCopied, setReferralCopied] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [pinForm, setPinForm] = useState(emptyPinForm);
  const [savingPin, setSavingPin] = useState(false);
  const [unitCounts, setUnitCounts] = useState({ beds: "", rooms: "", shops: "" });
  const [propertyTypesDraft, setPropertyTypesDraft] = useState([]);
  const [savingCounts, setSavingCounts] = useState(false);
  const [ownerDocuments, setOwnerDocuments] = useState(emptyOwnerDocuments);
  const [ownerDocumentError, setOwnerDocumentError] = useState("");
  const [ownerDocumentNotice, setOwnerDocumentNotice] = useState("");
  const [ownerDocumentBusy, setOwnerDocumentBusy] = useState("");
  const [confirmRemoveOwnerDocument, setConfirmRemoveOwnerDocument] = useState("");
  const [businessProfile, setBusinessProfile] = useState({ businessName: "", ownerName: "" });
  const [savingBusinessProfile, setSavingBusinessProfile] = useState(false);
  const [savingCanteenFeature, setSavingCanteenFeature] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const [account, walletData, pin] = await Promise.all([
        getAppBootstrap(),
        getWalletSummary().catch(() => null),
        getSystemSecurityPinStatus().catch(() => ({ configured: false })),
      ]);
      setBootstrap(account);
      setPropertyTypesDraft(account.organization?.selectedPropertyTypes || []);
      setBusinessProfile({
        businessName: account.organization?.name || "",
        ownerName: account.organization?.ownerName || account.user?.name || "",
      });
      if (account.organization?.onboardingMode === "flexible") {
        const initial = account.organization.unitCountsConfigured ? account.subscription?.units : account.unitUsage;
        setUnitCounts(Object.fromEntries(unitFields.map(({ key }) => [key, String(initial?.[key] || 0)])));
      }
      setWallet(walletData);
      setPinConfigured(Boolean(pin?.configured));
      if (account.user?.role === "system_admin") {
        try {
          setOwnerDocuments(await getOwnerDocuments());
          setOwnerDocumentError("");
        } catch (documentError) {
          setOwnerDocumentError(documentError.response?.data?.message || "Could not load owner documents.");
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const closePinModal = useCallback(() => {
    setShowPinModal(false);
    setPinForm(emptyPinForm);
  }, []);

  useEffect(() => {
    if (!showUnitsModal && !showPinModal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setShowUnitsModal(false);
        closePinModal();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showUnitsModal, showPinModal, closePinModal]);

  const subscription = bootstrap?.subscription || {};
  const access = bootstrap?.access || {};
  const subscriptionStatus = access.readOnly
    ? "View only"
    : access.needsPayment
      ? "Payment required"
      : access.expired
        ? "Expired"
        : titleCase(subscription.status || "Unknown");
  const organization = bootstrap?.organization || {};
  const user = bootstrap?.user || {};
  const units = subscription.units || organization.unitAllocation || {};
  const isTrial = Number(subscription.amount || 0) === 0 && !subscription.planId && String(subscription.status || "").toLowerCase() === "active";
  const canChangeUnits = Boolean(access.canUseSystem) && !access.readOnly && !access.needsPayment && !access.suspended;
  const walletBalance = Number(wallet?.balance || 0);
  const walletEntries = useMemo(() => Array.isArray(wallet?.entries) ? wallet.entries : [], [wallet]);
  const earnedCoins = useMemo(() => walletEntries.filter((entry) => entry.direction === "credit").reduce((sum, entry) => sum + Number(entry.coins || 0), 0), [walletEntries]);
  const usedCoins = useMemo(() => walletEntries.filter((entry) => entry.direction === "debit").reduce((sum, entry) => sum + Number(entry.coins || 0), 0), [walletEntries]);
  const entries = useMemo(() => walletFilter === "all" ? walletEntries : walletEntries.filter((entry) => entry.direction === walletFilter), [walletEntries, walletFilter]);
  const referral = wallet?.referralCode;
  const flexible = organization.onboardingMode === "flexible";
  const registeredUnits = flexible ? (bootstrap?.unitUsage || {}) : units;
  const totalUnits = unitFields.reduce((sum, { key }) => sum + Number(registeredUnits[key] || 0), 0);
  const selectedTypes = organization.selectedPropertyTypes || [];
  const hasHostel = flexible ? selectedTypes.includes("bed") : Number(units.beds || 0) > 0;
  const canteenEnabled = Boolean(organization.features?.canteenEnabled);

  const saveOwnerDocument = async (kind, label, file) => {
    const isImage = ["image/jpeg", "image/png"].includes(file.type) && /\.(jpe?g|png)$/i.test(file.name);
    const isPdf = kind !== "photo" && file.type === "application/pdf" && /\.pdf$/i.test(file.name);
    if (!isImage && !isPdf) {
      setOwnerDocumentError(kind === "photo" ? "Choose a JPG or PNG owner photo." : "Choose a JPG, PNG, or PDF document.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setOwnerDocumentError("The file must be 5 MB or smaller.");
      return;
    }
    try {
      setOwnerDocumentBusy(kind);
      setOwnerDocumentError("");
      setOwnerDocumentNotice("");
      const document = await uploadOwnerDocument(kind, file);
      setOwnerDocuments((current) => ({ ...current, [kind]: document }));
      setOwnerDocumentNotice(`${label} saved.`);
      setConfirmRemoveOwnerDocument("");
    } catch (uploadError) {
      setOwnerDocumentError(uploadError.response?.data?.message || `Could not save ${label.toLowerCase()}.`);
    } finally {
      setOwnerDocumentBusy("");
    }
  };

  const deleteOwnerDocument = async (kind, label) => {
    try {
      setOwnerDocumentBusy(kind);
      setOwnerDocumentError("");
      setOwnerDocumentNotice("");
      await removeOwnerDocument(kind);
      setOwnerDocuments((current) => ({ ...current, [kind]: null }));
      setOwnerDocumentNotice(`${label} removed.`);
      setConfirmRemoveOwnerDocument("");
    } catch (deleteError) {
      setOwnerDocumentError(deleteError.response?.data?.message || `Could not remove ${label.toLowerCase()}.`);
    } finally {
      setOwnerDocumentBusy("");
    }
  };

  const saveCounts = async () => {
    try {
      setSavingCounts(true); setError(""); setNotice("");
      const selectedTypeSet = new Set(propertyTypesDraft);
      const countPayload = Object.fromEntries(unitFields.map(({ key }) => [key, Number(unitCounts[key] || 0)]));
      const selectedCount = unitFields.some(({ key }) => {
        const type = ({ beds: "bed", rooms: "room", shops: "shop" })[key];
        return selectedTypeSet.has(type) && countPayload[key] > 0;
      });
      if (!selectedCount) {
        setError("Set a count for at least one selected property type.");
        return;
      }
      const savedTypes = organization.selectedPropertyTypes || [];
      if (savedTypes.length !== propertyTypesDraft.length || savedTypes.some((type) => !selectedTypeSet.has(type))) {
        await savePropertyTypes(propertyTypesDraft, canteenEnabled && selectedTypeSet.has("bed"));
      }
      await saveUnitCounts(countPayload);
      await load();
      setNotice("Property types and unit counts saved. Your existing units have been kept.");
    } catch (err) { setError(err.response?.data?.message || "Unable to save unit counts."); }
    finally { setSavingCounts(false); }
  };

  const changeCanteenFeature = async (enabled) => {
    try {
      setSavingCanteenFeature(true); setError(""); setNotice("");
      const result = await saveCanteenFeature(enabled);
      await load();
      setNotice(result.message || (enabled ? "Canteen feature enabled." : "Canteen feature disabled."));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update canteen feature.");
    } finally {
      setSavingCanteenFeature(false);
    }
  };

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
      setPinConfigured(true); setPinForm(emptyPinForm); setNotice("Security PIN saved.");
    } catch (err) { setError(err.response?.data?.message || "Unable to save the security PIN."); }
    finally { setSavingPin(false); }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      setSavingBusinessProfile(true);
      setError("");
      setNotice("");
      const updated = await saveBusinessProfile(businessProfile);
      setBootstrap((current) => ({
        ...current,
        organization: updated.organization,
        user: updated.user,
      }));
      setBusinessProfile({
        businessName: updated.organization?.name || "",
        ownerName: updated.organization?.ownerName || updated.user?.name || "",
      });
      setNotice("Business profile saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update your business profile.");
    } finally {
      setSavingBusinessProfile(false);
    }
  };

  if (loading) return <div className="profile-page profile-loading"><div className="spinner-border text-primary" role="status" /></div>;

  return (
    <main className="profile-page">
      <div className="profile-shell">
        <div className="profile-content">
        <header className="profile-header">
          <div><span>ACCOUNT SETTINGS</span><h1>Profile</h1><p>Manage your business, subscription, wallet and security.</p></div>
          <nav className="profile-breadcrumb" aria-label="Breadcrumb"><Link to="/admin">Home</Link><FiChevronRight /><span>Profile</span></nav>
        </header>
        {error && <div className="profile-message error">{error}</div>}
        {notice && <div className="profile-message success"><FiCheckCircle />{notice}</div>}

        <section className="profile-hero">
          <div className="profile-avatar">{String(user.name || user.email || "AD").slice(0, 2).toUpperCase()}</div>
          <div className="profile-hero-identity"><h2>{user.name || "System admin"}</h2><p>{user.email || organization.phone || user.phone || "-"}</p><b>{titleCase(user.role || "system admin")}</b></div>
          <div className="profile-hero-art" aria-hidden="true"><div className="profile-art-sheet"><span /><span /><span /></div><div className="profile-art-user"><FiUser /></div></div>
          <div className="profile-hero-message"><strong>Manage your account</strong><span>Keep your business information, subscription and security settings up to date.</span></div>
        </section>

        <section className="profile-stat-grid" aria-label="Profile overview">
          <button type="button" className="profile-stat-card profile-stat-blue" onClick={() => { setError(""); setNotice(""); setShowUnitsModal(true); }}><FiHome /><div><span>Registered units</span><strong>{number(totalUnits)}</strong><small>{flexible ? "Manage property types" : "View capacity"}</small></div></button>
          <button type="button" className="profile-stat-card profile-stat-plan" onClick={() => scrollToProfileSection("profile-subscription")}><FiGift /><div><span>Subscription</span><strong>{subscriptionStatus}</strong><small>View subscription details</small></div></button>
          <button type="button" className="profile-stat-card profile-stat-wallet" onClick={() => scrollToProfileSection("profile-wallet")}><FiDatabase /><div><span>Wallet coins</span><strong>{number(walletBalance)}</strong><small>View activity</small></div></button>
          <button type="button" className="profile-stat-card profile-stat-purple" onClick={() => { setError(""); setNotice(""); setPinForm(emptyPinForm); setShowPinModal(true); }}><FiShield /><div><span>Security PIN</span><strong>{pinConfigured ? "Set" : "Not set"}</strong><small>{pinConfigured ? "Manage PIN" : "Set PIN"}</small></div></button>
        </section>

        <div className="profile-main-columns">
          <div className="profile-column">
            <section className="profile-card profile-account-card">
              <div className="profile-section-heading"><h2><FiUser /> Account &amp; business details</h2></div>
              <div className="profile-details">
                <p><FiUsers /><span>Name<strong>{user.name || "System admin"}</strong></span></p>
                <p><FiPhone /><span>Phone<strong>{organization.phone || user.phone || "-"}</strong></span></p>
                <p><FiBriefcase /><span>Business<strong>{organization.name || "-"}</strong></span></p>
                <p><FiGrid /><span>Business type<strong>{titleCase(organization.businessType)}</strong></span></p>
                <p><FiClock /><span>Created<strong>{formatDate(user.createdAt)}</strong></span></p>
                <p><FiUser /><span>Owner<strong>{organization.ownerName || "-"}</strong></span></p>
              </div>
              {user.role === "system_admin" && <form className="profile-business-edit" onSubmit={saveProfile}>
                <h3>Business details</h3>
                <label>
                  Business name
                  <input
                    className="form-control"
                    value={businessProfile.businessName}
                    onChange={(event) => setBusinessProfile((current) => ({ ...current, businessName: event.target.value }))}
                    maxLength={120}
                    required
                  />
                </label>
                <label>
                  Owner name
                  <input
                    className="form-control"
                    value={businessProfile.ownerName}
                    onChange={(event) => setBusinessProfile((current) => ({ ...current, ownerName: event.target.value }))}
                    maxLength={120}
                    required
                  />
                </label>
                <button className="btn btn-primary" type="submit" disabled={savingBusinessProfile}>
                  {savingBusinessProfile ? "Saving..." : "Save business details"}
                </button>
              </form>}
            </section>
            {user.role === "system_admin" && hasHostel && <section className="profile-card profile-canteen-feature">
              <div className="profile-section-heading"><div><h2><FiCoffee /> Canteen feature</h2><p>Choose whether this hostel uses meal settings and attendance.</p></div></div>
              <label className="profile-canteen-toggle">
                <span><strong>{canteenEnabled ? "Canteen enabled" : "Canteen disabled"}</strong><small>{canteenEnabled ? "Canteen settings, tenant meal options, and attendance are available." : "Canteen sections and meal options are hidden. Existing canteen settings are kept if you enable it later."}</small></span>
                <input type="checkbox" role="switch" checked={canteenEnabled} disabled={savingCanteenFeature || !canChangeUnits} onChange={(event) => changeCanteenFeature(event.target.checked)} />
              </label>
              {!canChangeUnits && <p className="profile-card-copy mb-0">Activate or renew your subscription to change this feature.</p>}
            </section>}
            {user.role === "system_admin" && <section className="profile-card profile-owner-documents" id="profile-owner-documents">
              <div className="profile-section-heading">
                <div><h2><FiFileText /> Owner documents</h2><p>Save the owner's photo and identity cards for police verification.</p></div>
              </div>
              {ownerDocumentError && <div className="profile-message error" role="alert">{ownerDocumentError}</div>}
              {ownerDocumentNotice && <div className="profile-message success" role="status"><FiCheckCircle />{ownerDocumentNotice}</div>}
              {access.readOnly && <div className="profile-owner-document-readonly"><FiInfo /><span>Your subscription is view only. Renew it to upload or change owner documents.</span><Link to="/subscription-expired">Renew subscription</Link></div>}
              <div className="profile-owner-document-grid">
                {ownerDocumentFields.map(({ key, label, hint, Icon }) => {
                  const document = ownerDocuments?.[key];
                  return <article className="profile-owner-document" key={key}>
                    <div className="profile-owner-document-heading"><Icon /><div><strong>{label}</strong><small>{hint}</small></div></div>
                    {document?.url
                      ? <a className={`profile-owner-document-preview${key === "photo" ? " is-photo" : ""}`} href={document.url} target="_blank" rel="noopener noreferrer" aria-label={`View ${label}`}>{document.mimeType === "application/pdf" ? <span className="profile-owner-document-pdf"><FiFileText /> PDF document</span> : <img src={document.url} alt={label} />}<span className="profile-owner-document-view"><FiExternalLink /> View {document.mimeType === "application/pdf" ? "PDF" : "image"}</span></a>
                      : <div className="profile-owner-document-placeholder"><Icon /><span>No image uploaded</span></div>}
                    {document && <small className="profile-owner-document-date">Saved {formatDate(document.uploadedAt)}</small>}
                    <div className="profile-owner-document-actions">
                      {!access.readOnly && <label className="profile-owner-upload"><FiUpload /> {ownerDocumentBusy === key ? "Saving…" : document ? "Replace" : "Upload"}<input type="file" accept={key === "photo" ? "image/jpeg,image/png,.jpg,.jpeg,.png" : "image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"} disabled={Boolean(ownerDocumentBusy)} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) saveOwnerDocument(key, label, file); }} /></label>}
                      {access.readOnly && <Link className="profile-owner-upload" to="/subscription-expired"><FiUpload /> Renew to upload</Link>}
                      {document && !access.readOnly && <button type="button" className="profile-owner-remove" onClick={() => setConfirmRemoveOwnerDocument(key)} disabled={Boolean(ownerDocumentBusy)} aria-label={`Remove ${label}`}><FiTrash2 /> Remove</button>}
                    </div>
                    {confirmRemoveOwnerDocument === key && <div className="profile-owner-remove-confirm"><span>Remove {label.toLowerCase()}?</span><button type="button" onClick={() => deleteOwnerDocument(key, label)} disabled={Boolean(ownerDocumentBusy)}>Yes, remove</button><button type="button" onClick={() => setConfirmRemoveOwnerDocument("")} disabled={Boolean(ownerDocumentBusy)}>Cancel</button></div>}
                  </article>;
                })}
              </div>
              <p className="profile-owner-document-help">Photo: JPG or PNG. Cards: JPG, PNG, or PDF. Maximum 5 MB per file.</p>
            </section>}
            <section className="profile-card profile-subscription-card" id="profile-subscription">
              <div className="profile-section-heading"><h2><FiCreditCard /> Subscription</h2>{(access.readOnly || access.expired || access.needsPayment) && <Link className="profile-section-action" to="/subscription-expired"><FiRefreshCw /> {access.needsPayment ? "Complete payment" : "Renew subscription"}</Link>}</div>
              <span className={`profile-status ${access.readOnly ? "profile-status-read-only" : access.expired || access.needsPayment ? "profile-status-inactive" : ""}`}>{subscriptionStatus}</span>
              <div className="profile-subscription">
                <p><FiCreditCard /><span>Plan amount<strong>{money(subscription.amount, subscription.currency)}</strong></span></p>
                <p><FiCalendar /><span>Valid until<strong>{formatDate(subscription.endDate)}</strong></span></p>
                <p><FiClock /><span>Duration<strong>{subscription.durationMonths ? `${subscription.durationMonths} months` : "-"}</strong></span></p>
              </div>
              {access.readOnly && <p className="profile-read-only-note"><FiInfo /> You can view and download your data until {formatDate(access.readOnlyUntil)}. Renew your subscription to add or change records.</p>}
              <div className="profile-unit-grid">{unitFields.map(({ key, label }) => <div key={key}>{key === "beds" ? <FiLayers /> : key === "rooms" ? <FiHome /> : <FiBriefcase />}<strong>{flexible && isTrial && !organization.unitCountsConfigured ? "Not set" : number(units[key])}</strong><span>{label} capacity</span></div>)}</div>
            </section>
          </div>

          <div className="profile-column">
            {!(flexible && isTrial && !organization.unitCountsConfigured) && <section className="profile-card profile-upgrade" id="profile-upgrade">
              <div className="profile-card-title"><div><h2><FiPlus /> {isTrial ? "Trial units" : "Upgrade units"}</h2><p>{isTrial ? "Increase your unit capacity for free during the trial. The trial allows up to 10 active units total across all property types." : "Add capacity to your active paid plan; upgrade pricing applies."}</p></div>{canChangeUnits && <button type="button" className="profile-primary-button" onClick={() => setShowUpgrade((value) => !value)}><FiPlus /> {showUpgrade ? "Close" : "Add units"}</button>}</div>
              <div className="profile-wallet-summary"><span className="profile-wallet-summary-icon"><FiDatabase /></span><div><span>Wallet balance</span><strong>{number(walletBalance)} coins</strong></div><span className="profile-coins-art" aria-hidden="true">◉</span></div>
              {!canChangeUnits && <p className="profile-card-copy">Unit capacity changes are unavailable until your subscription is active. Complete or renew your plan first; paid unit upgrades are available after successful purchase.</p>}
              {showUpgrade && canChangeUnits && <div className="profile-upgrade-form"><div className="profile-upgrade-inputs">{unitFields.map(({ key, label }) => <label key={key}>Extra {label.toLowerCase()}<input inputMode="numeric" value={upgradeUnits[key]} onChange={(event) => changeUpgradeUnit(key, event.target.value)} placeholder="0" /></label>)}</div>{!isTrial && <label className="profile-wallet-toggle"><input type="checkbox" checked={useWallet} disabled={!walletBalance} onChange={(event) => setUseWallet(event.target.checked)} /> Use wallet coins ({number(walletBalance)} available)</label>}<button type="button" className="profile-primary-button" onClick={upgrade} disabled={upgrading}>{upgrading ? "Starting payment…" : isTrial ? "Add trial units free" : "Continue to payment"}</button></div>}
            </section>}

            <section className="profile-wallet-page" id="profile-wallet">
              <div className="profile-section-heading"><div><h2><FiDatabase /> Wallet</h2><p>Coins, referrals and reward history</p></div><button type="button" className="profile-section-action" onClick={openWalletUpgrade}><FiRefreshCw /> Upgrade package</button></div>
              <div className="profile-wallet-balance-card"><span className="profile-wallet-balance-icon"><FaRupeeSign /></span><div><span>Available balance</span><strong>{number(walletBalance)} coins</strong><p>Use coins when upgrading your package</p></div><FiArrowRight className="profile-wallet-balance-arrow" /></div>
            </section>
            <section className="profile-referral-panel">
              {referral?.code && <div className="profile-referral-card">
                <div className="profile-referral-heading"><FiDatabase /><div><h3>Invite &amp; earn</h3><p>Earn {number(referral.rewardCoins || 100)} coins after your friend completes their first payment.</p></div></div>
                <div className="profile-referral-actions"><button type="button" className="profile-referral-code" onClick={copyReferralCode}>{referral.code}<FiCopy /></button><button type="button" className="profile-referral-share" onClick={shareReferralCode}><FiShare2 /> Share code</button></div>
                {referralCopied && <small className="profile-referral-copied">Referral code copied.</small>}
              </div>}
              <div className="profile-wallet-stats"><div><FiGift /><strong>{number(earnedCoins)}</strong><span>Earned</span></div><div><FaRupeeSign /><strong>{number(usedCoins)}</strong><span>Used</span></div><div><FiUsers /><strong>{number(referral?.usedCount)}</strong><span>Referrals</span></div></div>
            </section>
            <section className="profile-history-panel"><div className="profile-wallet-history-heading"><h3><FiGift /> Reward history</h3><select value={walletFilter} onChange={(event) => setWalletFilter(event.target.value)} aria-label="Filter reward history"><option value="all">All activity</option><option value="credit">Coins earned</option><option value="debit">Coins used</option></select></div><div className="profile-wallet-history">{entries.length ? entries.map((entry) => <WalletEntry entry={entry} key={entry._id || `${entry.createdAt}-${entry.coins}`} />) : <p className="profile-empty">No wallet activity for this filter.</p>}</div><p className="profile-wallet-disclaimer"><FiInfo /> Coins have no cash value</p></section>
          </div>
        </div>
        </div>
      </div>
      {showUnitsModal && createPortal(
        <div className="profile-units-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowUnitsModal(false); }}>
          <section className="profile-units-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-units-title">
            <header className="profile-units-dialog-header">
              <div><h2 id="profile-units-title">{flexible ? "Property types & unit counts" : "Registered units"}</h2><p>{flexible ? "View your capacity and manage the property types you use." : "View the units in your current plan."}</p></div>
              <button type="button" className="profile-units-close" onClick={() => setShowUnitsModal(false)} aria-label="Close registered units" autoFocus><FiX /></button>
            </header>
            <div className="profile-units-dialog-body">
              {error && <div className="profile-message error" role="alert">{error}</div>}
              {notice && <div className="profile-message success" role="status"><FiCheckCircle />{notice}</div>}
              <h3 className="profile-units-added-title">Units added</h3>
              <div className="profile-unit-grid">{unitFields.map(({ key, label }) => <div key={key}><strong>{number(registeredUnits[key])}</strong><span>{label}</span></div>)}</div>
              {flexible && <>
                <p className="profile-card-copy">Select the property types you use. Types with existing units or allocated capacity must remain selected.</p>
                <PropertyTypePicker initialTypes={selectedTypes} initialCanteenEnabled={canteenEnabled} showCanteenOption={false} onTypesChange={setPropertyTypesDraft} onSaved={async () => { await load(); setNotice("Property types saved."); }} />
                {isTrial && <div className="profile-upgrade-form"><h3>Set unit counts</h3><p className="profile-card-copy">Set the capacity for each selected property type, including types you just selected above. Existing units must remain covered. Trial usage remains limited to 10 active units total.</p><div className="profile-upgrade-inputs">{unitFields.filter(({ key }) => propertyTypesDraft.includes(({ beds: "bed", rooms: "room", shops: "shop" })[key])).map(({ key, label }) => <label key={key}>{label}<input inputMode="numeric" value={unitCounts[key]} onChange={(event) => setUnitCounts((current) => ({ ...current, [key]: event.target.value.replace(/\D/g, "") }))} /></label>)}</div><button type="button" className="profile-primary-button" onClick={saveCounts} disabled={savingCounts}>{savingCounts ? "Saving..." : "Save property types & counts"}</button></div>}
              </>}
              {!flexible && <button type="button" className="profile-primary-button" onClick={() => { setShowUnitsModal(false); openWalletUpgrade(); }}>Add units</button>}
            </div>
            <footer className="profile-units-dialog-footer"><button type="button" className="profile-outline-button" onClick={() => setShowUnitsModal(false)}>Close</button></footer>
          </section>
        </div>,
        document.body
      )}
      {showPinModal && createPortal(
        <div className="profile-units-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closePinModal(); }}>
          <section className="profile-units-dialog profile-pin-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-pin-title">
            <header className="profile-units-dialog-header">
              <div><h2 id="profile-pin-title"><FiShield /> Security PIN</h2><p>Your PIN is required before deleting tenants, units, bills, and expenses.</p></div>
              <button type="button" className="profile-units-close" onClick={closePinModal} aria-label="Close security PIN" autoFocus><FiX /></button>
            </header>
            <div className="profile-units-dialog-body">
              {error && <div className="profile-message error" role="alert">{error}</div>}
              {notice && <div className="profile-message success" role="status"><FiCheckCircle />{notice}</div>}
              <form className="profile-pin-form" onSubmit={savePin}>
                {pinConfigured && !pinForm.reset && <label>Current security PIN<input type="password" inputMode="numeric" maxLength="8" value={pinForm.currentPin} onChange={(event) => setPinForm({ ...pinForm, currentPin: event.target.value.replace(/\D/g, "") })} /></label>}
                {pinConfigured && pinForm.reset && <label>Account password<input type="password" value={pinForm.password} onChange={(event) => setPinForm({ ...pinForm, password: event.target.value })} /></label>}
                <label>New security PIN<input type="password" inputMode="numeric" maxLength="8" placeholder="4 to 8 digits" value={pinForm.pin} onChange={(event) => setPinForm({ ...pinForm, pin: event.target.value.replace(/\D/g, "") })} /></label>
                <label>Confirm security PIN<input type="password" inputMode="numeric" maxLength="8" value={pinForm.confirm} onChange={(event) => setPinForm({ ...pinForm, confirm: event.target.value.replace(/\D/g, "") })} /></label>
                {pinConfigured && <button className="profile-link-button" type="button" onClick={() => setPinForm({ ...pinForm, reset: !pinForm.reset, currentPin: "", password: "" })}>{pinForm.reset ? "Use current PIN" : "Forgot PIN? Reset with account password"}</button>}
                <button className="profile-primary-button" disabled={savingPin}>{savingPin ? "Saving…" : pinConfigured ? "Update PIN" : "Set security PIN"}</button>
              </form>
            </div>
            <footer className="profile-units-dialog-footer"><button type="button" className="profile-outline-button" onClick={closePinModal}>Close</button></footer>
          </section>
        </div>,
        document.body
      )}
    </main>
  );
}
