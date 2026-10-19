import { api } from "../api";

export const meals = ["breakfast", "lunch", "dinner"];
export const canteenApi = {
  settings: async () => (await api.get("/canteen-attendance/settings")).data,
  saveSettings: async (payload) => (await api.put("/canteen-attendance/settings", payload)).data,
  attendance: async (date, meal) => (await api.get("/canteen-attendance", { params: { date, meal } })).data,
  range: async (start, end) => (await api.get("/canteen-attendance/range", { params: { start, end } })).data,
  mark: async (payload) => (await api.post("/canteen-attendance/mark", payload)).data,
  bulk: async (payload) => (await api.post("/canteen-attendance/bulk", payload)).data,
};

export function needsCanteenAttendance(settings = {}) {
  if (!settings) return false;
  if (!settings.isConfigured) return false;
  const primary = (settings.activeModes || []).find((mode) => ["per_meal", "meal_package"].includes(mode));
  return primary === "per_meal" || (primary === "meal_package" && settings.mealPackage?.billingMethod !== "fixed_monthly");
}

export function enabledMeals(settings = {}) {
  if (!settings) return meals;
  const primary = (settings.activeModes || []).find((mode) => ["per_meal", "meal_package", "full_package"].includes(mode));
  if (primary === "per_meal") {
    const priced = meals.filter((meal) => Number(settings.perMeal?.[meal]) > 0);
    return priced.length ? priced : meals;
  }
  if (primary === "meal_package" || primary === "full_package") {
    const included = settings[primary === "meal_package" ? "mealPackage" : "fullPackage"]?.includedMeals || [];
    return included.length ? meals.filter((meal) => included.includes(meal)) : meals;
  }
  return meals;
}

export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
