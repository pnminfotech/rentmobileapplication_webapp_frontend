import React from "react";
import { FiBarChart2, FiUser } from "react-icons/fi";
import { MdLightbulbOutline, MdOutlineBedroomParent, MdOutlineReceiptLong } from "react-icons/md";
import { FaUtensils } from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";
import { getAppBootstrap } from "../saasApi";
import { allowedUnitTypes } from "../utils/subscriptionAccess";

export const dashboardMenuItems = [
  { label: "Dashboard", icon: <FiBarChart2 />, path: "/admin" },
  { label: "Units", icon: <MdOutlineBedroomParent />, path: "/roommanager" },
  {
    label: "Rent Tracker", icon: <MdOutlineBedroomParent />,
    children: [
      { label: "Hostel Tracker", path: "/tracker/bed", state: { tab: "rent", trackerType: "bed" } },
      { label: "Residential Rooms Tracker", path: "/tracker/room", state: { tab: "rent", trackerType: "room" } },
      { label: "Commercial Shop Tracker", path: "/tracker/shop", state: { tab: "rent", trackerType: "shop" } },
    ],
  },
  {
    label: "Light Bill", icon: <MdLightbulbOutline />,
    children: [
      { label: "Hostel", path: "/tracker/bed", state: { tab: "light-hostel", trackerType: "bed" } },
      { label: "Residential Rooms", path: "/tracker/room", state: { tab: "light-room", trackerType: "room" } },
      { label: "Commercial Shop", path: "/tracker/shop", state: { tab: "light-shop", trackerType: "shop" } },
    ],
  },
  {
    label: "Expenses", icon: <MdOutlineReceiptLong />,
    children: [
      { label: "Hostel", path: "/tracker/bed", state: { tab: "expenses-hostel", trackerType: "bed" } },
      { label: "Residential Rooms", path: "/tracker/room", state: { tab: "expenses-room", trackerType: "room" } },
      { label: "Commercial Shop", path: "/tracker/shop", state: { tab: "expenses-shop", trackerType: "shop" } },
    ],
  },
  {
    label: "Canteen", icon: <FaUtensils />,
    children: [
      { label: "Meal settings", path: "/canteen-settings" },
      { label: "Meal attendance", path: "/canteen-attendance" },
    ],
  },
  { label: "Hostel rules", icon: <MdOutlineReceiptLong />, path: "/hostel-rules" },
  { label: "Staff", icon: <MdOutlineReceiptLong />, path: "/tracker/bed", state: { tab: "staff", trackerType: "bed" } },
  { label: "Profile", icon: <FiUser />, path: "/profile" },
];

export function useDashboardMenuItems() {
  const [unitAccess, setUnitAccess] = useState(null);

  useEffect(() => {
    let active = true;
    getAppBootstrap()
      .then((bootstrap) => {
        if (active) setUnitAccess(bootstrap);
      })
      .catch(() => {
        if (active) setUnitAccess({});
      });
    return () => { active = false; };
  }, []);

  return useMemo(() => {
    const enabledTypes = new Set(allowedUnitTypes(unitAccess || {}).map((item) => item.value));
    const typeForChild = (child) => child?.state?.trackerType;

    return dashboardMenuItems
      .map((item) => {
        if (!Array.isArray(item.children)) return item;
        const children = item.children.filter((child) => {
          const type = typeForChild(child);
          return !type || enabledTypes.has(type);
        });
        return { ...item, children };
      })
      .filter((item) => !Array.isArray(item.children) || item.children.length > 0)
      .filter((item) => {
        if (item.label === "Canteen" || item.label === "Hostel rules") return enabledTypes.has("bed");
        if (item.label === "Staff") return enabledTypes.size > 0;
        return true;
      });
  }, [unitAccess]);
}
