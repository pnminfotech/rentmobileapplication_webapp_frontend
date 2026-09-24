import { api } from "./api";
import { saveAuthSession } from "./authStorage";

export async function loginSaas(email, password) {
  const { data } = await api.post("/saas/auth/login", {
    email,
    password,
  });

  saveAuthSession({
    token: data.token,
    user: data.user,
  });

  return data;
}

export async function registerBusiness(payload) {
  const { data } = await api.post("/saas/register", payload);
  return data;
}

export async function getAppBootstrap() {
  const { data } = await api.get("/saas/app/bootstrap");
  return data;
}

export async function saveOnboardingUnits(payload = {}) {
  const { data } = await api.post("/saas/onboarding/units", payload);
  return data;
}

export async function requestSubscriptionRenewal(payload = {}) {
  const { data } = await api.post("/saas/subscription/renew-request", payload);
  return data;
}

export async function createSaasPayment(payload = {}) {
  const { data } = await api.post("/saas/payments/create", payload);
  return data;
}

export async function getSaasPaymentStatus(transactionId) {
  const { data } = await api.get(`/saas/payments/${transactionId}/status`);
  return data;
}

export async function completeMockSaasPayment(transactionId) {
  const { data } = await api.post(`/saas/payments/mock/success/${transactionId}`);
  return data;
}

export async function getWalletSummary() {
  const { data } = await api.get("/saas/wallet");
  return data;
}

export async function getSubscriptionPlans() {
  const { data } = await api.get("/saas/plans");
  return data;
}

export async function getSuperAdminDashboard() {
  const { data } = await api.get("/saas/admin/dashboard");
  return data;
}

export async function getOrganizations() {
  const { data } = await api.get("/saas/admin/organizations");
  return data;
}

export async function getSystemDashboard() {
  const { data } = await api.get("/saas/dashboard");
  return data;
}
