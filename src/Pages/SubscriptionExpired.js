import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, LogOut, Mail, MessageCircle, Phone, RefreshCw, WalletCards } from "lucide-react";

import { clearAuthSession } from "../authStorage";
import {
  completeMockSaasPayment,
  createSaasPayment,
  getAppBootstrap,
  getSaasPaymentStatus,
  getWalletSummary,
  requestUnitReductionSupport,
  requestSubscriptionRenewal,
  quoteReferralCode,
  saveUnitCounts,
} from "../saasApi";

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

function isPendingPaymentStatus(value) {
  return String(value || "").toLowerCase() === "pending_payment";
}

const SUPPORT_PHONE = String(process.env.REACT_APP_SUPPORT_PHONE || "").trim();
const SUPPORT_EMAIL = String(process.env.REACT_APP_SUPPORT_EMAIL || "").trim();

function isOpenPaymentStatus(value) {
  return ["created", "pending"].includes(String(value || "").toLowerCase());
}

function planDurationLabel(months) {
  const totalMonths = Number(months || 0);
  const years = totalMonths / 12;
  if (Number.isInteger(years) && years > 0) return `${years} ${years === 1 ? "year" : "years"}`;
  return `${totalMonths || 0} months`;
}

function calculatePlanPricing(plan, units = {}) {
  if (!plan) return { subtotal: 0, discountPercent: 0, discountAmount: 0, amount: 0 };
  const months = Number(plan.durationMonths || 0);
  const pricing = plan.unitPricing || {};
  const subtotal =
    Number(plan.baseAmount || 0) +
    months *
      (Number(units.beds || 0) * Number(pricing.bedMonthly || 0) +
        Number(units.rooms || 0) * Number(pricing.roomMonthly || 0) +
        Number(units.shops || 0) * Number(pricing.shopMonthly || 0));
  const discount = Math.min(100, Math.max(0, Number(plan.discountPercent || 0)));
  const amount = Math.max(0, Math.round(subtotal - (subtotal * discount) / 100));
  return { subtotal, discountPercent: discount, discountAmount: Math.max(0, subtotal - amount), amount };
}

function calculatePlanAmount(plan, units = {}) {
  return calculatePlanPricing(plan, units).amount;
}

function isTrialSubscription(subscription = {}) {
  return (
    Number(subscription.amount || 0) === 0 &&
    !subscription.planId
  );
}

function UnitBox({ label, value }) {
  return (
    <div className="subscription-unit-box">
      <div className="subscription-unit-value">{Number(value || 0)}</div>
      <div className="subscription-unit-label">{label}</div>
    </div>
  );
}

export default function SubscriptionExpired() {
  const navigate = useNavigate();
  const [bootstrap, setBootstrap] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [useWallet, setUseWallet] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [requestingSupport, setRequestingSupport] = useState(false);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({ beds: "", rooms: "", shops: "" });
  const [savingCounts, setSavingCounts] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [appliedReferral, setAppliedReferral] = useState(null);
  const [referralError, setReferralError] = useState("");
  const [checkingReferral, setCheckingReferral] = useState(false);

  async function load() {
    try {
      setError("");
      const [data, walletData] = await Promise.all([
        getAppBootstrap(),
        getWalletSummary().catch(() => null),
      ]);

      if (data.access?.canUseSystem && !data.access?.readOnly) {
        navigate(data.user?.role === "superadmin" ? "/superadmin" : "/admin", { replace: true });
        return;
      }

      const activePlans = Array.isArray(data?.plans)
        ? data.plans.filter((plan) => plan.isActive !== false)
        : [];
      const pending = isPendingPaymentStatus(data.subscription?.status);
      const pendingPlanId = data.subscription?.planId?._id || data.subscription?.planId;
      if (pending && pendingPlanId) setSelectedPlanId(String(pendingPlanId));
      else if (!selectedPlanId && activePlans[0]?._id) setSelectedPlanId(String(activePlans[0]._id));
      if (pending) {
        setReferralCode(String(data.subscription?.pricing?.referralCode || ""));
        setAppliedReferral(null);
        setUseWallet(Number(data.subscription?.pricing?.walletCoinsUsed || 0) > 0);
      }
      setBootstrap(data);
      const initialCounts = data.organization?.unitCountsConfigured ? data.subscription?.units : data.unitUsage;
      setCounts(Object.fromEntries(["beds", "rooms", "shops"].map((key) => [key, String(initialCounts?.[key] || 0)])));
      setWallet(walletData);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load subscription.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function logout() {
    clearAuthSession();
    navigate("/login", { replace: true });
  }

  async function verifyRenewalPayment(transactionId) {
    let latest = null;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      latest = await getSaasPaymentStatus(transactionId);
      const paymentStatus = String(latest?.transaction?.status || "").toLowerCase();
      if (["success", "failed", "cancelled", "canceled"].includes(paymentStatus)) return latest;
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    return latest;
  }

  async function renewNow() {
    try {
      setRenewing(true);
      setError("");

      if ((trialEnded || pendingPayment) && referralCode.trim() &&
          referralCode.trim().toUpperCase() !== pendingReferralCode && !referralApplied) {
        throw new Error("Apply the referral code for your selected plan before purchasing.");
      }

      const isPendingPayment =
        isPendingPaymentStatus(bootstrap?.subscription?.status) ||
        isPendingPaymentStatus(bootstrap?.organization?.status);
      const latestTransaction = bootstrap?.latestTransaction || null;
      const canReuseLatestTransaction =
        isPendingPayment &&
        latestTransaction?._id &&
        isOpenPaymentStatus(latestTransaction.status) &&
        (!bootstrap?.subscription?._id ||
          !latestTransaction.subscriptionId ||
          String(latestTransaction.subscriptionId) === String(bootstrap.subscription._id));
      const existingTransactionId = canReuseLatestTransaction ? latestTransaction._id : null;
      let transactionId = checkoutOptionsChanged ? null : existingTransactionId;

      if (!transactionId) {
        const renewal = await requestSubscriptionRenewal({
          planId: selectedPlan?._id || selectedPlanId || undefined,
          durationMonths: selectedPlan?.durationMonths || bootstrap?.subscription?.durationMonths || 12,
          useWallet,
          referralCode: referralApplied ? appliedReferral.referral.code : undefined,
          ...(checkoutOptionsChanged ? { repricePending: true, referralCode: referralCode.trim() } : {}),
        });
        transactionId = renewal?.transaction?._id;
      }

      if (!transactionId) {
        throw new Error("Renewal transaction was not created.");
      }

      const payment = await createSaasPayment({ transactionId });
      const provider = String(payment?.payment?.provider || "").toLowerCase();
      const paymentActionLabel = isPendingPayment && existingTransactionId ? "activated" : "renewed";

      if (String(payment?.payment?.status || "").toLowerCase() === "success") {
        window.alert("Subscription activated successfully.");
        navigate("/admin", { replace: true });
        return;
      }

      if (provider === "mock" && payment?.payment?.mockSuccessUrl) {
        await completeMockSaasPayment(transactionId);
        window.alert(`Subscription ${paymentActionLabel} successfully.`);
        navigate("/admin", { replace: true });
        return;
      }

      const paymentUrl =
        payment?.payment?.directPaymentUrl ||
        payment?.payment?.paymentUrl ||
        payment?.payment?.checkoutPageUrl;

      if (paymentUrl) {
        window.open(paymentUrl, "_blank", "noopener,noreferrer");
        const latest = await verifyRenewalPayment(transactionId);
        const paymentStatus = String(latest?.transaction?.status || "").toLowerCase();

        if (paymentStatus === "success") {
          window.alert(`Subscription ${paymentActionLabel} successfully.`);
          navigate("/admin", { replace: true });
          return;
        }
        if (["failed", "cancelled", "canceled"].includes(paymentStatus)) {
          setError("Payment was not completed. Please try again.");
          return;
        }
        setError("Payment is still pending. If money was deducted, refresh after a minute.");
      } else {
        setError("Payment request created. Complete payment to renew your subscription.");
      }

      await load();
    } catch (err) {
      const backendMessage = err.response?.data?.message || err.message || "";
      setError(
        backendMessage && backendMessage !== "Server error"
          ? backendMessage
          : "The payment request could not be started right now. Please try again in a moment."
      );
    } finally {
      setRenewing(false);
    }
  }

  async function saveTrialCounts() {
    try {
      setSavingCounts(true); setError("");
      await saveUnitCounts(Object.fromEntries(["beds", "rooms", "shops"].map((key) => [key, Number(counts[key] || 0)])));
      await load();
    } catch (err) { setError(err.response?.data?.message || "Unable to save unit counts."); }
    finally { setSavingCounts(false); }
  }

  async function requestUnitHelp() {
    try {
      setRequestingSupport(true);
      setError("");
      const result = await requestUnitReductionSupport();
      window.alert(result?.message || "Your request was sent. Our support team will contact you using the phone or email on your account.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to Contact Support right now.");
    } finally {
      setRequestingSupport(false);
    }
  }

  async function applyReferral() {
    if (!referralCode.trim() || (!pendingPayment && !checkoutPlanId)) return;
    try {
      setCheckingReferral(true);
      setReferralError("");
      const quote = await quoteReferralCode({ referralCode: referralCode.trim(), planId: checkoutPlanId });
      setAppliedReferral({ ...quote, planId: String(checkoutPlanId), unitKey: JSON.stringify(units) });
      setReferralCode(quote.referral.code);
    } catch (err) {
      setAppliedReferral(null);
      setReferralError(err.response?.data?.message || "Unable to apply this referral code.");
    } finally {
      setCheckingReferral(false);
    }
  }

  const organization = bootstrap?.organization || {};
  const subscription = bootstrap?.subscription || {};
  const units = organization.onboardingMode === "flexible" && !organization.unitCountsConfigured && isTrialSubscription(subscription)
    ? bootstrap?.unitUsage || {} : subscription.units || organization.unitAllocation || {};
  const pendingPayment = isPendingPaymentStatus(subscription.status) || isPendingPaymentStatus(organization.status);
  const trialEnded = !pendingPayment && isTrialSubscription(subscription);
  const pendingReferralCode = pendingPayment ? String(subscription.pricing?.referralCode || "") : "";
  const showCountSetup = organization.onboardingMode === "flexible" && trialEnded && !organization.unitCountsConfigured;
  const plans = useMemo(
    () => (Array.isArray(bootstrap?.plans) ? bootstrap.plans.filter((plan) => plan.isActive !== false) : []),
    [bootstrap]
  );
  const selectedPlan = plans.find((plan) => String(plan._id) === String(selectedPlanId)) || plans[0] || null;
  const checkoutPlanId = pendingPayment ? String(subscription.planId?._id || subscription.planId || "") : String(selectedPlan?._id || "");
  const selectedPlanPricing = calculatePlanPricing(selectedPlan, units);
  const referralApplied = Boolean(appliedReferral?.referral?.code &&
    appliedReferral.planId === checkoutPlanId &&
    appliedReferral.unitKey === JSON.stringify(units) &&
    referralCode.trim().toUpperCase() === appliedReferral.referral.code);
  const referralDiscount = referralApplied ? Number(appliedReferral.pricing?.referralDiscountAmount || 0) : 0;
  const pendingBeforeWallet = Number(subscription.amount || 0) + Number(subscription.pricing?.walletCoinsUsed || 0);
  const pendingWithoutReferral = Number(subscription.pricing?.subtotal || 0) > 0
    ? Math.max(0, Number(subscription.pricing.subtotal) - Number(subscription.pricing.planDiscountAmount || 0))
    : pendingBeforeWallet + Number(subscription.pricing?.referralDiscountAmount || 0);
  const renewalAmount = pendingPayment
    ? referralApplied ? Number(appliedReferral.pricing?.payableAmount || 0)
      : referralCode.trim().toUpperCase() === pendingReferralCode ? pendingBeforeWallet : pendingWithoutReferral
    : referralApplied ? Number(appliedReferral.pricing?.payableAmount || 0) : calculatePlanAmount(selectedPlan, units);
  const walletBalance = Number(wallet?.balance || 0);
  const walletCoinsUsed = useWallet ? Math.min(walletBalance, renewalAmount) : 0;
  const payableAmount = Math.max(0, renewalAmount - walletCoinsUsed);
  const checkoutOptionsChanged = pendingPayment &&
    (referralCode.trim().toUpperCase() !== pendingReferralCode ||
      (walletBalance > 0 && useWallet !== (Number(subscription.pricing?.walletCoinsUsed || 0) > 0)));

  const pageCopy = pendingPayment
    ? {
        eyebrow: "Payment required",
        title: "Subscription payment required",
        subtitle: `${organization.name || "Your account"} needs activation payment to start.`,
        cardText: "Review your wallet and referral options, then complete payment to activate your subscription.",
        amountLabel: "Activation amount",
        buttonText: "Complete payment",
      }
    : trialEnded
      ? {
          eyebrow: "Free trial ended",
          title: "Choose a plan to continue",
          subtitle: bootstrap?.access?.readOnly
            ? `Your data is available to view and download until ${formatDate(bootstrap.access.readOnlyUntil)}. Purchase a plan to add or change records.`
            : `${organization.name || "Your account"} needs a paid plan to continue.`,
          cardText: "Choose a plan, review its price for your registered units, then complete payment to start using the system again.",
          amountLabel: "Plan amount",
          buttonText: "Purchase plan",
        }
      : {
        eyebrow: "Subscription required",
        title: "Subscription expired",
        subtitle: `${organization.name || "Your account"} needs renewal to continue.`,
        cardText: `Your subscription ended on ${formatDate(subscription.endDate)}. Renew now to restore dashboard, tenants, payments and reports.`,
        amountLabel: "Renewal amount",
        buttonText: "Renew subscription",
      };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  return (
    <div className="subscription-page">
      <style>{`
        .subscription-page {
          min-height: 100vh;
          padding: 28px;
          background: #eaf1f8;
          color: #0f172a;
          font-family: Poppins, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .subscription-shell {
          width: 100%;
          margin: 0 auto;
        }
        .subscription-header {
          min-height: 86px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
          border-radius: 12px;
          background: #fff;3
          box-shadow: 0 8px 24px rgba(30, 58, 18, 0.08);
        }
        .subscription-eyebrow {
          color: #b91c1c;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .subscription-title {
          margin: 5px 0 4px;
          color: #08295f;
          font-size: 28px;
          line-height: 1.15;
          font-weight: 900;
        }
        .subscription-subtitle {
          margin: 0;
          color: #607086;
          font-size: 14px;
          font-weight: 600;
        }
        .subscription-logout {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #d7e2ef;
          border-radius: 8px;
          background: #fff;
          color: #1e3a8a;
          box-shadow: 0 5px 16px rgba(15, 23, 42, 0.06);
        }
        .subscription-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 18px;
          align-items: start;
        }
        .subscription-card {
          padding: 20px;
          border: 0;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 12px 30px rgba(30, 58, 138, 0.09);
        }
        .subscription-card-icon {
          width: 46px;
          height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #e9f2ff;
          color: #1e3a8a;
        }
        .subscription-card-title {
          margin-top: 12px;
          color: #08295f;
          font-size: 20px;
          font-weight: 900;
        }
        .subscription-card-text {
          max-width: 760px;
          margin-top: 5px;
          color: #607086;
          font-size: 14px;
          font-weight: 600;
        }
        .subscription-summary {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .subscription-summary-item,
        .subscription-unit-box {
          min-height: 76px;
          padding: 13px;
          border-radius: 12px;
          background: #eef6ff;
          border: 1px solid #dce6f2;
        }
        .subscription-summary-label,
        .subscription-unit-label {
          color: #607086;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .subscription-summary-value,
        .subscription-unit-value {
          margin-top: 4px;
          color: #08295f;
          font-size: 18px;
          font-weight: 900;
          text-transform: capitalize;
        }
        .subscription-plan-title {
          margin-top: 18px;
          margin-bottom: 10px;
          color: #08295f;
          font-size: 15px;
          font-weight: 900;
        }
        .subscription-plan-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
        }
        .subscription-plan-card {
          min-height: 98px;
          padding: 14px;
          border: 1px solid #dce6f2;
          border-radius: 12px;
          background: #fbfdff;
          text-align: left;
          transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
        }
        .subscription-plan-card:hover {
          transform: translateY(-1px);
          border-color: #1e3a8a;
          color: #0f172a;
          box-shadow: 0 8px 18px rgba(30, 58, 138, 0.08);
        }
        .subscription-plan-card.is-active {
          border-color: #1e3a8a;
          background: #eef6ff;
          box-shadow: inset 0 0 0 1px #1e3a8a;
          color: #0f172a;
        }
        .subscription-plan-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #08295f;
          font-weight: 900;
        }
        .subscription-plan-price { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; white-space: nowrap; }
        .subscription-plan-old-price { color: #718096; font-size: 11px; font-weight: 700; text-decoration: line-through; }
        .subscription-plan-discount { margin-top: 8px; color: #18734a; font-size: 11px; font-weight: 800; }
        .subscription-summary-note { margin-top: 3px; color: #18734a; font-size: 11px; font-weight: 800; }
        .subscription-payable-note { margin: 7px 2px 0; color: #18734a; font-size: 11px; font-weight: 800; text-align: right; }
        .subscription-plan-meta {
          margin-top: 7px;
          color: #607086;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.5;
        }
        .subscription-wallet {
          width: 100%;
          min-height: 66px;
          margin-top: 16px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid #dce6f2;
          border-radius: 12px;
          background: #f8fbff;
          text-align: left;
        }
        .subscription-wallet:disabled {
          opacity: 0.62;
        }
        .subscription-wallet-icon {
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: #e9f2ff;
          color: #1e3a8a;
        }
        .subscription-wallet-copy {
          flex: 1;
          min-width: 0;
        }
        .subscription-wallet-title {
          font-weight: 900;
        }
        .subscription-wallet-text {
          color: #607086;
          font-size: 12px;
          font-weight: 700;
        }
        .subscription-toggle {
          width: 48px;
          height: 28px;
          padding: 3px;
          border-radius: 14px;
          background: #d7e2ef;
        }
        .subscription-toggle-dot {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          transition: transform 0.16s ease;
        }
        .subscription-toggle.is-active {
          background: #1e3a8a;
        }
        .subscription-toggle.is-active .subscription-toggle-dot {
          transform: translateX(20px);
        }
        .subscription-payable {
          margin-top: 0;
          padding: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid #dce6f2;
          border-radius: 12px;
          background: #fff;
        }
        .subscription-payable-label {
          color: #607086;
          font-size: 13px;
          font-weight: 800;
        }
        .subscription-payable-value {
          font-size: 20px;
          font-weight: 900;
        }
        .subscription-unit-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .subscription-primary {
          width: 100%;
          min-height: 44px;
          margin-top: 17px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          border-radius: 8px;
          background: #1e3a8a;
          color: #fff;
          font-weight: 900;
          box-shadow: 0 12px 24px rgba(30, 58, 138, 0.22);
        }
        .subscription-primary:hover:not(:disabled) {
          background: #172f70;
          color: #fff;
        }
        .subscription-primary:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .subscription-error {
          margin-top: 14px;
          padding: 12px;
          border-radius: 10px;
          background: #fee2e2;
          color: #991b1b;
          font-weight: 800;
        }
        /* Match the cards, colors, and spacing used by the main web system. */
        .subscription-page {
          padding: 92px 24px 40px;
          background: linear-gradient(180deg, #f8f6ff 0%, #eef5fc 100%);
          color: #14213d;
        }
        .subscription-header {
          min-height: 96px;
          padding: 20px 24px;
          border: 1px solid #d7e3f4;
          border-radius: 16px;
          background: linear-gradient(105deg, #f4f8ff, #ffffff);
          box-shadow: 0 8px 25px rgba(39, 65, 113, .09);
        }
        .subscription-eyebrow { color: #c14436; }
        .subscription-title { color: #112f5d; font-size: clamp(25px, 3vw, 32px); }
        .subscription-subtitle { color: #5f718c; }
        .subscription-logout { border-color: #cfe0f5; border-radius: 11px; color: #1f63dc; box-shadow: 0 5px 16px rgba(36, 64, 112, .09); }
        .subscription-card {
          padding: 22px;
          border: 1px solid #d7e3f4;
          border-radius: 16px;
          background: rgba(255, 255, 255, .96);
          box-shadow: 0 8px 25px rgba(39, 65, 113, .09);
        }
        .subscription-side { background: linear-gradient(150deg, #ffffff, #f5f9ff); }
        .subscription-card-icon { border-radius: 14px; background: #e7efff; color: #1550ce; }
        .subscription-card-title, .subscription-summary-value, .subscription-unit-value, .subscription-plan-title, .subscription-plan-head { color: #112f5d; }
        .subscription-card-text, .subscription-subtitle, .subscription-plan-meta, .subscription-wallet-text, .subscription-summary-label, .subscription-unit-label, .subscription-payable-label { color: #62748e; }
        .subscription-summary-item, .subscription-unit-box { border-color: #d4e3ff; border-radius: 13px; background: #edf4ff; }
        .subscription-plan-card { border-color: #d7e3f4; border-radius: 13px; }
        .subscription-plan-card:hover { border-color: #2761d4; background: #595be8; color: #ffffff; box-shadow: 0 8px 18px rgba(39, 65, 113, .11); }
        .subscription-plan-card:hover .subscription-plan-head,
        .subscription-plan-card:hover .subscription-plan-meta,
        .subscription-plan-card:hover .subscription-plan-price { color: #ffffff; }
        .subscription-plan-card:hover .subscription-plan-old-price { color: rgba(255, 255, 255, .78); }
        .subscription-plan-card.is-active:hover { background: #e8f0ff; color: #0f172a; }
        .subscription-plan-card.is-active:hover .subscription-plan-head,
        .subscription-plan-card.is-active:hover .subscription-plan-meta,
        .subscription-plan-card.is-active:hover .subscription-plan-price { color: #0d3e93; }
        .subscription-plan-card.is-active:hover .subscription-plan-old-price { color: #718096; }
        .subscription-plan-discount { color: #111111; font-weight: 900; }
        .subscription-plan-card.is-active { border-color: #2761d4; background: #edf4ff; box-shadow: inset 0 0 0 1px #2761d4; }
        .subscription-wallet { border-color: #d7e3f4; border-radius: 13px; background: #f9fbff; }
        .subscription-wallet-icon { background: #e7efff; color: #1550ce; }
        .subscription-toggle.is-active { background: #2360d9; }
        .subscription-payable { border-color: #d7e3f4; border-radius: 13px; }
        .subscription-primary { border-radius: 10px; background: #2360d9; box-shadow: 0 7px 16px rgba(35, 96, 217, .24); }
        .subscription-primary:hover:not(:disabled) { background: #174bb4; }
        /* Use the same Poppins type and blue, green, amber, and purple cards as NewComponant. */
        .subscription-page,
        .subscription-page button,
        .subscription-page input,
        .subscription-page select {
          font-family: Poppins, sans-serif !important;
        }
        .subscription-page { background: #f7f5ff; }
        .subscription-shell { width: 100%; }
        .subscription-header { border-radius: 18px; background: #ffffff; }
        .subscription-layout { gap: 20px; grid-template-columns: minmax(0, 1fr) 350px; }
        .subscription-card { border-radius: 18px; }
        .subscription-main { background: #ffffff; }
        .subscription-side { background: #ffffff; }
        .subscription-card-icon { background: #e8f0ff; color: #2d6eef; }
        .subscription-summary-item:nth-child(1) { background: #e7f0ff; border-color: #c8dbfa; }
        .subscription-summary-item:nth-child(2) { background: #fff0db; border-color: #f5d3a0; }
        .subscription-summary-item:nth-child(3) { background: #e6f8ed; border-color: #bfe9d0; }
        .subscription-summary-value { color: #102c58; }
        .subscription-plan-card { background: #ffffff; }
        .subscription-plan-card.is-active { background: #e8f0ff; border-color: #2d6eef; box-shadow: inset 0 0 0 1px #2d6eef; }
        .subscription-plan-card.is-active .subscription-plan-head { color: #0d3e93; }
        .subscription-wallet { background: #f8fbff; }
        .subscription-payable { background: #e8f0ff; border-color: #c8dbfa; }
        .subscription-payable-value { color: #0d3e93; }
        .subscription-unit-box:nth-child(1) { background: #dfeeff; border-color: #c3daf8; }
        .subscription-unit-box:nth-child(2) { background: #dcf6ea; border-color: #b9e6d1; }
        .subscription-unit-box:nth-child(3) { background: #fff0d8; border-color: #f3d29c; }
        .subscription-unit-value { color: #102c58; }
        .subscription-primary { min-height: 48px; background: #2d6eef; box-shadow: 0 8px 18px rgba(45, 110, 239, .26); }
        .subscription-primary:hover:not(:disabled) { background: #1d57cf; }
        .subscription-support-card { margin-top: 14px; padding: 14px; border: 1px solid #c9daf7; border-radius: 10px; background: #f2f7ff; }
        .subscription-support-title { margin: 0 0 5px; color: #12356b; font-size: 14px; font-weight: 800; }
        .subscription-support-copy { margin: 0 0 11px; color: #536783; font-size: 12px; line-height: 1.5; }
        .subscription-support-button { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; gap: 8px; padding: 8px 12px; border: 1px solid #2d6eef; border-radius: 8px; background: #fff; color: #102244; font-size: 12px; font-weight: 800; cursor: pointer; }
        .subscription-support-button:disabled { opacity: .65; cursor: wait; }
        .subscription-support-contacts { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 10px; }
        .subscription-support-contact { display: inline-flex; align-items: center; gap: 6px; color: #1e54b7; font-size: 12px; font-weight: 800; text-decoration: none; }
        .subscription-support-contact:hover { color: #12356b; text-decoration: underline; }
        .subscription-wallet:disabled {
          opacity: 1;
          cursor: not-allowed;
          border-color: #d8d0f5;
          background: #ece9ff;
          color: #223a69;
        }
        .subscription-wallet:disabled .subscription-wallet-icon {
          background: #ffffff;
          color: #5a65b7;
        }
        .subscription-wallet:disabled .subscription-wallet-title { color: #223a69; }
        .subscription-wallet:disabled .subscription-wallet-text { color: #68769b; }
        .subscription-wallet:disabled .subscription-toggle { background: #cdd7e8; }
        .subscription-referral { margin-top: 12px; padding: 16px; border: 1px solid #d8d2fa; border-radius: 13px; background: #f8f6ff; }
        .subscription-referral-title { margin: 0 0 4px; color: #19345e; font-size: 15px; font-weight: 900; }
        .subscription-referral-copy { margin: 0 0 12px; color: #5d6d89; font-size: 12px; line-height: 1.5; }
        .subscription-referral-controls { display: flex; flex-wrap: wrap; gap: 8px; }
        .subscription-referral-controls input { flex: 1 1 180px; min-width: 0; text-transform: uppercase; }
        .subscription-referral-controls button { min-height: 40px; padding: 0 16px; border: 1px solid #366be5; border-radius: 8px; background: #fff; color: #1755cc; font-weight: 800; }
        .subscription-referral-controls button:disabled { opacity: .55; }
        .subscription-referral-benefit { margin: 10px 0 0; color: #146b45; font-size: 12px; font-weight: 700; line-height: 1.5; }
        .subscription-referral-error { margin: 10px 0 0; color: #b42318; font-size: 12px; font-weight: 700; }
        @media (max-width: 860px) {
          .subscription-page {
            padding: 76px 13px 28px;
          }
          .subscription-header {
            flex-direction: column;
            align-items: stretch;
          }
          .subscription-summary,
          .subscription-unit-grid,
          .subscription-layout {
            grid-template-columns: 1fr;
          }
            .subscription-plan-head:hover{
            color:white;}
            .subscription-plan-discount:hover{
            color: #030303;
            font-weight: bold;
            }
            .subscription-support-button:hover{
            color: #0d3e93;
            }
        }
      `}</style>
      <div className="subscription-shell">
        <div className="subscription-header">
          <div>
            <div className="subscription-eyebrow">{pageCopy.eyebrow}</div>
            <h1 className="subscription-title">{pageCopy.title}</h1>
            <p className="subscription-subtitle">{pageCopy.subtitle}</p>
          </div>
          {bootstrap?.access?.readOnly && (
            <button type="button" className="btn btn-outline-primary" onClick={() => navigate("/admin")}>View my data</button>
          )}
          <button className="subscription-logout" type="button" onClick={logout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>

        <div className="subscription-layout">
        <div className="subscription-card subscription-main">
          <div className="subscription-card-icon"><CreditCard size={25} /></div>
          <div className="subscription-card-title">{organization.name || "Business account"}</div>
          <div className="subscription-card-text">{pageCopy.cardText}</div>

          <div className="subscription-summary">
            <div className="subscription-summary-item">
              <div className="subscription-summary-label">Current status</div>
              <div className="subscription-summary-value">{subscription.status || organization.status || "-"}</div>
            </div>
            <div className="subscription-summary-item">
              <div className="subscription-summary-label">{referralApplied ? "After referral" : pageCopy.amountLabel}</div>
              <div className="subscription-summary-value">{money(renewalAmount)}</div>
              {!pendingPayment && selectedPlanPricing.discountPercent > 0 ? (
                <div className="subscription-summary-note">{selectedPlanPricing.discountPercent}% off · saving {money(selectedPlanPricing.discountAmount)}</div>
              ) : null}
            </div>
            <div className="subscription-summary-item">
              <div className="subscription-summary-label">Duration</div>
              <div className="subscription-summary-value">{pendingPayment ? subscription.durationMonths || 12 : selectedPlan?.durationMonths || 0} months</div>
            </div>
          </div>

          {!pendingPayment ? (
            <>
              <div className="subscription-plan-title">Choose plan</div>
              {!plans.length ? <div className="subscription-error">No active plans available. Please Contact Support.</div> : null}
              <div className="subscription-plan-list">
                {plans.map((plan) => {
                  const active = String(selectedPlan?._id) === String(plan._id);
                  const pricing = calculatePlanPricing(plan, units);
                  return (
                    <button
                      className={`subscription-plan-card ${active ? "is-active" : ""}`}
                      type="button"
                      key={plan._id}
                      onClick={() => { setSelectedPlanId(String(plan._id)); setAppliedReferral(null); setReferralError(""); }}
                    >
                      <div className="subscription-plan-head">
                        <span>{plan.name || planDurationLabel(plan.durationMonths)}</span>
                        <span className="subscription-plan-price">
                          {pricing.discountPercent > 0 ? <span className="subscription-plan-old-price">{money(pricing.subtotal)}</span> : null}
                          <span>{money(pricing.amount)}</span>
                        </span>
                      </div>
                      <div className="subscription-plan-meta">
                        {planDurationLabel(plan.durationMonths)} | Bed {money(plan.unitPricing?.bedMonthly)}/mo | Room {money(plan.unitPricing?.roomMonthly)}/mo | Shop {money(plan.unitPricing?.shopMonthly)}/mo
                      </div>
                      {pricing.discountPercent > 0 ? (
                        <div className="subscription-plan-discount">{pricing.discountPercent}% off · Save {money(pricing.discountAmount)}</div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {(
            <button
              className="subscription-wallet"
              type="button"
              onClick={() => walletBalance > 0 && setUseWallet((value) => !value)}
              disabled={!walletBalance}
            >
              <span className="subscription-wallet-icon"><WalletCards size={21} /></span>
              <span className="subscription-wallet-copy">
                <span className="subscription-wallet-title d-block">Use wallet coins</span>
                <span className="subscription-wallet-text d-block">
                  Available {walletBalance.toLocaleString("en-IN")} coins
                  {walletCoinsUsed ? ` | Discount ${money(walletCoinsUsed)}` : ""}
                </span>
              </span>
              <span className={`subscription-toggle ${useWallet && walletBalance > 0 ? "is-active" : ""}`}>
                <span className="subscription-toggle-dot" />
              </span>
            </button>
          )}
          {(trialEnded || pendingPayment) && (
            <div className="subscription-referral">
              <h3 className="subscription-referral-title">Have a referral code?</h3>
              <p className="subscription-referral-copy">Apply it to your first paid plan. We’ll show its exact benefit before payment.</p>
              <div className="subscription-referral-controls">
                <input className="form-control" value={referralCode} maxLength={24} autoCapitalize="characters" placeholder="Enter referral code" aria-label="Referral code" onChange={(event) => { setReferralCode(event.target.value.toUpperCase()); setAppliedReferral(null); setReferralError(""); }} />
                <button type="button" onClick={applyReferral} disabled={!referralCode.trim() || checkingReferral || (!pendingPayment && !checkoutPlanId) || showCountSetup}>{checkingReferral ? "Checking..." : "Apply code"}</button>
                {referralCode && <button type="button" onClick={() => { setReferralCode(""); setAppliedReferral(null); setReferralError(""); }}>Clear</button>}
              </div>
              {referralApplied && <p className="subscription-referral-benefit">Code applied. {referralDiscount > 0 ? `${appliedReferral.referral.discountPercent}% off this plan (${money(referralDiscount)} saved).` : "This code does not discount your plan."} {appliedReferral.referral.ownerOrganizationId && Number(appliedReferral.referral.rewardCoins || 0) > 0 ? `The referrer receives ${Number(appliedReferral.referral.rewardCoins).toLocaleString("en-IN")} wallet coins after payment.` : ""}</p>}
              {referralError && <p className="subscription-referral-error" role="alert">{referralError}</p>}
            </div>
          )}
          {pendingPayment && subscription.pricing?.referralCode && referralCode.trim().toUpperCase() === pendingReferralCode && !referralApplied && <p className="subscription-referral-benefit">Current payment uses referral code {pendingReferralCode}: {money(subscription.pricing.referralDiscountAmount)} saved.</p>}
          {pendingPayment && <p className="subscription-referral-copy" style={{ marginTop: 12 }}>If your earlier payment is still processing, changes can be saved after it fails or expires.</p>}
        </div>

        <aside className="subscription-card subscription-side">
          <div className="subscription-payable">
            <span className="subscription-payable-label">Payable now</span>
            <span className="subscription-payable-value">{money(payableAmount)}</span>
          </div>
          {!pendingPayment && selectedPlanPricing.discountPercent > 0 ? (
            <div className="subscription-payable-note">Plan discount: {selectedPlanPricing.discountPercent}% · saved {money(selectedPlanPricing.discountAmount)}</div>
          ) : null}
          {(referralApplied || (pendingPayment && referralCode.trim().toUpperCase() === pendingReferralCode)) && (referralApplied ? referralDiscount : Number(subscription.pricing?.referralDiscountAmount || 0)) > 0 && <div className="subscription-payable-note">Referral discount: -{money(referralApplied ? referralDiscount : subscription.pricing.referralDiscountAmount)}</div>}
          {walletCoinsUsed > 0 && <div className="subscription-payable-note">Wallet coins: -{money(walletCoinsUsed)}</div>}

          <div className="subscription-unit-grid">
            <UnitBox label="Beds" value={units.beds} />
            <UnitBox label="Rooms" value={units.rooms} />
            <UnitBox label="Shops" value={units.shops} />
          </div>

          {showCountSetup && <div className="subscription-support-card"><h2 className="subscription-support-title">Set unit counts</h2><p className="subscription-support-copy">Choose the counts for your plan. They must include your existing units.</p>{[["beds", "bed", "Beds"], ["rooms", "room", "Rooms"], ["shops", "shop", "Shops"]].filter(([, type]) => organization.selectedPropertyTypes?.includes(type)).map(([key, , label]) => <label key={key} style={{ display: "block", marginBottom: 10 }}>{label}<input className="form-control" inputMode="numeric" value={counts[key]} onChange={(event) => setCounts((current) => ({ ...current, [key]: event.target.value.replace(/\D/g, "") }))} /></label>)}<button type="button" className="subscription-support-button" onClick={saveTrialCounts} disabled={savingCounts}>{savingCounts ? "Saving..." : "Save counts and update price"}</button></div>}

          {!pendingPayment ? (
            <div className="subscription-support-card">
              <h2 className="subscription-support-title">Need fewer units?</h2>
              <p className="subscription-support-copy">Ask Superadmin to review your occupied and vacant units before you renew. Our team will contact you using the phone or email on your account.</p>
              <button className="subscription-support-button " type="button" onClick={requestUnitHelp} disabled={requestingSupport}>
                <MessageCircle size={16} />
                {requestingSupport ? "Sending request..." : "Contact support"}
              </button>
              {(SUPPORT_PHONE || SUPPORT_EMAIL) ? (
                <div className="subscription-support-contacts">
                  {SUPPORT_PHONE ? <a className="subscription-support-contact" href={`tel:${SUPPORT_PHONE.replace(/[^+\d]/g, "")}`}><Phone size={14} />Call {SUPPORT_PHONE}</a> : null}
                  {SUPPORT_EMAIL ? <a className="subscription-support-contact" href={`mailto:${SUPPORT_EMAIL}`}><Mail size={14} />Email {SUPPORT_EMAIL}</a> : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? <div className="subscription-error">{error}</div> : null}

          <button
            className="subscription-primary"
            type="button"
            onClick={renewNow}
            disabled={renewing || checkingReferral || showCountSetup || (!pendingPayment && !selectedPlan) || ((trialEnded || pendingPayment) && Boolean(referralCode.trim()) && referralCode.trim().toUpperCase() !== pendingReferralCode && !referralApplied)}
          >
            {renewing ? (
              "Processing..."
            ) : (
              <>
                <RefreshCw size={18} />
                {pageCopy.buttonText}
              </>
            )}
          </button>
        </aside>
        </div>
      </div>
    </div>
  );
}
