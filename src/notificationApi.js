import { api } from "./api";

export async function getNotifications(params = {}) {
  const { data } = await api.get("/notifications", { params });
  return data;
}

export async function markNotificationRead(id) {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.patch("/notifications/read-all");
  return data;
}

export async function resolveNotification(id) {
  const { data } = await api.patch(`/notifications/${id}/resolve`);
  return data;
}

export async function resolveAllNotifications() {
  const { data } = await api.patch("/notifications/resolve-all");
  return data;
}
