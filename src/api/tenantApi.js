import { api } from "../api";

export async function getTenants() {
  const { data } = await api.get("/forms");
  return data;
}

export async function getRentDues() {
  const { data } = await api.get("/forms/rent-dues");
  return data;
}

export async function getRentSummary(month) {
  const { data } = await api.get("/forms/rent-summary", {
    params: { month },
  });

  return data;
}

export async function importTenantsFromSheet(propertyType, rows) {
  const { data } = await api.post("/forms/import", { propertyType, rows });
  return data;
}
