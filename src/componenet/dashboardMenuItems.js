import React from "react";
import { FiBarChart2, FiUser } from "react-icons/fi";
import { MdLightbulbOutline, MdOutlineBedroomParent, MdOutlineReceiptLong } from "react-icons/md";
import { FaUtensils } from "react-icons/fa";

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
  return dashboardMenuItems;
}
