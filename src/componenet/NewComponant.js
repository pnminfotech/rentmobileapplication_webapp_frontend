import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import './Style.css';
import "../Pages/NewComponent.css";

import { API_BASE, api } from "../api";
import { getRentSummary, importTenantsFromSheet } from "../api/tenantApi";
import { allowedUnitTypes } from "../utils/subscriptionAccess";
import { getAppBootstrap } from "../saasApi";
import { lookupIndianPincode } from "../utils/pincodeLookup";
// import { useNavigate } from 'react-router-dom';
import { FaPlus, FaEdit, FaBars } from "react-icons/fa";
import { FaInfoCircle } from "react-icons/fa";
import * as XLSX from "xlsx";
import { getDocHref } from "../utils/getDocHref"; // adjust path if needed
import { FaBolt, FaReceipt, FaEye, FaTrash, FaExchangeAlt } from "react-icons/fa";

import { saveAs } from "file-saver";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
 // example icons
import StaffExpenses from "../componenet/StaffExpenses";

// or "../components/StaffExpense" if you kept it in components
import { useParams } from "react-router-dom";
import {FaUtensils} from "react-icons/fa";
import { FaThLarge } from "react-icons/fa";
 import OtherExpense from "../Pages/OtherExpense";
import LightBill from "../Pages/LightBill";
import { getLightBillSettings } from "../api/lightBillApi";
import { canteenApi, meals as canteenMeals } from "../Pages/canteenShared";
import { FaSearch } from "react-icons/fa";
import { FaSignOutAlt, FaUndo, FaDownload } from "react-icons/fa";
import FormDownload from "../componenet/Maintanace/FormDownload";
import TenantChatbot from "../componenet/TenantChatbot";
import NotificationBell from "../componenet/NotificationBell";
import RentSummaryCards from "./RentSummaryCards";
import RentHeaderBar from "./RentHeaderBar";
import MobileSectionSidebar from "./MobileSectionSidebar";
import RentTenantListView from "./RentTenantListView";
import RentTenantProfileView from "./RentTenantProfileViewCard";
import LeavedTenantScreen from "./LeavedTenantScreen";
import VacantBedScreen from "./VacantBedScreen";
import { MdOutlineBedroomParent, MdLightbulbOutline, MdOutlineReceiptLong, MdPerson, MdCalendarToday, MdDashboard } from "react-icons/md";

import LeaveNotificationBell from "../componenet/LeaveNotificationBell";
import RoomManager from "./RoomManager"; // adjust path if needed
// import { useNavigate } from 'react-router-dom';
import { FaMoneyBillWave, FaPhoneAlt, FaCalendarAlt } from "react-icons/fa";
const axios = api;

const canteenPlanLabels = { per_meal: "Per meal", meal_package: "Meal package", full_package: "Full package" };
const canteenPlansFor = (settings) => (settings?.activeModes || []).filter((mode) => canteenPlanLabels[mode]);
function tenantCanteenFields(tenant, settings, propertyType) {
  const hasCanteen = propertyType === "bed" && normalizeCanteenValue(tenant?.canteen ?? tenant?.hasCanteen) === "yes";
  const canteenPlanType = hasCanteen ? tenant?.canteenPlanType || canteenPlansFor(settings)[0] || "" : "";
  const enteredPrices = tenant?.canteenMealPrices || {};
  const hasIndividualPrices = canteenMeals.some((meal) => Number(enteredPrices[meal]) > 0);
  return {
    hasCanteen,
    canteenPlanType,
    canteenStartDate: hasCanteen ? tenant?.canteenStartDate || tenant?.joiningDate || undefined : undefined,
    canteenMonthlyAmount: hasCanteen && canteenPlanType !== "per_meal" ? Number(tenant?.canteenMonthlyAmount || 0) : 0,
    canteenMealPrices: Object.fromEntries(canteenMeals.map((meal) => [meal, hasCanteen && canteenPlanType === "per_meal" && hasIndividualPrices ? Number(enteredPrices[meal] || settings?.perMeal?.[meal] || 0) : 0])),
    canteenIncludedMeals: hasCanteen && canteenPlanType !== "per_meal" ? settings?.[canteenPlanType === "meal_package" ? "mealPackage" : "fullPackage"]?.includedMeals || tenant?.canteenIncludedMeals || [] : [],
  };
}
function CanteenTenantRates({ tenant, setTenant, settings }) {
  if (normalizeCanteenValue(tenant?.canteen ?? tenant?.hasCanteen) !== "yes") return null;
  const plans = canteenPlansFor(settings);
  const selectedPlan = tenant?.canteenPlanType || plans[0] || "";
  const commonAmount = settings?.[selectedPlan === "meal_package" ? "mealPackage" : "fullPackage"]?.monthlyAmount || 0;
  return <div className="col-12">
    {!settings?.isConfigured || !plans.length ? <div className="alert alert-warning py-2">Configure canteen rates in Meal settings before assigning canteen service.</div> : <>
      <label className="form-label">Canteen billing plan</label>
      <select className="form-select mb-2" value={selectedPlan} onChange={(e) => setTenant((prev) => ({ ...prev, canteenPlanType: e.target.value, canteenMonthlyAmount: "", canteenMealPrices: { breakfast: "", lunch: "", dinner: "" } }))}>
        {plans.map((plan) => <option key={plan} value={plan}>{canteenPlanLabels[plan]}</option>)}
      </select>
      {selectedPlan === "per_meal" ? <div className="row g-2">
        {canteenMeals.map((meal) => <div className="col-12 col-md-4" key={meal}>
          <label className="form-label">Individual {meal} price</label>
          <input type="number" min="0" step="0.01" className="form-control" value={tenant?.canteenMealPrices?.[meal] ?? ""} placeholder={`Common: ₹${settings?.perMeal?.[meal] || 0}`} onChange={(e) => setTenant((prev) => ({ ...prev, canteenMealPrices: { ...prev.canteenMealPrices, [meal]: e.target.value } }))} />
        </div>)}
      </div> : <>
        <label className="form-label">Individual monthly amount</label>
        <input type="number" min="0" step="0.01" className="form-control" value={tenant?.canteenMonthlyAmount ?? ""} placeholder={`Common: ₹${commonAmount}`} onChange={(e) => setTenant((prev) => ({ ...prev, canteenMonthlyAmount: e.target.value }))} />
      </>}
      <small className="text-muted">Leave individual rates blank to use the common canteen settings.</small>
    </>}
  </div>;
}

const TRACKER_TYPES = ["bed", "room", "shop"];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const BufferedInput = React.memo(function BufferedInput({
  value,
  onCommit,
  ...props
}) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const isDirtyRef = useRef(false);

  useEffect(() => {
    // Only sync external value into the field when the user is not actively editing,
    // or when the parent explicitly clears/resets the field.
    if (!isDirtyRef.current || (value ?? "") === "") {
      setLocalValue(value ?? "");
    }
  }, [value]);

  return (
    <input
      {...props}
      value={localValue}
      onChange={(e) => {
        isDirtyRef.current = true;
        setLocalValue(e.target.value);
      }}
      onBlur={() => {
        isDirtyRef.current = false;
        if (localValue !== (value ?? "")) {
          onCommit(localValue);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && localValue !== (value ?? "")) {
          onCommit(localValue);
        }
      }}
    />
  );
});

const BufferedTextarea = React.memo(function BufferedTextarea({
  value,
  onCommit,
  ...props
}) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const isDirtyRef = useRef(false);

  useEffect(() => {
    if (!isDirtyRef.current || (value ?? "") === "") {
      setLocalValue(value ?? "");
    }
  }, [value]);

  return (
    <textarea
      {...props}
      value={localValue}
      onChange={(e) => {
        isDirtyRef.current = true;
        setLocalValue(e.target.value);
      }}
      onBlur={() => {
        isDirtyRef.current = false;
        if (localValue !== (value ?? "")) {
          onCommit(localValue);
        }
      }}
    />
  );
});

function buildApiUrl(base) {
  const rawBase = String(base || "").trim();

  if (rawBase) {
    try {
      return new URL(`${rawBase.replace(/\/+$/, "")}/`).toString();
    } catch (_error) {
      // Fall through to the safe fallback below.
    }
  }

  const fallbackOrigin =
    typeof window !== "undefined" && LOCAL_HOSTS.has(window.location.hostname)
      ? "   http://localhost:8000/"
      : " http://localhost:8000/";

  return new URL("/api/", fallbackOrigin).toString();
}

function getWebTenantInviteUrl(invite, appBasePath) {
  const returnedUrl = invite?.url ? new URL(invite.url, window.location.origin) : null;
  const token = invite?.token || returnedUrl?.searchParams.get("inv");
  if (!token) return "";

  const configuredWebUrl = String(process.env.REACT_APP_TENANT_FORM_BASE_URL || "").trim();
  const webUrl = configuredWebUrl
    ? new URL(configuredWebUrl, window.location.origin)
    : new URL(`${appBasePath || ""}/tenant-intake`, window.location.origin);
  webUrl.search = returnedUrl?.search || "";
  webUrl.searchParams.set("tenant", "true");
  webUrl.searchParams.set("inv", token);
  return webUrl.toString();
}

function normalizeTrackerType(value) {
  const raw = String(value || "").trim().toLowerCase();
  return TRACKER_TYPES.includes(raw) ? raw : "bed";
}

function normalizeCanteenValue(value) {
  return value === true || String(value || "").trim().toLowerCase() === "yes" ? "yes" : "no";
}

const CANTEEN_MEAL_RATE = 75;
const CANTEEN_RENT_DISCOUNT = 500;

function getCurrentCanteenMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatCanteenMonth(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}$/.test(raw)) return raw || "-";
  const [year, month] = raw.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function getYearMonthKey(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function getLatestCanteenEntry(tenant) {
  const history = Array.isArray(tenant?.canteenHistory) ? [...tenant.canteenHistory] : [];
  history.sort((a, b) => String(b?.month || "").localeCompare(String(a?.month || "")));
  return history[0] || null;
}

function getCanteenEntryForMonth(tenant, y, m) {
  const history = Array.isArray(tenant?.canteenHistory) ? tenant.canteenHistory : [];
  const directMonthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
  const joinDate = tenant?.joiningDate ? new Date(tenant.joiningDate) : null;
  let cycleStart = null;

  if (joinDate && !Number.isNaN(joinDate.getTime())) {
    let firstBillYM;

    if (tenant?.firstRentMonth) {
      const raw = String(tenant.firstRentMonth).trim();
      const match = raw.match(/^([A-Za-z]{3})-(\d{2})$/);
      const monthMap = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };

      if (match && Object.prototype.hasOwnProperty.call(monthMap, match[1])) {
        firstBillYM = (2000 + Number(match[2])) * 12 + monthMap[match[1]];
      }
    }

    if (firstBillYM == null) {
      const isAdvance = tenant?.firstRentStatus === "ADVANCE_PAID";
      firstBillYM =
        joinDate.getFullYear() * 12 + joinDate.getMonth() + (isAdvance ? 0 : 1);
    }

    const cellYM = y * 12 + m;
    if (cellYM >= firstBillYM) {
      const cycleIndex = cellYM - firstBillYM;
      cycleStart = new Date(joinDate);
      cycleStart.setHours(0, 0, 0, 0);
      cycleStart.setMonth(cycleStart.getMonth() + cycleIndex);
    }
  }

  const cycleEnd = cycleStart ? new Date(cycleStart) : null;

  if (cycleEnd) {
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);
  }

  const cycleStartKey = cycleStart
    ? `${cycleStart.getFullYear()}-${String(cycleStart.getMonth() + 1).padStart(2, "0")}`
    : "";
  const cycleEndKey = cycleEnd
    ? `${cycleEnd.getFullYear()}-${String(cycleEnd.getMonth() + 1).padStart(2, "0")}`
    : "";

  return (
    history.find((entry) => {
      const entryMonth = String(entry?.month || "").trim();
      return (
        entryMonth === directMonthKey ||
        (cycleStartKey && entryMonth === cycleStartKey) ||
        (cycleEndKey && entryMonth === cycleEndKey)
      );
    }) || null
  );
}

function getTrackerTypeFromLocation(location) {
  const path = String(location?.pathname || "").toLowerCase();
  if (path.includes("/tracker/room")) return "room";
  if (path.includes("/tracker/shop")) return "shop";

  const stateType = normalizeTrackerType(location?.state?.trackerType);
  if (location?.state?.trackerType) return stateType;

  return "bed";
}

function normalizeRoomPropertyType(room) {
  const explicitType = String(room?.propertyType || room?.unitType || "").trim().toLowerCase();
  if (TRACKER_TYPES.includes(explicitType)) {
    return explicitType;
  }

  const bedNos = Array.isArray(room?.beds)
    ? room.beds.map((bed) => String(bed?.bedNo || "").trim().toUpperCase())
    : [];

  if (bedNos.some((bedNo) => bedNo === "SHOP-1")) return "shop";
  if (bedNos.some((bedNo) => bedNo === "ROOM-1")) return "room";

  return "bed";
}

function normalizeTenantPropertyType(tenant) {
  const explicitType = String(tenant?.propertyType || "").trim().toLowerCase();
  if (explicitType === "room" || explicitType === "shop") return explicitType;
  const bedNo = String(tenant?.bedNo || "").trim().toUpperCase();
  if (bedNo === "ROOM-1") return "room";
  if (bedNo === "SHOP-1") return "shop";
  return "bed";
}

function matchesTrackerUnitType(room, trackerType) {
  const normalizedType = normalizeRoomPropertyType(room);
  if (normalizedType !== trackerType) return false;

  const bedNos = Array.isArray(room?.beds)
    ? room.beds.map((bed) => String(bed?.bedNo || "").trim().toUpperCase())
    : [];

  if (trackerType === "shop") {
    return bedNos.includes("SHOP-1") || String(room?.unitType || room?.propertyType || "").trim().toLowerCase() === "shop";
  }

  if (trackerType === "room") {
    return bedNos.includes("ROOM-1") || String(room?.unitType || room?.propertyType || "").trim().toLowerCase() === "room";
  }

  return true;
}


function importColumnRows(type) {
  const row = {
    name: type === "shop" ? "Tenant name" : "Full Name",
    phoneNo: "10 digit mobile",
    joiningDate: "YYYY-MM-DD",
    depositAmount: "Number",
    firstRentStatus: "Advance paid / Normal cycle",
    category: "Property/Building name",
    wingName: "Optional wing/block",
    floorNo: "Floor",
    [type === "shop" ? "shopNumber" : "roomNo"]: type === "shop" ? "Shop number" : "Room number",
    baseRent: "Leave blank to use current unit rent",
    address: "Optional",
    pincode: "Optional",
    city: "Optional",
    state: "Optional",
    nearbyPlace: "Optional",
    relative1Name: "Optional",
    relative1Phone: "Optional",
    relative2Name: "Optional",
    relative2Phone: "Optional",
  };

  if (type === "bed") {
    row.bedNo = "Bed number";
    row.hasCanteen = "Yes/No";
  } else if (type === "room") {
    row.flatType = "Required if your residential room uses a flat type";
    row.familyMembers = "Optional";
  } else {
    row.shopName = "Shop name";
    row.shopBusiness = "Shop business";
    row.companyAddress = "Company / business address";
  }

  return [row];
}

function importSampleRows(type) {
  if (type === "room") {
    return [{
      name: "Amit Patil",
      phoneNo: "9876543210",
      joiningDate: "2026-08-25",
      depositAmount: 15000,
      firstRentStatus: "Normal cycle",
      category: "Sai Residency",
      wingName: "A",
      floorNo: "1",
      flatType: "1 BHK",
      roomNo: "101",
      baseRent: 9500,
      address: "Nigdi, Pune",
      pincode: "411044",
      city: "Pune",
      state: "Maharashtra",
      nearbyPlace: "Nigdi",
      familyMembers: 3,
      relative1Name: "Priya Patil",
      relative1Phone: "9988776655",
    }];
  }

  if (type === "shop") {
    return [{
      name: "Neha Traders",
      phoneNo: "9123456780",
      joiningDate: "2026-08-25",
      depositAmount: 30000,
      firstRentStatus: "Advance paid",
      category: "Market Plaza",
      wingName: "A",
      floorNo: "Ground",
      shopNumber: "S-12",
      baseRent: 18000,
      address: "Chakan, Pune",
      pincode: "410501",
      city: "Pune",
      state: "Maharashtra",
      nearbyPlace: "Chakan",
      shopName: "Neha Traders",
      shopBusiness: "Grocery",
      companyAddress: "Market Plaza, Chakan",
    }];
  }

  return [{
    name: "Rahul Sharma",
    phoneNo: "9876543210",
    joiningDate: "2026-08-25",
    depositAmount: 10000,
    firstRentStatus: "Normal cycle",
    category: "Boys Hostel A",
    wingName: "A",
    floorNo: "2",
    roomNo: "205",
    bedNo: "B2",
    baseRent: 5500,
    address: "Pimpri, Pune",
    pincode: "411018",
    city: "Pune",
    state: "Maharashtra",
    nearbyPlace: "Pimpri",
    hasCanteen: "Yes",
    relative1Name: "Suresh Sharma",
    relative1Phone: "9988776655",
  }];
}

function importInstructions(type) {
  const lines = [
    { step: "1", instruction: `Use this sheet only for ${type === "bed" ? "hostel beds" : type === "room" ? "residential rooms" : "commercial shops"}.` },
    { step: "2", instruction: "Do not change the column names in the first row." },
    { step: "3", instruction: "Phone number should be exactly 10 digits." },
    { step: "4", instruction: "Joining date format should be YYYY-MM-DD." },
    { step: "5", instruction: "Payment cycle should be Advance paid or Normal cycle." },
    { step: "6", instruction: "If you use wings or blocks, fill the same wing name from the saved unit." },
  ];
  if (type === "room") {
    lines.push({ step: "7", instruction: "For residential rooms, keep the same flat type as the saved unit." });
    lines.push({ step: "8", instruction: "The room/bed/shop must already exist in your system before import." });
    return lines;
  }
  lines.push({ step: "7", instruction: "The room/bed/shop must already exist in your system before import." });
  return lines;
}

function importFileName(type) {
  if (type === "room") return "tenant-import-template-residential-rooms.xlsx";
  if (type === "shop") return "tenant-import-template-commercial-shops.xlsx";
  return "tenant-import-template-hostel-beds.xlsx";
}

function typeDisplayName(type) {
  if (type === "room") return "Residential rooms";
  if (type === "shop") return "Commercial shops";
  return "Hostel beds";
}

function detectImportedSheetType(rows = []) {
  const firstRow = Array.isArray(rows) ? rows.find((row) => row && typeof row === "object") : null;
  if (!firstRow) return "";

  const normalizedHeaders = Object.keys(firstRow).map((key) =>
    String(key || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "")
  );

  const hasAny = (aliases = []) =>
    aliases.some((alias) =>
      normalizedHeaders.includes(String(alias || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, ""))
    );

  if (hasAny(["bedNo", "bed_no", "bed", "bed number", "hasCanteen", "has_canteen", "canteen"])) {
    return "bed";
  }
  if (hasAny(["shopName", "shop_name", "shop name", "shopBusiness", "shop_business", "shop business", "shopNumber", "shop_number", "shop number", "companyAddress", "company_address", "company address"])) {
    return "shop";
  }
  if (hasAny(["flatType", "flat_type", "flat type", "roomType", "room_type", "room type", "familyMembers", "family_members", "family members"])) {
    return "room";
  }
  return "";
}

function importTypeLabel(type) {
  if (type === "room") return "residential room";
  if (type === "shop") return "commercial shop";
  return "hostel bed";
}

function buildImportSummary(result, type) {
  const lines = [`${result.createdCount || 0} ${typeDisplayName(type).toLowerCase()} tenants imported.`];
  if (result.duplicateCount) lines.push(`${result.duplicateCount} duplicate row(s) skipped.`);
  if (result.invalidCount) lines.push(`${result.invalidCount} invalid row(s) skipped.`);

  const details = [
    ...(result.duplicates || []).map((item) => `Row ${item.rowNumber}: ${item.reason}`),
    ...(result.invalidRows || []).map((item) => `Row ${item.rowNumber}: ${item.reason}`),
  ];
  if (details.length) lines.push("", "Why some rows were skipped:", details.join("\n"));
  return lines.join("\n");
}

function NewComponant() {
  const location = useLocation();
  const navigate = useNavigate();
  const trackerTypeFromLocation = useMemo(() => getTrackerTypeFromLocation(location), [location]);
  const [trackerType, setTrackerType] = useState(trackerTypeFromLocation);
  const [unitAccess, setUnitAccess] = useState(null);
  const [canteenSettings, setCanteenSettings] = useState(null);

  useEffect(() => {
    let active = true;
    getAppBootstrap()
      .then((bootstrap) => {
        if (active) setUnitAccess(bootstrap);
      })
      .catch(() => {
        // Keep the existing navigation available if access information cannot load.
        if (active) setUnitAccess({});
      });
    return () => { active = false; };
  }, []);

  const trackerNavigationTypes = useMemo(
    () => (unitAccess ? allowedUnitTypes(unitAccess) : []),
    [unitAccess]
  );

  useEffect(() => {
    if (!unitAccess || trackerNavigationTypes.some((item) => item.value === trackerType)) return;
    const fallbackType = trackerNavigationTypes[0]?.value || "bed";
    setTrackerType(fallbackType);
    navigate(`/tracker/${fallbackType}`, {
      replace: true,
      state: { tab: "rent", trackerType: fallbackType },
    });
  }, [navigate, trackerNavigationTypes, trackerType, unitAccess]);

  useEffect(() => {
    if (trackerType !== "bed") return;
    let active = true;
    canteenApi.settings().then((data) => { if (active) setCanteenSettings(data); }).catch(() => { if (active) setCanteenSettings(null); });
    return () => { active = false; };
  }, [trackerType]);
  const trackerGroupLabel = trackerType === "bed" ? "Hostel" : "Property";
  const trackerLabel = trackerType === "shop"
    ? "Commercial Shop"
    : trackerType === "room"
      ? "Residential Rooms"
      : "Hostel";
  const trackerUnitLabel = trackerType === "shop" ? "Shop" : trackerType === "room" ? "Room" : "Room / Bed";
  const manageUnitsPath = "/roommanager";
  const appBasePath = useMemo(() => {
    try {
      const baseUrl = process.env.PUBLIC_URL || "/";
      return new URL(baseUrl, window.location.origin).pathname.replace(/\/$/, "");
    } catch (_error) {
      return "";
    }
  }, []);
  const formatTrackerUnit = useCallback(
    (roomNo, bedNo) => {
      const roomValue = String(roomNo || "").trim() || "-";
      const bedValue = String(bedNo || "").trim();

      if (/^UNASSIGNED-/i.test(roomValue)) {
        return "Details pending";
      }

      if (trackerType === "shop") return `Shop ${roomValue}`;
      if (trackerType === "room") return `Room ${roomValue}`;
      return `Room ${roomValue}${bedValue ? ` - Bed ${bedValue}` : ""}`;
    },
    [trackerType]
  );
  const [formData, setFormData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unitsLoadFailed, setUnitsLoadFailed] = useState(false);
  const [tenantsLoadFailed, setTenantsLoadFailed] = useState(false);
  const [roomsData, setRoomsData] = useState([]);
  const [allRoomsData, setAllRoomsData] = useState([]);
  const [allTenantsData, setAllTenantsData] = useState([]);
  // Backend rent summary is the same source of truth used by the mobile app.
  // Map shape: month key (e.g. "Sep-26") -> Map(tenantId -> summary row).
  const [rentSummaryByMonth, setRentSummaryByMonth] = useState(new Map());
  const [rentSummaryRevision, setRentSummaryRevision] = useState(0);
  const rentSummaryCacheRef = useRef(new Map());
  const rentSummaryCacheRevisionRef = useRef(0);
  const lastFocusRefreshAtRef = useRef(0);
  const importFileInputRef = useRef(null);
  const [templateType, setTemplateType] = useState("");
  const [importingType, setImportingType] = useState("");
// 📌 New state for Aadhaar + Photo
const [selfAadharFile, setSelfAadharFile] = useState([]);
const [parentAadharFile, setParentAadharFile] = useState([]);
const [photoFile, setPhotoFile] = useState([]);
const [panCardFile, setPanCardFile] = useState([]);
// Edit Tenant: document uploads
const [editSelfAadharFile, setEditSelfAadharFile] = useState([]);
const [editParentAadharFile, setEditParentAadharFile] = useState([]);
const [editPhotoFile, setEditPhotoFile] = useState([]);
const [editPanCardFile, setEditPanCardFile] = useState([]);
const [editDocMsg, setEditDocMsg] = useState("");
// For Staff & Other Expenses
  const [showExpensesModal, setShowExpensesModal] = useState(false);
const [expensesForm, setExpensesForm] = useState({
  type: "Employee",      // Employee / Cleaning Lady / Other
  name: "",
  month: "",
  amount: "",
  notes: "",
});



const [showOtherExpenseModal, setShowOtherExpenseModal] = useState(false);


const [showPendingModal, setShowPendingModal] = useState(false);
const [showUpcomingModal, setShowUpcomingModal] = useState(false);
const [showCanteenDueModal, setShowCanteenDueModal] = useState(false);
const [showCanteenTenantModal, setShowCanteenTenantModal] = useState(false);
const [showMonthBreakdownModal, setShowMonthBreakdownModal] = useState(false);
const [selectedMonthBreakdown, setSelectedMonthBreakdown] = useState(null);
const [showTenantLightBillModal, setShowTenantLightBillModal] = useState(false);
const [rentLightBillSettings, setRentLightBillSettings] = useState(null);
const [rentLightBillSettingsError, setRentLightBillSettingsError] = useState(false);
const [updatingBreakdownStatusKey, setUpdatingBreakdownStatusKey] = useState("");

const [pendingTenants, setPendingTenants] = useState([]);



const [paid, setPaid] = useState(false);



const [showVacantModal, setShowVacantModal] = useState(false);
const [editNote, setEditNote] = useState("");
const [rentUpdateMode, setRentUpdateMode] = useState("add");

  const roomColorStyleMap = useMemo(() => {
    const rooms = Array.from(
      new Set(
        (formData || [])
          .map((t) => String(t?.roomNo ?? "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const out = {};

    rooms.forEach((roomNo, idx) => {
      out[roomNo] = {
        toneClassName: idx % 2 === 0 ? "room-group-tone-a" : "room-group-tone-b",
      };
    });

    return out;
  }, [formData]);
  const [tenants, setTenants] = useState([]);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftTenant, setShiftTenant] = useState(null);
  const [shiftTargetKey, setShiftTargetKey] = useState(""); // "roomNo-bedNo"
  const [shiftEffectiveDate, setShiftEffectiveDate] = useState("");

  const [rentStart, setRentStart] = useState(null); // shared 3-month window start
  const [rowMonthStarts, setRowMonthStarts] = useState({});
  const [docs, setDocs] = useState([]);
  const [editingTenant, setEditingTenant] = useState(null);
  useEffect(() => {
    if (!editingTenant) return undefined;
    let active = true;
    setRentLightBillSettings(null);
    setRentLightBillSettingsError(false);
    getLightBillSettings().then((settings) => {
      if (active) setRentLightBillSettings(settings);
    }).catch(() => {
      if (active) setRentLightBillSettingsError(true);
    });
    return () => { active = false; };
  }, [editingTenant, showTenantLightBillModal]);
const [editRentAmount, setEditRentAmount] = useState("");
const [editRentCanteenAmount, setEditRentCanteenAmount] = useState("");
const [editRentQuote, setEditRentQuote] = useState(null);
const [editRentQuoteLoading, setEditRentQuoteLoading] = useState(false);
const [editRentQuoteError, setEditRentQuoteError] = useState("");
  const [editRentDate, setEditRentDate] = useState("");
  const [editRentCanteen, setEditRentCanteen] = useState("no");
const [editRentDiscount, setEditRentDiscount] = useState("");
const [editUtr, setEditUtr] = useState("");
const [editReceiptUrl, setEditReceiptUrl] = useState("");

  
  const [activeTab, setActiveTab] = useState("rent");
  const [showUnassignedTenantsView, setShowUnassignedTenantsView] = useState(false);
  const [showCanteenModal, setShowCanteenModal] = useState(false);
  const [canteenTenant, setCanteenTenant] = useState(null);
  const [savingCanteen, setSavingCanteen] = useState(false);
  const [canteenForm, setCanteenForm] = useState({
    month: getCurrentCanteenMonth(),
    mealCount: "",
    status: "due",
  });
  const [lightBills, setLightBills] = useState([]);
  // const [activeTab, setActiveTab] = useState('light'); // 'light' or 'other'
  const [searchText, setSearchText] = useState("");
  const [currentTablePage, setCurrentTablePage] = useState(1);
  const [tableRowsPerPage, setTableRowsPerPage] = useState(25);
  const [currentLeavedPage, setCurrentLeavedPage] = useState(1);
  const [leavedRowsPerPage, setLeavedRowsPerPage] = useState(10);
  const [leaveDates, setLeaveDates] = useState({});
  const [deletedData, setDeletedData] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedLeaveDate, setSelectedLeaveDate] = useState("");
  const [currentLeaveId, setCurrentLeaveId] = useState(null);
  const [currentLeaveName, setCurrentLeaveName] = useState("");
  const [currentLeaveTenant, setCurrentLeaveTenant] = useState(null);
  const [leaveDeductFromDeposit, setLeaveDeductFromDeposit] = useState(false);
  const [leaveSelectedMonths, setLeaveSelectedMonths] = useState([]);
  const [undoBedModal, setUndoBedModal] = useState({
    show: false,
    tenantId: "",
    message: "",
    vacantBeds: [],
    selectedIndex: "",
    busy: false,
  });
  const [showRentModal, setShowRentModal] = useState(false);
  const [selectedRentDetails, setSelectedRentDetails] = useState([]);
  const [selectedRentTenant, setSelectedRentTenant] = useState(null);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [photoEditTenant, setPhotoEditTenant] = useState(null);
  // const [selectedTenantName, setSelectedTenantName] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  ////form
  const [mobileSelectedTenant, setMobileSelectedTenant] = useState(null);
  const [showMobileLeavedTenants, setShowMobileLeavedTenants] = useState(false);
  const [showMobileVacantBeds, setShowMobileVacantBeds] = useState(false);
  const [showMobileSections, setShowMobileSections] = useState(false);
 const [showMobileTenantProfile, setShowMobileTenantProfile] = useState(false);

  const [openStaffModal, setOpenStaffModal] = useState(false);

  const [showFModal, setShowFModal] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState(null);
  // const [lang, setLang] = useState("en");
 const [showAddModal, setShowAddModal] = useState(false);
 const [showQuickTenantModal, setShowQuickTenantModal] = useState(false);
 const [quickTenantSaving, setQuickTenantSaving] = useState(false);
 const [quickTenantError, setQuickTenantError] = useState("");
 const [quickTenantEditing, setQuickTenantEditing] = useState(null);
 const [quickTenantForm, setQuickTenantForm] = useState({
   name: "",
   phoneNo: "",
   joiningDate: new Date().toISOString().slice(0, 10),
   depositAmount: "",
   rentAmount: "",
   pincode: "",
   city: "",
   state: "",
   address: "",
   houseNo: "",
   nearbyPlace: "",
   firstRentStatus: "",
 });
 const [quickTenantPinStatus, setQuickTenantPinStatus] = useState("idle");
 const [quickTenantSection, setQuickTenantSection] = useState("");
 const [assigningQuickTenant, setAssigningQuickTenant] = useState(null);
 const [quickTenantSlotKey, setQuickTenantSlotKey] = useState("");
 const [quickTenantAssigning, setQuickTenantAssigning] = useState(false);
 const [newTenant, setNewTenant] = useState({
    srNo: "",
    name: "",
    joiningDate: "",
    roomId: "",
    roomNo: "",
    category: "",
    wingName: "",
    flatType: "",
    depositAmount: "",
    address: "",
    pincode: "",
    city: "",
    state: "",
    houseNo: "",
    nearbyPlace: "",
    phoneNo: "",
    relativeAddress1: "",
    relativeAddress2: "",
    // inline relatives used in the modal:
    relative1Relation: "Self",
    relative1Name: "",
    relative1Phone: "",
    relative2Relation: "Self",
    relative2Name: "",
    relative2Phone: "",
    familyMembers: "",
    floorNo: "",
    bedNo: "",
    shopName: "",
    shopBusiness: "",
    bedPrice: "",
    companyAddress: "",
    dateOfJoiningCollege: "",
    dob: "",
     // rent/bed helpers you already reference:
    baseRent: "",
    rentAmount: "",
    newBedNo: "",
    newBedPrice: "",
    __bedMsg: "",
    __savingBed: false,
    canteen: "no",
    canteenPlanType: "",
    canteenMonthlyAmount: "",
    canteenMealPrices: { breakfast: "", lunch: "", dinner: "" },

  firstRentStatus: "ADVANCE_PAID",
  firstRentPaidDate: "",
  });
  const [tenantUnitSetupTarget, setTenantUnitSetupTarget] = useState(null);
  const [tenantUnitSetupSaving, setTenantUnitSetupSaving] = useState(false);
  const [tenantUnitSetupCustom, setTenantUnitSetupCustom] = useState({});
  const [tenantUnitSetupForm, setTenantUnitSetupForm] = useState({
    category: "",
    hasWing: false,
    wingName: "",
    floorNo: "",
    flatType: "",
    roomNo: "",
    price: "",
    bedCategory: "",
  });
  const [newTenantPinStatus, setNewTenantPinStatus] = useState("idle");
  useEffect(() => {
    const pin = String(newTenant?.pincode || "").trim();
    if (!showAddModal || !/^\d{6}$/.test(pin)) {
      setNewTenantPinStatus("idle");
      return;
    }

    const controller = new AbortController();
    setNewTenantPinStatus("loading");
    const timer = window.setTimeout(() => {
      const fetchPincodeDetails = async () => {
        try {
          const details = await lookupIndianPincode(pin, controller.signal);
          if (controller.signal.aborted) return;
          setNewTenant((prev) => ({
            ...prev,
            city: String(prev?.pincode || "").trim() === pin ? (prev.city || details.city) : prev.city,
            state: String(prev?.pincode || "").trim() === pin ? (prev.state || details.state) : prev.state,
            nearbyPlace: String(prev?.pincode || "").trim() === pin ? (prev.nearbyPlace || details.nearbyPlace) : prev.nearbyPlace,
          }));
          setNewTenantPinStatus("success");
        } catch {
          if (!controller.signal.aborted) setNewTenantPinStatus("error");
        }
      };

      fetchPincodeDetails();
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [newTenant?.pincode, showAddModal]);

  useEffect(() => {
    const pin = String(quickTenantForm?.pincode || "").trim();
    if (!showQuickTenantModal || !/^\d{6}$/.test(pin)) {
      setQuickTenantPinStatus("idle");
      return;
    }

    const controller = new AbortController();
    setQuickTenantPinStatus("loading");
    const timer = window.setTimeout(async () => {
      try {
        const details = await lookupIndianPincode(pin, controller.signal);
        if (controller.signal.aborted) return;
        setQuickTenantForm((prev) => String(prev?.pincode || "").trim() === pin ? ({
          ...prev,
          city: prev.city || details.city,
          state: prev.state || details.state,
          nearbyPlace: prev.nearbyPlace || details.nearbyPlace,
        }) : prev);
        setQuickTenantPinStatus("success");
      } catch {
        if (!controller.signal.aborted) setQuickTenantPinStatus("error");
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [quickTenantForm?.pincode, showQuickTenantModal]);

  const [firstRentStatusSelection, setFirstRentStatusSelection] = useState("ADVANCE_PAID");
  const [sortConfig, setSortConfig] = useState({
    column: null,      // 'sr' | 'name' | 'status' | 'due'
    direction: "asc",  // 'asc' | 'desc'
  });




const [showFormModal, setShowFormModal] = useState(false);
const [formTenant, setFormTenant] = useState(null);
const [showLeavedHistoryView, setShowLeavedHistoryView] = useState(false);
const [historyDocsTenant, setHistoryDocsTenant] = useState(null);
const canOpenAdmissionForm = trackerType === "bed";

const openAdmissionForm = (tenant) => {
  if (!canOpenAdmissionForm) return;
  setFormTenant(tenant);
  setShowFormModal(true);
};

const totalBeds = (Array.isArray(roomsData) ? roomsData : []).reduce(
  (sum, room) => sum + (room.beds?.length || 0),
  0
);
 const sectionItems = useMemo(() => {
    const typeMeta = {
      bed: {
        trackerKey: "tracker-bed",
        trackerLabel: "Hostel Tracker",
        lightKey: "light-hostel",
        lightLabel: "Hostel",
        expenseKey: "expenses-hostel",
        expenseLabel: "Hostel",
      },
      room: {
        trackerKey: "tracker-room",
        trackerLabel: "Residential Rooms Tracker",
        lightKey: "light-room",
        lightLabel: "Residential Rooms",
        expenseKey: "expenses-room",
        expenseLabel: "Residential Rooms",
      },
      shop: {
        trackerKey: "tracker-shop",
        trackerLabel: "Commercial Shop Tracker",
        lightKey: "light-shop",
        lightLabel: "Commercial Shop",
        expenseKey: "expenses-shop",
        expenseLabel: "Commercial Shop",
      },
    };

    const enabled = trackerNavigationTypes
      .map((item) => typeMeta[item.value])
      .filter(Boolean);

    return [
      { key: "dashboard", label: "Dashboard", icon: <MdDashboard size={20} /> },
      {
        key: "rent-group",
        label: "Rent Tracker",
        icon: <MdOutlineBedroomParent />,
        children: enabled.map((item) => ({ key: item.trackerKey, label: item.trackerLabel })),
      },
      {
        key: "light-group",
        label: "Light Bill",
        icon: <MdLightbulbOutline />,
        children: enabled.map((item) => ({ key: item.lightKey, label: item.lightLabel })),
      },
      {
        key: "expenses-group",
        label: "Expenses",
        icon: <MdOutlineReceiptLong />,
        children: enabled.map((item) => ({ key: item.expenseKey, label: item.expenseLabel })),
      },
      { key: "staff", label: "Staff", icon: <MdPerson /> },
    ];
  }, [trackerNavigationTypes]);



const [quickRoom, setQuickRoom] = useState({
  category: "",
  floorNo: "",
  roomNo: "",
  bedNo: "",
  bedCategory: "",
  bedPrice: "",
});

const [addingQuickRoom, setAddingQuickRoom] = useState(false);
const [quickRoomMsg, setQuickRoomMsg] = useState("");
const [submittingAdd, setSubmittingAdd] = useState(false); // for Save
const [creatingInvite, setCreatingInvite] = useState(false); // for Share Link
const [creatingEditInvite, setCreatingEditInvite] = useState(false); // Edit: Share Link


const addRoomFromTenantModal = async () => {
  const category = (quickRoom.category || "").trim();
  const floorNo = (quickRoom.floorNo || "").trim();
  const roomNo = (quickRoom.roomNo || "").trim();
  const isBedTracker = trackerType === "bed";

  if (!isBedTracker) {
    setQuickRoomMsg("Use the Commercial Manager for rooms and shops.");
    return;
  }

  const bedNo = isBedTracker ? (quickRoom.bedNo || "").trim() : "";
  const bedCategory = isBedTracker ? (quickRoom.bedCategory || "").trim() : "";
  const bedPriceStr = quickRoom.bedPrice;

  if (!category || !floorNo || !roomNo) {
    setQuickRoomMsg("Category, Floor, Room No are required.");
    return;
  }
// ✅ helper (global for this file)
const toNum = (v) => {
  if (v === "" || v == null) return undefined;
  const n = Number(String(v).replace(/[,₹\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

  const priceProvided = bedPriceStr !== "" && bedPriceStr != null;
  const bedPrice = priceProvided ? Number(bedPriceStr) : null;

  if (priceProvided && (Number.isNaN(bedPrice) || bedPrice < 0)) {
    setQuickRoomMsg("Bed Price must be 0 or a valid number.");
    return;
  }

  try {
    setAddingQuickRoom(true);
    setQuickRoomMsg("");

    // 1) create room
    const created = await axios.post(ROOMS_API, {
      category,
      floorNo,
      roomNo,
      propertyType: trackerType,
    });
    const room = created.data;

    // 2) create first bed only for hostel tracker
    if (isBedTracker && bedNo) {
      await axios.post(`${ROOMS_API}/${room._id}/bed`, {
        bedNo,
        bedCategory,
        price: priceProvided ? bedPrice : null,
      });
    } else if (!isBedTracker && priceProvided) {
      await axios.put(
        `${ROOMS_API}/${room._id}/bed/${getPrimaryUnitBedNo(trackerType)}`,
        { price: bedPrice }
      );
    }

    // 3) refresh rooms list (same as your fetchRoomsData / getRooms)
    // 🔁 Use your existing function if you already have it:
    // await fetchRoomsData();
    const res = await axios.get(ROOMS_API);
    setRoomsData(filterRoomsForTracker(res.data || []));

    // 4) auto-select this created room in tenant form
    setNewTenant((prev) => ({
      ...prev,
      roomId: room._id,         // ✅ NEW
      roomNo: room.roomNo,      // keep if your tenant schema needs roomNo
      floorNo: room.floorNo || "",
      bedNo: isBedTracker ? (bedNo ? bedNo : "") : getPrimaryUnitBedNo(trackerType),
      baseRent: priceProvided ? bedPrice : "",
      rentAmount: priceProvided ? bedPrice : "",
      newBedNo: "",
      newBedPrice: "",
      __bedMsg: "",
      __savingBed: false,
    }));

    setQuickRoom({
      category: "",
      floorNo: "",
      roomNo: "",
      bedNo: "",
      bedCategory: "",
      bedPrice: "",
    });

    setQuickRoomMsg("✔ Room created successfully");
  } catch (err) {
    console.error("addRoomFromTenantModal error:", err.response?.data || err);
    setQuickRoomMsg(err.response?.data?.message || "Failed to create room.");
  } finally {
    setAddingQuickRoom(false);
  }
};


const [inviteToken, setInviteToken] = useState(null);

const [staffExpenses, setStaffExpenses] = useState([]);


const [formId, setFormId] = useState(null);

const fetchStaffExpenses = async () => {
  try {
    const res = await fetch(`${apiUrl}staff-expense/all`);
    const data = await res.json();
    // if you have list state like setStaffExpenses, update it here
    // setStaffExpenses(Array.isArray(data) ? data : []);
  } catch (e) {
    console.error(e);
  }
};

const handleSaveStaffExpense = async () => {
  try {
    if (!expensesForm.type) return alert("Select Expense Type");
    if (!expensesForm.name?.trim()) return alert("Enter Name");
    if (!expensesForm.month) return alert("Select Month");
    if (!expensesForm.amount || Number(expensesForm.amount) <= 0)
      return alert("Enter Amount");

    const bodyData = {
      type: expensesForm.type,
      name: expensesForm.name.trim(),
      amount: Number(expensesForm.amount),
      notes: expensesForm.notes || "",
      status: expensesForm.status || "pending",
      date: `${expensesForm.month}-01`, // store as YYYY-MM-01 (like LightBill)
    };

    const res = await fetch(`${apiUrl}staff-expense`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyData),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to save");

    alert("Expense saved!");
    setShowExpensesModal(false);

    setExpensesForm({
      type: "Employee",
      name: "",
      month: "",
      amount: "",
      notes: "",
      status: "pending",
    });

    // refresh list/table if you are showing it
    fetchStaffExpenses();
  } catch (err) {
    alert(err.message);
  }
};



//===========================================================

// ✅ helper: key for occupied bed (roomId-bedNo)
const normRoomNo = (v) =>
  String(v ?? "")
    .trim()
    .split(/[ (]/)[0]; // "102 (Floor 2)" -> "102"

const normBedNo = (v) =>
  String(v ?? "")
    .trim()
    .replace(/^bed\s*/i, "")
    .split(/\s*-\s*|\s+/)[0]; // "Bed 5" -> "5", "1 - lower" -> "1"

const occKey = (roomNo, bedNo) => `${normRoomNo(roomNo)}-${normBedNo(bedNo)}`;

const parseOccupancyDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const ymd = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));

  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};



// A bed becomes vacant on the tenant's leave date.
const hasLeaveDatePassed = (leaveDate) => {
  if (!leaveDate) return false;
  const ld = parseOccupancyDate(leaveDate);


  
  if (isNaN(ld.getTime())) return false;
  ld.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return ld <= today;
};

// ✅ use tenants if present else formData (safe)
const occupiedBeds = useMemo(() => {
  const list = (tenants && tenants.length ? tenants : formData) || [];
  const s = new Set();

  list.forEach((t) => {
    if (t.leaveDate && hasLeaveDatePassed(t.leaveDate)) return;

    // prefer roomNo directly; if only roomId exists, map it to roomNo using roomsData
    let roomNo = t.roomNo;
    if (!roomNo) {
      const rid = t.roomId?._id || t.roomId || t.room?._id || t.room;
      const rm = roomsData?.find((r) => String(r._id) === String(rid));
      roomNo = rm?.roomNo;
    }

    const bedNo = t.bedNo;

    if (roomNo && bedNo != null && String(bedNo).trim() !== "") {
      s.add(occKey(roomNo, bedNo));
    }
  });

  return s;
}, [tenants, formData, roomsData]);

const getTrackerPropertyLabel = (item) => {
  return String(item?.buildingName || item?.category || "").trim();
};

const findTrackerRoomForTenant = (tenant, rooms = allRoomsData) => {
  const roomList = Array.isArray(rooms) ? rooms : [];
  const roomId = tenant?.roomId?._id || tenant?.roomId || tenant?.room?._id || tenant?.room;
  if (roomId) {
    const byId = roomList.find((room) => String(room?._id) === String(roomId));
    if (byId) return byId;
  }

  const roomNo = String(tenant?.roomNo || tenant?.roomId?.roomNo || "").trim();
  if (!roomNo) return null;
  const matchingNumber = roomList.filter((room) => String(room?.roomNo || "").trim() === roomNo);
  const property = String(tenant?.buildingName || tenant?.category || "").trim().toLowerCase();
  if (property) {
    const byProperty = matchingNumber.find((room) => getTrackerPropertyLabel(room).toLowerCase() === property);
    if (byProperty) return byProperty;
  }
  const wing = String(tenant?.wingName || "").trim().toLowerCase();
  const floor = String(tenant?.floorNo || "").trim().toLowerCase();
  const byLocation = matchingNumber.filter((room) =>
    (!wing || String(room?.wingName || "").trim().toLowerCase() === wing) &&
    (!floor || String(room?.floorNo || "").trim().toLowerCase() === floor)
  );
  return byLocation.length === 1 ? byLocation[0] : matchingNumber.length === 1 ? matchingNumber[0] : null;
};

const getTrackerPropertyLabelForTenant = (tenant) => {
  const matchedRoom = findTrackerRoomForTenant(tenant);

  const roomLabel = getTrackerPropertyLabel(matchedRoom);
  if (roomLabel) return roomLabel;

  return getTrackerPropertyLabel(tenant);
};

const getTrackerFlatTypeForTenant = (tenant) => {
  const directFlatType = String(tenant?.flatType || "").trim();
  if (directFlatType) return directFlatType;

  const matchedRoom = findTrackerRoomForTenant(tenant);

  return String(matchedRoom?.flatType || "").trim();
};

const getTrackerRoomKey = (roomNo, propertyLabel = "") => {
  const normalizedRoomNo = String(roomNo ?? "").trim();
  if (trackerType === "bed") return normalizedRoomNo;

  return `${String(propertyLabel || "").trim().toLowerCase()}::${normalizedRoomNo}`;
};

// ✅ ONE source of truth: occupied beds/units
const makeOccKey = (roomNo, bedNo, propertyLabel = "") =>
  `${getTrackerRoomKey(roomNo, propertyLabel)}-${String(bedNo ?? "").trim()}`;

const physicalBedKey = (slot) => [
  slot.propertyLabel || slot.category,
  slot.wingName,
  slot.floorNo,
  slot.roomNo,
  slot.bedNo,
].map((value) => String(value ?? "").trim().toLowerCase()).join("::");

const occupiedBedSet = useMemo(() => {
  const s = new Set();
  (formData || []).forEach((t) => {
    if (t.leaveDate && hasLeaveDatePassed(t.leaveDate)) return; // ignore tenants whose leave date has passed
    const roomNo = t.roomNo;
    const bedNo = t.bedNo;
    const propertyLabel = getTrackerPropertyLabelForTenant(t);
    if (String(roomNo ?? "").trim() && String(bedNo ?? "").trim()) {
      s.add(makeOccKey(roomNo, bedNo, propertyLabel));
    }
  });
  return s;
}, [allRoomsData, formData, trackerType]);

const hasPendingUnitDetails = (room) => {
  const roomNo = String(room?.roomNo || "").trim();
  const building = String(room?.buildingName || room?.category || "").trim();
  const floor = String(room?.floorNo || "").trim();

  return (
    Boolean(room?.isPlaceholder) ||
    /^UNASSIGNED-/i.test(roomNo) ||
    !building ||
    !floor ||
    !roomNo
  );
};

const getTenantSetupUnitType = (room) => normalizeRoomPropertyType(room || {});

const getTenantSetupUnitLabel = (roomOrType) => {
  const type =
    typeof roomOrType === "string"
      ? roomOrType
      : getTenantSetupUnitType(roomOrType);
  if (type === "shop") return "Shop";
  if (type === "room") return "Flat";
  return "Room";
};

const getTenantSetupCategoryLabel = (roomOrType) => {
  const type =
    typeof roomOrType === "string"
      ? roomOrType
      : getTenantSetupUnitType(roomOrType);
  if (type === "shop") return "Property / Market name";
  if (type === "room") return "Building / Property name";
  return "Property / Building name";
};

const getTenantSetupUnitPlaceholder = (roomOrType) => {
  const type =
    typeof roomOrType === "string"
      ? roomOrType
      : getTenantSetupUnitType(roomOrType);
  if (type === "shop") return "Example: Shop 1";
  if (type === "room") return "Example: 101";
  return "Example: Room 101";
};

const roomHasVacantBed = (room) => {
  if (hasPendingUnitDetails(room)) return false;

  const roomNo = room?.roomNo;
  const propertyLabel = getTrackerPropertyLabel(room);
  return (room?.beds || []).some(
    (bed) => !occupiedBedSet.has(makeOccKey(roomNo, bed?.bedNo, propertyLabel))
  );
};
const getPrimaryUnitBedNo = (type) => (type === "shop" ? "SHOP-1" : "ROOM-1");
const getPrimaryUnitBed = (room, type = "room") =>
  (room?.beds || []).find(
    (bed) => String(bed?.bedNo || "").trim().toUpperCase() === getPrimaryUnitBedNo(type)
  ) ||
  (room?.beds || []).find(
    (bed) =>
      toNum(bed?.price) != null ||
      toNum(bed?.baseRent) != null ||
      toNum(bed?.monthlyRent) != null
  ) ||
  (room?.beds || [])[0] ||
  null;

const getUnitPriceFromBed = (bed) =>
  toNum(bed?.price) ?? toNum(bed?.baseRent) ?? toNum(bed?.monthlyRent) ?? "";

const getRoomBuildingLabel = (room) =>
  String(room?.buildingName || room?.category || "").trim();

const getRoomWingValue = (room) => String(room?.wingName || "").trim();

const getRoomFloorValue = (room) => String(room?.floorNo || "").trim();

const formatWingOptionLabel = (wingValue) =>
  wingValue ? `Wing ${wingValue}` : "No Wing";

const getRoomSortNumber = (value) => {
  const parsed = parseInt(String(value ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const residentialVacantRooms = useMemo(() => {
  if (trackerType !== "room") return [];

  return (Array.isArray(roomsData) ? roomsData : [])
    .filter(
      (room) => normalizeRoomPropertyType(room) === "room" && roomHasVacantBed(room)
    )
    .sort((a, b) => {
      const buildingCompare = getRoomBuildingLabel(a).localeCompare(getRoomBuildingLabel(b), undefined, {
        sensitivity: "base",
      });
      if (buildingCompare !== 0) return buildingCompare;

      const wingCompare = getRoomWingValue(a).localeCompare(getRoomWingValue(b), undefined, {
        sensitivity: "base",
      });
      if (wingCompare !== 0) return wingCompare;

      const floorCompare = getRoomSortNumber(getRoomFloorValue(a)) - getRoomSortNumber(getRoomFloorValue(b));
      if (floorCompare !== 0) return floorCompare;

      return getRoomSortNumber(a?.roomNo) - getRoomSortNumber(b?.roomNo);
    });
}, [roomsData, trackerType, occupiedBedSet]);

const residentialBuildingOptions = useMemo(
  () => Array.from(new Set(residentialVacantRooms.map((room) => getRoomBuildingLabel(room)).filter(Boolean))),
  [residentialVacantRooms]
);

const residentialWingOptions = useMemo(() => {
  if (trackerType !== "room" || !newTenant.category) return [];

  return Array.from(
    new Set(
      residentialVacantRooms
        .filter((room) => getRoomBuildingLabel(room) === String(newTenant.category || "").trim())
        .map((room) => getRoomWingValue(room))
    )
  );
}, [newTenant.category, residentialVacantRooms, trackerType]);

const residentialFloorOptions = useMemo(() => {
  if (trackerType !== "room" || !newTenant.category) return [];

  return Array.from(
    new Set(
      residentialVacantRooms
        .filter((room) => {
          if (getRoomBuildingLabel(room) !== String(newTenant.category || "").trim()) return false;
          if (residentialWingOptions.length <= 1) return true;
          return getRoomWingValue(room) === String(newTenant.wingName || "").trim();
        })
        .map((room) => getRoomFloorValue(room))
        .filter(Boolean)
    )
  ).sort((a, b) => getRoomSortNumber(a) - getRoomSortNumber(b));
}, [newTenant.category, newTenant.wingName, residentialVacantRooms, residentialWingOptions.length, trackerType]);

const residentialFlatOptions = useMemo(() => {
  if (trackerType !== "room" || !newTenant.category || !newTenant.floorNo) return [];

  return residentialVacantRooms.filter((room) => {
    if (getRoomBuildingLabel(room) !== String(newTenant.category || "").trim()) return false;
    if (residentialWingOptions.length > 1 && getRoomWingValue(room) !== String(newTenant.wingName || "").trim()) {
      return false;
    }
    return getRoomFloorValue(room) === String(newTenant.floorNo || "").trim();
  });
}, [newTenant.category, newTenant.floorNo, newTenant.wingName, residentialVacantRooms, residentialWingOptions.length, trackerType]);

const applySelectedTrackerRoom = useCallback(
  (selectedRoom) => {
    if (selectedRoom && hasPendingUnitDetails(selectedRoom)) {
      alert("This unit is not set up yet. Please set building, floor and unit number from Units first.");
      return;
    }

    const autoSlot =
      trackerType !== "bed"
        ? (selectedRoom?.beds || []).find(
            (bed) => !occupiedBeds.has(occKey(selectedRoom?.roomNo, bed.bedNo))
          )
        : null;
    const selectedUnit = trackerType === "room" ? getPrimaryUnitBed(selectedRoom, "room") : autoSlot;
    const selectedUnitPrice = getUnitPriceFromBed(selectedUnit);

    setNewTenant((prev) => ({
      ...prev,
      roomId: selectedRoom?._id || "",
      roomNo: selectedRoom?.roomNo || "",
      category: getRoomBuildingLabel(selectedRoom),
      wingName: getRoomWingValue(selectedRoom),
      flatType: selectedRoom?.flatType || "",
      bedNo: selectedUnit?.bedNo || autoSlot?.bedNo || "",
      floorNo: selectedRoom?.floorNo || "",
      baseRent: selectedUnitPrice,
      rentAmount: selectedUnitPrice,
      bedPrice: selectedUnitPrice,
      newBedNo: "",
      newBedPrice: "",
      newBedCategory: "",
      __bedMsg: "",
      __savingBed: false,
      __priceMode: "current",
      __newBedPriceEdit: "",
      __priceMsg: "",
      __savingPrice: false,
    }));
  },
  [occupiedBeds, trackerType]
);

//-------------------------------------------------------------------------

useEffect(() => {
  if (!formData || !formData.length) return;

  // 🔥 Billing month = previous month of today
  const today = new Date();
  let billYear = today.getFullYear();
  let billMonth = today.getMonth() - 1; // previous month

  if (billMonth < 0) {
    billMonth = 11;
    billYear -= 1;
  }

  const billLabel = new Date(billYear, billMonth, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });

  // ✅ helper inside effect (no hoisting issues)
  const isPaidForBillingMonth = (r) => {
    if (!r) return false;

    if (r.date) {
      const d = new Date(r.date);
      if (!isNaN(d)) {
        return (
          d.getFullYear() === billYear &&
          d.getMonth() === billMonth &&
          Number(r.rentAmount) > 0
        );
      }
    }

    if (r.month) {
      try {
        const [mon, yy] = String(r.month).split("-");
        const year = yy && yy.length === 2 ? Number("20" + yy) : Number(yy);
        const month = new Date(`${mon} 1, ${year}`).getMonth();
        return (
          year === billYear &&
          month === billMonth &&
          Number(r.rentAmount) > 0
        );
      } catch (e) {
        return false;
      }
    }

    return false;
  };

  // ✅ Build detailed list for modal
  const pendingList = (formData || [])
    .filter((t) => {
      if (!t) return false;
      if (t.leaveDate) return false;
      if (!t.bedNo) return false;

      const rentDue = Number(t.rentDue || 0);
      if (rentDue > 0) return true;

      const rents = t.rents || [];
      const paidForBillingMonth = rents.some(isPaidForBillingMonth);
      return !paidForBillingMonth;
    })
    .map((t) => {
      const rentDue = Number(t.rentDue || 0);
      const rents = t.rents || [];
      const paidForBillingMonth = rents.some(isPaidForBillingMonth);

      return {
        tenant: t,
        billLabel,
        reason: rentDue > 0 ? "Due Amount Pending" : `Not paid for ${billLabel}`,
        dueAmount: rentDue > 0 ? rentDue : null,
      };
    });

  setPendingRents(pendingList.length);
  setPendingTenants(pendingList);
}, [formData]);









const handleSort = (column) => {
  setSortConfig((prev) => {
    if (prev.column === column) {
      // same column → toggle asc/desc
      return {
        column,
        direction: prev.direction === "asc" ? "desc" : "asc",
      };
    }
    // new column → start with asc
    return { column, direction: "asc" };
  });
};

const renderSortIcon = (column) => {
  if (sortConfig.column !== column) {
    // neutral icon when this column is not sorted
    return <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 4 }}>↕</span>;
  }

  return sortConfig.direction === "asc" ? (
    <span style={{ fontSize: 11, marginLeft: 4 }}>▲</span>
  ) : (
    <span style={{ fontSize: 11, marginLeft: 4 }}>▼</span>
  );
};

// for Rent status (Pending / Paid)
const getStatusWeight = (status) => {
  if (!status) return 99;
  const s = String(status).toLowerCase();
  if (s.startsWith("pend")) return 0; // Pending
  if (s.startsWith("paid")) return 1; // Paid
  return 2;
};

  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [currentDeleteId, setCurrentDeleteId] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [editPaymentMode, setEditPaymentMode] = useState("Cash");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTenantData, setEditTenantData] = useState(null);
  const isEditRentAtJoiningVisible = useMemo(() => {
    if (!editTenantData?.joiningDate) return false;
    const joinDate = new Date(String(editTenantData.joiningDate).split("T")[0]);
    const createdAt = new Date(
      String(editTenantData.createdAt || editTenantData.joiningDate).split("T")[0]
    );
    if (Number.isNaN(joinDate.getTime()) || Number.isNaN(createdAt.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    joinDate.setHours(0, 0, 0, 0);
    createdAt.setHours(0, 0, 0, 0);
    const windowEnd = new Date(joinDate);
    windowEnd.setMonth(windowEnd.getMonth() + 1);
    windowEnd.setHours(23, 59, 59, 999);
    return today >= createdAt && today <= windowEnd;
  }, [editTenantData?.createdAt, editTenantData?.joiningDate]);
  const [editTenantPinStatus, setEditTenantPinStatus] = useState("idle");
  useEffect(() => {
    const pin = String(editTenantData?.pincode || "").trim();
    if (!showEditModal || !/^\d{6}$/.test(pin)) {
      setEditTenantPinStatus("idle");
      return;
    }

    const controller = new AbortController();
    setEditTenantPinStatus("loading");
    const timer = window.setTimeout(async () => {
      try {
        const details = await lookupIndianPincode(pin, controller.signal);
        if (controller.signal.aborted) return;
        setEditTenantData((prev) => prev && String(prev.pincode || "").trim() === pin
          ? {
              ...prev,
              city: prev.city || details.city,
              state: prev.state || details.state,
              nearbyPlace: prev.nearbyPlace || details.nearbyPlace,
            }
          : prev);
        setEditTenantPinStatus("success");
      } catch {
        if (!controller.signal.aborted) setEditTenantPinStatus("error");
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [editTenantData?.pincode, showEditModal]);

  const residentialEditRooms = useMemo(() => {
    if (trackerType !== "room") return [];

    return (Array.isArray(roomsData) ? roomsData : [])
      .filter((room) => normalizeRoomPropertyType(room) === "room")
      .sort((a, b) => {
        const buildingCompare = getRoomBuildingLabel(a).localeCompare(getRoomBuildingLabel(b), undefined, {
          sensitivity: "base",
        });
        if (buildingCompare !== 0) return buildingCompare;

        const wingCompare = getRoomWingValue(a).localeCompare(getRoomWingValue(b), undefined, {
          sensitivity: "base",
        });
        if (wingCompare !== 0) return wingCompare;

        const floorCompare = getRoomSortNumber(getRoomFloorValue(a)) - getRoomSortNumber(getRoomFloorValue(b));
        if (floorCompare !== 0) return floorCompare;

        return getRoomSortNumber(a?.roomNo) - getRoomSortNumber(b?.roomNo);
      });
  }, [roomsData, trackerType]);

  const editResidentialBuildingOptions = useMemo(
    () => Array.from(new Set(residentialEditRooms.map((room) => getRoomBuildingLabel(room)).filter(Boolean))),
    [residentialEditRooms]
  );

  const editResidentialWingOptions = useMemo(() => {
    if (trackerType !== "room" || !editTenantData?.category) return [];

    return Array.from(
      new Set(
        residentialEditRooms
          .filter((room) => getRoomBuildingLabel(room) === String(editTenantData.category || "").trim())
          .map((room) => getRoomWingValue(room))
      )
    );
  }, [editTenantData?.category, residentialEditRooms, trackerType]);

  const editResidentialFloorOptions = useMemo(() => {
    if (trackerType !== "room" || !editTenantData?.category) return [];

    return Array.from(
      new Set(
        residentialEditRooms
          .filter((room) => {
            if (getRoomBuildingLabel(room) !== String(editTenantData.category || "").trim()) return false;
            if (editResidentialWingOptions.length <= 1) return true;
            return getRoomWingValue(room) === String(editTenantData.wingName || "").trim();
          })
          .map((room) => getRoomFloorValue(room))
          .filter(Boolean)
      )
    ).sort((a, b) => getRoomSortNumber(a) - getRoomSortNumber(b));
  }, [editResidentialWingOptions.length, editTenantData?.category, editTenantData?.wingName, residentialEditRooms, trackerType]);

  const editResidentialFlatOptions = useMemo(() => {
    if (trackerType !== "room" || !editTenantData?.category || !editTenantData?.floorNo) return [];

    return residentialEditRooms.filter((room) => {
      if (getRoomBuildingLabel(room) !== String(editTenantData.category || "").trim()) return false;
      if (editResidentialWingOptions.length > 1 && getRoomWingValue(room) !== String(editTenantData.wingName || "").trim()) {
        return false;
      }
      return getRoomFloorValue(room) === String(editTenantData.floorNo || "").trim();
    });
  }, [editResidentialWingOptions.length, editTenantData?.category, editTenantData?.floorNo, editTenantData?.wingName, residentialEditRooms, trackerType]);

  const applySelectedEditTrackerRoom = useCallback((selectedRoom) => {
    const primaryBed = getPrimaryUnitBed(selectedRoom, "room");
    const primaryBedPrice = getUnitPriceFromBed(primaryBed);

    setEditTenantData((prev) =>
      !prev
        ? prev
        : {
            ...prev,
            roomId: selectedRoom?._id || "",
            roomNo: selectedRoom?.roomNo || "",
            category: getRoomBuildingLabel(selectedRoom),
            wingName: getRoomWingValue(selectedRoom),
            flatType: selectedRoom?.flatType || "",
            bedNo: primaryBed?.bedNo || getPrimaryUnitBedNo("room"),
            floorNo: selectedRoom?.floorNo || "",
            bedPrice: primaryBedPrice,
            baseRent: primaryBedPrice,
            rentAmount: primaryBedPrice,
            __priceMode: "current",
            __newBedPriceEdit: "",
            __priceMsg: "",
            __savingPrice: false,
          }
    );
  }, []);



// const [password, setPassword] = useState("");
// const [currentDeleteId, setCurrentDeleteId] = useState(null);
// const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
// const [editPaymentMode, setEditPaymentMode] = useState("Cash");
  const [showPhotoEditModal, setShowPhotoEditModal] = useState(false);
  // const [photoEditTenant, setPhotoEditTenant] = useState(null);
  const [photoEditDocIndex, setPhotoEditDocIndex] = useState(null);
  const [photoEditTransform, setPhotoEditTransform] = useState({
    rotate: 0,
    flipX: false,
    flipY: false,
  });
  const [savingPhotoTransform, setSavingPhotoTransform] = useState(false);



  const [showDueModal, setShowDueModal] = useState(false);
  const [dueMonths, setDueMonths] = useState([]);
  const [selectedTenantName, setSelectedTenantName] = useState("");

  const [showStatusModal, setShowStatusModal] = useState(false);
  // const [statusMonths, setStatusMonths] = useState([]);
  // const [statusTenantName, setStatusTenantName] = useState("");

  const [selectedYear, setSelectedYear] = useState("All Records");
const [editMonthYM, setEditMonthYM] = useState({ y: null, m: null });
 const closeFormModal = () => {
 setShowAddModal(false);
  setFormTenant(null);          // ✅ clear selected tenant
  // if you have any other related states, reset them here too
  // setSomethingElse(...)
};
const normalizeSearchValue = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const compactSearchValue = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");

const formatSearchDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return [
    d.toLocaleDateString("en-IN"),
    d.toLocaleDateString("en-GB"),
    d.toLocaleString("en-IN", { month: "short", year: "numeric" }),
    d.toLocaleString("en-IN", { month: "long", year: "numeric" }),
    String(d.getFullYear()),
  ].join(" ");
};

const getYearFromMonthLabel = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return null;

  const fourDigit = text.match(/\b(19|20)\d{2}\b/);
  if (fourDigit) return Number(fourDigit[0]);

  const twoDigit = text.match(/\b\d{2}\b/);
  if (twoDigit) {
    const yy = Number(twoDigit[0]);
    return yy >= 70 ? 1900 + yy : 2000 + yy;
  }

  return null;
};

const getTenantDateYears = (tenant) => {
  const yearsSet = new Set();
  const addDateYear = (value) => {
    if (!value) return;
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) yearsSet.add(d.getFullYear());
  };

  [
    tenant?.joiningDate,
    tenant?.leaveDate,
    tenant?.dateOfJoiningCollege,
    tenant?.dob,
    tenant?.firstRentPaidDate,
    tenant?.createdAt,
    tenant?.updatedAt,
  ].forEach(addDateYear);

  (Array.isArray(tenant?.rents) ? tenant.rents : []).forEach((rent) => {
    addDateYear(rent?.date);
    const monthYear = getYearFromMonthLabel(rent?.month);
    if (monthYear) yearsSet.add(monthYear);
  });

  (Array.isArray(tenant?.rentHistory) ? tenant.rentHistory : []).forEach((rent) => {
    addDateYear(rent?.date);
    const monthYear = getYearFromMonthLabel(rent?.month);
    if (monthYear) yearsSet.add(monthYear);
  });

  (Array.isArray(tenant?.leaveSettlement?.deductions)
    ? tenant.leaveSettlement.deductions
    : []
  ).forEach((deduction) => {
    const monthYear = getYearFromMonthLabel(deduction?.month);
    if (monthYear) yearsSet.add(monthYear);
  });

  return yearsSet;
};

const tenantMatchesSelectedYear = (tenant) => {
  if (selectedYear === "All Records") return true;
  const selected = Number(selectedYear);
  if (!Number.isFinite(selected)) return true;
  return getTenantDateYears(tenant).has(selected);
};

const tenantMatchesSearchText = (tenant) => {
  const query = normalizeSearchValue(searchText);
  const compactQuery = compactSearchValue(searchText);
  if (!query && !compactQuery) return true;

  const roomQuery = query.match(/\b(?:room|roomno|room no)\s+([a-z0-9]+)/i);
  if (roomQuery) {
    return compactSearchValue(tenant?.roomNo).includes(compactSearchValue(roomQuery[1]));
  }

  const bedQuery = query.match(/\b(?:bed|bedno|bed no)\s+([a-z0-9]+)/i);
  if (bedQuery) {
    return compactSearchValue(tenant?.bedNo).includes(compactSearchValue(bedQuery[1]));
  }

  const phoneQuery = query.match(/\b(?:mobile|mob|phone|contact)\s+([0-9]+)/i);
  if (phoneQuery) {
    const needle = compactSearchValue(phoneQuery[1]);
    return [
      tenant?.phoneNo,
      tenant?.mobileNo,
      tenant?.relative1Phone,
      tenant?.relative2Phone,
    ].some((value) => compactSearchValue(value).includes(needle));
  }

  const nameQuery = query.match(/\b(?:name|tenant)\s+(.+)/i);
  if (nameQuery) {
    return normalizeSearchValue(tenant?.name).includes(
      normalizeSearchValue(nameQuery[1])
    );
  }

  const rents = Array.isArray(tenant?.rents) ? tenant.rents : [];
  const rentHistory = Array.isArray(tenant?.rentHistory) ? tenant.rentHistory : [];
  const docs = Array.isArray(tenant?.documents) ? tenant.documents : [];
  const deductions = Array.isArray(tenant?.leaveSettlement?.deductions)
    ? tenant.leaveSettlement.deductions
    : [];

  const values = [
    tenant?.srNo,
    tenant?.name,
    tenant?.phoneNo,
    `phone ${tenant?.phoneNo || ""}`,
    `mobile ${tenant?.phoneNo || tenant?.mobileNo || ""}`,
    tenant?.mobileNo,
    tenant?.roomNo,
    `room ${tenant?.roomNo || ""}`,
    `room no ${tenant?.roomNo || ""}`,
    tenant?.bedNo,
    `bed ${tenant?.bedNo || ""}`,
    `bed no ${tenant?.bedNo || ""}`,
    tenant?.floorNo,
    `floor ${tenant?.floorNo || ""}`,
    tenant?.category,
    tenant?.address,
    tenant?.houseNo,
    tenant?.nearbyPlace,
    tenant?.city,
    tenant?.state,
    tenant?.pincode,
    tenant?.companyAddress,
    tenant?.relativeAddress,
    tenant?.relativeAddress1,
    tenant?.relativeAddress2,
    tenant?.relative1Name,
    tenant?.relative1Phone,
    tenant?.relative1Relation,
    tenant?.relative2Name,
    tenant?.relative2Phone,
    tenant?.relative2Relation,
    tenant?.depositAmount,
    tenant?.baseRent,
    tenant?.rentAmount,
    tenant?.firstRentStatus,
    tenant?.joiningDate,
    formatSearchDate(tenant?.joiningDate),
    tenant?.leaveDate,
    formatSearchDate(tenant?.leaveDate),
    tenant?.dateOfJoiningCollege,
    formatSearchDate(tenant?.dateOfJoiningCollege),
    tenant?.dob,
    formatSearchDate(tenant?.dob),
    tenant?.leaveSettlement?.grossDeposit,
    tenant?.leaveSettlement?.refundableDeposit,
    tenant?.leaveSettlement?.amountDueFromTenant,
    tenant?.leaveSettlement?.totalDeduction,
    ...rents.flatMap((rent) => [
      rent?.month,
      rent?.date,
      formatSearchDate(rent?.date),
      rent?.rentAmount,
      rent?.paymentMode,
      rent?.paymentType,
      rent?.status,
      rent?.note,
    ]),
    ...rentHistory.flatMap((rent) => [
      rent?.month,
      rent?.date,
      formatSearchDate(rent?.date),
      rent?.rentAmount,
      rent?.paymentMode,
      rent?.paymentType,
      rent?.status,
      rent?.note,
    ]),
    ...docs.flatMap((doc) => [
      doc?.relation,
      doc?.fileName,
      doc?.contentType,
      doc?.url,
    ]),
    ...deductions.flatMap((deduction) => [
      deduction?.month,
      deduction?.amount,
      deduction?.days,
      deduction?.dailyRent,
      deduction?.cycleRange,
    ]),
  ];

  const joined = values.filter(Boolean).join(" ");
  const haystack = normalizeSearchValue(joined);
  const compactHaystack = compactSearchValue(joined);
  return haystack.includes(query) || compactHaystack.includes(compactQuery);
};

const years = useMemo(() => {
  const ys = new Set();
  (formData || []).forEach((d) => {
    getTenantDateYears(d).forEach((year) => ys.add(year));
  });
  return ["All Records", ...Array.from(ys).sort((a, b) => b - a)];
}, [formData]);

const handleRentYearChange = (nextValueOrEvent) => {
  const value =
    typeof nextValueOrEvent === "string"
      ? nextValueOrEvent
      : nextValueOrEvent?.target?.value;
  setSelectedYear(value || "All Records");
};

const handleRentSearchChange = (nextValueOrEvent) => {
  if (showAddModal) return;
  const value =
    typeof nextValueOrEvent === "string"
      ? nextValueOrEvent
      : nextValueOrEvent?.target?.value;
  setSearchText(value || "");
};



const existingForm = formData?.find(
  (f) => String(f.roomNo) === String(newTenant.roomNo) && String(f.bedNo) === String(newTenant.bedNo)
);



  const apiUrl = useMemo(() => buildApiUrl(API_BASE), []);

const ROOMS_API = `${apiUrl}rooms`;
  const filterRoomsForTracker = useCallback(
    (rooms = []) =>
      (Array.isArray(rooms) ? rooms : []).filter((room) => {
        return matchesTrackerUnitType(room, trackerType);
      }),
    [trackerType]
  );

  const filterTenantsForTracker = useCallback(
    (tenants = []) => (Array.isArray(tenants) ? tenants : []).filter(
      (tenant) => tenant?.intakeStatus !== "pending_tenant" && normalizeTenantPropertyType(tenant) === trackerType
    ),
    [trackerType]
  );

  const fetchTrackerUnits = useCallback(async () => {
    const { data } = await api.get("/rooms");
    return filterRoomsForTracker(Array.isArray(data) ? data : []);
  }, [filterRoomsForTracker]);
  const fetchAllUnits = useCallback(async () => {
    const { data } = await api.get("/rooms");
    return Array.isArray(data) ? data : [];
  }, []);

  const refreshTenants = React.useCallback(async () => {
    try {
      const [activeResponse, archivedResponse] = await Promise.all([
        api.get("/forms"),
        api.get("/forms/archived").catch((error) => {
          console.error("Failed to refresh archived tenants:", error);
          return { data: [] };
        }),
      ]);
      const activeTenants = Array.isArray(activeResponse.data) ? activeResponse.data : [];
      setAllTenantsData(activeTenants);
      setDeletedData(Array.isArray(archivedResponse?.data) ? archivedResponse.data : []);
      setFormData(
        filterTenantsForTracker(activeTenants, Array.isArray(allRoomsData) ? allRoomsData : [])
      );
    } catch (e) {
      console.error("Failed to refresh tenants:", e);
    }
  }, [allRoomsData, apiUrl, filterTenantsForTracker]);

  const refreshRooms = useCallback(async () => {
    try {
      const [trackerUnits, allUnits] = await Promise.all([
        fetchTrackerUnits(),
        fetchAllUnits(),
      ]);
      setAllRoomsData(allUnits);
      setRoomsData(filterRoomsForTracker(trackerUnits));
    } catch (e) {
      console.error("Failed to refresh rooms:", e);
    }
  }, [fetchAllUnits, fetchTrackerUnits, filterRoomsForTracker]);

  const normalizeLightBillPropertyType = useCallback(
    (bill, roomList = []) => {
      const explicitType = String(bill?.propertyType || "").trim().toLowerCase();
      if (TRACKER_TYPES.includes(explicitType)) return explicitType;

      const billRoomNo = String(bill?.roomNo || "").trim();
      if (!billRoomNo) return "bed";

      const matchedRoom = (Array.isArray(roomList) ? roomList : []).find(
        (room) => String(room?.roomNo || "").trim() === billRoomNo
      );

      return matchedRoom ? normalizeRoomPropertyType(matchedRoom) : "bed";
    },
    []
  );

  const refreshLightBills = useCallback(async () => {
    try {
      const { data } = await api.get("/light-bill/all");
      const normalizedBills = Array.isArray(data)
        ? data.map((bill) => ({
            ...bill,
            propertyType: normalizeLightBillPropertyType(bill, allRoomsData),
          }))
        : [];
      setLightBills(normalizedBills);
    } catch (e) {
      console.error("Failed to refresh light bills:", e);
    }
  }, [allRoomsData, apiUrl, normalizeLightBillPropertyType]);

const refreshAllData = useCallback(async () => {
    setError(null);
    setUnitsLoadFailed(false);
    setTenantsLoadFailed(false);
    const unitsRequest = fetchAllUnits().then((units) => {
      setAllRoomsData(units);
      return units;
    });
    const tenantsRequest = Promise.all([
      api.get("/forms"),
      api.get("/forms/archived").catch((error) => {
        console.error("Failed to refresh archived tenants:", error);
        return { data: [] };
      }),
    ]).then(([activeResponse, archivedResponse]) => {
      setAllTenantsData(Array.isArray(activeResponse.data) ? activeResponse.data : []);
      setDeletedData(Array.isArray(archivedResponse?.data) ? archivedResponse.data : []);
    });
    const billsRequest = api.get("/light-bill/all").then(({ data }) => data).catch((error) => {
      console.error("Failed to refresh light bills:", error);
      return null;
    });

    const [unitsResult, tenantsResult] = await Promise.allSettled([unitsRequest, tenantsRequest]);
    setUnitsLoadFailed(unitsResult.status === "rejected");
    setTenantsLoadFailed(tenantsResult.status === "rejected");
    if (unitsResult.status === "rejected" || tenantsResult.status === "rejected") {
      const failure = unitsResult.status === "rejected" ? unitsResult.reason : tenantsResult.reason;
      console.error("Failed to refresh tracker data:", failure);
      setError(failure?.code === "ECONNABORTED"
        ? "The server took too long to return tracker records. Please retry."
        : failure?.response?.data?.message || "Some tracker records could not be loaded. Please try again.");
    }
    if (unitsResult.status === "fulfilled" || tenantsResult.status === "fulfilled") {
      setRentSummaryRevision((value) => value + 1);
    }
    setLoading(false);
    const billData = await billsRequest;
    if (Array.isArray(billData)) {
      const units = unitsResult.status === "fulfilled" ? unitsResult.value : [];
      setLightBills(billData.map((bill) => ({
        ...bill,
        propertyType: normalizeLightBillPropertyType(bill, units),
      })));
    }
  }, [fetchAllUnits, normalizeLightBillPropertyType]);

  async function downloadImportTemplate(type) {
    try {
      setTemplateType(type);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(importSampleRows(type)), "Tenants");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(importColumnRows(type)), "Columns");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(importInstructions(type)), "Instructions");

      const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
      const blob = new Blob([output], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = importFileName(type);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Unable to create template\n\n${err.message || "Please try again."}`);
    } finally {
      setTemplateType("");
    }
  }

  async function readImportedSheet(file) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return {
      rows: XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false }),
      workbook,
    };
  }

  async function importTenantSheet(type, file) {
    if (!file) return;

    try {
      setImportingType(type);
      const { rows } = await readImportedSheet(file);

      if (!rows.length) {
        alert("Empty sheet\n\nThis file does not contain any tenant rows.");
        return;
      }

      const detectedSheetType = detectImportedSheetType(rows);
      if (detectedSheetType && detectedSheetType !== type) {
        alert(
          `Wrong sheet selected\n\nThis looks like a ${importTypeLabel(detectedSheetType)} sheet, but you are importing inside ${importTypeLabel(type)}. Please upload the matching template for this section.`
        );
        return;
      }

      const response = await importTenantsFromSheet(type, rows);
      await refreshAllData();
      alert(`Import finished\n\n${buildImportSummary(response, type)}`);
    } catch (err) {
      const backendMessage = err.response?.data?.message || "";
      const backendError = err.response?.data?.error || "";
      const combined = [backendMessage, backendError].filter(Boolean).join("\n");
      alert(`Unable to import sheet\n\n${combined || err.message || "Please try again."}`);
    } finally {
      setImportingType("");
    }
  }

  const handleTenantImportFileSelected = async (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    await importTenantSheet(trackerType, file);
  };

  const canteenTenants = useMemo(
    () =>
      (Array.isArray(formData) ? formData : []).filter(
        (tenant) => normalizeRoomPropertyType(tenant) === "bed" && (tenant?.hasCanteen === true || normalizeCanteenValue(tenant?.canteen) === "yes")
      ),
    [formData]
  );
  const toInt = (v) => {
    const s = String(v ?? "");
    const m = s.match(/\d+/); // takes first number from "301", "301 (Floor 3)" etc
    const n = m ? parseInt(m[0], 10) : NaN;
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
  };

  const compareRoomBed = (a, b) => {
    const r = toInt(a.roomNo) - toInt(b.roomNo);
    if (r !== 0) return r;
    return toInt(a.bedNo) - toInt(b.bedNo);
  };

  const canteenDueEntries = useMemo(() => {
    return canteenTenants
      .filter((tenant) => !hasLeaveDatePassed(tenant?.leaveDate))
      .flatMap((tenant) => {
        const history = Array.isArray(tenant?.canteenHistory) ? tenant.canteenHistory : [];

        return history
          .filter(
            (entry) =>
              Number(entry?.amount || 0) > 0 &&
              String(entry?.status || "").trim().toLowerCase() === "due"
          )
          .map((entry, index) => ({
            key: `${tenant?._id || tenant?.name || "tenant"}-${entry?.month || index}`,
            tenant,
            month: String(entry?.month || "").trim(),
            monthLabel: formatCanteenMonth(entry?.month),
            amount: Number(entry?.amount || 0),
            mealCount: Number(entry?.mealCount || 0),
            status: String(entry?.status || "").trim().toLowerCase(),
          }));
      })
      .sort((a, b) => {
        const monthCompare = String(a.month || "").localeCompare(String(b.month || ""));
        if (monthCompare !== 0) return monthCompare;
        return compareRoomBed(a, b);
      });
  }, [canteenTenants]);

  const updateBedPriceInRoomLists = useCallback((roomId, bedNo, price) => {
    const applyBedPrice = (rooms = []) =>
      (Array.isArray(rooms) ? rooms : []).map((room) => {
        if (String(room?._id) !== String(roomId)) return room;
        return {
          ...room,
          beds: (Array.isArray(room?.beds) ? room.beds : []).map((bed) =>
            String(bed?.bedNo) === String(bedNo) ? { ...bed, price } : bed
          ),
        };
      });

    setRoomsData((prev) => applyBedPrice(prev));
    setAllRoomsData((prev) => applyBedPrice(prev));
  }, []);

  useEffect(() => {
    if (!Array.isArray(allRoomsData) && !Array.isArray(allTenantsData)) return;

    const scopedRooms = filterRoomsForTracker(Array.isArray(allRoomsData) ? allRoomsData : []);
    setRoomsData(scopedRooms);
    setFormData(filterTenantsForTracker(Array.isArray(allTenantsData) ? allTenantsData : [], scopedRooms));
  }, [allRoomsData, allTenantsData, filterRoomsForTracker, filterTenantsForTracker]);

  const lastModalStateRef = useRef(null);
  const getScopedRoomNosByType = useCallback(
    (type) =>
      (Array.isArray(allRoomsData) ? allRoomsData : [])
        .filter((room) => normalizeRoomPropertyType(room) === type)
        .map((room) => String(room.roomNo || ""))
        .filter(Boolean),
    [allRoomsData]
  );
  const getScopedRoomOptionLabelsByType = useCallback(
    (type, labelPrefix) =>
      Object.fromEntries(
        (Array.isArray(allRoomsData) ? allRoomsData : [])
          .filter((room) => normalizeRoomPropertyType(room) === type)
          .map((room) => {
            const roomNo = String(room.roomNo || "").trim();
            return roomNo ? [roomNo, `${labelPrefix} ${roomNo}`] : null;
          })
          .filter(Boolean)
      ),
    [allRoomsData]
  );
  const getScopedRoomTypeMap = useCallback(
    (types) => {
      const allowedTypes = Array.isArray(types) ? types : [types];
      return Object.fromEntries(
        (Array.isArray(allRoomsData) ? allRoomsData : [])
          .filter((room) => allowedTypes.includes(normalizeRoomPropertyType(room)))
          .map((room) => {
            const roomNo = String(room.roomNo || "").trim();
            const type = normalizeRoomPropertyType(room);
            return roomNo ? [roomNo, type] : null;
          })
          .filter(Boolean)
      );
    },
    [allRoomsData]
  );
  const getScopedRoomCategoryMap = useCallback(
    (types) => {
      const allowedTypes = Array.isArray(types) ? types : [types];
      return Object.fromEntries(
        (allRoomsData || [])
          .filter((room) => allowedTypes.includes(normalizeRoomPropertyType(room)))
          .map((room) => {
            const roomNo = String(room.roomNo || "").trim();
            const category = String(room.category || "").trim();
            return roomNo ? [roomNo, category] : null;
          })
          .filter(Boolean)
      );
    },
    [allRoomsData]
  );
  const getScopedCategoriesByType = useCallback(
    (types) =>
      Array.from(
        new Set(
          (Array.isArray(allRoomsData) ? allRoomsData : [])
            .filter((room) => {
              const allowedTypes = Array.isArray(types) ? types : [types];
              return allowedTypes.includes(normalizeRoomPropertyType(room));
            })
            .map((room) => String(room.category || "").trim())
            .filter(Boolean)
        )
      ),
    [allRoomsData]
  );
  const lightBillPropertyScope = useMemo(() => {
    const roomNosByType = {
      bed: getScopedRoomNosByType("bed"),
      room: getScopedRoomNosByType("room"),
      shop: getScopedRoomNosByType("shop"),
    };

    if (activeTab === "light-hostel") {
      return {
        type: "bed",
        label: "Hostel-wise",
        roomNos: roomNosByType.bed,
        optionLabels: getScopedRoomOptionLabelsByType("bed", "Room"),
        roomTypeMap: getScopedRoomTypeMap("bed"),
        roomCategoryMap: getScopedRoomCategoryMap("bed"),
        categories: getScopedCategoriesByType("bed"),
        roomNosByType,
      };
    }

    if (activeTab === "light-room") {
      return {
        type: "room",
        label: "Room-wise",
        roomNos: roomNosByType.room,
        optionLabels: getScopedRoomOptionLabelsByType("room", "Room"),
        roomTypeMap: getScopedRoomTypeMap("room"),
        roomCategoryMap: getScopedRoomCategoryMap("room"),
        categories: getScopedCategoriesByType("room"),
        roomNosByType,
      };
    }

    if (activeTab === "light-room-shop") {
      return {
        type: "mixed",
        label: "Room & Shop-wise",
        roomNos: [
          ...roomNosByType.room,
          ...roomNosByType.shop,
        ],
        optionLabels: {
          ...getScopedRoomOptionLabelsByType("room", "Room"),
          ...getScopedRoomOptionLabelsByType("shop", "Shop"),
        },
        roomTypeMap: getScopedRoomTypeMap(["room", "shop"]),
        roomCategoryMap: getScopedRoomCategoryMap(["room", "shop"]),
        categories: getScopedCategoriesByType(["room", "shop"]),
        roomNosByType,
      };
    }

    if (activeTab === "light-shop") {
      return {
        type: "shop",
        label: "Shop-wise",
        roomNos: roomNosByType.shop,
        optionLabels: getScopedRoomOptionLabelsByType("shop", "Shop"),
        roomTypeMap: getScopedRoomTypeMap("shop"),
        roomCategoryMap: getScopedRoomCategoryMap("shop"),
        categories: getScopedCategoriesByType("shop"),
        roomNosByType,
      };
    }

    return {
      type: trackerType,
      label: trackerLabel,
      roomNos: (roomsData || []).map((room) => String(room.roomNo || "")).filter(Boolean),
      optionLabels: {},
      roomTypeMap: getScopedRoomTypeMap(trackerType),
      roomCategoryMap: getScopedRoomCategoryMap(trackerType),
      categories: getScopedCategoriesByType(trackerType),
      roomNosByType,
    };
  }, [activeTab, getScopedCategoriesByType, getScopedRoomCategoryMap, getScopedRoomNosByType, getScopedRoomOptionLabelsByType, getScopedRoomTypeMap, roomsData, trackerLabel, trackerType]);
  const expensePropertyScope = useMemo(() => {
    const roomNosByType = {
      bed: getScopedRoomNosByType("bed"),
      room: getScopedRoomNosByType("room"),
      shop: getScopedRoomNosByType("shop"),
    };

    if (activeTab === "expenses-hostel") {
      return {
        type: "bed",
        label: "Hostel-wise",
        roomNos: roomNosByType.bed,
        optionLabels: getScopedRoomOptionLabelsByType("bed", "Room"),
        roomTypeMap: getScopedRoomTypeMap("bed"),
        roomNosByType,
      };
    }

    if (activeTab === "expenses-room-shop") {
      return {
        type: "mixed",
        label: "Room & Shop-wise",
        roomNos: [
          ...roomNosByType.room,
          ...roomNosByType.shop,
        ],
        optionLabels: {
          ...getScopedRoomOptionLabelsByType("room", "Room"),
          ...getScopedRoomOptionLabelsByType("shop", "Shop"),
        },
        roomTypeMap: getScopedRoomTypeMap(["room", "shop"]),
        roomNosByType,
      };
    }

    if (activeTab === "expenses-room") {
      return {
        type: "room",
        label: "Room-wise",
        roomNos: roomNosByType.room,
        optionLabels: getScopedRoomOptionLabelsByType("room", "Room"),
        roomTypeMap: getScopedRoomTypeMap("room"),
        roomNosByType,
      };
    }

    if (activeTab === "expenses-shop") {
      return {
        type: "shop",
        label: "Shop-wise",
        roomNos: roomNosByType.shop,
        optionLabels: getScopedRoomOptionLabelsByType("shop", "Shop"),
        roomTypeMap: getScopedRoomTypeMap("shop"),
        roomNosByType,
      };
    }

    return {
      type: trackerType,
      label: trackerLabel,
      roomNos: (roomsData || []).map((room) => String(room.roomNo || "")).filter(Boolean),
      optionLabels: {},
      roomTypeMap: getScopedRoomTypeMap(trackerType),
      roomNosByType,
    };
  }, [activeTab, getScopedRoomNosByType, getScopedRoomOptionLabelsByType, getScopedRoomTypeMap, roomsData, trackerLabel, trackerType]);

  useEffect(() => {
    const modalState = {
      add: showAddModal,
      edit: showEditModal,
      leave: showLeaveModal,
      rent: showRentModal,
      shift: showShiftModal,
      deleteConfirm: showDeleteConfirmation,
      password: showPasswordPrompt,
      vacant: showVacantModal,
      pending: showPendingModal,
      upcoming: showUpcomingModal,
      details: showDetailsModal,
      admissionForm: showFormModal,
      form: showFModal,
      expenses: showExpensesModal,
      otherExpense: showOtherExpenseModal,
      photoEdit: showPhotoEditModal,
    };

    const previous = lastModalStateRef.current;
    lastModalStateRef.current = modalState;

    if (!previous) return undefined;

    const didAnyModalClose = Object.keys(modalState).some(
      (key) => previous[key] && !modalState[key]
    );

    if (!didAnyModalClose) return undefined;

    const timer = window.setTimeout(() => {
      refreshAllData();
    }, 150);

    return () => window.clearTimeout(timer);
  }, [
    showAddModal,
    showEditModal,
    showLeaveModal,
    showRentModal,
    showShiftModal,
    showDeleteConfirmation,
    showPasswordPrompt,
    showVacantModal,
    showPendingModal,
    showUpcomingModal,
    showDetailsModal,
    showFormModal,
    showFModal,
    showExpensesModal,
    showOtherExpenseModal,
    showPhotoEditModal,
    refreshAllData,
  ]);

  useEffect(() => {
    const refreshOnReturn = () => {
      const now = Date.now();
      if (now - lastFocusRefreshAtRef.current < 30000) return;
      lastFocusRefreshAtRef.current = now;
      refreshAllData();
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) refreshOnReturn();
    };

    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshAllData]);

const fmtMonthKey = (y, m) => {
  const mon = new Date(y, m, 1).toLocaleString("en-US", { month: "short" }); // e.g., "Sep"
  const yy = String(y).slice(-2); // "25"
  return `${mon}-${yy}`; // "Sep-25"
};

const getEditRentMonthKey = (editMonthYM, fallbackDate) => {
  if (editMonthYM?.y != null && editMonthYM?.m != null) {
    return fmtMonthKey(editMonthYM.y, editMonthYM.m);
  }

  if (fallbackDate) {
    const d = new Date(fallbackDate);
    if (!Number.isNaN(d.getTime())) {
      return fmtMonthKey(d.getFullYear(), d.getMonth());
    }
  }

  return "";
};

useEffect(() => {
  if (!editingTenant?._id || editMonthYM.y == null || editMonthYM.m == null) {
    setEditRentQuote(null);
    return undefined;
  }
  let active = true;
  setEditRentQuote(null);
  setEditRentQuoteLoading(true);
  setEditRentQuoteError("");
  setEditRentCanteenAmount("");
  const month = fmtMonthKey(editMonthYM.y, editMonthYM.m);
  api.get(`/form/${editingTenant._id}/rent-quote`, { params: { month } })
    .then(({ data }) => {
      if (!active) return;
      setEditRentQuote(data);
      setEditRentAmount(String(Math.max(Number(data?.balance || 0), 0) || ""));
      if (editingTenant.hasCanteen === true) {
        setEditRentCanteenAmount(String(Math.max(Number(data?.canteen?.balance || 0), 0) || ""));
      }
    })
    .catch((error) => {
      if (active) setEditRentQuoteError(error?.response?.data?.message || "Unable to load this month's rent and canteen amounts.");
    })
    .finally(() => { if (active) setEditRentQuoteLoading(false); });
  return () => { active = false; };
}, [editingTenant?._id, editingTenant?.hasCanteen, editMonthYM.y, editMonthYM.m]);

const getFirstRentMonthForStatus = (joiningDate, firstRentStatus) => {
  if (!joiningDate) return "";
  const joinDate = new Date(String(joiningDate).split("T")[0]);
  if (Number.isNaN(joinDate.getTime())) return "";

  const status = String(firstRentStatus || "NOT_PAID").trim();
  const monthOffset = status === "ADVANCE_PAID" ? 0 : 1;
  return fmtMonthKey(joinDate.getFullYear(), joinDate.getMonth() + monthOffset);
};

const parseMonthKey = (key) => {
  // accepts "Sep-25" => { y: 2025, m: 8 }
  if (!key || typeof key !== "string") return null;
  const [mon, yy] = key.split("-");
  if (!mon || !yy) return null;
  const m = new Date(`${mon} 1, 20${yy}`).getMonth();
  const y = Number(`20${yy}`);
  if (!Number.isFinite(m) || !Number.isFinite(y)) return null;
  return { y, m };
};

// Single place to read a record's (y,m)
// Prefers r.month (e.g. "Sep-25"). If absent, uses r.date.
const getYMFromRecord = (r) => {
  if (!r) return null;
  if (r.month) {
    const pm = parseMonthKey(r.month);
    if (pm) return pm;
  }
  if (r.date) {
    const d = new Date(r.date);
    if (!isNaN(d)) return { y: d.getFullYear(), m: d.getMonth() };
  }
  return null;
};
// ➕ add a tiny upsert helper near other helpers:
 const upsertRentForMonth = React.useCallback((tenant, { y, m, amount, date, mode, expectedRent, canteenApplied, discountAmount }) => {
   const monthKey = fmtMonthKey(y, m);
   const rents = Array.isArray(tenant.rents) ? [...tenant.rents] : [];
   const idx = rents.findIndex((r) => {
     const ym = getYMFromRecord(r);
     return ym && ym.y === y && ym.m === m;
   });
   const patch = {
     month: monthKey,                    // "Sep-25"
     rentAmount: Number(amount) || 0,
     date: date || new Date().toISOString(),
     paymentMode: mode || "Online",
     expectedRent: Number(expectedRent) || 0,
     canteenApplied: normalizeCanteenValue(canteenApplied),
     discountAmount: Number(discountAmount) || 0,
   };
   if (idx >= 0) rents[idx] = { ...rents[idx], ...patch };
   else rents.push(patch);
   return rents;
 }, []);

const pad2 = (n) => String(n).padStart(2, "0");

const monthKeyFromDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

const addMonthsSafe = (date, months) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);

  // handle month overflow (e.g. Jan 31 + 1 month)
  if (d.getDate() !== day) d.setDate(0);
  return d;
};

const sameMonthKey = (y, m) => `${y}-${pad2(m + 1)}`; // m is 0-based

const [invToken, setInvToken] = useState("");
const [invLoading, setInvLoading] = useState(false);
const [invError, setInvError] = useState("");

const [form, setForm] = useState({}); // only if you really need setForm

const handleApprovedFromBell = React.useCallback((payload) => {
   // payload = { tenantId, amount, year, month(1..12), paymentDate, paymentMode, ... }
   const { tenantId, amount, year, month, paymentDate, paymentMode } = payload || {};
   if (!tenantId || !Number.isFinite(year) || !Number.isFinite(month)) {
     // fallback: safer re-fetch if something is missing
     refreshTenants();
     return;
   }
   // Optimistic UI: update that tenant's month right away
   setFormData((prev) =>
     prev.map((t) =>
       t._id === tenantId
         ? { ...t, rents: upsertRentForMonth(t, {
             y: year,
             m: month - 1,                // convert 1..12 -> 0..11
             amount,
             date: paymentDate,
             mode: paymentMode
           })
           }
         : t
     )
   );
   // Optional safety: also re-fetch to stay perfectly in sync with server
   refreshTenants();
 }, [refreshTenants, upsertRentForMonth]);

  // Build the public tenant form URL (adjust the path if yours is different)
  // Build a shareable URL for the tenant intake page, prefilled + locked
 const buildTenantFormUrl = React.useCallback(() => {
    const base = new URL(
      `${appBasePath || ""}/tenant-intake`,
      window.location.origin
    );
    const p = new URLSearchParams(base.search);

    p.set("tenant", "true");
    p.set("lock", "1");
    p.set("trackerType", String(trackerType || "bed"));
    p.set("propertyType", String(trackerType || "bed"));

    if ((newTenant.name || "").trim()) p.set("name", newTenant.name.trim());
    if ((newTenant.phoneNo || "").trim())
      p.set("phoneNo", String(newTenant.phoneNo).trim());
    if (newTenant.roomNo) p.set("roomNo", String(newTenant.roomNo));
    if (newTenant.bedNo && newTenant.bedNo !== "__other__")
      p.set("bedNo", String(newTenant.bedNo));
    if (newTenant.address) p.set("address", String(newTenant.address));
    if (newTenant.pincode) p.set("pincode", String(newTenant.pincode));
    if (newTenant.city) p.set("city", String(newTenant.city));
    if (newTenant.state) p.set("state", String(newTenant.state));
    if (newTenant.houseNo) p.set("houseNo", String(newTenant.houseNo));
    if (newTenant.nearbyPlace) p.set("nearbyPlace", String(newTenant.nearbyPlace));
    if (trackerType === "bed" && newTenant.relativeAddress) {
      p.set("relativeAddress", String(newTenant.relativeAddress));
    }
    if (trackerType === "bed" && newTenant.relative1Relation) {
      p.set("relative1Relation", String(newTenant.relative1Relation));
    }
    if (trackerType === "bed" && newTenant.relative1Name) {
      p.set("relative1Name", String(newTenant.relative1Name));
    }
    if (trackerType === "bed" && newTenant.relative1Phone) {
      p.set("relative1Phone", String(newTenant.relative1Phone));
    }
    if (trackerType === "bed" && newTenant.relative2Relation) {
      p.set("relative2Relation", String(newTenant.relative2Relation));
    }
    if (trackerType === "bed" && newTenant.relative2Name) {
      p.set("relative2Name", String(newTenant.relative2Name));
    }
    if (trackerType === "bed" && newTenant.relative2Phone) {
      p.set("relative2Phone", String(newTenant.relative2Phone));
    }
    if (trackerType === "room" && newTenant.familyMembers !== "") {
      p.set("familyMembers", String(newTenant.familyMembers));
    }
    if (newTenant.shopName) p.set("shopName", String(newTenant.shopName));
    if (newTenant.companyAddress) p.set("companyAddress", String(newTenant.companyAddress));
    if (newTenant.shopBusiness) p.set("shopBusiness", String(newTenant.shopBusiness));
    if (newTenant.dateOfJoiningCollege)
      p.set("dateOfJoiningCollege", String(newTenant.dateOfJoiningCollege));
    if (newTenant.dob) p.set("dob", String(newTenant.dob));

    const baseRent = newTenant.baseRent ?? "";
    const rentAmount = baseRent !== "" && baseRent != null ? baseRent : newTenant.rentAmount;
    if (baseRent !== "") p.set("baseRent", String(baseRent));
    if (rentAmount !== "") p.set("rentAmount", String(rentAmount));
    if (newTenant.depositAmount != null && newTenant.depositAmount !== "") {
      p.set("depositAmount", String(newTenant.depositAmount));
    }
    if (newTenant.firstRentStatus) p.set("firstRentStatus", String(newTenant.firstRentStatus));
    if (newTenant.firstRentMonth) p.set("firstRentMonth", String(newTenant.firstRentMonth));
    if (newTenant.firstRentPaidDate)
      p.set("firstRentPaidDate", String(newTenant.firstRentPaidDate));

    base.search = p.toString(); // ← ensure params are applied
    return base.toString();
  }, [appBasePath, newTenant, trackerType]);


const params = new URLSearchParams(window.location.search);
const token = params.get("inv");

useEffect(() => {
  const loadInvite = async () => {
    const res = await axios.get(`${apiUrl}invites/${token}`);
    setFormId(res.data.formId);       // ✅ needed for update
    setForm((p) => ({ ...p, ...(res.data.prefill || {}) }));
  };
  if (token) loadInvite();
}, [token]);


useEffect(() => {
  const token = new URLSearchParams(window.location.search).get("inv");
  if (!token) return;

  setInvToken(token);

  (async () => {
    try {
      setInvLoading(true);
      setInvError("");

      const r = await axios.get(`${apiUrl}invites/${token}`);
      setFormId(r.data?.formId);
      setNewTenant((p) => ({
        ...p,
        ...(r.data?.prefill || {}),
        canteen: normalizeCanteenValue(r.data?.prefill?.hasCanteen ?? p.hasCanteen ?? r.data?.prefill?.canteen ?? p.canteen),
      }));
    } catch (e) {
      console.error(e);
      setInvError("Invalid/expired link.");
    } finally {
      setInvLoading(false);
    }
  })();
}, []);




const handleShareAddTenantModal = React.useCallback(async () => {
  // basic validation
  if (
    !newTenant.roomNo ||
    (trackerType === "bed" &&
      (!newTenant.bedNo || newTenant.bedNo === "__other__"))
  ) {
    alert(
      trackerType === "bed"
        ? "Please select a Room and a Bed before sharing the form."
        : `Please select a ${trackerType === "shop" ? "Shop" : "Room"} before sharing the form.`
    );
    return;
  }

  try {
    // ✅ Create invite + draft form in DB (ONE time)
    const roomFromId = roomsData.find((r) => String(r._id) === String(newTenant.roomId));
    const roomFromNo = roomsData.find((r) => String(r.roomNo) === String(newTenant.roomNo));
    const pickedRoom = roomFromId || roomFromNo;
    const rentSource =
      newTenant.baseRent !== "" && newTenant.baseRent != null
        ? newTenant.baseRent
        : newTenant.rentAmount;

      const payload = {
      roomId: newTenant.roomId || pickedRoom?._id || undefined,
      category: (newTenant.category || pickedRoom?.category || "").trim() || undefined,
      name: (newTenant.name || "").trim(),
      phoneNo: (newTenant.phoneNo || "").trim(),
      roomNo: newTenant.roomNo,
      wingName:
        trackerType === "room"
          ? newTenant.wingName || pickedRoom?.wingName || undefined
          : undefined,
      floorNo:
        trackerType === "room"
          ? newTenant.floorNo || pickedRoom?.floorNo || undefined
          : undefined,
      trackerType,
      propertyType: trackerType,
      bedNo: newTenant.bedNo,
      joiningDate: newTenant.joiningDate || new Date().toISOString().slice(0, 10), // ensure exists
      baseRent: newTenant.baseRent ?? "",
      rentAmount: rentSource ?? "",
      depositAmount: newTenant.depositAmount ?? "",
      address: newTenant.address || undefined,
      pincode: newTenant.pincode || undefined,
      city: newTenant.city || undefined,
      state: newTenant.state || undefined,
      houseNo: newTenant.houseNo || undefined,
      nearbyPlace: newTenant.nearbyPlace || undefined,
      relativeAddress:
        trackerType === "bed"
          ? newTenant.relativeAddress || newTenant.RelativeAddress || undefined
          : undefined,
      relative1Relation: trackerType === "bed" ? newTenant.relative1Relation || undefined : undefined,
      relative1Name: trackerType === "bed" ? newTenant.relative1Name || undefined : undefined,
      relative1Phone: trackerType === "bed" ? newTenant.relative1Phone || undefined : undefined,
      relative2Relation: trackerType === "bed" ? newTenant.relative2Relation || undefined : undefined,
      relative2Name: trackerType === "bed" ? newTenant.relative2Name || undefined : undefined,
      relative2Phone: trackerType === "bed" ? newTenant.relative2Phone || undefined : undefined,
      familyMembers:
        trackerType === "room" && String(newTenant.familyMembers || "").trim() !== ""
          ? Number(newTenant.familyMembers)
          : undefined,
      companyAddress: newTenant.companyAddress || undefined,
      shopName: newTenant.shopName || undefined,
      shopBusiness: newTenant.shopBusiness || undefined,
      dateOfJoiningCollege: newTenant.dateOfJoiningCollege || undefined,
      dob: newTenant.dob || undefined,
      canteen: trackerType === "bed" ? normalizeCanteenValue(newTenant.canteen) : undefined,
      hasCanteen: trackerType === "bed" && normalizeCanteenValue(newTenant.canteen) === "yes",
      ...tenantCanteenFields(newTenant, canteenSettings, trackerType),
      firstRentStatus: newTenant.firstRentStatus || "ADVANCE_PAID",
      firstRentMonth: newTenant.firstRentMonth || undefined,
      firstRentPaidDate: newTenant.firstRentPaidDate || undefined,
    };

    const res = await axios.post(`${apiUrl}invites`, payload, {
      headers: { "X-Origin": window.location.origin },
    });
setFormId(res.data?.formId || null);

setFormId(res.data?.formId || null);
setInviteToken(res.data?.token || null);
    const url = getWebTenantInviteUrl(res.data, appBasePath);
    if (!url) {
      alert("Failed to create invite link");
      return;
    }

    const shareData = {
      title: "Tenant Form",
      text: "Please fill out this tenant form:",
      url,
    };

    const copyFallback = async () => {
      await navigator.clipboard.writeText(url);
      alert("Form link copied to clipboard. Share it with the tenant.");
    };

    if (navigator.share) {
      if (typeof navigator.canShare === "function" && !navigator.canShare(shareData)) {
        await copyFallback();
        return;
      }
      await navigator.share(shareData);
    } else {
      await copyFallback();
    }
  } catch (err) {
    console.error("Share failed:", err.response?.data || err);
    alert(err.response?.data?.message || "Share failed. Check console.");
  }
}, [newTenant, trackerType, roomsData, appBasePath]);









const parseDate = (v) => {
  if (!v) return null;

  // Prefer explicit date formats so DD/MM/YYYY is not parsed as MM/DD/YYYY.
  const s = String(v).trim();
  const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));

  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));

  const d = new Date(v);
  if (!isNaN(d)) return d;

  return null;
};

const today0 = useMemo(() => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}, []);

const isActiveTenant = (t) => {
  // active if: no leaveDate OR leaveDate is in the future (upcoming)
  const ld = parseDate(t.leaveDate);
  if (!ld) return true;
  ld.setHours(0, 0, 0, 0);
  return ld > today0;
};

const vacantBedsList = useMemo(() => {
  const list = [];
  const seenBeds = new Set();
  (roomsData || []).forEach((room) => {
    const roomNo = room.roomNo ?? room.room ?? room.number ?? "";
    const floorNo = room.floorNo ?? room.floor ?? "";
    const category = room.category ?? "";
    const propertyLabel = getTrackerPropertyLabel(room);

    (room.beds || []).forEach((bed) => {
      const bedNo = bed.bedNo ?? bed.no ?? bed.number ?? bed;
      const key = makeOccKey(roomNo, bedNo, propertyLabel);
      const physicalKey = physicalBedKey({ propertyLabel, wingName: room.wingName, floorNo, roomNo, bedNo });
      if (seenBeds.has(physicalKey)) return;
      seenBeds.add(physicalKey);

      // ✅ vacant only if not in occupiedSet
      if (!occupiedBedSet.has(key)) {
        list.push({
          roomId: String(room._id || room.id || ""),
          roomNo,
          bedNo,
          floorNo,
          category,
          wingName: room.wingName || "",
          propertyType: room.propertyType || trackerType,
          propertyLabel,
          price: bed.price ?? bed.bedRent ?? room.bedRent ?? room.price ?? 0,
        });
      }
    });
  });

  list.sort((a, b) => {
    const r = String(a.roomNo).localeCompare(String(b.roomNo), undefined, { numeric: true });
    if (r !== 0) return r;
    return String(a.bedNo).localeCompare(String(b.bedNo), undefined, { numeric: true });
  });

  return list;
}, [roomsData, occupiedBedSet, trackerType]);

const vacantCount = vacantBedsList.length;

const pendingQuickTenants = useMemo(
  () => (Array.isArray(allTenantsData) ? allTenantsData : [])
    .filter((tenant) => tenant?.intakeStatus === "pending_tenant")
    .sort((a, b) => Number(a.srNo || 0) - Number(b.srNo || 0)),
  [allTenantsData]
);
const assigningQuickTenantType = assigningQuickTenant
  ? normalizeTenantPropertyType(assigningQuickTenant)
  : trackerType;

const quickAssignVacantSlots = useMemo(() => {
  const occupiedRoomBeds = new Set();
  const occupiedPhysicalBeds = new Set();
  (Array.isArray(allTenantsData) ? allTenantsData : []).forEach((tenant) => {
    if (tenant?.intakeStatus === "pending_tenant" || hasLeaveDatePassed(tenant?.leaveDate)) return;
    const propertyType = normalizeTenantPropertyType(tenant);
    const matchedRoom = findTrackerRoomForTenant(tenant);
    const roomId = String(tenant?.roomId?._id || tenant?.roomId || matchedRoom?._id || "");
    const roomNo = tenant?.roomNo || matchedRoom?.roomNo;
    const bedNo = propertyType === "room" ? "ROOM-1" : propertyType === "shop" ? "SHOP-1" : tenant?.bedNo;
    const propertyLabel = getTrackerPropertyLabel(matchedRoom) || getTrackerPropertyLabel(tenant);
    if (roomId && bedNo) occupiedRoomBeds.add(`${roomId}::${String(bedNo).trim().toLowerCase()}`);
    if (roomNo && bedNo) {
      occupiedPhysicalBeds.add(physicalBedKey({
        propertyLabel,
        category: tenant?.category || matchedRoom?.category,
        wingName: tenant?.wingName || matchedRoom?.wingName,
        floorNo: tenant?.floorNo || matchedRoom?.floorNo,
        roomNo,
        bedNo,
      }));
    }
  });

  const seen = new Set();
  return (Array.isArray(allRoomsData) ? allRoomsData : []).flatMap((room) => {
    if (hasPendingUnitDetails(room)) return [];
    const propertyType = normalizeRoomPropertyType(room);
    const propertyLabel = getTrackerPropertyLabel(room);
    const roomNo = room?.roomNo ?? room?.room ?? room?.number ?? "";
    const floorNo = room?.floorNo ?? room?.floor ?? "";
    return (Array.isArray(room?.beds) ? room.beds : []).flatMap((bed) => {
      const bedNo = propertyType === "room" ? "ROOM-1" : propertyType === "shop" ? "SHOP-1" : bed?.bedNo ?? bed?.no ?? bed?.number ?? bed;
      if (!bedNo) return [];
      const key = physicalBedKey({ propertyLabel, wingName: room?.wingName, floorNo, roomNo, bedNo });
      if (seen.has(key)) return [];
      seen.add(key);
      const roomBedKey = `${String(room?._id || room?.id || "")}::${String(bedNo).trim().toLowerCase()}`;
      if (occupiedRoomBeds.has(roomBedKey) || occupiedPhysicalBeds.has(key)) return [];
      return [{
        roomId: String(room?._id || room?.id || ""),
        propertyType,
        roomNo,
        bedNo,
        floorNo,
        category: room?.category || "",
        wingName: room?.wingName || "",
        propertyLabel,
        price: bed?.price ?? bed?.bedRent ?? room?.bedRent ?? room?.price ?? 0,
      }];
    });
  }).sort((a, b) =>
    String(a.propertyLabel).localeCompare(String(b.propertyLabel), undefined, { numeric: true }) ||
    String(a.roomNo).localeCompare(String(b.roomNo), undefined, { numeric: true }) ||
    String(a.bedNo).localeCompare(String(b.bedNo), undefined, { numeric: true })
  );
}, [allRoomsData, allTenantsData]);













const clampRotate = (deg) => ((deg % 360) + 360) % 360;

const getTenantPhotoDoc = (tenant) => {
  const docs = tenant?.documents || [];
  if (!docs.length) return null;

  // priority: relation contains 'photo'
  const byRelation = docs.find(
    (d) => d?.url && String(d?.relation || "").toLowerCase().includes("photo")
  );
  if (byRelation) return byRelation;

  // fallback: first image contentType
  const byType = docs.find(
    (d) => d?.url && String(d?.contentType || "").toLowerCase().startsWith("image/")
  );
  return byType || null;
};






// ✅ Always return a usable URL from your doc object
 const getDocHref = (doc) => {
  const url = (doc?.url || "").trim();
  return url ? url : "#"; // ✅ ImageKit URL stored in DB
};


// ✅ Pick tenant photo from documents
// const getTenantPhotoUrl = (tenant) => {
//   const docs = tenant?.documents || [];
//   if (!docs.length) return "";

//   // priority: relation contains 'photo'
//   const byRelation = docs.find(
//     (d) => d?.url && String(d?.relation || "").toLowerCase().includes("photo")
//   );
//   if (byRelation?.url) return byRelation.url;

//   // fallback: first image contentType
//   const byType = docs.find(
//     (d) => d?.url && String(d?.contentType || "").toLowerCase().startsWith("image/")
//   );
//   return byType?.url || "";
// };



const docHrefSafe = (doc) => {
  const u = getDocHref(doc);
  return u && u !== "#" ? String(u).trim() : "";
};

const isMediaDoc = (d) => {
  const ct = String(d?.contentType || "").toLowerCase();
  const name = String(d?.fileName || "").toLowerCase();
  return (
    ct.startsWith("image/") ||
    ct.startsWith("video/") ||
    /\.(png|jpe?g|webp|gif|heic|heif|avif|mp4|mov|webm)$/i.test(name)
  );
};

const isImageDoc = (d) => {
  const ct = String(d?.contentType || "").toLowerCase();
  const name = String(d?.fileName || "").toLowerCase();
  return ct.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic|heif|avif)$/i.test(name);
};

const docRel = (d) => String(d?.relation || "").trim().toLowerCase();
const docName = (d) => String(d?.fileName || "").toLowerCase();


const findTenantPhotoDoc = (tenant) => {
  const docs = tenant?.documents || [];
  if (!Array.isArray(docs) || docs.length === 0) return null;

  // ✅ 1) STRICT: preferred labels (new system)
  let idx =
    docs.findIndex((d) => docRel(d) === "tenant photo" && docHrefSafe(d)) ??
    -1;
  if (idx < 0) idx = docs.findIndex((d) => docRel(d) === "photo" && docHrefSafe(d));
  if (idx < 0) idx = docs.findIndex((d) => docRel(d) === "selfie" && docHrefSafe(d));
  if (idx >= 0) return { doc: docs[idx], index: idx };

  // ✅ 2) Fallback (old system): look for filename hints
  idx = docs.findIndex(
    (d) => isMediaDoc(d) && /photo|selfie|tenant|profile|passport/.test(docName(d)) && docHrefSafe(d)
  );
  if (idx >= 0) return { doc: docs[idx], index: idx };

  // ✅ 3) LAST fallback (old uploads): take the LAST "Self" media file
  let lastIdx = -1;
  docs.forEach((d, i) => {
    if (docRel(d) === "self" && isMediaDoc(d) && docHrefSafe(d)) lastIdx = i;
  });
  if (lastIdx >= 0) return { doc: docs[lastIdx], index: lastIdx };

  return null;
};


const normalizePhotoTransform = (doc) => {
  const rotate = Number(doc?.photoTransform?.rotate) || 0;
  const flipX = !!doc?.photoTransform?.flipX;
  const flipY = !!doc?.photoTransform?.flipY;
  return { rotate, flipX, flipY };
};
const photoTransformStyle = (t) => {
  const nt = normalizePhotoTransform(t);
  const sx = nt.flipX ? -1 : 1;
  const sy = nt.flipY ? -1 : 1;
  return {
    transform: `rotate(${nt.rotate}deg) scaleX(${sx}) scaleY(${sy})`,
    transformOrigin: "center",
  };
};

const isSameDoc = (a, b) => {
  if (!a || !b) return false;
  if (a._id && b._id) return String(a._id) === String(b._id);
  if (a.url && b.url) return String(a.url) === String(b.url);
  return String(a.fileName || "") === String(b.fileName || "");
};








// ✅ Pick tenant photo from documents
const getTenantPhotoUrl = (tenant) => {
  const docs = tenant?.documents || [];
  if (!docs.length) return "";

  // priority: relation contains 'photo'
  const byRelation = docs.find(
    (d) => d?.url && String(d?.relation || "").toLowerCase().includes("photo")
  );
  if (byRelation?.url) return byRelation.url;

  // fallback: first image contentType
  const byType = docs.find(
    (d) => d?.url && String(d?.contentType || "").toLowerCase().startsWith("image/")
  );
  return byType?.url || "";
};

const updateTenantPhotoTransform = async (tenant, updater, setFormData, setTenants, apiUrl) => {
  const photoDoc = getTenantPhotoDoc(tenant);
  if (!photoDoc) return;

  const current = normalizePhotoTransform(photoDoc);
  const next = updater(current);

  const updatedDocs = (tenant.documents || []).map((d) =>
    isSameDoc(d, photoDoc)
      ? {
          ...d,
          photoTransform: {
            rotate: clampRotate(next.rotate || 0),
            flipX: !!next.flipX,
            flipY: !!next.flipY,
          },
        }
      : d
  );

  try {
    await axios.put(`${apiUrl}update/${tenant._id}`, {
      documents: updatedDocs,
    });

    setFormData((prev) =>
      prev.map((t) =>
        t._id === tenant._id ? { ...t, documents: updatedDocs } : t
      )
    );
    setTenants((prev) =>
      prev.map((t) =>
        t._id === tenant._id ? { ...t, documents: updatedDocs } : t
      )
    );
  } catch (err) {
    console.error("Failed to update photo transform:", err);
    alert("Failed to update photo orientation.");
  }
};









const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const clampDay = (y, m, d) => Math.min(d, daysInMonth(y, m));

const fmtDM = (d) =>
  d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); // "07 Jan"

function getCycleRangeStr(tenant, cycleIndex) {
  const baseStart = getFirstCycleStart(tenant);
  baseStart.setHours(0, 0, 0, 0);

  const start = new Date(baseStart);
  start.setMonth(start.getMonth() + cycleIndex);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  return `${start.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })} - ${end.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })}`;
}











//------------------------------------------------------------------------------------------------------------------------------------------------------------------------













  const fetchSrNo = async () => {
    try {
      const response = await axios.get(`${apiUrl}forms/count`);
      setNewTenant((prev) => ({ ...prev, srNo: response.data.nextSrNo }));
    } catch (error) {
      console.error("Error fetching Sr No:", error);
    }
  };

  const getTodayISODate = () => new Date().toISOString().slice(0, 10);

  const syncFirstRentStatusForAdd = (status) => {
    const normalized = status === "NOT_PAID" ? "NOT_PAID" : "ADVANCE_PAID";
    setFirstRentStatusSelection(normalized);
    setNewTenant((prev) => ({
      ...prev,
      firstRentStatus: normalized,
      firstRentPaidDate: normalized === "ADVANCE_PAID" ? getTodayISODate() : "",
    }));
  };

  const openAddModal = () => {
    fetchSrNo();
    syncFirstRentStatusForAdd("ADVANCE_PAID");
    setShowAddModal(true);
  };

  const openQuickTenantModal = () => {
    setQuickTenantError("");
    setQuickTenantEditing(null);
    setQuickTenantSection("");
    setQuickTenantForm({
      name: "",
      phoneNo: "",
      joiningDate: getTodayISODate(),
      depositAmount: "",
      rentAmount: "",
      pincode: "",
      city: "",
      state: "",
      address: "",
      houseNo: "",
      nearbyPlace: "",
      firstRentStatus: "",
    });
    setShowQuickTenantModal(true);
  };

  const editQuickTenant = (tenant) => {
    setQuickTenantError("");
    setQuickTenantEditing(tenant);
    setQuickTenantSection(normalizeTenantPropertyType(tenant));
    setQuickTenantForm({
      name: tenant?.name || "",
      phoneNo: String(tenant?.phoneNo || "").replace(/\D/g, "").slice(0, 10),
      joiningDate: tenant?.joiningDate ? new Date(tenant.joiningDate).toISOString().slice(0, 10) : "",
      depositAmount: String(tenant?.depositAmount ?? ""),
      rentAmount: String(tenant?.baseRent ?? tenant?.rentAmount ?? ""),
      pincode: tenant?.pincode || "",
      city: tenant?.city || "",
      state: tenant?.state || "",
      address: tenant?.address || "",
      houseNo: tenant?.houseNo || "",
      nearbyPlace: tenant?.nearbyPlace || "",
      firstRentStatus: ["ADVANCE_PAID", "NOT_PAID"].includes(tenant?.firstRentStatus) ? tenant.firstRentStatus : "",
    });
    setShowQuickTenantModal(true);
  };

  const saveQuickTenant = async (event) => {
    event?.preventDefault?.();
    if (quickTenantSaving) return;
    const phoneNo = String(quickTenantForm.phoneNo || "").replace(/\D/g, "");
    if (!String(quickTenantForm.name || "").trim()) {
      setQuickTenantError("Enter the tenant name.");
      return;
    }
    if (!quickTenantSection || !trackerNavigationTypes.some((item) => item.value === quickTenantSection)) {
      setQuickTenantError("Select the tenant section.");
      return;
    }
    if (!/^\d{10}$/.test(phoneNo)) {
      setQuickTenantError("Enter a valid 10-digit phone number.");
      return;
    }
    const depositAmount = Number(quickTenantForm.depositAmount);
    if (quickTenantForm.depositAmount === "" || !Number.isFinite(depositAmount) || depositAmount < 0) {
      setQuickTenantError("Enter a valid deposit amount (0 or more).");
      return;
    }
    const rentAmount = Number(quickTenantForm.rentAmount);
    if (!Number.isFinite(rentAmount) || rentAmount <= 0 || quickTenantForm.rentAmount === "") {
      setQuickTenantError("Enter a valid monthly rent greater than 0.");
      return;
    }
    if (!quickTenantForm.joiningDate) {
      setQuickTenantError("Select a joining date.");
      return;
    }
    if (!["ADVANCE_PAID", "NOT_PAID"].includes(quickTenantForm.firstRentStatus)) {
      setQuickTenantError("Select a rent cycle.");
      return;
    }
    const pincode = String(quickTenantForm.pincode || "").trim();
    if (pincode && !/^\d{6}$/.test(pincode)) {
      setQuickTenantError("Enter a valid 6-digit pincode.");
      return;
    }

    setQuickTenantSaving(true);
    setQuickTenantError("");
    try {
      const payload = {
        ...quickTenantForm,
        name: String(quickTenantForm.name).trim(),
        phoneNo,
        depositAmount,
        baseRent: rentAmount,
        rentAmount,
        pincode,
        firstRentStatus: quickTenantForm.firstRentStatus,
        propertyType: quickTenantSection,
        intakeStatus: "pending_tenant",
      };
      if (quickTenantEditing?._id) {
        await api.put(`/forms/${quickTenantEditing._id}`, payload);
      } else {
        await api.post("/forms/quick-add", payload);
      }
      await refreshTenants();
      setShowQuickTenantModal(false);
      setQuickTenantEditing(null);
    } catch (error) {
      setQuickTenantError(
        error?.response?.data?.message || "Could not save tenant details. Please try again."
      );
    } finally {
      setQuickTenantSaving(false);
    }
  };

  const assignQuickTenantToSlot = async () => {
    if (!assigningQuickTenant || !quickTenantSlotKey || quickTenantAssigning) return;
    const tenantType = normalizeTenantPropertyType(assigningQuickTenant);
    const slot = quickAssignVacantSlots.find((item) =>
      item.propertyType === tenantType && `${item.roomId}::${item.bedNo}` === quickTenantSlotKey
    );
    if (!slot) {
      setQuickTenantError("That unit is no longer vacant. Refresh and select another unit.");
      return;
    }
    const savedRent = Number(assigningQuickTenant.baseRent ?? assigningQuickTenant.rentAmount ?? 0);
    const assignedRent = Number.isFinite(savedRent) && savedRent > 0 ? savedRent : Number(slot.price || 0);
    setQuickTenantAssigning(true);
    setQuickTenantError("");
    try {
      await api.put(`/forms/${assigningQuickTenant._id}`, {
        propertyType: tenantType,
        roomId: slot.roomId,
        category: slot.category,
        wingName: slot.wingName || "",
        floorNo: slot.floorNo,
        roomNo: slot.roomNo,
        bedNo: tenantType === "bed" ? slot.bedNo : tenantType === "shop" ? "SHOP-1" : "ROOM-1",
        baseRent: assignedRent,
        rentAmount: assignedRent,
        tenantRentOverride: true,
        intakeStatus: "submitted",
      });
      await refreshTenants();
      setAssigningQuickTenant(null);
      setQuickTenantSlotKey("");
    } catch (error) {
      setQuickTenantError(
        error?.response?.data?.message || "Could not assign this unit. Please try another vacant unit."
      );
    } finally {
      setQuickTenantAssigning(false);
    }
  };


 

  // state at top of component
  const [docFiles, setDocFiles] = useState([]); // [{file: File, relation: "Self"}]
  const [docMsg, setDocMsg] = useState("");

  const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
  const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

  const isAllowedImageFile = (file) => {
    if (!file) return false;

    const mime = String(file.type || "").toLowerCase();
    const name = String(file.name || "");
    const dotIndex = name.lastIndexOf(".");
    const ext = dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : "";

    return ALLOWED_IMAGE_MIME_TYPES.has(mime) && ALLOWED_IMAGE_EXTENSIONS.has(ext);
  };

  const handleStrictImageSelection = (selectedFiles, setter, messageSetter, label) => {
    const files = Array.from(selectedFiles || []).filter(Boolean);
    if (!files.length) return false;
    if (files.some((file) => !isAllowedImageFile(file))) {
      if (messageSetter) messageSetter(`${label} must be JPG, JPEG, or PNG.`);
      return false;
    }

    if (messageSetter) messageSetter("");
    setter((current) => [...(Array.isArray(current) ? current : current ? [current] : []), ...files]);
    return true;
  };

  const removeSelectedUpload = (setter, index) => {
    setter((current) => (Array.isArray(current) ? current : []).filter((_, itemIndex) => itemIndex !== index));
  };

  const renderDocumentUploader = ({ id, label, files, setFiles, messageSetter, capture = false, hint = "JPG, JPEG, or PNG only." }) => (
    <div className="border rounded p-3 h-100">
      <label className="form-label fw-semibold small d-block">{label}</label>
      <input
        id={id}
        type="file"
        className="d-none"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        multiple
        capture={capture ? "user" : undefined}
        onChange={(event) => {
          handleStrictImageSelection(event.target.files, setFiles, messageSetter, label);
          event.target.value = "";
        }}
      />
      <label htmlFor={id} className="btn btn-outline-primary btn-sm mb-2">+ Add document</label>
      <small className="text-muted d-block">{hint}</small>
      {(files || []).map((file, index) => <div className="d-flex align-items-center justify-content-between gap-2 mt-2" key={`${file.name}-${file.lastModified}-${index}`}>
        <small className="text-truncate">{file.name}</small>
        <button type="button" className="btn btn-outline-danger btn-sm py-0" onClick={() => removeSelectedUpload(setFiles, index)}>Remove</button>
      </div>)}
    </div>
  );

  // onChange for <input type="file" multiple>
  function handleDocsChange(e) {
    const files = Array.from(e.target.files || []);
    const invalid = files.find((f) => !isAllowedImageFile(f));
    if (invalid) {
      setDocMsg("Only JPG, JPEG, and PNG files are allowed.");
      e.target.value = "";
      return;
    }

    const mapped = files.map((f) => ({ file: f, relation: "Self" }));
    setDocMsg("");
    setDocFiles((prev) => [...prev, ...mapped]);
  }

  function removeDoc(i) {
    setDocFiles((prev) => prev.filter((_, idx) => idx !== i));
  }
  // --- sanitize payload before sending to backend ---
  // Converts "" -> undefined, coerces number/date-ish fields safely
  function sanitizeTenantPayload(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj || {})) {
      // keep non-numeric rent fields as-is
      if (k === "firstRentStatus" || k === "firstRentMonth" || k === "firstRentPaidDate") {
        out[k] = v;
        continue;
      }
      // turn empty strings/null into undefined (so Mongoose can skip/validate)
      if (v === "" || v === null) {
        out[k] = undefined;
        continue;
      }

      // numbers (rent, price, deposit, amounts, srNo)
      if (/(amount|price|rent|deposit|srNo)$/i.test(k)) {
        const n = Number(String(v).replace(/[,₹\s]/g, ""));
        out[k] = Number.isFinite(n) ? n : undefined;
        continue;
      }

      // dates (joiningDate, dob, dateOfJoiningCollege, date, etc.)
      if (/(date|dob|joining)/i.test(k)) {
        out[k] = v || undefined; // keep ISO string or undefined
        continue;
      }

      out[k] = v;
    }
    return out;
  }
function logAxiosError(err, label = "Axios error") {
  const isAxios = !!err?.isAxiosError;

  console.error(label, {
    isAxios,
    message: err?.message,
    url: err?.config?.url,
    method: err?.config?.method,
    status: err?.response?.status,
    resp: err?.response?.data,
  });

  // ✅ useful extra: show the upload response shape when upload fails
  if (err?.response?.data?.files) {
    console.error(label + " (files)", err.response.data.files);
  }

  // ✅ useful extra: show FormData keys when request was multipart
  const data = err?.config?.data;
  try {
    if (data && typeof data?.entries === "function") {
      const keys = [];
      for (const [k] of data.entries()) keys.push(k);
      console.error(label + " (FormData keys)", keys);
    }
  } catch (_) {}
}





// const formId = params?.id; // SAFE


const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const findSelectedTenantRoom = (tenant = {}) => {
  return findTrackerRoomForTenant(tenant, roomsData);
};

const validateAssignableTenantUnit = (tenant = {}) => {
  const selectedRoom = findSelectedTenantRoom(tenant);
  const unitName =
    trackerType === "shop" ? "shop" : trackerType === "room" ? "room" : "room";

  if (!selectedRoom) {
    return {
      ok: false,
      message: `Please select a valid ${unitName} before adding tenant.`,
    };
  }

  if (hasPendingUnitDetails(selectedRoom)) {
    return {
      ok: false,
      message: "This unit is not set up yet. Please set building, floor and unit number from Units first.",
    };
  }

  if (trackerType === "bed") {
    const bedNo = String(tenant?.bedNo || "").trim();
    const bedExists = (selectedRoom?.beds || []).some(
      (bed) => String(bed?.bedNo || "") === bedNo
    );

    if (!bedNo || bedNo === "__other__" || !bedExists) {
      return {
        ok: false,
        message: "Please select a valid vacant bed before adding tenant.",
      };
    }

    if (occupiedBedSet.has(makeOccKey(selectedRoom.roomNo, bedNo, getTrackerPropertyLabel(selectedRoom)))) {
      return {
        ok: false,
        message: "Selected bed is already occupied. Please choose another vacant bed.",
      };
    }
  } else {
    const primaryBedNo =
      String(tenant?.bedNo || "").trim() ||
      getPrimaryUnitBed(selectedRoom, trackerType)?.bedNo ||
      getPrimaryUnitBedNo(trackerType);

    if (occupiedBedSet.has(makeOccKey(selectedRoom.roomNo, primaryBedNo, getTrackerPropertyLabel(selectedRoom)))) {
      return {
        ok: false,
        message: `Selected ${unitName} is already occupied. Please choose another vacant ${unitName}.`,
      };
    }
  }

  return { ok: true, room: selectedRoom };
};

const addTenantSelectedRoom = findSelectedTenantRoom(newTenant);
const addTenantNeedsUnitSetup =
  Boolean(showAddModal && addTenantSelectedRoom && hasPendingUnitDetails(addTenantSelectedRoom));
const tenantUnitSetupType = tenantUnitSetupTarget
  ? getTenantSetupUnitType(tenantUnitSetupTarget)
  : trackerType;
const tenantUnitSetupReadyRooms = useMemo(() => {
  return (Array.isArray(allRoomsData) ? allRoomsData : []).filter((room) => {
    return (
      !hasPendingUnitDetails(room) &&
      normalizeRoomPropertyType(room) === tenantUnitSetupType
    );
  });
}, [allRoomsData, tenantUnitSetupType]);
// A building/property name can be shared by hostels, residential rooms, and shops.
// Keep the other setup fields scoped to the selected property type, but let this
// dropdown reuse every existing building name.
const tenantUnitSetupAllReadyRooms = useMemo(
  () =>
    (Array.isArray(allRoomsData) ? allRoomsData : []).filter(
      (room) => !hasPendingUnitDetails(room)
    ),
  [allRoomsData]
);
const tenantUnitBuildingOptions = useMemo(
  () =>
    Array.from(
      new Set(
        tenantUnitSetupAllReadyRooms
          .map((room) => getRoomBuildingLabel(room))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
  [tenantUnitSetupAllReadyRooms]
);
const tenantUnitWingOptions = useMemo(() => {
  const selectedBuilding = String(tenantUnitSetupForm.category || "").trim();
  return Array.from(
    new Set(
      tenantUnitSetupReadyRooms
        .filter((room) => !selectedBuilding || getRoomBuildingLabel(room) === selectedBuilding)
        .map((room) => getRoomWingValue(room))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}, [tenantUnitSetupForm.category, tenantUnitSetupReadyRooms]);
const tenantUnitFloorOptions = useMemo(() => {
  const selectedBuilding = String(tenantUnitSetupForm.category || "").trim();
  const selectedWing = tenantUnitSetupForm.hasWing
    ? String(tenantUnitSetupForm.wingName || "").trim()
    : "";

  return Array.from(
    new Set(
      tenantUnitSetupReadyRooms
        .filter((room) => {
          if (selectedBuilding && getRoomBuildingLabel(room) !== selectedBuilding) return false;
          if (tenantUnitSetupForm.hasWing && selectedWing && getRoomWingValue(room) !== selectedWing) return false;
          return true;
        })
        .map((room) => getRoomFloorValue(room))
        .filter(Boolean)
    )
  ).sort((a, b) => getRoomSortNumber(a) - getRoomSortNumber(b));
}, [
  tenantUnitSetupForm.category,
  tenantUnitSetupForm.hasWing,
  tenantUnitSetupForm.wingName,
  tenantUnitSetupReadyRooms,
]);
const tenantUnitFlatTypeOptions = useMemo(
  () =>
    Array.from(
      new Set(
        tenantUnitSetupReadyRooms
          .map((room) => String(room?.flatType || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
  [tenantUnitSetupReadyRooms]
);
const tenantUnitBedTypeOptions = useMemo(
  () =>
    Array.from(
      new Set(
        tenantUnitSetupReadyRooms
          .flatMap((room) => (Array.isArray(room?.beds) ? room.beds : []))
          .map((bed) => String(bed?.bedCategory || bed?.category || "").trim())
          .filter((value) => value && value.toLowerCase() !== "unassigned")
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
  [tenantUnitSetupReadyRooms]
);
const tenantUnitSetupDatalistPrefix =
  tenantUnitSetupTarget?._id || "tenant-unit-setup";
const getSetupDropdownValue = (options = [], value = "") => {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) return "";
  const existing = options.find(
    (option) => option.toLowerCase() === normalizedValue.toLowerCase()
  );
  return existing || "__custom__";
};

const openTenantUnitSetupModal = (room = addTenantSelectedRoom) => {
  if (!room?._id) {
    setDocMsg("Please select a unit first.");
    return;
  }

  const firstBed = Array.isArray(room.beds) ? room.beds[0] : null;
  const hasWing = Boolean(String(room?.wingName || "").trim());

  setTenantUnitSetupTarget(room);
  setTenantUnitSetupCustom({});
  setTenantUnitSetupForm({
    category: hasPendingUnitDetails(room) ? "" : getRoomBuildingLabel(room),
    hasWing,
    wingName: hasWing ? getRoomWingValue(room) : "",
    floorNo: hasPendingUnitDetails(room) ? "" : getRoomFloorValue(room),
    flatType: String(room?.flatType || "").trim(),
    roomNo:
      hasPendingUnitDetails(room) || /^UNASSIGNED-/i.test(String(room?.roomNo || ""))
        ? ""
        : String(room?.roomNo || "").trim(),
    // Placeholder units store a default price of 0. Start with an empty field so
    // the admin can type the monthly rent immediately.
    price:
      hasPendingUnitDetails(room)
        ? ""
        : firstBed?.price != null && firstBed?.price !== ""
          ? String(firstBed.price)
          : "",
    bedCategory:
      String(firstBed?.bedCategory || "").trim().toLowerCase() === "unassigned"
        ? ""
        : String(firstBed?.bedCategory || "").trim(),
  });
};

const closeTenantUnitSetupModal = () => {
  setTenantUnitSetupTarget(null);
  setTenantUnitSetupSaving(false);
  setTenantUnitSetupCustom({});
  setTenantUnitSetupForm({
    category: "",
    hasWing: false,
    wingName: "",
    floorNo: "",
    flatType: "",
    roomNo: "",
    price: "",
    bedCategory: "",
  });
};

const saveTenantUnitSetup = async () => {
  if (!tenantUnitSetupTarget?._id) return;

  const targetType = getTenantSetupUnitType(tenantUnitSetupTarget);
  const category = String(tenantUnitSetupForm.category || "").trim();
  const floorNo = String(tenantUnitSetupForm.floorNo || "").trim();
  const roomNo = String(tenantUnitSetupForm.roomNo || "").trim();
  const hasWing = Boolean(tenantUnitSetupForm.hasWing);
  const wingName = hasWing ? String(tenantUnitSetupForm.wingName || "").trim() : "";
  const flatType = targetType === "room" ? String(tenantUnitSetupForm.flatType || "").trim() : "";
  const priceValue = String(tenantUnitSetupForm.price || "").trim();
  const price = priceValue === "" ? undefined : Number(priceValue);
  const bedCategory = String(tenantUnitSetupForm.bedCategory || "").trim();

  if (!category) {
    setDocMsg("Please enter property name.");
    return;
  }
  if (hasWing && !wingName) {
    setDocMsg("Please enter wing name.");
    return;
  }
  if (!floorNo) {
    setDocMsg("Please enter floor.");
    return;
  }
  if (!roomNo) {
    setDocMsg(`Please enter ${getTenantSetupUnitLabel(targetType).toLowerCase()} number.`);
    return;
  }
  if (targetType === "room" && !flatType) {
    setDocMsg("Please enter flat type.");
    return;
  }
  if (price !== undefined && (Number.isNaN(price) || price < 0)) {
    setDocMsg("Please enter a valid monthly rent.");
    return;
  }

  const duplicate = (Array.isArray(allRoomsData) ? allRoomsData : []).some((room) => {
    if (String(room?._id) === String(tenantUnitSetupTarget._id)) return false;
    if (hasPendingUnitDetails(room)) return false;
    return (
      normalizeRoomPropertyType(room) === targetType &&
      String(room?.roomNo || "").trim().toLowerCase() === roomNo.toLowerCase() &&
      getRoomBuildingLabel(room).toLowerCase() === category.toLowerCase() &&
      getRoomFloorValue(room).toLowerCase() === floorNo.toLowerCase() &&
      getRoomWingValue(room).toLowerCase() === wingName.toLowerCase()
    );
  });

  if (duplicate) {
    setDocMsg(`${getTenantSetupUnitLabel(targetType)} already exists in this location.`);
    return;
  }

  try {
    setTenantUnitSetupSaving(true);
    setDocMsg("");

    const updatedResponse = await axios.put(`${ROOMS_API}/${tenantUnitSetupTarget._id}`, {
      category,
      hasWing,
      wingName,
      floorNo,
      flatType,
      roomNo,
      isPlaceholder: false,
    });

    const updatedRoom = updatedResponse?.data || {};
    const targetBedNo =
      String(newTenant.bedNo || "").trim() ||
      tenantUnitSetupTarget?.beds?.[0]?.bedNo ||
      getPrimaryUnitBedNo(targetType);

    let nextRoom = {
      ...tenantUnitSetupTarget,
      ...updatedRoom,
      category,
      hasWing,
      wingName,
      floorNo,
      flatType,
      roomNo,
      isPlaceholder: false,
    };

    if ((price !== undefined || bedCategory) && targetBedNo) {
      await axios.put(`${ROOMS_API}/${nextRoom._id || tenantUnitSetupTarget._id}/bed/${targetBedNo}`, {
        ...(price !== undefined ? { price } : {}),
        ...(bedCategory ? { bedCategory } : {}),
      });

      nextRoom = {
        ...nextRoom,
        beds: (nextRoom.beds || tenantUnitSetupTarget.beds || []).map((bed, index) => {
          if (String(bed?.bedNo || "") !== String(targetBedNo) && index !== 0) return bed;
          return {
            ...bed,
            ...(price !== undefined ? { price } : {}),
            ...(bedCategory ? { bedCategory } : {}),
          };
        }),
      };
    }

    const replaceRoom = (rooms = []) =>
      (Array.isArray(rooms) ? rooms : []).map((room) =>
        String(room?._id) === String(nextRoom._id || tenantUnitSetupTarget._id)
          ? nextRoom
          : room
      );

    setRoomsData((prev) => filterRoomsForTracker(replaceRoom(prev)));
    setAllRoomsData((prev) => replaceRoom(prev));

    const selectedBed =
      (nextRoom.beds || []).find((bed) => String(bed?.bedNo || "") === String(targetBedNo)) ||
      getPrimaryUnitBed(nextRoom, targetType);
    const selectedPrice = getUnitPriceFromBed(selectedBed);

    setNewTenant((prev) => ({
      ...prev,
      roomId: nextRoom._id || tenantUnitSetupTarget._id,
      roomNo,
      category,
      wingName,
      floorNo,
      flatType,
      bedNo: targetBedNo,
      bedPrice: selectedPrice,
      baseRent: selectedPrice,
      rentAmount: selectedPrice,
      __priceMode: "current",
      __newBedPriceEdit: "",
      __priceMsg: "",
    }));

    closeTenantUnitSetupModal();
  } catch (error) {
    console.error("Failed to set unit details from tenant modal:", error?.response?.data || error);
    setDocMsg(error?.response?.data?.message || "Failed to set unit details.");
  } finally {
    setTenantUnitSetupSaving(false);
  }
};


const handleAddTenantWithDocs = async () => {
  try {
    setDocMsg("");

    const isInviteFlow = !!invToken;

    if (isInviteFlow && !formId) {
      setDocMsg("Link is loading. Please wait 2 seconds and try again.");
      return;
    }

    const unitValidation = validateAssignableTenantUnit(newTenant);
    if (!unitValidation.ok) {
      setDocMsg(unitValidation.message);
      return;
    }

    const rentAmount = Number(newTenant.baseRent ?? newTenant.rentAmount ?? 0);
    const depositAmount = Number(newTenant.depositAmount ?? 0);

    if (!Number.isFinite(rentAmount) || rentAmount <= 0) {
      setDocMsg("Rent Amount is required (must be a valid number).");
      return;
    }

    if (!newTenant.joiningDate) {
      setDocMsg("Joining Date is required.");
      return;
    }

    // ✅ required by your schema
    const paymentMode = "Cash";
    const joinDate = new Date(newTenant.joiningDate);
    const firstRentStatus =
      firstRentStatusSelection || newTenant.firstRentStatus || "ADVANCE_PAID";

let firstRentMonth;

if (firstRentStatus === "ADVANCE_PAID") {
  // ✅ joining month
  firstRentMonth = fmtMonthKey(
    joinDate.getFullYear(),
    joinDate.getMonth()
  );
} else {
  // ✅ next cycle month
  const next = new Date(
    joinDate.getFullYear(),
    joinDate.getMonth() + 1,
    1
  );
  firstRentMonth = fmtMonthKey(
    next.getFullYear(),
    next.getMonth()
  );
}

    const fd = new FormData(); // ✅ use fd everywhere

    if (isInviteFlow) {
      if (formId) fd.append("formId", formId);
      if (invToken) fd.append("inv", invToken);
    }

    fd.append("rentAmount", String(rentAmount));
    fd.append("depositAmount", String(depositAmount));

    fd.append("paymentMode", paymentMode);
    fd.append("month", firstRentMonth);

    fd.append("name", newTenant.name || "");
    fd.append("phoneNo", newTenant.phoneNo || "");
    fd.append("address", newTenant.address || "");
    fd.append("joiningDate", newTenant.joiningDate);
    if (newTenant.pincode) fd.append("pincode", newTenant.pincode);
    if (newTenant.city) fd.append("city", newTenant.city);
    if (newTenant.state) fd.append("state", newTenant.state);
    if (newTenant.houseNo) fd.append("houseNo", newTenant.houseNo);
    if (newTenant.nearbyPlace) fd.append("nearbyPlace", newTenant.nearbyPlace);

    if (newTenant.dob) fd.append("dob", newTenant.dob);
    if (newTenant.dateOfJoiningCollege) fd.append("dateOfJoiningCollege", newTenant.dateOfJoiningCollege);
    if (trackerType === "shop") {
      fd.append("shopBusiness", newTenant.shopBusiness || "");
      fd.append("shopName", newTenant.shopName || "");
    } else if (newTenant.companyAddress) {
      fd.append("companyAddress", newTenant.companyAddress);
    }

    if (trackerType === "bed") {
      fd.append("relative1Relation", newTenant.relative1Relation || "Self");
      fd.append("relative1Name", newTenant.relative1Name || "");
      fd.append("relative1Phone", newTenant.relative1Phone || "");

      fd.append("relative2Relation", newTenant.relative2Relation || "Self");
      fd.append("relative2Name", newTenant.relative2Name || "");
      fd.append("relative2Phone", newTenant.relative2Phone || "");
    }
    if (trackerType === "room" && newTenant.familyMembers !== "") {
      fd.append("familyMembers", String(newTenant.familyMembers));
    }

    fd.append("roomNo", newTenant.roomNo || "");
    if (newTenant.roomId) fd.append("roomId", String(newTenant.roomId));
    if (trackerType === "room" && newTenant.wingName) fd.append("wingName", newTenant.wingName);
    if (trackerType === "room" && newTenant.floorNo) fd.append("floorNo", newTenant.floorNo);
    fd.append("firstRentStatus", firstRentStatus);
    fd.append("firstRentMonth", firstRentMonth);
    fd.append(
      "firstRentPaidDate",
      firstRentStatus === "ADVANCE_PAID"
        ? newTenant.firstRentPaidDate || getTodayISODate()
        : ""
    );

    if (newTenant.bedNo && newTenant.bedNo !== "__other__") fd.append("bedNo", newTenant.bedNo);

    const cat = (newTenant.category || existingForm?.category || "").trim();
    if (cat) fd.append("category", cat);
    
    if (trackerType === "bed") {
      fd.append("canteen", normalizeCanteenValue(newTenant.canteen));
      fd.append("hasCanteen", String(normalizeCanteenValue(newTenant.canteen) === "yes"));
      const canteenFields = tenantCanteenFields(newTenant, canteenSettings, trackerType);
      fd.append("canteenPlanType", canteenFields.canteenPlanType);
      fd.append("canteenMonthlyAmount", String(canteenFields.canteenMonthlyAmount));
      if (canteenFields.canteenStartDate) fd.append("canteenStartDate", canteenFields.canteenStartDate);
      canteenMeals.forEach((meal) => fd.append(`canteenMealPrices[${meal}]`, String(canteenFields.canteenMealPrices[meal])));
      canteenFields.canteenIncludedMeals.forEach((meal) => fd.append("canteenIncludedMeals[]", meal));
    }

    if (selfAadharFile.some((file) => !isAllowedImageFile(file))) {
      setDocMsg("Self Aadhaar Card must be JPG, JPEG, or PNG."); return;
    }
    if (parentAadharFile.some((file) => !isAllowedImageFile(file))) {
      setDocMsg(
        `${trackerType === "room" ? "Partner Aadhaar Card" : "Parent Aadhaar Card"} must be JPG, JPEG, or PNG.`
      ); return;
    }
    if (photoFile.some((file) => !isAllowedImageFile(file))) {
      setDocMsg("Tenant Photograph must be JPG, JPEG, or PNG."); return;
    }
    if (panCardFile.some((file) => !isAllowedImageFile(file))) {
      setDocMsg("PAN Card must be JPG, JPEG, or PNG."); return;
    }
    if (selfAadharFile.length + parentAadharFile.length + photoFile.length + panCardFile.length > 10) {
      setDocMsg("You can upload a maximum of 10 documents for one tenant."); return;
    }

    for (const file of selfAadharFile) {
      const f = await compressForUpload(file);
      fd.append("documents", f);
      fd.append("relations", "Self Aadhaar Card");
    }
    for (const file of parentAadharFile) {
      const f = await compressForUpload(file);
      fd.append("documents", f);
      fd.append("relations", trackerType === "room" ? "Partner Aadhaar Card" : "Parent Aadhaar Card");
    }
    for (const file of photoFile) {
      const f = await compressForUpload(file);
      fd.append("documents", f);
      fd.append("relations", "Tenant Photo");
    }
    for (const file of panCardFile) {
      const f = await compressForUpload(file);
      fd.append("documents", f);
      fd.append("relations", "PAN Card");
    }

    // ✅ safe URL build (won’t affect other code)
    const API_ROOT = String(apiUrl).replace(/\/+$/, "");
    const FORMS_WITH_DOCS_URL = API_ROOT.endsWith("/api")
      ? `${API_ROOT}/forms-with-docs`
      : `${API_ROOT}/api/forms-with-docs`;

    console.log("POST =>", FORMS_WITH_DOCS_URL);
    console.log("firstRentStatus (submit):", firstRentStatus);

    const res = await axios.post(FORMS_WITH_DOCS_URL, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const messageStatus = res?.data?.messageStatus || res?.data?._messageStatus;
    const messageNotice = messageStatus?.ok
      ? "Admission message sent successfully."
      : messageStatus?.reason
        ? `Admission message not sent: ${messageStatus.reason}`
        : "";

    alert(`Tenant saved successfully.${messageNotice ? `\n\n${messageNotice}` : ""}`);

    const savedTenant = res?.data?.form || res?.data;

    if (savedTenant && savedTenant._id) {
      setAllTenantsData((prev) => {
        const current = Array.isArray(prev) ? prev : [];
        const withoutSaved = current.filter((tenant) => tenant?._id !== savedTenant._id);
        return [savedTenant, ...withoutSaved];
      });

      setFormData((prev) => {
        const scopedRooms = Array.isArray(allRoomsData) ? allRoomsData : [];
        const current = Array.isArray(prev) ? prev : [];
        const withoutSaved = current.filter((tenant) => tenant?._id !== savedTenant._id);
        const scopedSaved = filterTenantsForTracker([savedTenant], scopedRooms);
        return scopedSaved.length > 0 ? [scopedSaved[0], ...withoutSaved] : withoutSaved;
      });
    }

    closeAddTenantModal();
    refreshTenants().catch((refreshError) => {
      console.error("Background tenant refresh failed after save:", refreshError);
    });
    return;
    
    console.log("Saved tenant:", res.data);
closeAddTenantModal(); // ✅ closes + clears form
    await refreshTenants();
    window.location.reload();

    setSelfAadharFile(null);
    setParentAadharFile(null);
    setPhotoFile(null);
    setDocMsg("");
    setShowAddModal(false);
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const msg =
      data?.message ||
      data?.error ||
      (typeof data === "string" ? data.slice(0, 200) : "") ||
      err?.message ||
      "Request failed";

    console.error("SAVE TENANT ERROR =>", { status, data, err });
    setDocMsg(`(${status || "NO_RESPONSE"}) ${msg}`);
  }
};




// ✅ ADD THIS FUNCTION
const closeAddTenantModal = () => {
  setShowAddModal(false);

  // ✅ clear Add Tenant form
  setNewTenant(EMPTY_TENANT);
  setFirstRentStatusSelection("ADVANCE_PAID");

  // ✅ clear files + message
  setSelfAadharFile([]);
  setParentAadharFile([]);
  setPhotoFile([]);
  setPanCardFile([]);
  setDocMsg("");

  // ✅ clear locking states (if you have these)
  setCreatingInvite(false);
  setSubmittingAdd(false);
};




  //  for file less than 10 kb

  // --- NEW: document upload state ---
  const [compressedDocs, setCompressedDocs] = React.useState([]); // Array<File>
  // const [docMsg, setDocMsg] = React.useState("");                 // inline message

  // Read a File into an <img>
  const loadImage = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

  // Canvas -> Blob (awaitable)
  const toBlob = (canvas, type, quality) =>
    new Promise((resolve) => canvas.toBlob(resolve, type, quality));

  // Compress an image to <= maxBytes (best effort)
  async function compressImageToTarget(file, maxBytes = 10 * 1024) {
    const img = await loadImage(file);
    let w = img.width;
    let h = img.height;
    let type = "image/jpeg";
    let quality = 0.82;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    for (let i = 0; i < 14; i++) {
      canvas.width = Math.max(128, Math.round(w));
      canvas.height = Math.max(128, Math.round(h));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      let blob = await toBlob(canvas, type, quality);
      if (blob && blob.size <= maxBytes) {
        return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
          type,
          lastModified: Date.now(),
        });
      }

      if (quality > 0.45) quality *= 0.8; // step quality down first
      else {
        w *= 0.85;
        h *= 0.85;
      } // then downscale

      if (i === 10) {
        type = "image/webp";
        quality = Math.min(quality, 0.5);
      }
    }

    // Final tiny attempt
    canvas.width = 128;
    canvas.height = 128;
    ctx.clearRect(0, 0, 128, 128);
    ctx.drawImage(img, 0, 0, 128, 128);
    const finalBlob = await toBlob(canvas, "image/webp", 0.35);
    if (finalBlob && finalBlob.size <= maxBytes) {
      return new File([finalBlob], file.name.replace(/\.\w+$/, ".webp"), {
        type: "image/webp",
        lastModified: Date.now(),
      });
    }
    return null; // couldn’t reach 10KB
  }

  // Compress large images before upload to speed up slow networks
  const DEFAULT_UPLOAD_MAX = 300 * 1024; // 300KB target
  const compressForUpload = async (file, maxBytes = DEFAULT_UPLOAD_MAX) => {
    if (!file || !file.type || !file.type.startsWith("image/")) return file;
    if (file.size && file.size <= maxBytes) return file;
    try {
      const compressed = await compressImageToTarget(file, maxBytes);
      return compressed || file;
    } catch {
      return file;
    }
  };

  
  // If you already post in handleAddTenant, you can move the FormData logic there instead.

  const PAGE = 3; // number of month sub-columns under Rent

  const timelineYear = useMemo(() => {
    const currentYear = new Date().getFullYear();
    if (selectedYear === "All Records") return currentYear;

    const parsedYear = Number(selectedYear);
    return Number.isFinite(parsedYear) ? parsedYear : currentYear;
  }, [selectedYear]);

  const buildMonthsTimeline = (year) => {
    const months = [];
    const cursor = new Date(Number(year) || new Date().getFullYear(), 0, 1);
    const end = new Date(Number(year) || new Date().getFullYear(), 11, 1);

    while (cursor <= end) {
      months.push({
        y: cursor.getFullYear(),
        m: cursor.getMonth(),
        label: cursor.toLocaleString("default", { month: "short", year: "numeric" }),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return months;
  };









  // const getRentForMonth = (rents = [], y, m) => {
  //   const hit = rents.find((r) => {
  //     if (!r?.date) return false;
  //     const d = new Date(r.date);
  //     return d.getFullYear() === y && d.getMonth() === m;
  //   });
  //   return hit ? Number(hit.rentAmount) || 0 : 0;
  // };

  // --- Memoize months + visible window so header & rows stay in sync ---
  const months = useMemo(() => buildMonthsTimeline(timelineYear), [timelineYear]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const maxStart = Math.max(0, months.length - PAGE);
  const defaultStart =
    timelineYear === currentYear
      ? Math.max(0, Math.min(maxStart, currentMonth - 1))
      : 0;
  const start = rentStart ?? defaultStart;
  const canLeft = start > 0;
  const canRight = start + PAGE < months.length;
  const visibleMonths = months.slice(start, start + PAGE);
  const summaryMonthKeys = useMemo(() => {
    const starts = new Set([start, ...Object.values(rowMonthStarts)]);
    const keys = new Set();
    starts.forEach((monthStart) => {
      months.slice(monthStart, monthStart + PAGE).forEach((month) => {
        keys.add(fmtMonthKey(month.y, month.m));
      });
    });
    return [...keys];
  }, [months, start, rowMonthStarts]);
  const summaryMonthKeyList = summaryMonthKeys.join(",");

  // The backend applies the organization's billing modes. Load only the
  // months visible in the table, including independently shifted tenant rows.
  useEffect(() => {
    if (!allTenantsData.length) return;
    if (rentSummaryCacheRevisionRef.current !== rentSummaryRevision) {
      rentSummaryCacheRef.current.clear();
      rentSummaryCacheRevisionRef.current = rentSummaryRevision;
    }

    let cancelled = false;
    const loadRentSummaries = async () => {
      const responses = await Promise.all(
        summaryMonthKeyList.split(",").filter(Boolean).map(async (key) => {
          let request = rentSummaryCacheRef.current.get(key);
          if (!request) {
            request = getRentSummary(key);
            rentSummaryCacheRef.current.set(key, request);
            request.catch(() => {
              if (rentSummaryCacheRef.current.get(key) === request) {
                rentSummaryCacheRef.current.delete(key);
              }
            });
          }
          try {
            return [key, await request];
          } catch (error) {
            console.error(`Failed to load rent summary for ${key}:`, error);
            return null;
          }
        })
      );

      if (cancelled) return;
      setRentSummaryByMonth((previous) => {
        const next = new Map(previous);
        responses.filter(Boolean).forEach(([key, summary]) => {
          next.set(key, new Map(
            (Array.isArray(summary?.rows) ? summary.rows : []).map((row) => [
              String(row?.tenantId || ""), row,
            ])
          ));
        });
        return next;
      });
    };

    loadRentSummaries();
    return () => { cancelled = true; };
  }, [summaryMonthKeyList, rentSummaryRevision, allTenantsData.length]);
  const getRowWindowStart = useCallback(
    (rowKey) => {
      if (!rowKey) return start;
      return rowMonthStarts[rowKey] ?? start;
    },
    [rowMonthStarts, start]
  );
  const getVisibleMonthsForRow = useCallback(
    (rowKey) => {
      const rowStart = getRowWindowStart(rowKey);
      return months.slice(rowStart, rowStart + PAGE);
    },
    [getRowWindowStart, months]
  );
  const canRowGoLeft = useCallback(
    (rowKey) => getRowWindowStart(rowKey) > 0,
    [getRowWindowStart]
  );
  const canRowGoRight = useCallback(
    (rowKey) => getRowWindowStart(rowKey) + PAGE < months.length,
    [getRowWindowStart, months.length]
  );

  useEffect(() => {
    setRentStart(null);
    setRowMonthStarts({});
  }, [timelineYear]);

  const goLeft = (e) => {
    e?.stopPropagation?.();
    setRentStart((s) => {
      const cur = s ?? defaultStart;
      return Math.max(0, cur - 1);
    });
  };
  const goRight = (e) => {
    e?.stopPropagation?.();
    setRentStart((s) => {
      const cur = s ?? defaultStart;
      return Math.min(maxStart, cur + 1);
    });
  };

  const goRowLeft = useCallback(
    (rowKey, e) => {
      e?.stopPropagation?.();
      setRowMonthStarts((prev) => {
        const cur = prev[rowKey] ?? start;
        return { ...prev, [rowKey]: Math.max(0, cur - 1) };
      });
    },
    [start]
  );
  const goRowRight = useCallback(
    (rowKey, e) => {
      e?.stopPropagation?.();
      setRowMonthStarts((prev) => {
        const cur = prev[rowKey] ?? start;
        return { ...prev, [rowKey]: Math.min(maxStart, cur + 1) };
      });
    },
    [maxStart, start]
  );

  const renderMonthWindowNav = (index, rowKey, rowMonths) => (
    <>
      {index === 0 && (
        <button
          type="button"
          className="month-inline-nav month-inline-nav-prev"
          disabled={!canRowGoLeft(rowKey)}
          onClick={(e) => goRowLeft(rowKey, e)}
          title="Previous months"
          aria-label="Previous months"
        >
          &lsaquo;
        </button>
      )}
      {index === rowMonths.length - 1 && (
        <button
          type="button"
          className="month-inline-nav month-inline-nav-next"
          disabled={!canRowGoRight(rowKey)}
          onClick={(e) => goRowRight(rowKey, e)}
          title="Newer months"
          aria-label="Newer months"
        >
          &rsaquo;
        </button>
      )}
    </>
  );

  const formatShort = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        })
      : "";

  // Decide month status + date to show (prefers record.paymentDate; falls back to record.date)

  // ✅ SINGLE SOURCE: status + date + extra

  // Pick an expected monthly rent from tenant or record-level fields
  const pickExpected = (tenant, rec) => {
    // record-level (if you store per-month expected)
    const recExpected =
      Number(rec?.expectedRent ?? 0) ||
      Number(rec?.monthRent ?? 0) ||
      Number(rec?.rentExpected ?? 0);

    // tenant-level (global monthly rent)
  const tenantExpected =
      Number(tenant?.baseRent ?? 0) ||
      Number(tenant?.rentAmount ?? 0) ||
      Number(tenant?.rent ?? 0) ||
      Number(tenant?.expectedRent ?? 0) ||
      Number(tenant?.defaultRent ?? 0);

    return recExpected || tenantExpected || 0;
  };

  // Parses "₹3,250" / "3,250" / " 3250 "
  const toNum = (v) => {
    if (v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/[,₹\s]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  // Get monthly rent from tenant or (fallback) roomsData




 const explicitRentFromTenant = (tenant) =>
  toNum(tenant?.baseRent) ||
  toNum(tenant?.rentAmount) ||
  toNum(tenant?.rent) ||
  toNum(tenant?.expectedRent) ||
  toNum(tenant?.defaultRent) ||
  toNum(tenant?.monthlyRent) ||
  toNum(tenant?.price) ||
  toNum(tenant?.bedPrice);

 const latestPaidRentAmount = (tenant) => {
  const paidRents = (tenant?.rents || [])
    .filter((r) => toNum(r?.rentAmount) > 0)
    .map((r) => ({
      amount: toNum(r.rentAmount),
      time: (() => {
        if (r?.date) {
          const d = new Date(r.date);
          if (!Number.isNaN(d.getTime())) return d.getTime();
        }
        const ym = getYMFromRecord(r);
        return ym ? new Date(ym.y, ym.m, 1).getTime() : 0;
      })(),
    }))
    .sort((a, b) => a.time - b.time);

  return paidRents.length ? paidRents[paidRents.length - 1].amount : 0;
 };

 const getShiftPreservedRent = (tenant) => {
  const hasShiftHistory = (tenant?.rentHistory || []).some(
    (entry) => entry?.source === "shift"
  );
  const hasShiftFlag = Boolean(
    tenant?.shiftEffectiveFrom || tenant?.shiftDate || tenant?.effectiveFrom
  );
  const canUsePaidRent =
    hasShiftHistory ||
    hasShiftFlag ||
    tenant?.firstRentStatus === "ADVANCE_PAID";

  const latestPaid = latestPaidRentAmount(tenant);
  const explicitRent = explicitRentFromTenant(tenant);
  if (
    canUsePaidRent &&
    latestPaid > 0 &&
    explicitRent > 0 &&
    latestPaid < explicitRent
  ) {
    return latestPaid;
  }

  return 0;
 };

 const getLatestShiftCutoffDate = (tenant) => {
  const direct = tenant?.shiftEffectiveFrom || tenant?.shiftDate || tenant?.effectiveFrom;
  if (direct) {
    const parsed = new Date(direct);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const history = Array.isArray(tenant?.rentHistory) ? tenant.rentHistory : [];
  const latestShift = history
    .map((entry) => normalizeRentSnapshot(entry))
    .filter((entry) => entry && entry.source === "shift")
    .sort((a, b) => b.effectiveFrom - a.effectiveFrom)[0];

  return latestShift?.effectiveFrom || null;
 };

 const expectFromTenant = (tenant, roomsData) => {
  const tenantRent = explicitRentFromTenant(tenant);
  // Quick-add rent belongs to the tenant, even when the assigned unit has a default price.
  if (tenant?.tenantRentOverride && tenantRent > 0) return tenantRent;

  // 1️⃣ Always prefer NEW updated bed/room price from roomsData
  if (roomsData && tenant?.roomNo && tenant?.bedNo) {
    const room = roomsData.find(
      (r) => String(r.roomNo) === String(tenant.roomNo)
    );

    const bed = room?.beds?.find(
      (b) => String(b.bedNo) === String(tenant.bedNo)
    );
    const updatedPrice =
      toNum(bed?.price) ||
      toNum(bed?.baseRent) ||
      toNum(bed?.monthlyRent);

    if (updatedPrice) return updatedPrice; // ⭐ THIS WILL NOW RETURN 4000
  }

 // 2️⃣ If room price is not found, fallback to tenant stored values
  return explicitRentFromTenant(tenant);
};

const firstDayOfNextMonth = (date = new Date()) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  return d;
};

const startOfDayTime = (date) => {
  const d = date ? new Date(date) : null;
  if (!d || Number.isNaN(d.getTime())) return 0;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const normalizeRentSnapshot = (entry = {}) => {
  const effectiveFrom =
    entry?.effectiveFrom ||
    entry?.from ||
    entry?.changedAt ||
    entry?.date ||
    null;
  const parsed = effectiveFrom ? new Date(effectiveFrom) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return null;

  const amount =
    toNum(entry?.baseRent) ||
    toNum(entry?.rentAmount) ||
    toNum(entry?.amount) ||
    toNum(entry?.price) ||
    toNum(entry?.monthlyRent);
  if (!amount) return null;

  return {
    effectiveFrom: parsed,
    amount,
    roomNo: entry?.roomNo != null ? String(entry.roomNo) : "",
    bedNo: entry?.bedNo != null ? String(entry.bedNo) : "",
    previousAmount: toNum(entry?.previousBaseRent) || toNum(entry?.previousRentAmount),
    source: entry?.source || "",
  };
};

const pruneConflictingFutureSnapshots = (snapshots = [], tenant = {}) => {
  const currentRoomNo = tenant?.roomNo != null ? String(tenant.roomNo) : "";
  const currentBedNo = tenant?.bedNo != null ? String(tenant.bedNo) : "";
  if (!currentRoomNo || !currentBedNo || !Array.isArray(snapshots) || !snapshots.length) {
    return snapshots;
  }

  let anchorIndex = -1;
  snapshots.forEach((snap, index) => {
    if (
      String(snap?.roomNo || "") === currentRoomNo &&
      String(snap?.bedNo || "") === currentBedNo
    ) {
      anchorIndex = index;
    }
  });

  if (anchorIndex === -1) return snapshots;

  return snapshots.filter((snap, index) => {
    if (index <= anchorIndex) return true;
    return (
      String(snap?.roomNo || "") === currentRoomNo &&
      String(snap?.bedNo || "") === currentBedNo
    );
  });
};

const getCycleStartForMonth = (tenant, y, m) => {
  if (!tenant?.joiningDate) return null;

  const joinDate = new Date(tenant.joiningDate);
  if (Number.isNaN(joinDate.getTime())) return null;

  let firstBillYM;
  if (tenant.firstRentMonth) {
    const pm = parseMonthKey(tenant.firstRentMonth);
    if (!pm) return null;
    firstBillYM = pm.y * 12 + pm.m;
  } else {
    const isAdvance = tenant.firstRentStatus === "ADVANCE_PAID";
    firstBillYM = joinDate.getFullYear() * 12 + joinDate.getMonth() + (isAdvance ? 0 : 1);
  }

  const cellYM = y * 12 + m;
  if (cellYM < firstBillYM) return null;

  const cycleIndex = cellYM - firstBillYM;
  const cycleStart = new Date(joinDate);
  cycleStart.setHours(0, 0, 0, 0);
  cycleStart.setMonth(cycleStart.getMonth() + cycleIndex);

  return cycleStart;
};

const buildRentSnapshots = (tenant, roomsData) => {
  const snapshots = [];
  const history = Array.isArray(tenant?.rentHistory) ? tenant.rentHistory : [];
 const paidRents = (tenant?.rents || [])
    .filter((r) => toNum(r?.rentAmount) > 0)
    .map((r) => ({
      amount: toNum(r.rentAmount),
      ym: getYMFromRecord(r),
      date: r?.date ? new Date(r.date) : null,
    }))
    .filter((r) => r.ym && r.date && !Number.isNaN(r.date.getTime()))
    .sort((a, b) => (a.ym.y * 12 + a.ym.m) - (b.ym.y * 12 + b.ym.m));

  history
    .map((entry) => normalizeRentSnapshot(entry))
    .filter(Boolean)
    .sort((a, b) => a.effectiveFrom - b.effectiveFrom)
    .forEach((snap) => snapshots.push(snap));

  const selectedShiftDate =
    tenant?.shiftEffectiveFrom || tenant?.shiftDate || tenant?.effectiveFrom;
  const parsedShiftDate = selectedShiftDate ? new Date(selectedShiftDate) : null;
  if (parsedShiftDate && !Number.isNaN(parsedShiftDate.getTime())) {
    parsedShiftDate.setHours(0, 0, 0, 0);
    const latestShiftIndex = snapshots
      .map((snap, index) => ({ snap, index }))
      .filter(({ snap }) => snap.source === "shift")
      .sort((a, b) => b.snap.effectiveFrom - a.snap.effectiveFrom)[0]?.index;

    if (latestShiftIndex !== undefined) {
      snapshots[latestShiftIndex] = {
        ...snapshots[latestShiftIndex],
        effectiveFrom: parsedShiftDate,
      };
    }
  }

  const joinDate = tenant?.joiningDate ? new Date(tenant.joiningDate) : null;
  if (
    snapshots.length &&
    joinDate &&
    !Number.isNaN(joinDate.getTime()) &&
    snapshots[0].effectiveFrom > joinDate
  ) {
    const paidBeforeFirstShift = paidRents
      .filter((rent) => rent.date < snapshots[0].effectiveFrom)
      .sort((a, b) => b.date - a.date)[0];
    const previousAmount =
      toNum(snapshots[0].previousAmount) || toNum(paidBeforeFirstShift?.amount);

    if (previousAmount > 0) {
    snapshots.unshift({
      effectiveFrom: joinDate,
      amount: previousAmount,
      roomNo: tenant?.roomNo != null ? String(tenant.roomNo) : "",
      bedNo: tenant?.bedNo != null ? String(tenant.bedNo) : "",
    });
    }
  }

  if (!snapshots.length) {
    const shiftStart =
      tenant?.shiftEffectiveFrom || tenant?.shiftDate || tenant?.effectiveFrom;
    const parsedShiftStart = shiftStart ? new Date(shiftStart) : null;
    const latestPaid = latestPaidRentAmount(tenant);
    const currentRent = expectFromTenant(tenant, roomsData);

    if (
      parsedShiftStart &&
      !Number.isNaN(parsedShiftStart.getTime()) &&
      joinDate &&
      !Number.isNaN(joinDate.getTime()) &&
      latestPaid > 0 &&
      currentRent > 0 &&
      latestPaid !== currentRent
    ) {
      snapshots.push({
        effectiveFrom: joinDate,
        amount: latestPaid,
        roomNo: tenant?.roomNo != null ? String(tenant.roomNo) : "",
        bedNo: tenant?.bedNo != null ? String(tenant.bedNo) : "",
        source: "reconstructed-before-shift",
      });
      snapshots.push({
        effectiveFrom: parsedShiftStart,
        amount: currentRent,
        roomNo: tenant?.roomNo != null ? String(tenant.roomNo) : "",
        bedNo: tenant?.bedNo != null ? String(tenant.bedNo) : "",
        source: "reconstructed-shift",
      });
    }
  }

  if (!snapshots.length) {
    const fallback = expectFromTenant(tenant, roomsData);
    if (fallback > 0) {
      const joinDate = tenant?.joiningDate ? new Date(tenant.joiningDate) : new Date();
      snapshots.push({
        effectiveFrom: Number.isNaN(joinDate.getTime()) ? new Date() : joinDate,
        amount: fallback,
        roomNo: tenant?.roomNo != null ? String(tenant.roomNo) : "",
        bedNo: tenant?.bedNo != null ? String(tenant.bedNo) : "",
      });
    }
  }

  const currentAmount = expectFromTenant(tenant, roomsData);
  const lastSnapshot = snapshots[snapshots.length - 1];
  if (currentAmount > 0 && (!lastSnapshot || toNum(lastSnapshot.amount) !== currentAmount)) {
    snapshots.push({
      effectiveFrom: new Date(),
      amount: currentAmount,
      roomNo: tenant?.roomNo != null ? String(tenant.roomNo) : "",
      bedNo: tenant?.bedNo != null ? String(tenant.bedNo) : "",
    });
  }

  const sorted = snapshots.sort((a, b) => a.effectiveFrom - b.effectiveFrom);
  return pruneConflictingFutureSnapshots(sorted, tenant);
};

const getExpectedRentForMonth = (tenant, y, m, roomsData) => {
  const monthRentRecord = (Array.isArray(tenant?.rents) ? tenant.rents : []).find((rent) => {
    const ym = getYMFromRecord(rent);
    return ym && ym.y === y && ym.m === m;
  });
  const savedMonthExpected =
    Number(
      monthRentRecord?.expectedRent ??
      monthRentRecord?.monthRent ??
      monthRentRecord?.rentExpected ??
      0
    ) || 0;

  if (savedMonthExpected > 0) {
    return savedMonthExpected;
  }

  const snapshots = buildRentSnapshots(tenant, roomsData);
  if (!snapshots.length) return expectFromTenant(tenant, roomsData);

  const cycleStart = getCycleStartForMonth(tenant, y, m);
  if (!cycleStart) return expectFromTenant(tenant, roomsData);

  const cycleEnd = new Date(cycleStart);
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);
  let expected = 0;
  const cycleStartTime = startOfDayTime(cycleStart);
  const cycleEndTime = startOfDayTime(cycleEnd);
  const hasSelectedShiftDate = Boolean(
    tenant?.shiftEffectiveFrom || tenant?.shiftDate || tenant?.effectiveFrom
  );

  for (const snap of snapshots) {
    const snapDate = new Date(snap.effectiveFrom);
    const isLegacyMonthStartShift =
      !hasSelectedShiftDate &&
      snap.source === "shift" &&
      !Number.isNaN(snapDate.getTime()) &&
      snapDate.getDate() === 1;
    const appliesToCycle = isLegacyMonthStartShift
      ? startOfDayTime(snap.effectiveFrom) <= cycleStartTime
      : startOfDayTime(snap.effectiveFrom) < cycleEndTime;

    if (appliesToCycle) {
      expected = toNum(snap.amount);
    } else {
      break;
    }
  }

  let resolved = expected || expectFromTenant(tenant, roomsData);
  const parsedShiftCutoff = getLatestShiftCutoffDate(tenant);
  const paidAmount = (tenant?.rents || []).reduce((sum, rent) => {
    const ym = getYMFromRecord(rent);
    if (!ym || ym.y !== y || ym.m !== m) return sum;
    return sum + Number(rent?.rentAmount || 0);
  }, 0);

  // Do not retroactively raise older paid cycles after a later bed shift.
  if (
    parsedShiftCutoff &&
    !Number.isNaN(parsedShiftCutoff.getTime()) &&
    cycleEnd <= parsedShiftCutoff &&
    paidAmount > 0 &&
    paidAmount < resolved
  ) {
    resolved = paidAmount;
  }

  return resolved;
};

const getHostelLightBillMonthDetails = (tenant, y, m) => {
  if (trackerType !== "bed") {
    return {
      extraAmount: 0,
      shareAmount: 0,
      occupiedBedsCount: 0,
      roomBillAmount: 0,
      matchingBills: [],
      status: "",
    };
  }

  const roomNo = normRoomNo(tenant?.roomNo);
  if (!roomNo) {
    return {
      extraAmount: 0,
      shareAmount: 0,
      occupiedBedsCount: 0,
      roomBillAmount: 0,
      matchingBills: [],
      status: "",
    };
  }

  const monthStart = new Date(y, m, 1);
  const monthEnd = new Date(y, m + 1, 1);
  const selectedMonthKey = fmtMonthKey(y, m);
  const sameRoom = (record, other) => {
    if (normRoomNo(record?.roomNo) !== normRoomNo(other?.roomNo)) return false;
    const recordRoomId = String(record?.roomId?._id || record?.roomId || "");
    const otherRoomId = String(other?.roomId?._id || other?.roomId || "");
    if (recordRoomId && otherRoomId) return recordRoomId === otherRoomId;
    for (const field of ["category", "wingName", "floorNo"]) {
      if (record?.[field] && other?.[field] && String(record[field]).trim().toLowerCase() !== String(other[field]).trim().toLowerCase()) return false;
    }
    return true;
  };

  const matchingRoomBills = (Array.isArray(lightBills) ? lightBills : []).filter((bill) => {
    const type = String(bill?.type || "").trim().toLowerCase();
    const propertyType = String(bill?.propertyType || "").trim().toLowerCase();
    if (type !== "meter" || propertyType !== "bed" || bill?.billPayer === "owner" || bill?.isUnitLinked === false) return false;

    if (bill?.billingMonth) {
      if (bill.billingMonth !== selectedMonthKey) return false;
    } else {
      const billDate = new Date(bill?.date);
      if (Number.isNaN(billDate.getTime())) return false;
      if (billDate.getFullYear() !== y || billDate.getMonth() !== m) return false;
    }

    return sameRoom(bill, tenant);
  });

  const roomBillAmount = matchingRoomBills.reduce(
    (sum, bill) => sum + toNum(bill?.amount),
    0
  );

  if (roomBillAmount <= 0) {
    return {
      extraAmount: 0,
      shareAmount: 0,
      occupiedBedsCount: 0,
      roomBillAmount: 0,
      matchingBills: [],
      status: "",
    };
  }

  const occupancySource =
    Array.isArray(allTenantsData) && allTenantsData.length ? allTenantsData : Array.isArray(formData) ? formData : [];

  const matchingTenants = occupancySource.filter((candidate) => {
    const candidateRoomNo = normRoomNo(candidate?.roomNo);
    const candidateBedNo = normBedNo(candidate?.bedNo || candidate?.bed?.bedNo);
    if (!candidateRoomNo || !candidateBedNo) return false;
    if (candidateRoomNo !== roomNo || !sameRoom(candidate, tenant)) return false;

    const joinDate = parseOccupancyDate(candidate?.joiningDate);
    if (!joinDate || Number.isNaN(joinDate.getTime()) || joinDate >= monthEnd) return false;

    const leaveDate = parseOccupancyDate(candidate?.leaveDate);
    if (leaveDate && !Number.isNaN(leaveDate.getTime()) && leaveDate <= monthStart) return false;

    return true;
  });

  const occupantsByBed = new Map();
  matchingTenants.forEach((candidate) => {
    const bedNo = normBedNo(candidate?.bedNo || candidate?.bed?.bedNo);
    const previous = occupantsByBed.get(bedNo);
    if (!previous || parseOccupancyDate(candidate?.joiningDate) > parseOccupancyDate(previous?.joiningDate)) {
      occupantsByBed.set(bedNo, candidate);
    }
  });
  const occupiedBedsCount = occupantsByBed.size;
  const tenantIsOccupant = [...occupantsByBed.values()].some((candidate) => String(candidate?._id) === String(tenant?._id));
  if (occupiedBedsCount <= 0 || !tenantIsOccupant) {
    return {
      extraAmount: 0,
      shareAmount: 0,
      occupiedBedsCount: 0,
      roomBillAmount,
      matchingBills: matchingRoomBills,
      status: "",
    };
  }

  const extraAmount = matchingRoomBills.reduce((sum, bill) => {
    const amount = Number(bill?.amount ?? bill?.salary ?? 0) || 0;
    const mode = String(bill?.billingMode || "");
    const consumed = Number(bill?.consumedUnits);
    const measured = Number.isFinite(consumed) ? consumed : Number(bill?.totalReading);
    const included = Number(bill?.includedUnits || 0);
    if (mode === "room_meter_actual_bill" && Number.isFinite(measured) && measured > 0) {
      return sum + amount * Math.max(measured - included, 0) / measured;
    }
    if (["room_meter_rate", "room_meter_split"].includes(mode) && Number.isFinite(measured) && Number(bill?.ratePerUnit) > 0) {
      return sum + Math.max(measured - included, 0) * Number(bill.ratePerUnit);
    }
    return sum + amount;
  }, 0);
  const normalizedStatuses = Array.from(
    new Set(
      matchingRoomBills
        .map((bill) => String(bill?.status || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
  const status =
    normalizedStatuses.length === 1
      ? normalizedStatuses[0]
      : normalizedStatuses.length > 1
      ? "mixed"
      : "";
  if (extraAmount <= 0) {
    return {
      extraAmount: 0,
      shareAmount: 0,
      occupiedBedsCount,
      roomBillAmount,
      matchingBills: matchingRoomBills,
      status,
    };
  }

  return {
    extraAmount,
    shareAmount: Number((extraAmount / occupiedBedsCount).toFixed(2)),
    occupiedBedsCount,
    roomBillAmount,
    matchingBills: matchingRoomBills,
    status,
  };
};

const getHostelLightBillExtraAmount = (tenant, y, m) => {
  const details = getHostelLightBillMonthDetails(tenant, y, m);
  return Number(details?.shareAmount || 0);
};








function getFirstBillYM(tenant) {
  if (tenant?.firstRentMonth) {
    const pm = parseMonthKey(tenant.firstRentMonth); // "Jan-26"
    if (pm) return pm.y * 12 + pm.m;
  }
  const jd = new Date(tenant.joiningDate);
  const isAdvance = tenant?.firstRentStatus === "ADVANCE_PAID";
  return jd.getFullYear() * 12 + jd.getMonth() + (isAdvance ? 0 : 1);
}

function getJoiningPaymentLabel(tenant) {
  if (!tenant) return "";
  return tenant.firstRentStatus === "ADVANCE_PAID"
    ? "Paid in advance at joining"
    : "Not paid in advance";
}

function getFirstCycleStart(tenant) {
  const joinDate = new Date(tenant.joiningDate);
  return joinDate;
}


// const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

const clampDate = (y, m, day) => {
  const d = Math.min(day, daysInMonth(y, m));
  return new Date(y, m, d);
};

const DAILY_DUE_PENALTY = 50;


  // Single source of truth for a month cell
const shiftRentMonth = (date, amount) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);

const cycleStartForRentMonth = (tenant, date) => {
  const joined = new Date(tenant?.joiningDate || tenant?.createdAt || date);
  const cycleDay = Number.isNaN(joined.getTime()) ? 1 : joined.getDate();
  const day = Math.min(cycleDay, daysInMonth(date.getFullYear(), date.getMonth()));
  return new Date(date.getFullYear(), date.getMonth(), day);
};

const isRentMonthBeforeJoining = (tenant, date) => {
  const joined = new Date(tenant?.joiningDate || tenant?.createdAt || date);
  if (Number.isNaN(joined.getTime())) return false;
  const monthEnd = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  return monthEnd < joined;
};

const latestRentPaymentDate = (rentEntry) => {
  const payments = Array.isArray(rentEntry?.payments) ? rentEntry.payments : [];
  const dates = [
    ...payments.map((payment) => payment?.date || payment?.createdAt),
    rentEntry?.date,
    rentEntry?.createdAt,
  ]
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (!dates.length) return null;
  return dates.sort((a, b) => b.getTime() - a.getTime())[0];
};

// Single source of truth for a month cell.
// When a backend summary is available this mirrors mobile's rentMonthStatus logic,
// including Light Bill/Canteen amounts selected by the System Admin settings.
const getMonthCell = (tenant, y, m) => {
  if (!tenant?.joiningDate && !tenant?.createdAt) return { label: "", amountText: "" };

  const monthDate = new Date(y, m, 1);
  const beforeJoining = isRentMonthBeforeJoining(tenant, monthDate);
  if (beforeJoining) {
    return {
      label: "",
      amountText: "",
      beforeRentStart: true,
      expected: 0,
      totalExpected: 0,
      amountPaid: 0,
      totalPaid: 0,
      outstanding: 0,
      totalBalance: 0,
    };
  }

  const monthKey = fmtMonthKey(y, m);
  const summary = rentSummaryByMonth.get(monthKey)?.get(String(tenant?._id || ""));
  const usesBackendRentSummary = Boolean(summary);

  const rentRec = (tenant.rents || []).find((r) => {
    const ym = getYMFromRecord(r);
    return ym && ym.y === y && ym.m === m;
  });

  // Backend values are authoritative. Legacy local values remain only as a
  // safe fallback while summaries load or if the endpoint is unavailable.
  const localExpected = getExpectedRentForMonth(tenant, y, m, roomsData);
  const localRentPaid = rentRec ? Number(rentRec.rentAmount || 0) : 0;
  const localDiscount = Math.max(0, Number(rentRec?.discountAmount || 0));
  const localCanteenEntry = getCanteenEntryForMonth(tenant, y, m);
  const localLightBillDetails = getHostelLightBillMonthDetails(tenant, y, m);

  const expected = Number(
    summary?.expected ?? Math.max(0, Number(localExpected ?? tenant?.baseRent ?? 0) - localDiscount)
  );
  const amountPaid = Number(summary?.paid ?? localRentPaid ?? 0);
  const canteenPaid = Number(summary?.canteenPaid ?? rentRec?.canteenAmount ?? 0);
  const lightBillPaid = Number(summary?.lightBillPaid ?? rentRec?.lightBillAmount ?? 0);
  const canteenAmount = Number(summary?.canteenExpected ?? localCanteenEntry?.amount ?? 0);
  const lightBillExtraAmount = Number(
    summary?.lightBillExpected ?? localLightBillDetails?.shareAmount ?? 0
  );
  const totalExpected = Number(
    summary?.totalExpected ?? expected + canteenAmount + lightBillExtraAmount
  );
  const totalPaid = Number(
    summary?.totalPaid ??
      amountPaid + canteenPaid + lightBillPaid
  );
  const totalBalance = Math.max(
    Number(summary?.totalBalance ?? totalExpected - totalPaid),
    0
  );
  const rentOutstanding = Math.max(Number(summary?.balance ?? expected - amountPaid), 0);

  // A column is named for the month in which that rent cycle is due.  For a
  // tenant who joined on 25 August, the September column is 25 Aug–25 Sep.
  // Using the calendar month's 25th here turned that column into 25 Sep–25
  // Oct, so an already overdue September rent was incorrectly shown as
  // Upcoming until October 25.
  const periodStart =
    getCycleStartForMonth(tenant, y, m) || cycleStartForRentMonth(tenant, monthDate);
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const paymentDate = latestRentPaymentDate(rentRec);
  const today = new Date();
  const cycleStarted = periodStart <= today;
  const cycleCompleted = periodEnd <= today;
  const isAdvanceCycle = String(tenant?.firstRentStatus || "").trim() === "ADVANCE_PAID";
  const futureMonth = new Date(y, m, 1) > new Date(today.getFullYear(), today.getMonth(), 1);

  let label;
  if (totalExpected <= 0 && totalPaid <= 0) {
    label = "Upcoming";
  } else if (totalPaid >= totalExpected && totalExpected > 0) {
    label = "Paid";
  } else if (totalPaid > 0) {
    label = "Pending";
  } else if (futureMonth || !cycleStarted) {
    label = "Upcoming";
  } else if (!isAdvanceCycle && !cycleCompleted) {
    label = "Upcoming";
  } else {
    label = "Due";
  }

  // Mobile shows payment date only for Paid; Due/Upcoming use cycle start.
  const dateSource = label === "Paid" && paymentDate ? paymentDate : periodStart;
  const dateStr = dateSource
    ? dateSource.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
    : "";

  // Keep legacy penalty metadata available elsewhere, but do not add it to the
  // Tenant-page Total because mobile/backend rent-summary does not include it.
  const dueBaseDate = isAdvanceCycle ? periodStart : periodEnd;
  const isPast = isAdvanceCycle ? today >= periodStart : today >= periodEnd;
  const firstPenaltyCutoff = new Date(
    dueBaseDate.getFullYear(),
    dueBaseDate.getMonth(),
    dueBaseDate.getDate() + 1,
    22,
    0,
    0,
    0
  );
  const dueDays =
    label === "Due" && today >= firstPenaltyCutoff
      ? Math.floor((today.getTime() - firstPenaltyCutoff.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 0;
  const duePenaltyAmount = dueDays > 0 ? dueDays * DAILY_DUE_PENALTY : 0;

  const lightBillMonthKey = getYearMonthKey(y, m);
  const lightBillStatusHistory = Array.isArray(tenant?.lightBillStatusHistory)
    ? tenant.lightBillStatusHistory
    : [];
  const matchingLightBillStatusEntry = lightBillStatusHistory.find(
    (entry) => String(entry?.month || "").trim() === lightBillMonthKey
  );
  const derivedLightBillStatus = String(localLightBillDetails?.status || "").trim().toLowerCase();
  const lightBillStatus = String(
    matchingLightBillStatusEntry?.status || derivedLightBillStatus
  )
    .trim()
    .toLowerCase();

  const penaltyMonthKey = getYearMonthKey(y, m);
  const penaltyHistory = Array.isArray(tenant?.penaltyHistory) ? tenant.penaltyHistory : [];
  const matchingPenaltyEntry = penaltyHistory.find(
    (entry) => String(entry?.month || "").trim() === penaltyMonthKey
  );
  const penaltyStatus =
    String(matchingPenaltyEntry?.status || "").trim().toLowerCase() === "paid"
      ? "paid"
      : "due";

  return {
    label,
    headerDate: `${pad2(periodEnd.getDate())} ${periodEnd.toLocaleString("en-US", {
      month: "short",
    })}`,
    rangeText: `${fmtDM(periodStart)} - ${fmtDM(periodEnd)}`,
    amountText: `₹${expected.toLocaleString("en-IN")}`,
    dateStr,
    amountPaid,
    canteenPaid,
    lightBillPaid,
    totalPaid,
    expected,
    totalExpected,
    outstanding: totalBalance,
    rentOutstanding,
    discountAmount: Number(summary?.discount ?? localDiscount),
    totalBalance,
    canteenAmount,
    canteenMealCount: Number(
      summary?.canteenPresentDays ?? localCanteenEntry?.mealCount ?? 0
    ),
    canteenStatus: String(localCanteenEntry?.status || "").trim().toLowerCase(),
    canteenEntry: localCanteenEntry,
    canteenBreakdown: Array.isArray(summary?.canteenBreakdown) ? summary.canteenBreakdown : [],
    lightBillExtraAmount,
    lightBillMonthKey,
    lightBillStatus,
    lightBillMode: String(summary?.lightBillMode || ""),
    lightBillModeLabel: String(summary?.lightBillModeLabel || ""),
    lightBillBreakdown: Array.isArray(summary?.lightBillBreakdown) ? summary.lightBillBreakdown : [],
    lightBillBills: Array.isArray(localLightBillDetails?.matchingBills)
      ? localLightBillDetails.matchingBills
      : [],
    duePenaltyAmount,
    duePenaltyDays: dueDays,
    penaltyMonthKey,
    penaltyStatus,
    isPast,
    isAdvancePaymentMonth:
      isAdvanceCycle && y === periodStart.getFullYear() && m === periodStart.getMonth(),
    usesBackendRentSummary,
    rentSummary: summary || null,
  };
};

const getMonthCellRentAmount = (cell) => Number(cell?.expected || 0);

const getMonthCellTotalAmount = (cell) =>
  Number(
    cell?.totalExpected ??
      getMonthCellRentAmount(cell) +
        Number(cell?.canteenAmount || 0) +
        Number(cell?.lightBillExtraAmount || 0)
  );

const getSuggestedEditRentAmount = (
  tenant,
  y,
  m,
  canteenValue = tenant?.canteen,
  discountValue = 0
) => {
  if (!tenant || y == null || m == null) return "";
  const normalizedCanteen = normalizeCanteenValue(canteenValue);
  const cell = getMonthCell(tenant, y, m);
  if (cell?.usesBackendRentSummary) {
    const grossExpected = Number(cell.expected || 0) + Number(cell.discountAmount || 0);
    const adjustedExpected = Math.max(grossExpected - Math.max(0, Number(discountValue || 0)), 0);
    const balance = Math.max(adjustedExpected - Number(cell.amountPaid || 0), 0);
    return balance > 0 ? String(balance) : "";
  }
  const paidAmount = Number(cell?.amountPaid || 0);
  const rentRec = (Array.isArray(tenant?.rents) ? tenant.rents : []).find((r) => {
    const ym = getYMFromRecord(r);
    return ym && ym.y === y && ym.m === m;
  });
  const savedExpected =
    Number(rentRec?.expectedRent ?? rentRec?.monthRent ?? rentRec?.rentExpected ?? 0) || 0;
  const savedCanteenApplied = normalizeCanteenValue(rentRec?.canteenApplied);
  const savedDiscountAmount = Number(rentRec?.discountAmount || 0) || 0;
  const isBedTenant = String(tenant?.bedNo ?? "").trim() !== "";
  const normalizedDiscount = Math.max(0, Number(discountValue || 0) || 0);

  let baseExpected = savedExpected || Number(cell?.expected || 0);
  if (savedExpected > 0 && savedCanteenApplied === "yes" && isBedTenant) {
    baseExpected += CANTEEN_RENT_DISCOUNT;
  }
  if (savedExpected > 0 && savedDiscountAmount > 0) {
    baseExpected += savedDiscountAmount;
  }

  let nextExpected =
    isBedTenant && normalizedCanteen === "yes"
      ? Math.max(0, baseExpected - CANTEEN_RENT_DISCOUNT)
      : baseExpected;
  nextExpected = Math.max(0, nextExpected - normalizedDiscount);

  const amount = Math.max(0, nextExpected - paidAmount);
  return amount > 0 ? String(amount) : "";
};

const getSavedRentCanteenValue = (tenant, y, m) => {
  if (!tenant || y == null || m == null) return normalizeCanteenValue(tenant?.canteen);
  const rentRec = (Array.isArray(tenant?.rents) ? tenant.rents : []).find((r) => {
    const ym = getYMFromRecord(r);
    return ym && ym.y === y && ym.m === m;
  });
  return normalizeCanteenValue(rentRec?.canteenApplied || tenant?.canteen);
};

const getSavedRentDiscountValue = (tenant, y, m) => {
  if (!tenant || y == null || m == null) return "";
  const rentRec = (Array.isArray(tenant?.rents) ? tenant.rents : []).find((r) => {
    const ym = getYMFromRecord(r);
    return ym && ym.y === y && ym.m === m;
  });
  const savedDiscount = Number(rentRec?.discountAmount || 0) || 0;
  return savedDiscount > 0 ? String(savedDiscount) : "";
};

const hasCanteenAccess = (tenant) => {
  if (normalizeCanteenValue(tenant?.canteen) === "yes") return true;
  return (Array.isArray(tenant?.rents) ? tenant.rents : []).some(
    (rent) => normalizeCanteenValue(rent?.canteenApplied) === "yes"
  );
};

const getMonthCellBreakdownItems = (cell, tenant = null, month = null) => {
  if (!cell) return [];

  const items = [
    {
      key: "rent",
      type: "rent",
      label: "Rent",
      amount: getMonthCellRentAmount(cell),
      status: String(cell?.label || "").trim() || "Due",
    },
  ];

  if (Number(cell?.canteenAmount || 0) > 0) {
    items.push({
      key: "canteen",
      type: "canteen",
      label: "Canteen",
      amount: Number(cell.canteenAmount || 0),
      status: String(cell?.canteenStatus || "due").trim() || "Due",
      editable: true,
      meta: {
        tenantId: tenant?._id || "",
        month: String(cell?.canteenEntry?.month || "").trim(),
        mealCount: Number(cell?.canteenEntry?.mealCount || 0),
      },
    });
  }

  if (Number(cell?.lightBillExtraAmount || 0) > 0) {
    items.push({
      key: "light-bill",
      type: "light-bill",
      label: "Light Bill",
      amount: Number(cell.lightBillExtraAmount || 0),
      status:
        String(cell?.lightBillStatus || "").trim().toLowerCase() === "mixed"
          ? "Mixed"
          : String(cell?.lightBillStatus || "due").trim() || "Due",
      editable: Array.isArray(cell?.lightBillBills) && cell.lightBillBills.length > 0,
      meta: {
        tenantId: tenant?._id || "",
        month:
          String(cell?.lightBillMonthKey || "").trim() ||
          (month ? getYearMonthKey(month.y, month.m) : ""),
        bills: Array.isArray(cell?.lightBillBills) ? cell.lightBillBills : [],
      },
    });
  }

  if (!cell?.usesBackendRentSummary && Number(cell?.duePenaltyAmount || 0) > 0) {
    items.push({
      key: "penalty",
      type: "penalty",
      label: "Penalty",
      amount: Number(cell.duePenaltyAmount || 0),
      status: String(cell?.penaltyStatus || "due").trim() || "Due",
      editable: true,
      meta: {
        tenantId: tenant?._id || "",
        month:
          String(cell?.penaltyMonthKey || "").trim() ||
          (month ? getYearMonthKey(month.y, month.m) : ""),
        amount: Number(cell?.duePenaltyAmount || 0),
        dueDays: Number(cell?.duePenaltyDays || 0),
      },
    });
  }

  return items;
};


const getTenantDueTotal = (tenant, monthsArr) => {
  return (monthsArr || []).reduce((sum, m) => {
    const c = getMonthCell(tenant, m.y, m.m);

    // ignore months before rent start (joining month etc.)
    if (!c || c.beforeRentStart) return sum;

    // ✅ ONLY past months can be "Due"
    const isRealDue =
      c.isPast && (c.label === "Due" || c.label === "Pending");

    return sum + (isRealDue ? Number(c.outstanding || 0) : 0);
  }, 0);
};


// Rent status for sorting (uses CURRENT month)
const getRentStatusLabelForSort = (tenant) => {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const cell = getMonthCell(tenant, y, m);   // Paid / Pend / Due
  return cell?.label || "";                  // string like "Paid", "Pend", "Due"
};

const openMonthBreakdownModal = (tenant, month, cellOverride = null) => {
  // Rent totals/statuses open the complete Add Rent editor directly, matching mobile.
  if (tenant && month) {
    openEditForTenantMonth(tenant._id, month.m, month.y);
    return;
  }
  const monthCell = cellOverride || getMonthCell(tenant, month.y, month.m);
  if (!monthCell) return;

  setSelectedMonthBreakdown({
    tenantId: tenant?._id || "",
    unitId: tenant?.roomId?._id || tenant?.roomId || "",
    propertyType: normalizeRoomPropertyType(tenant),
    billingMonth: monthCell?.lightBillMonthKey || (month ? getYearMonthKey(month.y, month.m) : ""),
    monthYear: month?.y || null,
    monthIndex: month?.m ?? null,
    tenantName: tenant?.name || "Tenant",
    roomLabel: formatTrackerUnit(tenant?.roomNo, tenant?.bedNo || tenant?.bed?.bedNo),
    monthLabel: month?.label || "",
    rangeText: monthCell?.rangeText || "",
    label: monthCell?.label || "",
    totalAmount: getMonthCellTotalAmount(monthCell),
    items: getMonthCellBreakdownItems(monthCell, tenant, month),
  });
  setShowMonthBreakdownModal(true);
};

const updateBreakdownItemStatus = async (item, nextStatus) => {
  const normalizedStatus = String(nextStatus || "").trim().toLowerCase() === "paid" ? "paid" : "due";
  if (!item?.editable) return;

  try {
    setUpdatingBreakdownStatusKey(String(item.key || item.label || ""));

    if (item.type === "canteen") {
      const tenantId = String(item?.meta?.tenantId || "").trim();
      const month = String(item?.meta?.month || "").trim();
      const mealCount = Number(item?.meta?.mealCount || 0);
      if (!tenantId || !month) {
        throw new Error("Canteen entry details not found.");
      }

      try {
        await axios.post(`${apiUrl}forms/${tenantId}/canteen`, {
          month,
          mealCount,
          status: normalizedStatus,
        });
      } catch (routeError) {
        if (routeError?.response?.status !== 404) {
          throw routeError;
        }

        const tenantRecord = (Array.isArray(allTenantsData) ? allTenantsData : []).find(
          (entry) => String(entry?._id) === tenantId
        );
        const existingHistory = Array.isArray(tenantRecord?.canteenHistory)
          ? [...tenantRecord.canteenHistory]
          : [];
        const existingIndex = existingHistory.findIndex(
          (entry) => String(entry?.month || "").trim() === month
        );

        if (existingIndex >= 0) {
          existingHistory[existingIndex] = {
            ...existingHistory[existingIndex],
            status: normalizedStatus,
          };
        } else {
          existingHistory.push({
            month,
            mealCount,
            rate: CANTEEN_MEAL_RATE,
            amount: mealCount * CANTEEN_MEAL_RATE,
            status: normalizedStatus,
          });
        }

        try {
          await axios.put(`${apiUrl}forms/${tenantId}`, {
            canteen: "yes",
            canteenHistory: existingHistory,
          });
        } catch (_formsUpdateError) {
          await axios.put(`${apiUrl}update/${tenantId}`, {
            canteen: "yes",
            canteenHistory: existingHistory,
          });
        }
      }
    } else if (item.type === "light-bill") {
      const tenantId = String(item?.meta?.tenantId || "").trim();
      const month = String(item?.meta?.month || "").trim();
      if (!tenantId || !month) {
        throw new Error("Light bill tracker details not found.");
      }

      const tenantRecord = (Array.isArray(allTenantsData) ? allTenantsData : []).find(
        (entry) => String(entry?._id) === tenantId
      );
      const existingHistory = Array.isArray(tenantRecord?.lightBillStatusHistory)
        ? [...tenantRecord.lightBillStatusHistory]
        : [];
      const existingIndex = existingHistory.findIndex(
        (entry) => String(entry?.month || "").trim() === month
      );

      if (existingIndex >= 0) {
        existingHistory[existingIndex] = {
          ...existingHistory[existingIndex],
          status: normalizedStatus,
        };
      } else {
        existingHistory.push({
          month,
          status: normalizedStatus,
        });
      }

      try {
        await axios.put(`${apiUrl}forms/${tenantId}`, {
          lightBillStatusHistory: existingHistory,
        });
      } catch (_formsUpdateError) {
        await axios.put(`${apiUrl}update/${tenantId}`, {
          lightBillStatusHistory: existingHistory,
        });
      }
    } else if (item.type === "penalty") {
      const tenantId = String(item?.meta?.tenantId || "").trim();
      const month = String(item?.meta?.month || "").trim();
      const amount = Number(item?.meta?.amount || item?.amount || 0);
      const dueDays = Number(item?.meta?.dueDays || 0);
      if (!tenantId || !month) {
        throw new Error("Penalty details not found.");
      }

      const tenantRecord = (Array.isArray(allTenantsData) ? allTenantsData : []).find(
        (entry) => String(entry?._id) === tenantId
      );
      const existingHistory = Array.isArray(tenantRecord?.penaltyHistory)
        ? [...tenantRecord.penaltyHistory]
        : [];
      const existingIndex = existingHistory.findIndex(
        (entry) => String(entry?.month || "").trim() === month
      );

      if (existingIndex >= 0) {
        existingHistory[existingIndex] = {
          ...existingHistory[existingIndex],
          amount,
          dueDays,
          status: normalizedStatus,
        };
      } else {
        existingHistory.push({
          month,
          amount,
          dueDays,
          status: normalizedStatus,
        });
      }

      try {
        await axios.put(`${apiUrl}forms/${tenantId}`, {
          penaltyHistory: existingHistory,
        });
      } catch (_formsUpdateError) {
        await axios.put(`${apiUrl}update/${tenantId}`, {
          penaltyHistory: existingHistory,
        });
      }
    } else {
      return;
    }

    setSelectedMonthBreakdown((prev) =>
      !prev
        ? prev
        : {
            ...prev,
            items: (prev.items || []).map((entry) =>
              entry.key === item.key ? { ...entry, status: normalizedStatus } : entry
            ),
          }
    );

    await Promise.all([refreshAllData(), refreshLightBills(), refreshTenants()]);
  } catch (error) {
    console.error("Failed to update breakdown item status:", error);
    alert(error?.message || "Failed to update status.");
  } finally {
    setUpdatingBreakdownStatusKey("");
  }
};

  useEffect(() => {
    lastFocusRefreshAtRef.current = Date.now();
    refreshAllData();
  }, [refreshAllData]);

  useEffect(() => {
    const leaveMap = {};
    allTenantsData.forEach((item) => {
      if (item.leaveDate) {
        leaveMap[item._id] = new Date(item.leaveDate)
          .toISOString()
          .split("T")[0];
      }
    });
    setLeaveDates(leaveMap);
  }, [allTenantsData]);
  // useEffect(() => {
  //   axios
  //     .get(`${apiUrl}forms/archived`)
  //     .then((response) => setDeletedData(response.data))
  //     .catch((err) => console.error("Error fetching archived tenants:", err));
  // }, []);
  // useEffect(() => {
  //   axios
  //     .get("    http://localhost:8000/api/rooms")
  //     .then((response) => setRoomsData(response.data))
  //     .catch((err) => console.error("Failed to fetch rooms:", err));
  // }, []);

  const renderTenantPhoto = (tenant) => {
    const photoUrl = getTenantPhotoUrl(tenant);
    if (!photoUrl) {
      return (
        <div
          className="tenant-photo-placeholder"
          style={{
            width: 75,
            height: 70,
            borderRadius: 6,
            background: "#eee",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            color: "#777",
            border: "1px solid #ccc",
            flexShrink: 0,
          }}
        >
          N/A
        </div>
      );
    }

    const photoDoc = getTenantPhotoDoc(tenant);
    const t = normalizePhotoTransform(photoDoc);
    const rotate = clampRotate(t.rotate || 0);
    const scaleX = t.flipX ? -1 : 1;
    const scaleY = t.flipY ? -1 : 1;

    return (
      <div className="tenant-photo-wrap">
        <div className="tenant-photo-frame">
          <img
            src={photoUrl}
            alt="Tenant"
            crossOrigin="anonymous"
            className="tenant-photo-img"
            style={{
              transform: `rotate(${rotate}deg) scale(${scaleX}, ${scaleY})`,
            }}
          />
          <button
            type="button"
            className="photo-edit-btn"
            title="Edit photo"
            onClick={(e) => {
              e.stopPropagation();
              setPhotoEditTenant(tenant);
            }}
          >
            <FaEdit style={{color:"#aa0e03cc"}}/>
          </button>
        </div>

      </div>
    );
  };

  const handleAddTenant = async () => {
    try {
      const unitValidation = validateAssignableTenantUnit(newTenant);
      if (!unitValidation.ok) {
        alert(unitValidation.message);
        return;
      }

      const selectedRoom = roomsData.find(
        (r) => String(r.roomNo) === String(newTenant.roomNo)
      );
      const selectedBed = selectedRoom?.beds?.find(
        (b) => String(b.bedNo) === String(newTenant.bedNo)
      );
      const baseRent = selectedBed?.price || 0;

      const joinDate = new Date(newTenant.joiningDate);
      const firstRentStatus =
        firstRentStatusSelection || newTenant.firstRentStatus || "ADVANCE_PAID";
      const firstRentMonth =
        firstRentStatus === "ADVANCE_PAID"
          ? fmtMonthKey(joinDate.getFullYear(), joinDate.getMonth())
          : fmtMonthKey(joinDate.getFullYear(), joinDate.getMonth() + 1);

      console.log("firstRentStatus (legacy submit):", firstRentStatus);
      const tenantToSave = sanitizeTenantPayload({
        ...newTenant,
        baseRent,
        firstRentStatus,
        firstRentMonth,
        firstRentPaidDate:
          firstRentStatus === "ADVANCE_PAID"
            ? newTenant.firstRentPaidDate || getTodayISODate()
            : "",
      });

      const res = await axios.post(`${apiUrl}forms`, tenantToSave);
      const savedTenant = res?.data || null;
      const messageStatus = res?.data?._messageStatus || res?.data?.messageStatus;
      const messageNotice = messageStatus?.ok
        ? "Admission message sent successfully."
        : messageStatus?.reason
          ? `Admission message not sent: ${messageStatus.reason}`
          : "";

      if (savedTenant?._id) {
        setAllTenantsData((prev) => {
          const next = Array.isArray(prev) ? [savedTenant, ...prev] : [savedTenant];
          return next;
        });
        setFormData((prev) => {
          const scopedRooms = Array.isArray(allRoomsData) ? allRoomsData : [];
          const next = Array.isArray(allTenantsData)
            ? [savedTenant, ...allTenantsData]
            : [savedTenant];
          return filterTenantsForTracker(next, scopedRooms);
        });
      }

      alert(`Tenant added successfully${messageNotice ? `\n\n${messageNotice}` : ""}`);
      setShowAddModal(false);

      setNewTenant({
        srNo: "",
        name: "",
        joiningDate: "",
        roomNo: "",
        depositAmount: "",
        address: "",
        pincode: "",
        city: "",
        state: "",
        houseNo: "",
        nearbyPlace: "",
        phoneNo: "",
        familyMembers: "",
        relativeAddress1: "",
        relativeAddress2: "",
        floorNo: "",
        bedNo: "",
        shopName: "",
        companyAddress: "",
        shopBusiness: "",
        dateOfJoiningCollege: "",
        dob: "",
        baseRent: "",
        rentAmount: "",
        canteen: "no",
        canteenPlanType: "",
        canteenMonthlyAmount: "",
        canteenMealPrices: { breakfast: "", lunch: "", dinner: "" },
        firstRentStatus: "ADVANCE_PAID",
        firstRentPaidDate: "",
        firstRentMonth: "",
      });
      setFirstRentStatusSelection("ADVANCE_PAID");

      // const response = await axios.get(`${apiUrl}`);
      // setFormData(response.data);
      refreshTenants().catch((error) => {
        console.error("Background tenant refresh failed after add:", error);
      });
    } catch (err) {
      logAxiosError(err, "handleAddTenant");
      const msg = err?.response?.data?.message || err.message;
      if (/E11000/i.test(msg)) {
        alert(
          "Sr No already exists. Close and reopen Add Tenant to get a fresh Sr No."
        );
      } else {
        alert("Failed to add tenant: " + msg);
      }
    }
  };


const occupiedBedsSet = new Set(
  formData
    .filter((t) => !(t.leaveDate && hasLeaveDatePassed(t.leaveDate)))
    .map((t) => `${String(t.roomNo).trim()}-${String(t.bedNo).trim()}`)
);

// Always use month-aware lookup (prefers r.month like "Sep-25", else r.date)
const getRentForMonth = (rents = [], y, m) => {
  const rec = (Array.isArray(rents) ? rents : []).find((r) => {
    const ym = getYMFromRecord(r);
    return ym && ym.y === y && ym.m === m;
  });
  return rec ? Number(rec.rentAmount) || 0 : 0;
};

// Current-year pending months since JOIN+1, month-aware
const getPendingMonthsForStatus = (rents = [], joiningDateStr) => {
  if (!joiningDateStr) return [];
  const today = new Date();
  const currentYear = today.getFullYear();

  const join = new Date(joiningDateStr);
  const rentStart = new Date(join.getFullYear(), join.getMonth() + 1, 1);
  const jan1 = new Date(currentYear, 0, 1);
  const start = rentStart > jan1 ? rentStart : jan1;

  // Set of "m-y" paid months
  // const paid = new Set(
  //   (Array.isArray(rents) ? rents : [])
  //     .filter((r) => Number(r?.rentAmount) > 0)
  //     .map(getYMFromRecord)
  //     .filter(Boolean)
  //     .map(({ m, y }) => `${m}-${y}`)
  // );

  const out = [];
  const cur = new Date(start);
  while (cur <= today && cur.getFullYear() === currentYear) {
    const key = `${cur.getMonth()}-${cur.getFullYear()}`;
    if (!paid.has(key)) {
      out.push(cur.toLocaleString("default", { month: "long", year: "numeric" }));
    }
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
};

  // const getPendingMonthsForStatus = (rents = [], joiningDateStr) => {
  //   if (!joiningDateStr) return [];

  //   const now = new Date();
  //   const currentYear = now.getFullYear();

  //   // Map paid months
  //   const paidMonths = new Set(
  //     rents
  //       .filter((r) => r.date && Number(r.rentAmount) > 0)
  //       .map((r) => {
  //         const d = new Date(r.date);
  //         return `${d.getMonth()}-${d.getFullYear()}`;
  //       })
  //   );

  //   const months = [];
  //   const startMonth = new Date(currentYear, 0); // Jan of current year

  //   const joinDate = new Date(joiningDateStr);
  //   const startDate = joinDate > startMonth ? joinDate : startMonth;
  //   const tempDate = new Date(startDate);

  //   while (tempDate <= now) {
  //     const key = `${tempDate.getMonth()}-${tempDate.getFullYear()}`;
  //     if (!paidMonths.has(key)) {
  //       months.push(
  //         tempDate.toLocaleString("default", { month: "long", year: "numeric" })
  //       );
  //     }
  //     tempDate.setMonth(tempDate.getMonth() + 1);
  //   }

  //   return months;
  // };

  // All room-bed slots from roomsData


const filteredDeletedData = useMemo(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeTenants = (allTenantsData || []).map((tenant) => ({
    ...tenant,
    leaveDate: tenant.leaveDate || leaveDates[tenant._id] || "",
  }));
  const archivedTenantKeys = new Set(
    (deletedData || []).map((tenant) => String(tenant.originalFormId || tenant._id))
  );
  const tenantSource = [
    ...activeTenants.filter((tenant) => !archivedTenantKeys.has(String(tenant.originalFormId || tenant._id))),
    ...(deletedData || []),
  ];

  return tenantSource
    .filter((tenant) => normalizeTenantPropertyType(tenant) === trackerType)
    .map((tenant) => ({
      ...tenant,
      leaveDate: tenant.leaveDate || leaveDates[tenant._id] || "",
    }))
    .filter((tenant) => {
    if (!tenant.leaveDate) return false;

    const d = parseOccupancyDate(tenant.leaveDate);
    if (!d || Number.isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);

    return (
      d <= today &&
      tenantMatchesSearchText(tenant) &&
      tenantMatchesSelectedYear(tenant)
    ); // already left
  });
}, [allTenantsData, leaveDates, trackerType, searchText, selectedYear]);

const totalLeavedRows = filteredDeletedData.length;
const totalLeavedPages = Math.max(1, Math.ceil(totalLeavedRows / leavedRowsPerPage));
const paginatedLeavedRows = useMemo(() => {
  const startIndex = (currentLeavedPage - 1) * leavedRowsPerPage;
  return filteredDeletedData.slice(startIndex, startIndex + leavedRowsPerPage);
}, [filteredDeletedData, currentLeavedPage, leavedRowsPerPage]);

useEffect(() => {
  setCurrentLeavedPage(1);
}, [searchText, selectedYear, trackerType, showLeavedHistoryView]);

useEffect(() => {
  if (currentLeavedPage > totalLeavedPages) {
    setCurrentLeavedPage(totalLeavedPages);
  }
}, [currentLeavedPage, totalLeavedPages]);



const futureOnLeaveTenants = useMemo(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (formData || []).filter((t) => {
    if (!t.isOnLeave || !t.leaveDate) return false;

    const leaveDate = new Date(t.leaveDate);
    leaveDate.setHours(0, 0, 0, 0);

    return leaveDate > today; // 🔥 FUTURE leave only
  });
}, [formData]);



  const slots = useMemo(() => {
    const uniqueSlots = new Map();
    (roomsData || []).flatMap((room) =>
      (room.beds || []).map((bed) => ({
        roomId: room._id,
        roomNo: String(room.roomNo),
        isPlaceholder: Boolean(room.isPlaceholder),
        wingName: String(room.wingName || "").trim(),
        floorNo: room.floorNo,
        bedNo: String(bed.bedNo),
        price: toNum(bed.price),
        flatType: String(room.flatType || "").trim(),
        propertyType: normalizeRoomPropertyType(room),
        category:
          trackerType === "bed"
            ? bed.category || getTrackerPropertyLabel(room) || ""
            : getTrackerPropertyLabel(room) || "",
        propertyLabel: getTrackerPropertyLabel(room) || "",
      }))
    ).forEach((slot) => {
      const key = physicalBedKey(slot);
      const previous = uniqueSlots.get(key);
      if (!previous || (previous.isPlaceholder && !slot.isPlaceholder)) uniqueSlots.set(key, slot);
    });
    return [...uniqueSlots.values()];
  }, [roomsData, trackerType]);
const getBillingMonthsUpToNow = (tenant) => {
  if (!tenant?.joiningDate) return [];

  const firstBillYM = getFirstBillYM(tenant);
  const now = new Date();
  const lastYM = now.getFullYear() * 12 + now.getMonth();

  const months = [];
  for (let ym = firstBillYM; ym <= lastYM; ym++) {
    const y = Math.floor(ym / 12);
    const m = ym % 12;
    months.push({ y, m });
  }
  return months;
};

const getBillingMonthsUpToDate = (tenant, cutoffDate) => {
  if (!tenant?.joiningDate) return [];

  const firstBillYM = getFirstBillYM(tenant);
  const cutoff = cutoffDate ? new Date(cutoffDate) : new Date();
  if (Number.isNaN(cutoff.getTime())) return [];

  const lastYM = cutoff.getFullYear() * 12 + cutoff.getMonth();
  const months = [];

  for (let ym = firstBillYM; ym <= lastYM; ym++) {
    const y = Math.floor(ym / 12);
    const m = ym % 12;
    months.push({ y, m });
  }

  return months;
};

const getLeaveSettlementMonths = (tenant, cutoffDate) => {
  const cutoff = cutoffDate ? new Date(cutoffDate) : null;
  if (!tenant?.joiningDate || !cutoff || Number.isNaN(cutoff.getTime())) return [];

  const joinDate = new Date(tenant.joiningDate);
  if (Number.isNaN(joinDate.getTime())) return [];

  const months = getBillingMonthsUpToDate(tenant, cutoffDate);
  const firstBillYM = getFirstBillYM(tenant);
  return months
    .map(({ y, m }) => {
      const cycleIndex = y * 12 + m - firstBillYM;
      const periodStart = new Date(joinDate);
      periodStart.setMonth(periodStart.getMonth() + cycleIndex);
      periodStart.setHours(0, 0, 0, 0);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setHours(0, 0, 0, 0);

      const cell = getMonthCell(tenant, y, m);
      const outstanding = Number(cell?.outstanding || 0);
      const isSettledByLeaveDate = periodEnd <= cutoff;

      if (!isSettledByLeaveDate || outstanding <= 0) return null;

      return {
        key: `${y}-${m}`,
        label: new Date(y, m, 1).toLocaleString("en-IN", {
          month: "short",
          year: "numeric",
        }),
        amount: outstanding,
      };
    })
    .filter(Boolean);
};

const getLeaveProratedAdjustment = (tenant, cutoffDate) => {
  const cutoff = cutoffDate ? new Date(cutoffDate) : null;
  if (!tenant?.joiningDate || !cutoff || Number.isNaN(cutoff.getTime())) return null;

  cutoff.setHours(0, 0, 0, 0);

  const joinDate = new Date(tenant.joiningDate);
  if (Number.isNaN(joinDate.getTime())) return null;
  joinDate.setHours(0, 0, 0, 0);

  const firstBillYM = getFirstBillYM(tenant);
  let active = null;

  for (let cycleIndex = 0; cycleIndex < 240; cycleIndex++) {
    const periodStart = new Date(joinDate);
    periodStart.setMonth(periodStart.getMonth() + cycleIndex);
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setHours(0, 0, 0, 0);

    if (cutoff >= periodStart && cutoff < periodEnd) {
      const ym = firstBillYM + cycleIndex;
      active = {
        y: Math.floor(ym / 12),
        m: ym % 12,
        periodStart,
        periodEnd,
      };
      break;
    }

    if (periodStart > cutoff) break;
  }

  if (!active) return null;

  const expectedRent = Number(getExpectedRentForMonth(tenant, active.y, active.m, roomsData) || 0);
  if (expectedRent <= 0) return null;

  const msPerDay = 1000 * 60 * 60 * 24;
  const cycleDays = Math.max(1, Math.round((active.periodEnd - active.periodStart) / msPerDay));
  const occupiedDays = Math.max(1, Math.round((cutoff - active.periodStart) / msPerDay) + 1);
  if (occupiedDays <= 0 || occupiedDays > cycleDays) return null;

  const cell = getMonthCell(tenant, active.y, active.m);
  const alreadyPaid = Number(cell?.amountPaid || 0);
  const proratedAmount = Math.round((expectedRent / cycleDays) * occupiedDays);
  const deductionAmount = Math.max(0, proratedAmount - alreadyPaid);
  const refundAmount = Math.max(0, alreadyPaid - proratedAmount);
  if (deductionAmount <= 0 && refundAmount <= 0) return null;

  return {
    key: "prorated-rent-adjustment",
    label: `Stayed rent (${occupiedDays} day${occupiedDays === 1 ? "" : "s"})`,
    deductionAmount,
    refundAmount,
    occupiedDays,
    dailyRent: expectedRent / cycleDays,
    monthlyRent: expectedRent,
    paidAmount: alreadyPaid,
    proratedAmount,
    cycleRange: `${fmtDM(active.periodStart)} - ${fmtDM(active.periodEnd)}`,
  };
};

const calculateDue = (rents = [], joiningDateStr, tenant, roomsData) => {
  if (!tenant?.joiningDate) return 0;

  const months = getBillingMonthsUpToNow(tenant);
  return months.reduce((sum, m) => {
    const c = getMonthCell(tenant, m.y, m.m);
    const isRealDue =
      c?.isPast && (c.label === "Due" || c.label === "Pending");
    return sum + (isRealDue ? Number(c.outstanding || 0) : 0);
  }, 0);
};
  const leaveSettlementMonths = useMemo(
    () => getLeaveSettlementMonths(currentLeaveTenant, selectedLeaveDate),
    [currentLeaveTenant, roomsData, selectedLeaveDate]
  );

  const selectedLeaveSettlementMonths = useMemo(
    () =>
      leaveSettlementMonths.filter((month) =>
        leaveSelectedMonths.includes(month.key)
      ),
    [leaveSettlementMonths, leaveSelectedMonths]
  );

  const leaveProratedAdjustment = useMemo(
    () => getLeaveProratedAdjustment(currentLeaveTenant, selectedLeaveDate),
    [currentLeaveTenant, roomsData, selectedLeaveDate]
  );

  const leaveSettlementSummary = useMemo(() => {
    const grossDeposit = Number(currentLeaveTenant?.depositAmount || 0);
    const monthDeduction = selectedLeaveSettlementMonths.reduce(
      (sum, month) => sum + Number(month.amount || 0),
      0
    );
    const proratedDeduction = Number(leaveProratedAdjustment?.deductionAmount || 0);
    const rentRefund = Number(leaveProratedAdjustment?.refundAmount || 0);
    const totalDeduction = monthDeduction + proratedDeduction;
    const totalReturnable = grossDeposit + rentRefund;

    return {
      grossDeposit,
      monthDeduction,
      proratedDeduction,
      rentRefund,
      totalDeduction,
      refundableDeposit: Math.max(0, totalReturnable - totalDeduction),
      amountDueFromTenant: Math.max(0, totalDeduction - totalReturnable),
    };
  }, [currentLeaveTenant, selectedLeaveSettlementMonths, leaveProratedAdjustment]);

  // Tenants to show in the main table (hide those who have left)
  const visibleTenants = useMemo(() => {
  // 1) Filter tenants (same logic you already had)
  const base = (formData || []).filter((t) => {
    const leaveISO = leaveDates[t._id];
    const isLeaved = leaveISO && new Date(leaveISO) < new Date();

    return (
      !isLeaved &&
      tenantMatchesSearchText(t) &&
      tenantMatchesSelectedYear(t)
    );
  });

  // 2) Sort according to sortConfig
 // 2) Sort according to sortConfig
const sorted = [...base];

if (sortConfig.column) {
  sorted.sort((a, b) => {
    const dir = sortConfig.direction === "asc" ? 1 : -1;

    // 🔹 Sr: use srNo numeric
    if (sortConfig.column === "sr") {
      const aSr = Number(a.srNo || 0);
      const bSr = Number(b.srNo || 0);
      return (aSr - bSr) * dir;
    }

    // 🔹 Name: A → Z / Z → A
    if (sortConfig.column === "name") {
      return (
        (a.name || "").localeCompare(b.name || "", undefined, {
          sensitivity: "base",
        }) * dir
      );
    }

    // 🔹 Due: numeric due amount
    if (sortConfig.column === "due") {
      // ✅ IMPORTANT: pass tenant + roomsData (matches your calculateDue usage)
      const aDue = calculateDue(a.rents, a.joiningDate, a, roomsData);
      const bDue = calculateDue(b.rents, b.joiningDate, b, roomsData);
      return (aDue - bDue) * dir;
    }

    // 🔹 Rent status: Pending/Due first OR Paid first
    if (sortConfig.column === "status") {
      const aLabel = getRentStatusLabelForSort(a); // "Paid" / "Pend" / "Due"
      const bLabel = getRentStatusLabelForSort(b);

      const rank = (label, direction) => {
        const s = String(label).toLowerCase();
        const isPending = s.startsWith("pending") || s.startsWith("due");
        const isPaid = s.startsWith("paid");

        if (direction === "asc") {
          // 1st click: Pending/Due at top
          if (isPending) return 0;
          if (isPaid) return 1;
          return 2;
        } else {
          // 2nd click: Paid at top
          if (isPaid) return 0;
          if (isPending) return 1;
          return 2;
        }
      };

      const aRank = rank(aLabel, sortConfig.direction);
      const bRank = rank(bLabel, sortConfig.direction);
      return aRank - bRank;
    }

    return 0;
  });
} else {
  // ✅ DEFAULT FLOW when no sorting selected: 301,302,303... then 401,402...
  sorted.sort((a, b) => {
    const toInt = (v) => {
      const m = String(v ?? "").match(/\d+/);
      const n = m ? parseInt(m[0], 10) : NaN;
      return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
    };
    const r = toInt(a.roomNo) - toInt(b.roomNo);
    if (r !== 0) return r;
    return toInt(a.bedNo) - toInt(b.bedNo);
  });
}

return sorted;
  }, [formData, leaveDates, searchText, selectedYear, sortConfig, roomsData]);

  // Vacant slots = slots that are not currently occupied (by a visible, non-leaved tenant)
  const extraVacantSlots = useMemo(() => {
    const activeKeys = new Set(
      (formData || [])
        .filter((t) => {
          const leaveISO = leaveDates[t._id];
          const isLeaved = leaveISO && new Date(leaveISO) < new Date();
          return !isLeaved;
        })
        .map((t) => makeOccKey(t.roomNo, t.bedNo, getTrackerPropertyLabelForTenant(t)))
    );

    const search = (searchText || "").toLowerCase();

   return (slots || [])
  .filter((slot) => {
    if (trackerType !== "bed" && String(slot?.propertyType || "") !== trackerType) {
      return false;
    }

    const key = makeOccKey(slot.roomNo, slot.bedNo, slot.propertyLabel || slot.category);
    if (activeKeys.has(key)) return false;

    const matchesSearch =
      !search ||
      String(slot.bedNo).toLowerCase().includes(search) ||
      String(slot.roomNo).toLowerCase().includes(search);

    const matchesYear = selectedYear === "All Records";
    return matchesSearch && matchesYear;
  })
  .sort(compareRoomBed); // ✅ vacant flow

  }, [slots, formData, leaveDates, searchText, selectedYear, trackerType, visibleTenants, allRoomsData]);

  // Build combined rows (occupied + vacant) in room-wise flow when no sorting selected
  const combinedRows = useMemo(() => {
    if (sortConfig.column) return null;

    const byProperty = new Map();
    const getSetupGroupLabel = () => "Added units - details pending";
    const getRowPropertyLabel = (propertyLabel = "", roomNo = "") => {
      const label = String(propertyLabel || "").trim();
      if (/^UNASSIGNED-/i.test(String(roomNo || "").trim())) return getSetupGroupLabel();
      if (label && !/^unassigned(?:-.*)?$/i.test(label)) return label;
      return /^unassigned/i.test(label)
        ? getSetupGroupLabel()
        : "Property not named";
    };
    const propertySort = (a, b) => {
      const aSetup = String(a?.propertyLabel || "") === getSetupGroupLabel();
      const bSetup = String(b?.propertyLabel || "") === getSetupGroupLabel();
      if (aSetup !== bSetup) return aSetup ? 1 : -1;
      return String(a?.propertyLabel || "").localeCompare(String(b?.propertyLabel || ""), undefined, {
        sensitivity: "base",
        numeric: true,
      });
    };
    const roomSort = (a, b) => {
      const roomCompare = getRoomSortNumber(a?.roomNo) - getRoomSortNumber(b?.roomNo);
      if (roomCompare !== 0) return roomCompare;
      return String(a?.roomNo || "").localeCompare(String(b?.roomNo || ""), undefined, {
        sensitivity: "base",
        numeric: true,
      });
    };
    const getPropertyBucket = (propertyLabel) => {
      const normalizedPropertyLabel = String(propertyLabel || "").trim();
      if (!byProperty.has(normalizedPropertyLabel)) {
        byProperty.set(normalizedPropertyLabel, {
          propertyLabel: normalizedPropertyLabel,
          rooms: new Map(),
        });
      }
      return byProperty.get(normalizedPropertyLabel);
    };
    const addRoomBucket = (roomNo, propertyLabel = "") => {
      const normalizedRoomNo = String(roomNo ?? "").trim();
      const normalizedPropertyLabel = getRowPropertyLabel(propertyLabel, normalizedRoomNo);
      const propertyBucket = getPropertyBucket(normalizedPropertyLabel);
      const key = getTrackerRoomKey(normalizedRoomNo, normalizedPropertyLabel);
      if (!propertyBucket.rooms.has(key)) {
        propertyBucket.rooms.set(key, {
          tenants: [],
          vacants: [],
          roomNo: normalizedRoomNo,
          propertyLabel: normalizedPropertyLabel,
        });
      }
      return propertyBucket.rooms.get(key);
    };

    (roomsData || []).forEach((room) => {
      if (trackerType !== "bed" && normalizeRoomPropertyType(room) !== trackerType) return;
      if (trackerType === "bed" && normalizeRoomPropertyType(room) !== "bed") return;
      const roomNo = String(room?.roomNo ?? "").trim();
      const propertyLabel = getTrackerPropertyLabel(room);
      if (!roomNo) return;
      addRoomBucket(roomNo, propertyLabel);
    });

    (visibleTenants || []).forEach((t) => {
      const bucket = addRoomBucket(t.roomNo, getTrackerPropertyLabelForTenant(t));
      bucket.tenants.push(t);
    });

    (extraVacantSlots || []).forEach((s) => {
      const bucket = addRoomBucket(s.roomNo, s.propertyLabel || s.category);
      bucket.vacants.push(s);
    });

    const rows = [];
    const propertyBuckets = Array.from(byProperty.values()).sort(propertySort);
    propertyBuckets.forEach((propertyBucket) => {
      const roomBuckets = Array.from(propertyBucket.rooms.values()).sort(roomSort);
      const tenantRows = [];
      const vacantRows = [];

      roomBuckets.forEach((bucket) => {
        bucket.tenants.sort(compareRoomBed);
        bucket.vacants.sort(compareRoomBed);

        bucket.tenants.forEach((t) =>
          tenantRows.push({
            type: "tenant",
            tenant: t,
            propertyLabel: propertyBucket.propertyLabel,
          })
        );
        bucket.vacants.forEach((s) =>
          vacantRows.push({
            type: "vacant",
            slot: s,
            propertyLabel: propertyBucket.propertyLabel,
          })
        );
      });

      rows.push(...tenantRows, ...vacantRows);
    });

    return rows;
  }, [visibleTenants, extraVacantSlots, roomsData, sortConfig, trackerType, allRoomsData]);

  const propertyBuildingByRoomKey = useMemo(() => {
    const map = new Map();

    (roomsData || []).forEach((room) => {
      if (trackerType !== "bed" && normalizeRoomPropertyType(room) !== trackerType) return;
      const roomNo = String(room?.roomNo ?? "").trim();
      const propertyLabel = getTrackerPropertyLabel(room);
      if (!roomNo) return;
      const key = getTrackerRoomKey(roomNo, propertyLabel);
      if (propertyLabel && !map.has(key)) {
        map.set(key, propertyLabel);
      }
    });

    return map;
  }, [roomsData, trackerType]);

  const getPropertyBuildingLabelForRow = useCallback(
    (row, isStructuredRow) => {
      if (isStructuredRow) {
        if (row?.propertyLabel) return String(row.propertyLabel).trim();

        if (row?.type === "tenant") {
          const tenant = row?.tenant;
          return String(
            tenant?.category ||
            propertyBuildingByRoomKey.get(
              getTrackerRoomKey(tenant?.roomNo, getTrackerPropertyLabelForTenant(tenant))
            ) ||
            ""
          ).trim();
        }

        if (row?.type === "vacant") {
          const slot = row?.slot;
          return String(
            slot?.propertyLabel ||
            slot?.category ||
            propertyBuildingByRoomKey.get(
              getTrackerRoomKey(slot?.roomNo, slot?.propertyLabel || slot?.category)
            ) ||
            ""
          ).trim();
        }
      }

      return String(
        row?.category ||
        propertyBuildingByRoomKey.get(
          getTrackerRoomKey(row?.roomNo, row?.category || row?.buildingName || "")
        ) ||
        ""
      ).trim();
    },
    [propertyBuildingByRoomKey, trackerType]
  );


  const groupedRooms = useMemo(() => {
    const roomMap = new Map();

    (visibleTenants || []).forEach((t) => {
      const roomNo = String(t.roomNo ?? "").trim();
      const propertyLabel = getTrackerPropertyLabelForTenant(t);
      const roomKey = getTrackerRoomKey(roomNo, propertyLabel);
      if (!roomMap.has(roomKey)) {
        roomMap.set(roomKey, { roomNo, propertyLabel, occupied: [], vacant: [] });
      }
      roomMap.get(roomKey).occupied.push(t);
    });

    (extraVacantSlots || []).forEach((s) => {
      const roomNo = String(s.roomNo ?? "").trim();
      const propertyLabel = String(s.propertyLabel || s.category || "").trim();
      const roomKey = getTrackerRoomKey(roomNo, propertyLabel);
      if (!roomMap.has(roomKey)) {
        roomMap.set(roomKey, { roomNo, propertyLabel, occupied: [], vacant: [] });
      }
      roomMap.get(roomKey).vacant.push(s);
    });

    const rooms = Array.from(roomMap.values()).sort((a, b) => {
      if (trackerType === "room") {
        const propertyCompare = String(a?.propertyLabel || "").localeCompare(
          String(b?.propertyLabel || ""),
          undefined,
          { sensitivity: "base" }
        );
        if (propertyCompare !== 0) return propertyCompare;
      }

      return toInt(a.roomNo) - toInt(b.roomNo);
    });

    rooms.forEach((r) => {
      r.occupied.sort(compareRoomBed);
      r.vacant.sort(compareRoomBed);
    });

    return rooms;
  }, [visibleTenants, extraVacantSlots, trackerType, allRoomsData]);

  const tableRows = combinedRows || visibleTenants;
  const totalTableRows = tableRows.length;
  const totalTablePages = Math.max(1, Math.ceil(totalTableRows / tableRowsPerPage));
  const paginatedTableRows = useMemo(() => {
    const startIndex = (currentTablePage - 1) * tableRowsPerPage;
    return tableRows.slice(startIndex, startIndex + tableRowsPerPage);
  }, [tableRows, currentTablePage, tableRowsPerPage]);

  useEffect(() => {
    setCurrentTablePage(1);
  }, [searchText, selectedYear, sortConfig, trackerType, activeTab]);

  useEffect(() => {
    if (currentTablePage > totalTablePages) {
      setCurrentTablePage(totalTablePages);
    }
  }, [currentTablePage, totalTablePages]);
  // All vacant slots (for shifting), not filtered by search/year
  const allVacantSlots = useMemo(() => {
    const activeKeys = new Set(
      (formData || [])
        .filter((t) => {
          const leaveISO = leaveDates[t._id];
          const isLeaved = leaveISO && new Date(leaveISO) < new Date();
          return !isLeaved;
        })
        .map((t) => makeOccKey(t.roomNo, t.bedNo, getTrackerPropertyLabelForTenant(t)))
    );

 return (slots || [])
  .filter((slot) => {
    if (trackerType !== "bed" && String(slot?.propertyType || "") !== trackerType) {
      return false;
    }

    const key = makeOccKey(slot.roomNo, slot.bedNo, slot.propertyLabel || slot.category);
    return !activeKeys.has(key);
  })
  .sort(compareRoomBed);

  }, [slots, formData, leaveDates, trackerType, allRoomsData]);

  const getShiftSlotKey = (slot) =>
    `${String(slot?.roomId || slot?._id || slot?.roomNo || "")}::${String(slot?.bedNo || "")}`;
  const selectedShiftSlot = useMemo(() =>
    allVacantSlots.find((slot) => getShiftSlotKey(slot) === shiftTargetKey) || null,
  [allVacantSlots, shiftTargetKey]);
  const selectedShiftSlotNeedsDetails = Boolean(
    selectedShiftSlot?.isPlaceholder || /^UNASSIGNED-/i.test(String(selectedShiftSlot?.roomNo || ""))
  );

  // ADD THIS helper in NewComponant component (near other handlers)
  const openEditForTenantMonth = (tenantId, monthIdx, year) => {
    const tenant = formData.find((t) => t._id === tenantId);
    if (!tenant) return;

    // Prefill the modal to the 1st of the requested month/year
    // const date = new Date(year, monthIdx, 1).toISOString().split("T")[0];

    // setEditingTenant(tenant);
    // setEditRentDate(date);
setEditingTenant(tenant);
setEditMonthYM({ y: year, m: monthIdx });
// date field now will be "today", set once on open:
setEditRentDate(new Date().toISOString().split("T")[0]);
const savedCanteenValue = getSavedRentCanteenValue(tenant, year, monthIdx);
const savedDiscountValue = getSavedRentDiscountValue(tenant, year, monthIdx);
setEditRentCanteen(savedCanteenValue);
setEditRentDiscount(savedDiscountValue);
setEditRentAmount(getSuggestedEditRentAmount(tenant, year, monthIdx, savedCanteenValue, savedDiscountValue));
setEditRentCanteenAmount("");
setRentUpdateMode("add");
    // Optional: clear or auto-suggest amount
    // setEditRentAmount(expectFromTenant(tenant, roomsData));
  };
  const openAddForSlot = (slotOrRoomNo, bedNoArg) => {
    const slot =
      slotOrRoomNo && typeof slotOrRoomNo === "object" ? slotOrRoomNo : null;
    const roomNo = slot ? slot.roomNo : slotOrRoomNo;
    const bedNo = slot ? slot.bedNo : bedNoArg;

    const room = roomsData.find((r) =>
      slot?.roomId
        ? String(r._id) === String(slot.roomId)
        : String(r.roomNo) === String(roomNo) &&
          (!slot?.propertyLabel || getTrackerPropertyLabel(r) === slot.propertyLabel)
    );
    const bed = room?.beds?.find((b) => String(b.bedNo) === String(bedNo));
    const price =
      toNum(slot?.price) || toNum(bed?.price) || toNum(bed?.baseRent) || "";

    // Optionally fetch SrNo if you use it
    fetchSrNo?.();

    setNewTenant((prev) => ({
      ...prev,
      roomId: room?._id || prev.roomId || "",
      roomNo: String(roomNo ?? ""),
      category: room?.category || slot?.category || prev.category || "",
      bedNo: String(bedNo ?? ""),
      floorNo: room?.floorNo ?? slot?.floorNo ?? "",
      bedPrice: price,
      baseRent: price,
      rentAmount: price,
      firstRentStatus: "ADVANCE_PAID",
      firstRentPaidDate: new Date().toISOString().slice(0, 10),
      // clear inline “other bed” form fields if you use them
      newBedNo: "",
      newBedPrice: "",
    }));
    setShowAddModal(true);
  };

  const openUnitSetupForSlot = (slotOrRoomNo, bedNoArg) => {
    const slot =
      slotOrRoomNo && typeof slotOrRoomNo === "object" ? slotOrRoomNo : null;
    const roomNo = slot ? slot.roomNo : slotOrRoomNo;
    const bedNo = slot ? slot.bedNo : bedNoArg;

    const room =
      roomsData.find((r) => {
        if (slot?.roomId && String(r?._id) !== String(slot.roomId)) return false;
        const sameRoom = String(r?.roomNo) === String(roomNo);
        if (!sameRoom) return false;
        if (!bedNo) return true;
        return (r?.beds || []).some((bed) => String(bed?.bedNo) === String(bedNo));
      }) ||
      allRoomsData.find((r) => {
        if (slot?.roomId && String(r?._id) !== String(slot.roomId)) return false;
        const sameRoom = String(r?.roomNo) === String(roomNo);
        if (!sameRoom) return false;
        if (!bedNo) return true;
        return (r?.beds || []).some((bed) => String(bed?.bedNo) === String(bedNo));
      });

    if (!room) {
      alert("Unit details could not be found. Please refresh and try again.");
      return;
    }

    if (hasPendingUnitDetails(room)) {
      openTenantUnitSetupModal(room);
    } else {
      openAddForSlot(slot || roomNo, bedNo);
    }
  };





  const openCurrentMonthEdit = (tenant) => {
    if (!tenant?._id) return;
    const now = new Date();
    openEditForTenantMonth(tenant._id, now.getMonth(), now.getFullYear());
  };

  const openDueMonthsModal = (tenant) => {
    if (!tenant) return;
    const dueList = getAllPendingMonths(tenant);
    setDueMonths(dueList);
    setSelectedTenantName(tenant.name || "");
    setSelectedTenant(tenant);
    setShowDueModal(true);
  };

  const openShiftTenantModal = (tenant) => {
    if (!tenant) return;
    setShiftTenant(tenant);
    setShiftTargetKey("");
    setShiftEffectiveDate(new Date().toISOString().slice(0, 10));
    setShowShiftModal(true);
  };

  const openDesktopTenantDetails = (tenant) => {
    if (!tenant) return;
    setSelectedTenant(tenant);
    setShowDetailsModal(true);
  };

  const openTenantEditModal = (tenant) => {
    if (!tenant) return;
    const copy = { ...tenant };
    const tenantRoomId =
      copy?.roomId?._id || copy?.roomId || copy?.room?._id || copy?.room || "";
    const tenantRoomNo =
      copy?.roomNo || copy?.roomId?.roomNo || copy?.room?.roomNo || "";
    const tenantBuilding = String(copy?.buildingName || copy?.category || "").trim();
    const matchedRoom = findTrackerRoomForTenant(copy, roomsData);
    const matchedBed =
      (matchedRoom?.beds || []).find(
        (bed) => String(bed?.bedNo || "") === String(copy.bedNo || "")
      ) ||
      getPrimaryUnitBed(matchedRoom, "room");
    const matchedBedPrice = getUnitPriceFromBed(matchedBed);
    copy.canteen = normalizeCanteenValue(copy.hasCanteen === true ? true : copy.canteen);
    copy.canteenMealPrices = copy.canteenMealPrices || { breakfast: "", lunch: "", dinner: "" };
    copy.roomId = matchedRoom?._id || tenantRoomId || "";
    copy.roomNo = matchedRoom?.roomNo || tenantRoomNo || "";
    if (trackerType === "room") {
      copy.category = getRoomBuildingLabel(matchedRoom) || tenantBuilding || copy.category || "";
      copy.wingName = getRoomWingValue(matchedRoom) || copy.wingName || "";
      copy.floorNo = getRoomFloorValue(matchedRoom) || copy.floorNo || "";
      copy.flatType = matchedRoom?.flatType || copy.flatType || "";
      copy.bedNo = matchedBed?.bedNo || copy.bedNo || getPrimaryUnitBedNo("room");
      copy.bedPrice = matchedBedPrice !== "" ? matchedBedPrice : copy.baseRent ?? copy.rentAmount ?? "";
      copy.baseRent = matchedBedPrice !== "" ? matchedBedPrice : copy.baseRent ?? copy.rentAmount ?? "";
      copy.rentAmount = matchedBedPrice !== "" ? matchedBedPrice : copy.rentAmount ?? copy.baseRent ?? "";
    } else {
      copy.category = copy.category || tenantBuilding || getRoomBuildingLabel(matchedRoom);
      copy.wingName = copy.wingName || getRoomWingValue(matchedRoom);
      copy.floorNo = copy.floorNo || getRoomFloorValue(matchedRoom) || "";
      copy.flatType = copy.flatType || matchedRoom?.flatType || "";
      copy.bedNo = copy.bedNo || matchedBed?.bedNo || "";
      copy.bedPrice = matchedBedPrice !== "" ? matchedBedPrice : copy.baseRent ?? copy.rentAmount ?? "";
      // Hostel beds and shops use the configured unit/bed price as their
      // monthly rent. Populate it when opening Edit Tenant as Add Tenant does.
      copy.baseRent = matchedBedPrice !== "" ? matchedBedPrice : copy.baseRent ?? copy.rentAmount ?? "";
      copy.rentAmount = matchedBedPrice !== "" ? matchedBedPrice : copy.rentAmount ?? copy.baseRent ?? "";
    }
    copy.__priceMode = "current";
    copy.__newBedPriceEdit = "";
    copy.__priceMsg = "";
    copy.__savingPrice = false;
    if (!copy.firstRentStatus && copy.joiningDate) {
      const joinDate = new Date(String(copy.joiningDate).split("T")[0]);
      if (!Number.isNaN(joinDate.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        joinDate.setHours(0, 0, 0, 0);
        const diffDays = (today - joinDate) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0 && diffDays < 31) {
          copy.firstRentStatus = "ADVANCE_PAID";
          copy.firstRentPaidDate = copy.firstRentPaidDate || new Date().toISOString().slice(0, 10);
        }
      }
    }
    if (!copy.firstRentMonth && copy.joiningDate) {
      copy.firstRentMonth = getFirstRentMonthForStatus(
        copy.joiningDate,
        copy.firstRentStatus || "NOT_PAID"
      );
    }
    copy.canteen = copy.hasCanteen === true ? "yes" : normalizeCanteenValue(copy.canteen);
    setEditTenantData(copy);
    setShowEditModal(true);
  };

  const openTenantDeleteModal = (tenant) => {
    if (!tenant?._id) return;
    openDeleteConfirmation(tenant._id);
  };

  const openTenantDetails = (tenant) => {
  if (!tenant) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(max-width: 768px)").matches
    ) {
      setMobileSelectedTenant(tenant);
      setShowMobileTenantProfile(true);
      return;
    }
    openDesktopTenantDetails(tenant);
  };

  const openCanteenEntryModal = (tenant) => {
    if (!tenant) return;

    const existingEntry =
      (Array.isArray(tenant.canteenHistory) ? tenant.canteenHistory : []).find(
        (entry) => String(entry?.month || "").trim() === getCurrentCanteenMonth()
      ) || null;

    setCanteenTenant(tenant);
    setCanteenForm({
      month: existingEntry?.month || getCurrentCanteenMonth(),
      mealCount:
        existingEntry?.mealCount || existingEntry?.mealCount === 0
          ? String(existingEntry.mealCount)
          : "",
      status: String(existingEntry?.status || "due").trim().toLowerCase() === "paid" ? "paid" : "due",
    });
    setShowCanteenModal(true);
  };

  const closeCanteenModal = () => {
    setShowCanteenModal(false);
    setCanteenTenant(null);
    setSavingCanteen(false);
    setCanteenForm({
      month: getCurrentCanteenMonth(),
      mealCount: "",
      status: "due",
    });
  };

  const saveCanteenEntry = async () => {
    if (!canteenTenant?._id) return;

    const mealCount = Number(canteenForm.mealCount || 0);
    if (!canteenForm.month) {
      alert("Please select month.");
      return;
    }

    if (!Number.isFinite(mealCount) || mealCount < 0) {
      alert("Please enter a valid meal count.");
      return;
    }

    try {
      setSavingCanteen(true);
      try {
        await axios.post(`${apiUrl}forms/${canteenTenant._id}/canteen`, {
          month: canteenForm.month,
          mealCount,
          status: canteenForm.status,
        });
      } catch (routeError) {
        if (routeError?.response?.status !== 404) {
          throw routeError;
        }

        const existingHistory = Array.isArray(canteenTenant.canteenHistory)
          ? [...canteenTenant.canteenHistory]
          : [];
        const nextEntry = {
          month: canteenForm.month,
          mealCount,
          rate: CANTEEN_MEAL_RATE,
          amount: mealCount * CANTEEN_MEAL_RATE,
          status: canteenForm.status,
        };
        const existingIndex = existingHistory.findIndex(
          (entry) => String(entry?.month || "").trim() === canteenForm.month
        );

        if (existingIndex >= 0) {
          existingHistory[existingIndex] = {
            ...existingHistory[existingIndex],
            ...nextEntry,
          };
        } else {
          existingHistory.push(nextEntry);
        }

        try {
          await axios.put(`${apiUrl}forms/${canteenTenant._id}`, {
            canteen: "yes",
            canteenHistory: existingHistory,
          });
        } catch (formsUpdateError) {
          await axios.put(`${apiUrl}update/${canteenTenant._id}`, {
            canteen: "yes",
            canteenHistory: existingHistory,
          });
        }
      }

      await refreshTenants();
      closeCanteenModal();
    } catch (error) {
      console.error("Failed to save canteen entry:", error);
      alert(error?.response?.data?.message || "Failed to save canteen entry.");
      setSavingCanteen(false);
    }
  };

  const closeMobileTenantProfile = () => {
    setShowMobileTenantProfile(false);
    setMobileSelectedTenant(null);
  };

  const openMobileLeavedTenants = () => {
    setShowMobileLeavedTenants(true);
    setShowMobileVacantBeds(false);
    setShowMobileTenantProfile(false);
    setMobileSelectedTenant(null);
  };

  const closeMobileLeavedTenants = () => {
    setShowMobileLeavedTenants(false);
  };

  const openMobileVacantBeds = () => {
    setShowMobileVacantBeds(true);
    setShowMobileLeavedTenants(false);
    setShowMobileTenantProfile(false);
    setMobileSelectedTenant(null);
  };

  const closeMobileVacantBeds = () => {
    setShowMobileVacantBeds(false);
  };

  const getTenantPhotoMetaForMobile = (tenant) => {
    const found = findTenantPhotoDoc(tenant);
    return found?.doc
      ? {
          photoUrl: docHrefSafe(found.doc),
          photoTransform: found.doc.transform,
        }
      : null;
  };

  const openPhotoEditor = (tenant) => {
    const found = findTenantPhotoDoc(tenant);
    if (!found?.doc) {
      alert("No tenant photo found.");
      return;
    }

    setPhotoEditTenant(tenant);
    setPhotoEditDocIndex(found.index);
    setPhotoEditTransform(normalizePhotoTransform(found.doc.transform));
    setShowPhotoEditModal(true);
  };

  const savePhotoTransform = async () => {
    if (!photoEditTenant || photoEditDocIndex == null) return;

    const docs = Array.isArray(photoEditTenant.documents)
      ? [...photoEditTenant.documents]
      : [];

    if (!docs[photoEditDocIndex]) {
      alert("Photo document not found.");
      return;
    }

    const normalized = normalizePhotoTransform(photoEditTransform);
    docs[photoEditDocIndex] = {
      ...docs[photoEditDocIndex],
      transform: normalized,
    };

    try {
      setSavingPhotoTransform(true);
      await axios.put(`${apiUrl}forms/${photoEditTenant._id}`, {
        documents: docs,
      });

      setFormData((prev) =>
        prev.map((t) =>
          t._id === photoEditTenant._id ? { ...t, documents: docs } : t
        )
      );

      setShowPhotoEditModal(false);
      setPhotoEditTenant(null);
      setPhotoEditDocIndex(null);
    } catch (err) {
      console.error("Failed to save photo transform:", err);
      alert("Failed to save photo changes.");
    } finally {
      setSavingPhotoTransform(false);
    }
  };
// ✅ ADD THIS (near top inside component)
const EMPTY_TENANT = {
  srNo: "",
  name: "",
  phoneNo: "",
  address: "",
  pincode: "",
  city: "",
  state: "",
  houseNo: "",
  nearbyPlace: "",
  joiningDate: "",
  depositAmount: "",

  roomId: "",
  roomNo: "",
  category: "",
  floorNo: "",

  bedNo: "",
  bedPrice: "",
  baseRent: "",
  rentAmount: "",

  __priceMode: "current",
  __newBedPriceEdit: "",
  __priceMsg: "",
  __savingPrice: false,

  newBedNo: "",
  newBedPrice: "",
  newBedCategory: "",
  __bedMsg: "",
  __savingBed: false,

  relative1Relation: "Self",
  relative1Name: "",
  relative1Phone: "",
  relative2Relation: "Self",
  relative2Name: "",
  relative2Phone: "",
  familyMembers: "",
  canteen: "no",

  dob: "",
  dateOfJoiningCollege: "",
  companyAddress: "",
  shopBusiness: "",
  relativeAddress: "",
  firstRentStatus: "ADVANCE_PAID",
  firstRentPaidDate: "",
  firstRentMonth: "",

};

const EXPORT_COLORS = {
  title: "1E3A8A",
  header: "2563EB",
  section: "0F766E",
  labelFill: "EFF6FF",
  bandFill: "F8FAFC",
  border: "CBD5E1",
  text: "0F172A",
  subText: "475569",
};

const rgb = (hex) => ({ rgb: hex });

const borderStyle = (color = EXPORT_COLORS.border) => ({
  top: { style: "thin", color: rgb(color) },
  bottom: { style: "thin", color: rgb(color) },
  left: { style: "thin", color: rgb(color) },
  right: { style: "thin", color: rgb(color) },
});

const setCellStyle = (ws, row, col, style) => {
  const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
  if (cell) cell.s = style;
};

const mergeRow = (ws, row, lastCol) => {
  ws["!merges"] = ws["!merges"] || [];
  ws["!merges"].push({ s: { r: row, c: 0 }, e: { r: row, c: lastCol } });
};

const styleDataGrid = (ws, startRow, endRow, colCount, options = {}) => {
  const alternate = options.alternate !== false;
  for (let r = startRow; r <= endRow; r++) {
    for (let c = 0; c < colCount; c++) {
      const isLabel = c === 0;
      const fillColor = alternate && r % 2 === 0 ? EXPORT_COLORS.bandFill : "FFFFFF";
      setCellStyle(ws, r, c, {
        font: {
          name: "Calibri",
          sz: 11,
          color: rgb(EXPORT_COLORS.text),
          bold: isLabel,
        },
        fill: {
          patternType: "solid",
          fgColor: rgb(isLabel ? EXPORT_COLORS.labelFill : fillColor),
        },
        border: borderStyle(),
        alignment: {
          vertical: "center",
          horizontal: "left",
          wrapText: true,
        },
      });
    }
  }
};

const styleTitleRow = (ws, row, lastCol, subtitle = false) => {
  mergeRow(ws, row, lastCol);
  setCellStyle(ws, row, 0, {
    font: {
      name: "Calibri",
      sz: subtitle ? 10 : 14,
      bold: !subtitle,
      italic: subtitle,
      color: rgb(subtitle ? EXPORT_COLORS.subText : "FFFFFF"),
    },
    fill: {
      patternType: "solid",
      fgColor: rgb(subtitle ? "E2E8F0" : EXPORT_COLORS.title),
    },
    border: borderStyle(subtitle ? "CBD5E1" : EXPORT_COLORS.title),
    alignment: {
      horizontal: subtitle ? "left" : "center",
      vertical: "center",
      wrapText: true,
    },
  });
};

const styleSectionRow = (ws, row, lastCol) => {
  mergeRow(ws, row, lastCol);
  setCellStyle(ws, row, 0, {
    font: {
      name: "Calibri",
      sz: 11,
      bold: true,
      color: rgb("FFFFFF"),
    },
    fill: {
      patternType: "solid",
      fgColor: rgb(EXPORT_COLORS.section),
    },
    border: borderStyle(EXPORT_COLORS.section),
    alignment: {
      horizontal: "left",
      vertical: "center",
      wrapText: true,
    },
  });
};

const normalizeSheetText = (ws, startRow, endRow, startCol, endCol) => {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell || cell.v === undefined || cell.v === null || cell.v === "") continue;
      cell.v = String(cell.v);
      cell.t = "s";
    }
  }
};

const setHyperlinkCell = (ws, row, col, url, tooltip) => {
  if (!url) return;
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = ws[addr];
  if (!cell) return;
  cell.l = {
    Target: url,
    Tooltip: tooltip || url,
  };
};

const getExportDocuments = (...sources) => {
  const candidates = [];

  sources.forEach((source) => {
    if (!source || typeof source !== "object") return;
    candidates.push(
      source.documents,
      source.documentFiles,
      source.uploadedDocuments,
      source.docs
    );
  });

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate;
    }
  }

  return [];
};

const handleDownloadExcel = () => {
  const headers = [
    "SrNo",
    "Name",
    "Phone",
    "JoiningDate",
    "Category",
    "WingName",
    "FlatType",
    "RoomNo",
    "FloorNo",
    "BedNo",
    "DepositAmount",
    "Address",
    "RelativeAddress1",
    "RelativeAddress2",
    "CompanyAddress",
    "DateOfJoiningCollege",
    "DOB",
  ];

  const rows = formData.map((item) => ([
    item.srNo ?? "",
    item.name ?? "",
    item.phoneNo ?? "",
    item.joiningDate ?? "",
    item.category ?? "",
    item.wingName ?? "",
    item.flatType ?? "",
    item.roomNo ?? "",
    item.floorNo ?? "",
    item.bedNo ?? "",
    item.depositAmount ?? "",
    item.address ?? "",
    item.relativeAddress1 ?? "",
    item.relativeAddress2 ?? "",
    item.companyAddress ?? "",
    item.dateOfJoiningCollege ?? "",
    item.dob ?? "",
  ]));

  const aoa = [
    ["Tenant Summary Report"],
    [`Generated on ${new Date().toLocaleString("en-IN")}`],
    [],
    headers,
    ...rows,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  normalizeSheetText(worksheet, 4, aoa.length - 1, 0, headers.length - 1);
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
  ];
  worksheet["!cols"] = [
    { wch: 10 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 26 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
  ];

  styleTitleRow(worksheet, 0, headers.length - 1, false);
  styleTitleRow(worksheet, 1, headers.length - 1, true);
  for (let c = 0; c < headers.length; c++) {
    setCellStyle(worksheet, 3, c, {
      font: {
        name: "Calibri",
        sz: 11,
        bold: true,
        color: rgb("FFFFFF"),
      },
      fill: {
        patternType: "solid",
        fgColor: rgb(EXPORT_COLORS.header),
      },
      border: borderStyle(EXPORT_COLORS.header),
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
    });
  }
  styleDataGrid(worksheet, 4, aoa.length - 1, headers.length);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tenants");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true,
  });
  const data = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(data, "tenant_data.xlsx");
};
  const getDisplayedRent = (rents = []) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    let current = null;
    let previous = null;
    let next = null;

    // rents.forEach((rent) => {
    //   const date = new Date(rent.date);
    //   const m = date.getMonth();
    //   const y = date.getFullYear();
    rents.forEach((rent) => {
    const ym = getYMFromRecord(rent);
    if (!ym) return;
    const { m, y } = ym;
      if (m === currentMonth && y === currentYear) {
        current = rent;
      } else if (m === prevMonth && y === prevYear) {
        previous = rent;
      } else if (m === nextMonth && y === nextYear) {
        next = rent;
      }
    });

    return { previous, current, next };
  };

  // const getDisplayedRent = (rents = []) => {
  //   const now = new Date();
  //   const currentMonth = now.getMonth();
  //   const currentYear = now.getFullYear();
  //   const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  //   const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  //   const matchRent = (month, year) =>
  //     rents.find(r => {
  //       if (!r.date) return false;
  //       const d = new Date(r.date);
  //       return d.getMonth() === month && d.getFullYear() === year && Number(r.rentAmount) > 0;
  //     });

  //   const current = matchRent(currentMonth, currentYear);
  //   if (current) return { rentAmount: Number(current.rentAmount), date: current.date };

  //   const previous = matchRent(previousMonth, previousYear);
  //   if (previous) return { rentAmount: Number(previous.rentAmount), date: previous.date };

  //   const latest = rents
  //     .filter(r => Number(r.rentAmount) > 0 && r.date)
  //     .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  //   return latest ? { rentAmount: Number(latest.rentAmount), date: latest.date } : { rentAmount: 0, date: null };
  // };

  
const sectionHeadingMap = {
  rent: "Rent and Deposit Tracker",
  "light-hostel": "Light Bill",
  "light-room-shop": "Light Bill",
  "light-room": "Light Bill",
  "light-shop": "Light Bill",
  "expenses-hostel": "Expenses",
  "expenses-room-shop": "Expenses",
  "expenses-room": "Expenses",
  "expenses-shop": "Expenses",
  staff: "Staff Expenses",
  holiday: "Holiday Management",
  canteen: "Canteen Portal",
  "canteen attendance": "Meal Attendance",
};

const currentSectionHeading =
  sectionHeadingMap[activeTab] || `${trackerLabel} Rent and Deposit Tracker`;

useEffect(() => {
  setTrackerType((prev) =>
    prev === trackerTypeFromLocation ? prev : trackerTypeFromLocation
  );
}, [trackerTypeFromLocation]);

useEffect(() => {
  if (activeTab !== "rent") setShowUnassignedTenantsView(false);
}, [activeTab]);

useEffect(() => {
  if (location.state?.tab) {
    setActiveTab(location.state.tab);
  }
}, [location.state?.tab]);

const openNewComponantSection = (tab) => {
  navigate(`/tracker/${trackerType}`, { state: { tab, trackerType } });
};

const openTrackerView = (nextTrackerType, tab = activeTab) => {
  const normalizedType = normalizeTrackerType(nextTrackerType);
  if (!trackerNavigationTypes.some((item) => item.value === normalizedType)) return;
  setShowUnassignedTenantsView(false);
  const targetPath = `/tracker/${normalizedType}`;
  const isSamePath = location.pathname === targetPath;
  const isSameTab = (location.state?.tab || "rent") === tab;

  if (isSamePath && isSameTab) return;

  navigate(`/tracker/${normalizedType}`, {
    state: { tab, trackerType: normalizedType },
  });
};

const mobileSidebarActiveKey = useMemo(() => {
  if (activeTab === "rent") {
    if (trackerType === "room") return "tracker-room";
    if (trackerType === "shop") return "tracker-shop";
    return "tracker-bed";
  }

  if (
    activeTab === "light-hostel" ||
    activeTab === "light-room-shop" ||
    activeTab === "light-room" ||
    activeTab === "light-shop"
  ) {
    return activeTab;
  }

  if (
    activeTab === "expenses-hostel" ||
    activeTab === "expenses-room-shop" ||
    activeTab === "expenses-room" ||
    activeTab === "expenses-shop"
  ) {
    return activeTab;
  }

  if (activeTab === "staff") return "staff";
  return "";
}, [activeTab, trackerType]);

const handleMobileSectionSelect = (key) => {
  setShowMobileSections(false);

  if (key === "dashboard") {
    navigate("/maindashboard");
    return;
  }

  if (key === "tracker-bed") {
    openTrackerView("bed", "rent");
    return;
  }

  if (key === "tracker-room") {
    openTrackerView("room", "rent");
    return;
  }

  if (key === "tracker-shop") {
    openTrackerView("shop", "rent");
    return;
  }

  if (key === "light-hostel" || key === "light-room-shop" || key === "light-room" || key === "light-shop") {
    openNewComponantSection(key);
    return;
  }

  if (key === "expenses-hostel" || key === "expenses-room-shop" || key === "expenses-room" || key === "expenses-shop") {
    openNewComponantSection(key);
    return;
  }

  if (key === "staff") {
    openNewComponantSection("staff");
    return;
  }

 
};
  const handleLeave = (tenant) => {
    setCurrentLeaveId(tenant._id);
    setCurrentLeaveName(tenant.name);
    setCurrentLeaveTenant(tenant);
    setSelectedLeaveDate(new Date().toISOString().slice(0, 10));
    setLeaveDeductFromDeposit(false);
    setLeaveSelectedMonths([]);
    setShowLeaveModal(true);
  };

  const closeLeaveModal = () => {
    setShowLeaveModal(false);
    setCurrentLeaveTenant(null);
    setLeaveDeductFromDeposit(false);
    setLeaveSelectedMonths([]);
    setSelectedLeaveDate("");
    setCurrentLeaveId(null);
    setCurrentLeaveName("");
  };

 const confirmLeave = async () => {
  if (!selectedLeaveDate) {
    alert("Please select a leave date.");
    return;
  }

  const settlementMonths = leaveSettlementMonths;
  const selectedSettlementMonths = selectedLeaveSettlementMonths;
  if (
    leaveDeductFromDeposit &&
    settlementMonths.length > 0 &&
    selectedSettlementMonths.length === 0 &&
    !leaveProratedAdjustment
  ) {
    alert("Please select at least one month to deduct, or turn off deposit deduction.");
    return;
  }
  const grossDeposit = leaveSettlementSummary.grossDeposit;
  const totalDeduction = leaveDeductFromDeposit
    ? leaveSettlementSummary.totalDeduction
    : 0;
  const refundableDeposit = leaveDeductFromDeposit
    ? leaveSettlementSummary.refundableDeposit
    : grossDeposit;
  const amountDueFromTenant = leaveDeductFromDeposit
    ? leaveSettlementSummary.amountDueFromTenant
    : 0;
  const deductionRows = leaveDeductFromDeposit
    ? [
        ...selectedSettlementMonths.map((month) => ({
          month: month.label,
          amount: Number(month.amount || 0),
        })),
        ...(leaveProratedAdjustment?.deductionAmount
          ? [
              {
                month: leaveProratedAdjustment.label,
                amount: Number(leaveProratedAdjustment.deductionAmount || 0),
                days: leaveProratedAdjustment.occupiedDays,
                dailyRent: Math.round(Number(leaveProratedAdjustment.dailyRent || 0)),
                cycleRange: leaveProratedAdjustment.cycleRange,
              },
            ]
          : []),
        ...(leaveProratedAdjustment?.refundAmount
          ? [
              {
                month: "Unused prepaid rent refund",
                amount: -Number(leaveProratedAdjustment.refundAmount || 0),
                days: leaveProratedAdjustment.occupiedDays,
                dailyRent: Math.round(Number(leaveProratedAdjustment.dailyRent || 0)),
                cycleRange: leaveProratedAdjustment.cycleRange,
              },
            ]
          : []),
      ]
    : [];

  try {
    const payload = {
      tenantId: currentLeaveId,
      leaveDate: selectedLeaveDate,
      leaveSettlement: {
        deductFromDeposit: leaveDeductFromDeposit,
        selectedMonths: leaveDeductFromDeposit
          ? selectedSettlementMonths.map((month) => month.label)
          : [],
        deductions: deductionRows,
        grossDeposit,
        totalDeduction,
        refundableDeposit,
        amountDueFromTenant,
      },
    };

    console.log("Sending leave payload:", payload);

    const res = await axios.post(
      `${apiUrl}/leave`,
      payload
    );

    alert("Leave marked successfully");
    const updatedTenant = res?.data?.tenant;
    if (updatedTenant?._id) {
      setFormData((prev) =>
        prev.map((tenant) =>
          tenant._id === updatedTenant._id ? { ...tenant, ...updatedTenant } : tenant
        )
      );
      setTenants((prev) =>
        prev.map((tenant) =>
          tenant._id === updatedTenant._id ? { ...tenant, ...updatedTenant } : tenant
        )
      );
    } else {
      setFormData((prev) =>
        prev.map((tenant) =>
          tenant._id === currentLeaveId
            ? { ...tenant, leaveDate: selectedLeaveDate, isOnLeave: true, leaveSettlement: payload.leaveSettlement }
            : tenant
        )
      );
      setTenants((prev) =>
        prev.map((tenant) =>
          tenant._id === currentLeaveId
            ? { ...tenant, leaveDate: selectedLeaveDate, isOnLeave: true, leaveSettlement: payload.leaveSettlement }
            : tenant
        )
      );
    }
    setLeaveDates((prev) => ({
      ...prev,
      [currentLeaveId]: selectedLeaveDate,
    }));
    closeLeaveModal();
    await refreshTenants();

  } catch (error) {
    console.error(
      "Error setting leave:",
      error.response?.data || error.message
    );
    alert(error.response?.data?.message || "Server error");
  }
};


  // const getDueMonths = (rents = [], joiningDateStr) => {
  //   if (!joiningDateStr) return [];

  //   const joiningDate = new Date(joiningDateStr);
  //   const startDate = new Date(
  //     joiningDate.getFullYear(),
  //     joiningDate.getMonth() + 1,
  //     1
  //   );
  //   const now = new Date();
  //   const currentYear = now.getFullYear();

  //   const rentMap = new Map();
  //   rents.forEach((rent) => {
  //     const d = new Date(rent.date);
  //     const key = `${d.getMonth()}-${d.getFullYear()}`;
  //     rentMap.set(key, true);
  //   });

  //   const months = [];
  //   const tempDate = new Date(startDate);

  //   while (tempDate <= now) {
  //     const year = tempDate.getFullYear();
  //     const month = tempDate.getMonth();
  //     const key = `${month}-${year}`;

  //     if (year === currentYear && !rentMap.has(key)) {
  //       months.push(
  //         tempDate.toLocaleString("default", { month: "long", year: "numeric" })
  //       );
  //     }

  //     tempDate.setMonth(tempDate.getMonth() + 1);
  //   }

  //   return months;
  // };
// Shows ALL pending/due months based on the new rent cycle logic (advance/normal)
const getAllPendingMonths = (tenant) => {
  if (!tenant?.joiningDate) return [];

  const months = getBillingMonthsUpToNow(tenant);
  const out = [];

  months.forEach(({ y, m }) => {
    const c = getMonthCell(tenant, y, m);
    const isRealDue =
      c?.isPast && (c.label === "Due" || c.label === "Pending");
    const outstanding = Number(c?.outstanding || 0);
    if (isRealDue && outstanding > 0) {
      const monthLabel = new Date(y, m, 1).toLocaleString("default", {
          month: "long",
          year: "numeric",
      });
      out.push({
        y,
        m,
        key: `${y}-${m}`,
        label: monthLabel,
        cycle: c.rangeText || "",
        dueDate: c.dateStr || "",
        expected: Number(c.expected || 0),
        paid: Number(c.amountPaid || 0),
        outstanding,
      });
    }
  });

  return out;
};

  const handleEdit = (tenant) => {
    const { rentAmount, date } = getDisplayedRent(tenant.rents);
    const latestRent = (Array.isArray(tenant?.rents) ? tenant.rents : []).slice(-1)[0];
    const rentDate = date ? new Date(date) : new Date();
    setEditMonthYM({ y: rentDate.getFullYear(), m: rentDate.getMonth() });
    setEditingTenant(tenant);
    setEditRentCanteen(normalizeCanteenValue(tenant?.canteen));
    setEditRentCanteenAmount("");
    setEditRentDiscount("");
setEditRentAmount(rentAmount);
setEditRentDate(date || new Date().toISOString().split("T")[0]);
setEditUtr(String(latestRent?.utr || ""));
setEditReceiptUrl(String(latestRent?.receiptUrl || ""));
  };

  const handleDelete = async (tenant) => {
    try {
      // Determine current month-year key, matching how backend identifies rent
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      // const monthKey = `${currentMonth}-${currentYear}`; // format to match backend

      // // Make sure you pass monthKey in URL or request body as per backend spec
      // await axios.delete(`${apiUrl}form/${tenant._id}/rent/${monthKey}`);
      // Backend expects e.g. "Apr-25"
      const opts = { month: "short" };
      const monthStr = new Date(currentYear, currentMonth, 1).toLocaleString(
        "en-US",
        opts
      );
      const yy = String(currentYear).slice(-2);
      const monthKey = `${monthStr}-${yy}`;

      await axios.delete(`${apiUrl}form/${tenant._id}/rent/${monthKey}`);

      // Refresh data after delete
      const response = await axios.get(apiUrl);
      setFormData(
        filterTenantsForTracker(
          response.data,
          Array.isArray(allRoomsData) ? allRoomsData : []
        )
      );
    } catch (error) {
      alert(
        "Failed to delete rent: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  // formupdate

 const formatVacantBedOption = (bed) =>
  `${formatTrackerUnit(bed.roomNo, bed.bedNo)}`;

 const getTrackerVacancyNoun = useCallback(() => {
  if (trackerType === "shop") return "shop";
  if (trackerType === "room") return "room";
  return "bed";
 }, [trackerType]);

 const buildUndoLeaveConflictMessage = useCallback(
  (data = {}) => {
    if (trackerType === "shop") {
      const shopNo = data?.occupant?.roomNo || data?.roomNo || "";
      const occupantName = data?.occupant?.name || "another tenant";
      return `Old shop ${shopNo} is already occupied by ${occupantName}. Select another vacant shop to undo leave.`;
    }

    if (trackerType === "room") {
      const roomNo = data?.occupant?.roomNo || data?.roomNo || "";
      const occupantName = data?.occupant?.name || "another tenant";
      return `Old room ${roomNo} is already occupied by ${occupantName}. Select another vacant room to undo leave.`;
    }

    return data?.message || "Please select another vacant bed.";
  },
  [trackerType]
 );

 const filterVacantSlotsForCurrentTracker = useCallback(
  (vacantSlots = []) => {
    const allowedRoomNos = new Set(
      (roomsData || [])
        .map((room) => String(room?.roomNo ?? "").trim())
        .filter(Boolean)
    );

    const occupiedRoomNos = new Set(
      (formData || [])
        .filter((tenant) => isActiveTenant(tenant))
        .map((tenant) => String(tenant?.roomNo ?? "").trim())
        .filter(Boolean)
    );

    const seenKeys = new Set();

    return (Array.isArray(vacantSlots) ? vacantSlots : []).filter((slot) => {
      const roomNo = String(slot?.roomNo ?? "").trim();
      const bedNo = String(slot?.bedNo ?? "").trim();

      if (!allowedRoomNos.has(roomNo)) return false;

      if (trackerType !== "bed" && occupiedRoomNos.has(roomNo)) return false;

      const dedupeKey = trackerType === "bed" ? `${roomNo}__${bedNo}` : roomNo;
      if (seenKeys.has(dedupeKey)) return false;
      seenKeys.add(dedupeKey);

      return true;
    });
  },
  [roomsData, formData, trackerType, today0]
 );



 const openUndoBedModal = (tenantId, message, vacantBeds = []) => {
  const filteredVacantBeds = filterVacantSlotsForCurrentTracker(vacantBeds);

  if (!filteredVacantBeds.length) {
    const trackerLabel =
      trackerType === "shop" ? "shop" : trackerType === "room" ? "room" : "bed";
    alert(
      `${message}\n\nNo vacant ${trackerLabel}s are available right now. ${
        trackerType === "bed"
          ? "Please free another bed first."
          : `Please add or free another ${trackerLabel} first.`
      }`
    );
    return;
  }

  setUndoBedModal({
    show: true,
    tenantId,
    message,
    vacantBeds: filteredVacantBeds,
    selectedIndex: "",
    busy: false,
  });
};

 const undoLeaveRequest = async (tenantId, bedOverride = null) => {
  const payload = { id: tenantId };
  if (bedOverride) {
    payload.roomNo = bedOverride.roomNo;
    payload.bedNo = bedOverride.bedNo;
    payload.category = bedOverride.category;
  }

  return axios.post(`${apiUrl}/cancel-leave`, payload);
};

 const handleConfirmUndoWithSelectedBed = async () => {
  const selectedIndex = Number(undoBedModal.selectedIndex);
  const pickedBed = undoBedModal.vacantBeds[selectedIndex];
  if (!pickedBed) {
    alert(`Please select a vacant ${getTrackerVacancyNoun()}.`);
    return;
  }

  try {
    setUndoBedModal((prev) => ({ ...prev, busy: true }));
    const retryRes = await undoLeaveRequest(undoBedModal.tenantId, pickedBed);
    if (retryRes.data?.success) {
      const restored = retryRes.data?.form;
      alert(
        `Leave undone successfully.\nAssigned: ${formatTrackerUnit(restored?.roomNo || pickedBed.roomNo, restored?.bedNo || pickedBed.bedNo)}`
      );
      setUndoBedModal({
        show: false,
        tenantId: "",
        message: "",
        vacantBeds: [],
        selectedIndex: "",
        busy: false,
      });
      await refreshTenants?.();
      return;
    }
    alert(retryRes.data?.message || "Failed to undo leave.");
    setUndoBedModal((prev) => ({ ...prev, busy: false }));
  } catch (retryError) {
    console.error("Error undoing leave with selected bed:", retryError);
    alert(retryError?.response?.data?.message || "Failed to undo leave with selected bed.");
    setUndoBedModal((prev) => ({ ...prev, busy: false }));
  }
};

 const handleUndoClick = async (tenantId) => {
  try {
    let res = await undoLeaveRequest(tenantId);

    if (res.data?.success) {
      const restored = res.data?.form;
      alert(
        `Leave undone successfully.\nAssigned: ${formatTrackerUnit(restored?.roomNo || "-", restored?.bedNo || "-")}`
      );
      await refreshTenants?.();
      return;
    }

    alert(res.data?.message || "Failed to undo leave.");
  } catch (error) {
    const data = error?.response?.data;
    if (error?.response?.status === 409 && (data?.code === "BED_OCCUPIED" || data?.code === "BED_REQUIRED")) {
      openUndoBedModal(
        tenantId,
        data?.code === "BED_OCCUPIED"
          ? buildUndoLeaveConflictMessage(data)
          : `Please select another vacant ${getTrackerVacancyNoun()}.`,
        data.vacantBeds || []
      );
      return;
    }

    console.error("Error undoing leave:", error);
    alert(data?.message || "Failed to undo leave.");
  }
};
  const handleDownloadForm = async (tenant) => {
    try {
    const id = tenant?._id;
    if (!id) {
      alert("Tenant ID missing.");
      return;
    }

    const response = await axios.get(`${apiUrl}form/${id}`);
    const item = response.data;

    const formatDate = (v) => {
      if (!v) return "N/A";
      const d = new Date(v);
      return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("en-IN");
    };


    // ✅ Find current month rent from rents array
    const today = new Date();
    const rents = Array.isArray(item.rents) ? item.rents : [];

    const currentMonthRent = rents.find((r) => {
      const d = new Date(r.date);
      return (
        !isNaN(d.getTime()) &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    });

    const currentMonthRentAmount = currentMonthRent ? toNum(currentMonthRent.rentAmount) : 0;

    // ✅ Bed price / base rent fallback
    const bedPrice = toNum(item.baseRent); // your bed price stored here
    const effectiveRentAmount = currentMonthRentAmount > 0 ? currentMonthRentAmount : bedPrice;
    const exportDocs = getExportDocuments(item, tenant);
    const docLinkRows = [];
    const settlement = item.leaveSettlement || {};
    const settlementDeductions = Array.isArray(settlement.deductions)
      ? settlement.deductions
      : [];
    const totalDeductionAmount =
      settlement.totalDeduction != null
        ? Number(settlement.totalDeduction || 0)
        : settlementDeductions.reduce(
            (sum, deduction) => sum + Number(deduction?.amount || 0),
            0
          );
    const extraDaysDeductions = settlementDeductions.filter((deduction) => {
      const label = String(deduction?.month || "").toLowerCase();
      return (
        Number(deduction?.days || 0) > 0 ||
        Number(deduction?.dailyRent || 0) > 0 ||
        Boolean(deduction?.cycleRange) ||
        label.includes("extra")
      );
    });
    const extraDaysDeductionAmount = extraDaysDeductions.reduce(
      (sum, deduction) => sum + Number(deduction?.amount || 0),
      0
    );
    const fullMonthDeductionAmount = Math.max(
      0,
      totalDeductionAmount - extraDaysDeductionAmount
    );
    const extraDaysDetailText = extraDaysDeductions
      .map((deduction) => {
        const parts = [
          deduction.month || "Extra days rent",
          deduction.days ? `${deduction.days} days` : "",
          deduction.dailyRent
            ? `Rs. ${Number(deduction.dailyRent || 0).toLocaleString("en-IN")} per day`
            : "",
          deduction.cycleRange || "",
          `Rs. ${Number(deduction.amount || 0).toLocaleString("en-IN")}`,
        ].filter(Boolean);
        return parts.join(" | ");
      })
      .join("\n");

    const reportTitle = `Tenant Report - ${item.name || "Tenant"}`;
    const generatedLine = `Generated on ${new Date().toLocaleString("en-IN")}`;

    const formatted = [
      [reportTitle],
      [generatedLine],
      [],
      ["Field", "Value"],
      ["SrNo", item.srNo ?? ""],
      ["Name", item.name ?? ""],
      ["Phone", item.phoneNo ?? ""],
      ["Category", item.category ?? ""],
      ["WingName", item.wingName ?? ""],
      ["FlatType", item.flatType ?? ""],
      ["JoiningDate", formatDate(item.joiningDate)],
      ["RoomNo", item.roomNo ?? ""],
      ["FloorNo", item.floorNo ?? ""],
      ["BedNo", item.bedNo ?? ""],
      ["DepositAmount", item.depositAmount ?? ""],
      ["Address", item.address ?? ""],
      ["RelativeAddress1", item.relativeAddress1 ?? item.relative1Address ?? ""],
      ["RelativeAddress2", item.relativeAddress2 ?? item.relative2Address ?? ""],
      ["CompanyAddress", item.companyAddress ?? ""],
      ["DateOfJoiningCollege", formatDate(item.dateOfJoiningCollege)],
      ["DOB", formatDate(item.dob)],
      ["LeaveDate", formatDate(item.leaveDate)],
      [
        "DeductFromDeposit",
        settlement.deductFromDeposit ? "Yes" : "No",
      ],
      [
        "GrossDeposit",
        settlement.grossDeposit ?? item.depositAmount ?? "",
      ],
      ["FullMonthDeduction", fullMonthDeductionAmount],
      ["ExtraDaysDeduction", extraDaysDeductionAmount],
      ["ExtraDaysDetails", extraDaysDetailText || "N/A"],
      ["TotalDeduction", totalDeductionAmount],
      [
        "RefundableDeposit",
        settlement.refundableDeposit ?? item.depositAmount ?? "",
      ],
      [
        "AmountDueFromTenant",
        settlement.amountDueFromTenant ?? 0,
      ],
    ];

    // ✅ Optional: include full rent history
    if (rents.length > 0) {
      formatted.push(["", ""]);
      formatted.push(["Rents History", ""]);
      rents.forEach((rent, i) => {
        formatted.push([`Rent ${i + 1} Amount`, rent.rentAmount ?? ""]);
        formatted.push([`Rent ${i + 1} Date`, formatDate(rent.date)]);
      });
    }

    if (exportDocs.length > 0) {
      formatted.push(["", ""]);
      formatted.push(["Documents", ""]);
      exportDocs.forEach((doc, i) => {
        const href = docHrefSafe(doc);
        formatted.push([`Doc ${i + 1} Relation`, doc.relation || ""]);
        formatted.push([`Doc ${i + 1} URL`, href || "No link available"]);
        if (href) {
          docLinkRows.push({
            row: formatted.length - 1,
            label: doc.fileName || doc.relation || `Document ${i + 1}`,
            url: href,
          });
        }
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(formatted);
    normalizeSheetText(ws, 4, formatted.length - 1, 0, 1);
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    ];
    ws["!cols"] = [{ wch: 32 }, { wch: 45 }];

    styleTitleRow(ws, 0, 1, false);
    styleTitleRow(ws, 1, 1, true);
    setCellStyle(ws, 3, 0, {
      font: {
        name: "Calibri",
        sz: 11,
        bold: true,
        color: rgb("FFFFFF"),
      },
      fill: {
        patternType: "solid",
        fgColor: rgb(EXPORT_COLORS.header),
      },
      border: borderStyle(EXPORT_COLORS.header),
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
    });
    setCellStyle(ws, 3, 1, {
      font: {
        name: "Calibri",
        sz: 11,
        bold: true,
        color: rgb("FFFFFF"),
      },
      fill: {
        patternType: "solid",
        fgColor: rgb(EXPORT_COLORS.header),
      },
      border: borderStyle(EXPORT_COLORS.header),
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
    });

    for (let row = 4; row < formatted.length; row++) {
      const [label, value] = formatted[row] || [];
      if (!label && !value) continue;

      if (label && !value && label !== "Field") {
        styleSectionRow(ws, row, 1);
        continue;
      }

      const fillColor = row % 2 === 0 ? EXPORT_COLORS.bandFill : "FFFFFF";
      setCellStyle(ws, row, 0, {
        font: {
          name: "Calibri",
          sz: 11,
          bold: true,
          color: rgb(EXPORT_COLORS.text),
        },
        fill: {
          patternType: "solid",
          fgColor: rgb(EXPORT_COLORS.labelFill),
        },
        border: borderStyle(),
        alignment: {
          horizontal: "left",
          vertical: "center",
          wrapText: true,
        },
      });
      setCellStyle(ws, row, 1, {
        font: {
          name: "Calibri",
          sz: 11,
          color: rgb(EXPORT_COLORS.text),
        },
        fill: {
          patternType: "solid",
          fgColor: rgb(fillColor),
        },
        border: borderStyle(),
        alignment: {
          horizontal: "left",
          vertical: "center",
          wrapText: true,
        },
      });
    }

    docLinkRows.forEach(({ row, url, label }) => {
      setCellStyle(ws, row, 1, {
        font: {
          name: "Calibri",
          sz: 11,
          color: rgb("0563C1"),
          underline: true,
        },
        fill: {
          patternType: "solid",
          fgColor: rgb(row % 2 === 0 ? EXPORT_COLORS.bandFill : "FFFFFF"),
        },
        border: borderStyle(),
        alignment: {
          horizontal: "left",
          vertical: "center",
          wrapText: true,
        },
      });
      setHyperlinkCell(ws, row, 1, url, `Open ${label}`);
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tenant Data");

    const settlementRows = [
      [`Leave Settlement - ${item.name || "Tenant"}`],
      [`Generated on ${new Date().toLocaleString("en-IN")}`],
      [],
      ["Field", "Value"],
      ["Leave Date", formatDate(item.leaveDate)],
      ["Deduct From Deposit", settlement.deductFromDeposit ? "Yes" : "No"],
      [
        "Gross Deposit",
        settlement.grossDeposit ?? item.depositAmount ?? "",
      ],
      ["Full Month Deduction", fullMonthDeductionAmount],
      ["Extra Days Deduction", extraDaysDeductionAmount],
      ["Total Deduction", totalDeductionAmount],
      [
        "Refundable Deposit",
        settlement.refundableDeposit ?? item.depositAmount ?? "",
      ],
      [
        "Amount Due From Tenant",
        settlement.amountDueFromTenant ?? 0,
      ],
    ];

    settlementDeductions.forEach((deduction, idx) => {
      settlementRows.push([`Deduction ${idx + 1} Month`, deduction.month || ""]);
      settlementRows.push([`Deduction ${idx + 1} Amount`, deduction.amount ?? 0]);
      if (Number(deduction?.days || 0) > 0) {
        settlementRows.push([`Deduction ${idx + 1} Days`, deduction.days]);
      }
      if (Number(deduction?.dailyRent || 0) > 0) {
        settlementRows.push([`Deduction ${idx + 1} Daily Rent`, deduction.dailyRent]);
      }
      if (deduction?.cycleRange) {
        settlementRows.push([`Deduction ${idx + 1} Cycle Range`, deduction.cycleRange]);
      }
    });

    if (settlementRows.length > 1) {
      const settlementSheet = XLSX.utils.aoa_to_sheet(settlementRows);
      normalizeSheetText(settlementSheet, 4, settlementRows.length - 1, 0, 1);
      settlementSheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      ];
      settlementSheet["!cols"] = [{ wch: 24 }, { wch: 40 }];
      styleTitleRow(settlementSheet, 0, 1, false);
      styleTitleRow(settlementSheet, 1, 1, true);
      setCellStyle(settlementSheet, 3, 0, {
        font: {
          name: "Calibri",
          sz: 11,
          bold: true,
          color: rgb("FFFFFF"),
        },
        fill: {
          patternType: "solid",
          fgColor: rgb(EXPORT_COLORS.header),
        },
        border: borderStyle(EXPORT_COLORS.header),
        alignment: {
          horizontal: "center",
          vertical: "center",
          wrapText: true,
        },
      });
      setCellStyle(settlementSheet, 3, 1, {
        font: {
          name: "Calibri",
          sz: 11,
          bold: true,
          color: rgb("FFFFFF"),
        },
        fill: {
          patternType: "solid",
          fgColor: rgb(EXPORT_COLORS.header),
        },
        border: borderStyle(EXPORT_COLORS.header),
        alignment: {
          horizontal: "center",
          vertical: "center",
          wrapText: true,
        },
      });
      for (let row = 4; row < settlementRows.length; row++) {
        const fillColor = row % 2 === 0 ? EXPORT_COLORS.bandFill : "FFFFFF";
        setCellStyle(settlementSheet, row, 0, {
          font: {
            name: "Calibri",
            sz: 11,
            bold: true,
            color: rgb(EXPORT_COLORS.text),
          },
          fill: {
            patternType: "solid",
            fgColor: rgb(EXPORT_COLORS.labelFill),
          },
          border: borderStyle(),
          alignment: {
            horizontal: "left",
            vertical: "center",
            wrapText: true,
          },
        });
        setCellStyle(settlementSheet, row, 1, {
          font: {
            name: "Calibri",
            sz: 11,
            color: rgb(EXPORT_COLORS.text),
          },
          fill: {
            patternType: "solid",
            fgColor: rgb(fillColor),
          },
          border: borderStyle(),
          alignment: {
            horizontal: "left",
            vertical: "center",
            wrapText: true,
          },
        });
      }
      XLSX.utils.book_append_sheet(wb, settlementSheet, "Leave Settlement");
    }

    const docs = exportDocs;
    if (docs.length > 0) {
      const docRows = [["Documents"]];
      docRows.push([`Generated on ${new Date().toLocaleString("en-IN")}`]);
      docRows.push([""]);
      docRows.push(["Document", "Relation", "ImageKit URL"]);
      docs.forEach((doc, idx) => {
        const href = docHrefSafe(doc);
        docRows.push([
          doc.fileName || doc.relation || `Document ${idx + 1}`,
          doc.relation || "",
          href || "No link available",
        ]);
      });

      const docsSheet = XLSX.utils.aoa_to_sheet(docRows);
      normalizeSheetText(docsSheet, 4, docRows.length - 1, 0, 2);
      docsSheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
      ];
      docsSheet["!cols"] = [{ wch: 28 }, { wch: 20 }, { wch: 90 }];
      styleTitleRow(docsSheet, 0, 2, false);
      styleTitleRow(docsSheet, 1, 2, true);
      for (let c = 0; c < 3; c++) {
        setCellStyle(docsSheet, 3, c, {
          font: {
            name: "Calibri",
            sz: 11,
            bold: true,
            color: rgb("FFFFFF"),
          },
          fill: {
            patternType: "solid",
            fgColor: rgb(EXPORT_COLORS.header),
          },
          border: borderStyle(EXPORT_COLORS.header),
          alignment: {
            horizontal: "center",
            vertical: "center",
            wrapText: true,
          },
        });
      }
      for (let row = 4; row < docRows.length; row++) {
        const fillColor = row % 2 === 0 ? EXPORT_COLORS.bandFill : "FFFFFF";
        setCellStyle(docsSheet, row, 0, {
          font: {
            name: "Calibri",
            sz: 11,
            bold: true,
            color: rgb(EXPORT_COLORS.text),
          },
          fill: {
            patternType: "solid",
            fgColor: rgb(EXPORT_COLORS.labelFill),
          },
          border: borderStyle(),
          alignment: {
            horizontal: "left",
            vertical: "center",
            wrapText: true,
          },
        });
        setCellStyle(docsSheet, row, 1, {
          font: {
            name: "Calibri",
            sz: 11,
            color: rgb(EXPORT_COLORS.text),
          },
          fill: {
            patternType: "solid",
            fgColor: rgb(fillColor),
          },
          border: borderStyle(),
          alignment: {
            horizontal: "left",
            vertical: "center",
            wrapText: true,
          },
        });
        const href = docHrefSafe(docs[row - 4]);
        setCellStyle(docsSheet, row, 2, {
          font: {
            name: "Calibri",
            sz: 11,
            color: rgb(href ? "0563C1" : EXPORT_COLORS.text),
            underline: !!href,
          },
          fill: {
            patternType: "solid",
            fgColor: rgb(fillColor),
          },
          border: borderStyle(),
          alignment: {
            horizontal: "left",
            vertical: "center",
            wrapText: true,
          },
        });
        if (href) {
          setHyperlinkCell(
            docsSheet,
            row,
            2,
            href,
            `Open ${docs[row - 4]?.fileName || docs[row - 4]?.relation || "document"}`
          );
        }
      }
      XLSX.utils.book_append_sheet(wb, docsSheet, "Documents");
    }

    const safeName = (item.name || "Tenant").replace(/[\\/:*?"<>|]/g, "_");
    XLSX.writeFile(wb, `Tenant_${safeName}.xlsx`, { cellStyles: true });
  } catch (err) {
    console.error("Download failed", err);
    alert("Failed to download tenant data.");
  }
};

  const closeEditTenantModal = () => {
    setShowEditModal(false);
    setEditSelfAadharFile([]);
    setEditParentAadharFile([]);
    setEditPhotoFile([]);
    setEditPanCardFile([]);
    setEditDocMsg("");
  };

  const deleteSavedTenantDocument = async (documentIndex) => {
    const documents = Array.isArray(editTenantData?.documents) ? editTenantData.documents : [];
    const document = documents[documentIndex];
    if (!document || !window.confirm(`Delete ${document.fileName || document.relation || "this document"}?`)) return;

    try {
      setEditDocMsg("");
      const remainingDocuments = documents.filter((_, index) => index !== documentIndex);
      const response = await axios.put(`${apiUrl}forms/${editTenantData._id}`, { documents: remainingDocuments });
      const updated = response.data?.form || { ...editTenantData, documents: remainingDocuments };
      setEditTenantData(updated);
      setFormData((current) => current.map((tenant) => tenant._id === updated._id ? updated : tenant));
    } catch (err) {
      setEditDocMsg(err.response?.data?.message || "Unable to delete this document.");
    }
  };

  const handleShareEditTenantLink = async () => {
    try {
      if (!editTenantData?._id) {
        alert("Tenant ID missing.");
        return;
      }
      if (creatingEditInvite) return;
      setCreatingEditInvite(true);

      const toNumLocal = (v) => {
        if (v === "" || v == null) return undefined;
        const n = Number(String(v).replace(/[,₹\s]/g, ""));
        return Number.isFinite(n) ? n : undefined;
      };

      const joinDate =
        editTenantData.joiningDate?.split("T")[0] ||
        editTenantData.joiningDate ||
        undefined;

      const inferredCategory =
        editTenantData.category ||
        roomsData.find((r) => String(r.roomNo) === String(editTenantData.roomNo))
          ?.category ||
        undefined;

      const payload = {
        name: editTenantData.name || undefined,
        phoneNo: editTenantData.phoneNo || undefined,
        address: editTenantData.address || undefined,
        pincode: editTenantData.pincode || undefined,
        city: editTenantData.city || undefined,
        state: editTenantData.state || undefined,
        houseNo: editTenantData.houseNo || undefined,
        nearbyPlace: editTenantData.nearbyPlace || undefined,
        relativeAddress: trackerType === "bed" ? editTenantData.relativeAddress || undefined : undefined,
        relative1Relation: trackerType === "bed" ? editTenantData.relative1Relation || undefined : undefined,
        relative1Name: trackerType === "bed" ? editTenantData.relative1Name || undefined : undefined,
        relative1Phone: trackerType === "bed" ? editTenantData.relative1Phone || undefined : undefined,
        relative2Relation: trackerType === "bed" ? editTenantData.relative2Relation || undefined : undefined,
        relative2Name: trackerType === "bed" ? editTenantData.relative2Name || undefined : undefined,
        relative2Phone: trackerType === "bed" ? editTenantData.relative2Phone || undefined : undefined,
        familyMembers:
          trackerType === "room" && String(editTenantData.familyMembers || "").trim() !== ""
            ? (() => {
                const parsed = Number(editTenantData.familyMembers);
                return Number.isFinite(parsed) ? parsed : undefined;
              })()
            : undefined,
        companyAddress: editTenantData.companyAddress || undefined,
        shopBusiness: editTenantData.shopBusiness || undefined,
        shopName: editTenantData.shopName || undefined,
        dateOfJoiningCollege: editTenantData.dateOfJoiningCollege || undefined,
        dob: editTenantData.dob || undefined,
        roomNo: editTenantData.roomNo || undefined,
        wingName: trackerType === "room" ? editTenantData.wingName || undefined : undefined,
        bedNo: editTenantData.bedNo || undefined,
        floorNo: trackerType === "room" ? editTenantData.floorNo || undefined : undefined,
        joiningDate: joinDate,
        baseRent: toNumLocal(editTenantData.baseRent),
        rentAmount: toNumLocal(
          editTenantData.baseRent !== "" && editTenantData.baseRent != null
            ? editTenantData.baseRent
            : editTenantData.rentAmount
        ),
        depositAmount: toNumLocal(editTenantData.depositAmount),
        category: inferredCategory,
        canteen: normalizeCanteenValue(editTenantData.canteen),
        hasCanteen: trackerType === "bed" && normalizeCanteenValue(editTenantData.canteen || editTenantData.hasCanteen) === "yes",
        ...tenantCanteenFields(editTenantData, canteenSettings, trackerType),
        firstRentStatus: editTenantData.firstRentStatus || undefined,
        firstRentMonth: editTenantData.firstRentMonth || undefined,
        firstRentPaidDate: editTenantData.firstRentPaidDate || undefined,
      };

      const res = await axios.post(
        `${apiUrl}invites/for-form/${editTenantData._id}`,
        payload,
        { headers: { "X-Origin": window.location.origin } }
      );

      const url = getWebTenantInviteUrl(res.data, appBasePath);
      if (!url) {
        alert("Invite created but URL missing.");
        setCreatingEditInvite(false);
        return;
      }

      const shareData = {
        title: "Tenant Form (One-Time)",
        text: "Please fill this form:",
        url,
      };

      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        alert("One-time link copied to clipboard.");
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        (typeof e?.response?.data === "string" ? e.response.data : "") ||
        e.message;
      console.error("EDIT INVITE ERROR =>", e?.response?.data || e);
      alert(`Could not create invite link.\n\n${msg}`);
    } finally {
      setCreatingEditInvite(false);
    }
  };




  const handleTenantUpdate = async () => {
    try {
      setEditDocMsg("");
      const hasEditDocs =
        editSelfAadharFile.length > 0 || editParentAadharFile.length > 0 || editPhotoFile.length > 0 || editPanCardFile.length > 0;
      const firstRentStatus = String(
        editTenantData.firstRentStatus || "NOT_PAID"
      ).trim();
      const firstRentMonth = getFirstRentMonthForStatus(
        editTenantData.joiningDate,
        firstRentStatus
      );

      if (hasEditDocs) {
        const rentAmountNum = Number(
          editTenantData.baseRent ?? editTenantData.rentAmount ?? 0
        );
        if (!Number.isFinite(rentAmountNum) || rentAmountNum <= 0) {
          setEditDocMsg("Rent Amount is required (must be a valid number).");
          return;
        }
        if (!editTenantData.joiningDate) {
          setEditDocMsg("Joining Date is required.");
          return;
        }

        const fd = new FormData();
        fd.append("formId", editTenantData._id);
        fd.append("rentAmount", String(rentAmountNum));
        fd.append(
          "depositAmount",
          String(Number(editTenantData.depositAmount ?? 0))
        );
        fd.append("paymentMode", "Cash");
        fd.append("month", firstRentMonth);
        fd.append("firstRentStatus", firstRentStatus);
        fd.append("firstRentMonth", firstRentMonth);

        fd.append("name", editTenantData.name || "");
        fd.append("phoneNo", editTenantData.phoneNo || "");
        fd.append("address", editTenantData.address || "");
        if (editTenantData.pincode) fd.append("pincode", editTenantData.pincode);
        if (editTenantData.city) fd.append("city", editTenantData.city);
        if (editTenantData.state) fd.append("state", editTenantData.state);
        if (editTenantData.houseNo) fd.append("houseNo", editTenantData.houseNo);
        if (editTenantData.nearbyPlace) fd.append("nearbyPlace", editTenantData.nearbyPlace);
        fd.append(
          "joiningDate",
          editTenantData.joiningDate?.split("T")[0] ||
            editTenantData.joiningDate ||
            ""
        );
        fd.append("roomNo", editTenantData.roomNo || "");
        if (editTenantData.wingName) fd.append("wingName", editTenantData.wingName);
        fd.append("bedNo", editTenantData.bedNo || "");
        fd.append("floorNo", editTenantData.floorNo || "");
        fd.append(
          "baseRent",
          String(
            Number(editTenantData.baseRent ?? rentAmountNum ?? 0) || rentAmountNum
          )
        );
        fd.append("companyAddress", editTenantData.companyAddress || "");
        fd.append("shopBusiness", editTenantData.shopBusiness || "");
        fd.append("shopName", editTenantData.shopName || "");
        fd.append(
          "dateOfJoiningCollege",
          editTenantData.dateOfJoiningCollege?.split("T")[0] ||
            editTenantData.dateOfJoiningCollege ||
            ""
        );
        fd.append(
          "dob",
          editTenantData.dob?.split("T")[0] || editTenantData.dob || ""
        );
        fd.append("category", editTenantData.category || "");
        fd.append("canteen", normalizeCanteenValue(editTenantData.canteen));
        fd.append("hasCanteen", String(trackerType === "bed" && normalizeCanteenValue(editTenantData.canteen || editTenantData.hasCanteen) === "yes"));
        if (trackerType === "bed") {
          const canteenFields = tenantCanteenFields(editTenantData, canteenSettings, trackerType);
          fd.append("canteenPlanType", canteenFields.canteenPlanType);
          fd.append("canteenMonthlyAmount", String(canteenFields.canteenMonthlyAmount));
          if (canteenFields.canteenStartDate) fd.append("canteenStartDate", canteenFields.canteenStartDate);
          canteenMeals.forEach((meal) => fd.append(`canteenMealPrices[${meal}]`, String(canteenFields.canteenMealPrices[meal])));
          canteenFields.canteenIncludedMeals.forEach((meal) => fd.append("canteenIncludedMeals[]", meal));
        }

        if (trackerType === "bed") {
          fd.append("relativeAddress", editTenantData.relativeAddress || "");
          fd.append("relative1Relation", editTenantData.relative1Relation || "");
          fd.append("relative1Name", editTenantData.relative1Name || "");
          fd.append("relative1Phone", editTenantData.relative1Phone || "");
          fd.append("relative2Relation", editTenantData.relative2Relation || "");
          fd.append("relative2Name", editTenantData.relative2Name || "");
          fd.append("relative2Phone", editTenantData.relative2Phone || "");
        }
        if (trackerType === "room" && String(editTenantData.familyMembers || "").trim() !== "") {
          fd.append("familyMembers", String(editTenantData.familyMembers));
        }

        if (editSelfAadharFile.some((file) => !isAllowedImageFile(file))) {
          setEditDocMsg("Self Aadhaar Card must be JPG, JPEG, or PNG.");
          return;
        }
        if (editParentAadharFile.some((file) => !isAllowedImageFile(file))) {
          setEditDocMsg(
            `${trackerType === "room" ? "Partner Aadhaar Card" : "Parent Aadhaar Card"} must be JPG, JPEG, or PNG.`
          );
          return;
        }
        if (editPhotoFile.some((file) => !isAllowedImageFile(file))) {
          setEditDocMsg("Tenant Photograph must be JPG, JPEG, or PNG.");
          return;
        }
        if (editPanCardFile.some((file) => !isAllowedImageFile(file))) {
          setEditDocMsg("PAN Card must be JPG, JPEG, or PNG.");
          return;
        }
        if (editSelfAadharFile.length + editParentAadharFile.length + editPhotoFile.length + editPanCardFile.length > 10) {
          setEditDocMsg("You can upload a maximum of 10 documents at one time.");
          return;
        }

        for (const file of editSelfAadharFile) {
          const f = await compressForUpload(file);
          fd.append("documents", f);
          fd.append("relations", "Self Aadhaar Card");
        }
        for (const file of editParentAadharFile) {
          const f = await compressForUpload(file);
          fd.append("documents", f);
          fd.append("relations", trackerType === "room" ? "Partner Aadhaar Card" : "Parent Aadhaar Card");
        }
        for (const file of editPhotoFile) {
          const f = await compressForUpload(file);
          fd.append("documents", f);
          fd.append("relations", "Tenant Photo");
        }
        for (const file of editPanCardFile) {
          const f = await compressForUpload(file);
          fd.append("documents", f);
          fd.append("relations", "PAN Card");
        }

        const API_ROOT = String(apiUrl).replace(/\/+$/, "");
        const FORMS_WITH_DOCS_URL = API_ROOT.endsWith("/api")
          ? `${API_ROOT}/forms-with-docs`
          : `${API_ROOT}/api/forms-with-docs`;

        const res = await axios.post(FORMS_WITH_DOCS_URL, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        alert("Tenant updated successfully!");
        const updated = res.data?.form || editTenantData;
        setFormData((prev) =>
          prev.map((t) => (t._id === editTenantData._id ? updated : t))
        );

        closeEditTenantModal();
        return;
      }

      const updatePayload = {
        ...editTenantData,
        canteen: normalizeCanteenValue(editTenantData.canteen),
        hasCanteen: trackerType === "bed" && normalizeCanteenValue(editTenantData.canteen || editTenantData.hasCanteen) === "yes",
        ...tenantCanteenFields(editTenantData, canteenSettings, trackerType),
        firstRentStatus,
        firstRentMonth,
      };
      delete updatePayload._id;
      delete updatePayload.__v;
      delete updatePayload.createdAt;
      delete updatePayload.updatedAt;
      delete updatePayload.__priceMode;
      delete updatePayload.__newBedPriceEdit;
      delete updatePayload.__priceMsg;
      delete updatePayload.__savingPrice;
      delete updatePayload.bedPrice;

      if (trackerType !== "bed") {
        updatePayload.canteen = undefined;
        updatePayload.hasCanteen = undefined;
        updatePayload.canteenPlanType = undefined;
        updatePayload.canteenMonthlyAmount = undefined;
        updatePayload.canteenStartDate = undefined;
        updatePayload.canteenMealPrices = undefined;
        updatePayload.canteenIncludedMeals = undefined;
        updatePayload.relativeAddress = undefined;
        updatePayload.relative1Relation = undefined;
        updatePayload.relative1Name = undefined;
        updatePayload.relative1Phone = undefined;
        updatePayload.relative2Relation = undefined;
        updatePayload.relative2Name = undefined;
        updatePayload.relative2Phone = undefined;
      }

      if (trackerType === "room") {
        updatePayload.familyMembers =
          String(editTenantData.familyMembers || "").trim() !== ""
            ? (() => {
                const parsed = Number(editTenantData.familyMembers);
                return Number.isFinite(parsed) ? parsed : undefined;
              })()
            : undefined;
      }

      const response = await axios.put(
        `${apiUrl}update/${editTenantData._id}`,
        updatePayload
      );
      alert("Tenant updated successfully!");
      const updatedTenant = response.data?.form || response.data;

      // Replace updated tenant in list
      setFormData((prev) =>
        prev.map((t) => (t._id === editTenantData._id ? updatedTenant : t))
      );

      closeEditTenantModal();
    } catch (err) {
      console.error("Update failed:", err?.response?.data || err);
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : "") ||
        err?.message ||
        "Failed to update tenant.";
      alert(message);
    }
  };
  const handleShiftSave = async () => {
    if (!shiftTenant || !shiftTargetKey) return;
    if (!shiftEffectiveDate) {
      alert("Please select the shift effective date.");
      return;
    }

    const slot = allVacantSlots.find((candidate) => getShiftSlotKey(candidate) === shiftTargetKey);
    if (!slot) {
      alert("The selected vacant unit is no longer available. Please refresh and choose another unit.");
      return;
    }
    const roomNo = slot.roomNo;
    const bedNo = slot.bedNo;

    const targetUnit = (allRoomsData || []).find((room) =>
      (slot?.roomId && String(room?._id) === String(slot.roomId)) ||
      (String(room?.roomNo) === String(roomNo) && String(room?.propertyType || "") === String(trackerType || ""))
    );
    const targetUnitId = slot?.roomId || targetUnit?._id;
    if (!targetUnitId) {
      alert("Unable to identify the selected vacant unit. Please refresh and try again.");
      return;
    }

    try {
      // ⛏️ Uses your existing update endpoint
      const res = await axios.post(`${apiUrl}forms/${shiftTenant._id}/shift`, {
        targetUnitId: String(targetUnitId),
        targetBedNo: bedNo,
        effectiveDate: shiftEffectiveDate,
      });

      // Update UI
      setFormData((prev) =>
        prev.map((t) => (t._id === shiftTenant._id ? (res.data?.tenant || res.data) : t))
      );

      setShowShiftModal(false);
      setShiftTenant(null);
      setShiftTargetKey("");
      setShiftEffectiveDate("");
      alert("Tenant shifted successfully.");
    } catch (err) {
      console.error("Shift room failed:", err);
      const unpaid = err?.response?.data?.unpaidRents;
      const unpaidText = Array.isArray(unpaid) && unpaid.length
        ? `\n\nPending: ${unpaid
            .map((item) => `${item.month} ₹${toNum(item.outstanding).toLocaleString("en-IN")}`)
            .join(", ")}`
        : "";
      alert(
        (err?.response?.data?.message ||
          "Failed to shift tenant. Please try again.") + unpaidText
      );
    }
  };

  const openDeleteConfirmation = (tenantId) => {
    setCurrentDeleteId(tenantId);
    setPassword("");
    setShowPasswordPrompt(true);
  };
  const verifyPassword = () => {
    if (/^\d{4,8}$/.test(String(password || "").trim())) {
      setShowPasswordPrompt(false);
      setShowDeleteConfirmation(true);
    } else {
      alert("Enter your 4 to 8 digit security PIN.");
    }
  };
  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`${apiUrl}form/${currentDeleteId}`, {
        data: { securityPin: String(password || "").trim() },
      });
      setFormData((prev) => prev.filter((t) => t._id !== currentDeleteId));
      alert("Tenant deleted successfully.");
      setShowDeleteConfirmation(false);
      setShowPasswordPrompt(false);
      setCurrentDeleteId(null);
      setPassword("");
      // The edit form belongs to the deleted tenant, so close it immediately.
      closeEditTenantModal();
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Failed to delete tenant.");
    }
  };

  // const showLastThreeRents = (tenant) => {
  //   const sortedRents = [...(tenant.rents || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  //   const lastThree = sortedRents.slice(0, 3);
  //   setSelectedRentDetails(lastThree);
  //   setSelectedTenantName(tenant.name);
  //   setShowRentModal(true);
  // };
  const showRentHistory = (tenant) => {
    const sortedRents = [...(tenant.rents || [])].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    setSelectedRentDetails(sortedRents); // 👈 full history now
    setSelectedRentTenant(tenant);
    setSelectedTenantName(tenant.name);
    setShowRentModal(true);
  };

  const sharePaymentReceipt = async () => {
    if (!paymentReceipt) return;
    const tenant = paymentReceipt.tenant || selectedRentTenant || {};
    const rent = paymentReceipt.rent || {};
    const payment = paymentReceipt.payment || {};
    const text = [
      "Rent payment receipt",
      `Tenant: ${tenant.name || "-"}`,
      `Rent month: ${rent.month || "-"}`,
      `Unit: ${tenant.roomNo || tenant.roomId?.roomNo || "-"}`,
      `Amount: Rs. ${Number(payment.amount ?? rent.rentAmount ?? 0).toLocaleString("en-IN")}`,
      `Payment mode: ${payment.paymentMode || "Cash"}`,
      `Date: ${payment.date ? new Date(payment.date).toLocaleDateString("en-IN") : "-"}`,
      payment.utr ? `Reference: ${payment.utr}` : "",
    ].filter(Boolean).join("\n");
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Rent payment receipt",
          text,
          url: window.location.href,
        });
        return;
      }
      if (navigator.clipboard) await navigator.clipboard.writeText(text);
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipt-${rent.month || "payment"}.txt`;
      link.click();
      URL.revokeObjectURL(url);
      alert("Receipt details copied and downloaded. You can share the downloaded file.");
    } catch (error) {
      if (error?.name !== "AbortError") alert("Unable to share receipt.");
    }
  };

  const getReceiptShareText = () => {
    const tenant = paymentReceipt?.tenant || selectedRentTenant || {};
    const rent = paymentReceipt?.rent || {};
    const payment = paymentReceipt?.payment || {};
    return [`Rent payment receipt`, `Tenant: ${tenant.name || "-"}`, `Rent month: ${rent.month || "-"}`, `Unit: ${tenant.roomNo || tenant.roomId?.roomNo || "-"}`, `Amount: Rs. ${Number(payment.amount ?? rent.rentAmount ?? 0).toLocaleString("en-IN")}`, `Payment mode: ${payment.paymentMode || "Cash"}`, `Date: ${payment.date ? new Date(payment.date).toLocaleDateString("en-IN") : "-"}`, payment.utr ? `Reference: ${payment.utr}` : ""].filter(Boolean).join("\n");
  };
  const shareReceiptWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(getReceiptShareText())}`, "_blank", "noopener,noreferrer");
  const shareReceiptEmail = () => { window.location.href = `mailto:?subject=${encodeURIComponent("Rent payment receipt")}&body=${encodeURIComponent(getReceiptShareText())}`; };
  const copyReceiptText = async () => { await navigator.clipboard?.writeText(getReceiptShareText()); alert("Receipt copied. You can paste it into any app."); };

  // const handleSave = async () => {
  //   if (!editingTenant) return;
  //   try {
  //     await axios.put(`${apiUrl}form/${editingTenant._id}`, {
  //       rentAmount: editRentAmount,
  //       date: editRentDate,
  //       month: new Date(editRentDate).toLocaleString('default', { month: 'short', year: '2-digit' })
  //     });
  //     setEditingTenant(null);
  //     // window.location.reload();
  //   } catch (error) {
  //     alert('Failed to update rent');
  //   }
  // };

const handleSave = async () => {
  if (!editingTenant) return;

  const paymentISO =
    editRentDate && String(editRentDate).trim()
      ? editRentDate
      : new Date().toISOString().split("T")[0];

  try {
    const monthKey = getEditRentMonthKey(editMonthYM, paymentISO);

    if (!monthKey) {
      alert("Please pick a valid rent month before saving.");
      return;
    }

    const rentPaymentAmount = Number(editRentAmount || 0);
    const canteenPaymentAmount = Number(editRentCanteenAmount || 0);
    if (!Number.isFinite(rentPaymentAmount) || rentPaymentAmount < 0 || !Number.isFinite(canteenPaymentAmount) || canteenPaymentAmount < 0) {
      alert("Enter valid rent and canteen amounts.");
      return;
    }
    const addedAmount = rentPaymentAmount + canteenPaymentAmount;
    if (addedAmount <= 0) {
      alert("Enter a payment amount greater than zero.");
      return;
    }
    const existingCell = getMonthCell(editingTenant, editMonthYM.y, editMonthYM.m);
    const existingPaidAmount = Number(existingCell?.amountPaid || 0);
    if (canteenPaymentAmount > 0 && rentUpdateMode === "replace") {
      alert("Use Add to existing when collecting a canteen amount.");
      return;
    }
    const totalPaidAmount =
      rentUpdateMode === "replace" ? addedAmount : existingPaidAmount + addedAmount;
    const normalizedDiscountAmount = Math.max(0, Number(editRentDiscount || 0) || 0);
    if (canteenPaymentAmount > 0) {
      const quote = editRentQuote?.month === monthKey
        ? editRentQuote
        : (await api.get(`/form/${editingTenant._id}/rent-quote`, { params: { month: monthKey } })).data;
      const remainingRent = Math.max(Number(quote.expected || 0) + Number(quote.discount || 0) - normalizedDiscountAmount - Number(quote.paid || 0), 0);
      const remainingCanteen = Math.max(Number(quote.canteen?.balance || 0), 0);
      if (rentPaymentAmount < remainingRent) {
        alert("Pay the remaining rent first. The system applies payments to rent before canteen dues.");
        return;
      }
      if (canteenPaymentAmount > remainingCanteen) {
        alert("Canteen amount cannot exceed the canteen due for this month.");
        return;
      }
    }
    const adjustedExpectedRent =
      Number(
        getSuggestedEditRentAmount(
          editingTenant,
          editMonthYM.y,
          editMonthYM.m,
          editRentCanteen,
          normalizedDiscountAmount
        ) || 0
      ) +
      existingPaidAmount;

    const payload = {
      rentAmount: addedAmount,
      date: paymentISO,
      paymentDate: paymentISO,
      month: monthKey,
      rentUpdateMode,
      paymentMode: editPaymentMode || "Cash",
      utr: editPaymentMode === "Online" ? editUtr.trim() : "",
      expectedRent: adjustedExpectedRent,
      canteenApplied: normalizeCanteenValue(editRentCanteen),
      discountAmount: normalizedDiscountAmount,
      receiptUrl: editReceiptUrl.trim(),
      note: editNote || "", // ✅ NEW (optional)
    };

    const savedRentResponse = await axios.put(`${apiUrl}form/${editingTenant._id}`, payload);
    const savedTenant = savedRentResponse.data;
    const savedRentEntry = (savedTenant?.rents || []).find((rent) => rent.month === monthKey);
    const savedPayment = (savedRentEntry?.payments || []).slice(-1)[0];
    setPaymentReceipt({
      tenant: savedTenant || editingTenant,
      rent: savedRentEntry || { month: monthKey, rentAmount: totalPaidAmount },
      payment: savedPayment || { amount: addedAmount, date: paymentISO, paymentMode: payload.paymentMode, utr: payload.utr, note: payload.note },
    });

    setFormData((prev) =>
      prev.map((t) =>
        t._id === editingTenant._id ? (savedTenant || t) : t
      )
    );

    await refreshTenants();
    setRentSummaryRevision((value) => value + 1);
    setEditRentCanteen("no");
    setEditRentCanteenAmount("");
    setEditRentDiscount("");
    setEditUtr("");
    setEditReceiptUrl("");
    setEditingTenant(null);
  } catch (error) {
    console.error(error);
    alert(error?.response?.data?.message || "Failed to update rent");
  }
};

  const handleManageUnitsNavigation = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const targetPath = `${appBasePath}${manageUnitsPath}`;
    if (window.location.pathname === targetPath) return;
    window.location.assign(targetPath);
  }, [appBasePath, manageUnitsPath]);
  const handleBackToDashboard = useCallback(() => {
    const targetPath = `${appBasePath}/maindashboard`;
    if (window.location.pathname === targetPath) return;
    window.location.assign(targetPath);
  }, [appBasePath]);
  const handleNavigation = (path) => {
    const shouldReplace = path === "/maindashboard" || path === "/maindashbaord";
    navigate(path, shouldReplace ? { replace: true } : undefined);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/");
  };

 const [pendingRents, setPendingRents] = useState(0);

useEffect(() => {
  if (!formData || !formData.length) {
    setPendingTenants([]);
    setPendingRents(0);
    return;
  }

  const fmt = (y, m) =>
    new Date(y, m, 1).toLocaleString("en-IN", { month: "short", year: "numeric" });

  const list = (formData || [])
    .filter((t) => !t.leaveDate) // ignore left tenants
    .map((t) => {
      // ✅ your existing due calc (same as table logic)
      const due = calculateDue(t.rents, t.joiningDate, t, roomsData);
      if (!due || due <= 0) return null;

      // build "Not paid for ..." based on your month-cells
      const dueMonths = getBillingMonthsUpToNow(t)
        .filter(({ y, m }) => {
          const c = getMonthCell(t, y, m);
          const isRealDue = c?.isPast && (c.label === "Due" || c.label === "Pending");
          return isRealDue && Number(c.outstanding || 0) > 0;
        })
        .map(({ y, m }) => fmt(y, m));

      return {
        tenant: t,
        dueAmount: due,
        reason:
          dueMonths.length > 0
            ? `Not paid for ${dueMonths.join(", ")}`
            : "Rent pending",
      };
    })
    .filter(Boolean)
    .sort(compareRoomBed);

  setPendingTenants(list);
  setPendingRents(list.length);
}, [formData, roomsData]);

const upcomingRentEntries = useMemo(() => {
  if (!formData || !formData.length) return [];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return (formData || [])
    .filter((t) => !t.leaveDate)
    .flatMap((t) =>
      months
        .map(({ y, m }) => {
          if (y !== currentYear || m > currentMonth) return null;

          const c = getMonthCell(t, y, m);
          if (!c || c.label !== "Upcoming") return null;

          return {
            key: `${t._id}-${y}-${m}`,
            tenant: t,
            roomNo: t.roomNo,
            bedNo: t.bedNo,
            billYear: y,
            billMonth: m,
            monthText: new Date(y, m, 1).toLocaleString("default", {
              month: "long",
              year: "numeric",
            }),
            dateStr:
              c.dateStr ||
              new Date(y, m, 1).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
              }),
            amount: Number(c.expected || expectFromTenant(t, roomsData) || 0),
          };
        })
        .filter(Boolean)
    )
    .sort((a, b) => {
      const roomCmp = compareRoomBed(a, b);
      if (roomCmp !== 0) return roomCmp;
      if (a.billYear !== b.billYear) return a.billYear - b.billYear;
      return a.billMonth - b.billMonth;
    });
}, [formData, roomsData, months]);

const summaryCounts = useMemo(() => {
  const units = Array.isArray(roomsData) ? roomsData : [];
  const activeTenants = (formData || []).filter(
    (tenant) => !hasLeaveDatePassed(tenant?.leaveDate)
  );

  if (trackerType === "bed") {
    return {
      total: slots.length,
      occupied: activeTenants.length,
      vacant: vacantBedsList.length,
    };
  }

  const totalUnits = new Set(
    units
      .map((room) =>
        getTrackerRoomKey(
          room?.roomNo,
          getTrackerPropertyLabel(room)
        )
      )
      .filter(Boolean)
  ).size;

  const occupiedUnits = new Set(
    activeTenants
      .map((tenant) =>
        getTrackerRoomKey(
          tenant?.roomNo,
          getTrackerPropertyLabelForTenant(tenant)
        )
      )
      .filter(Boolean)
  ).size;

  const vacantUnits = new Set(
    vacantBedsList
      .map((slot) =>
        getTrackerRoomKey(
          slot?.roomNo,
          slot?.propertyLabel || slot?.category
        )
      )
      .filter(Boolean)
  ).size;

  return {
    total: totalUnits,
    occupied: occupiedUnits,
    vacant: vacantUnits,
  };
}, [formData, roomsData, trackerType, vacantBedsList, slots]);


  // Filter only tenants who left in the last month or this month
  // const filteredDeletedData = deletedData.filter((t) => t.leaveDate);
// --- Month helpers (use month column if available, else fall back to date) ---

// const dateStr = rec?.date
//   ? new Date(rec?.paymentDate || rec.date).toLocaleDateString("en-GB", {
//       day: "2-digit",
//       month: "short",
//     })
//   : "";
// Cancel a scheduled leave (keeps tenant active)




const handleCancelLeave = async (id) => {
  const ok = window.confirm("Cancel this tenant's scheduled leave?");
  if (!ok) return;

  try {
    const res = await axios.post(`${apiUrl}/cancel-leave`, { id });
    if (res.data?.success) {
      // remove the scheduled leave date locally
      setLeaveDates((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      // optional: hard-refresh the list if backend updates more fields
      await refreshTenants?.();
      alert("Leave canceled successfully.");
    } else {
      alert(res.data?.message || "Failed to cancel leave.");
    }
  } catch (err) {
    console.error("Cancel leave error:", err);
    alert(err?.response?.data?.message || "Something went wrong.");
  }
};
const startOfToday = () => {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d;
};
const isTodayOrFuture = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  d.setHours(0,0,0,0);
  return d >= startOfToday();
};

  return (
    // <div className="container-fluid py-4" style={{ fontFamily: 'Inter, sans-serif' }}>
    <div
      className="container-fluid  py-3"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={refreshAllData}>
            Retry
          </button>
        </div>
      )}
     
    
      

{/* ///////////////////// */}
     
{/* /////////////////// */}





{showVacantModal && (
  <div
    className="modal d-block"
    tabIndex="-1"
    style={{
      background: "rgba(0,0,0,0.5)",
      position: "fixed",
      inset: 0,
      zIndex: 9999,
    }}
  >
    <div className="modal-dialog modal-lg modal-dialog-centered">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">
            {trackerType === "shop" ? "Vacant Shops" : trackerType === "room" ? "Vacant Rooms" : "Vacant Beds"}
          </h5>
          <button
            type="button"
            className="modal-x-btn"
            onClick={() => setShowVacantModal(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {vacantBedsList.length === 0 ? (
            <p>No vacant beds found.</p>
          ) : (
            <table className="table table-bordered">
              <thead>
                <tr>
                  {trackerType !== "bed" && <th>Property</th>}
                  <th>{trackerType === "shop" ? "Shop Number" : "Room No"}</th>
                  {trackerType === "bed" && <th>Bed No</th>}
                  <th>Floor No</th>
                  <th>Category</th>
                  <th>Action</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {vacantBedsList.map((b, i) => (
                  <tr key={i}>
                    {trackerType !== "bed" && <td>{b.propertyLabel || "-"}</td>}
                    <td>{b.roomNo}</td>
                    {trackerType === "bed" && <td>{b.bedNo}</td>}
                    <td>{b.floorNo}</td>
                    <td>{b.category}</td>
                    <td>
                      <button
                        className="btn btn-sm"
                        style={{ backgroundColor: "#3db7b1", color: "white" }}
                        onClick={() => {
                          setShowVacantModal(false);
                          openAddForSlot(b);
                        }}
                      >
                        <FaPlus className="me-1" /> Add Tenant
                      </button>
                    </td>
                    <td>₹{Number(b.price || 0).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowVacantModal(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}




      {/* <div className="row text-center mb-4">
        <div className="col">
          <div className="border rounded p-3"><strong>Total Beds</strong><h4>{formData.length}</h4></div>
        </div>
        <div className="col">
          <div className="border rounded p-3"><strong>Occupied</strong><h4>{formData.filter(d => !d.leaveDate).length}</h4></div>
        </div>
        <div className="col">
          <div className="border rounded p-3"><strong>Vacant</strong><h4>{formData.filter(d => d.leaveDate).length}</h4></div>
        </div>
        <div className="col">
          <div className="border rounded p-3"><strong>Pending Rents</strong><h4>{formData.filter(d => calculateDue(d.rents, d.joiningDate) > 0).length}</h4></div>
        </div>
        <div className="col">
          <div className="border rounded p-3"><strong>Deposits</strong><h4>{formData.filter(d => Number(d.depositAmount) > 0).length}</h4></div>
        </div>
      </div> */}
 <div className="card ">
  <div className="card-body">

    {/* ⭐ Staff & Other Expenses Button */}
  {/* ----------------- NEW BUTTON ROW ----------------- */}
      <MobileSectionSidebar
        open={showMobileSections}
        activeKey={mobileSidebarActiveKey}
        items={sectionItems}
        title="Sections"
        onSelect={handleMobileSectionSelect}
        onClose={() => setShowMobileSections(false)}
        onLogout={handleLogout}
      />

   <div className="mobile-section-trigger-wrap">
  <button
    type="button"
    className="mobile-section-trigger"
    onClick={() => setShowMobileSections(true)}
  >
    <FaBars />
    {/* <span>Sections</span> */}
  </button>

  <h3 className="mobile-dynamic-heading">{currentSectionHeading}</h3>
</div>

    {/* ⭐ Staff & Other Expenses Button */}
  {/* ----------------- NEW BUTTON ROW ----------------- */}
{/* <div className="expense-tabs-wrapper mb-4">


  <button
    className={`btn btn-lightbill-tab ${activeTab === "light" ? "active-tab" : ""}`}
   onClick={() =>
  setActiveTab(activeTab === "light" ? "rent" : "light")
}

  >
    🔌 Light Bill
    
  </button>
<button
  className={`btn btn-expenses-tab ${
    activeTab === "expenses" ? "active-tab" : ""
  }`}
  onClick={() => setActiveTab("expenses")}
>
  📄 Expenses
  
</button>




  <button
  className="btn btn-light"
  onClick={() => {
    setActiveTab("staff");
    
  }}
>
  🧑‍🔧 Staff 
</button>


</div> */}


<div className="expense-tabs-wrapper mb-4">
  <button
    type="button"
    className="tab-pill tab-pill-back"
    onClick={() => handleNavigation("/maindashboard")}
    title="Back"
  >
    ← Back
  </button>

  <button
  className={`tab-pill ${activeTab === "rent" ? "active" : ""}`}
  onClick={() => setActiveTab("rent")}
>
  💰 Rent
</button>

  <button
    className={`tab-pill ${activeTab === "canteen" ? "active" : ""}`}
    onClick={() => setActiveTab("canteen")}
  >
    Canteen
  </button>

  <button
    className={`tab-pill ${activeTab === "light-hostel" ? "active" : ""}`}
    onClick={() => setActiveTab("light-hostel")}
  >
    Light Bill Hostel
  </button>

  <button
    className={`tab-pill ${activeTab === "light-room-shop" ? "active" : ""}`}
    onClick={() => setActiveTab("light-room-shop")}
  >
    Light Bill Room + Shop
  </button>

  <button
    className={`tab-pill ${activeTab === "expenses-hostel" ? "active" : ""}`}
    onClick={() => setActiveTab("expenses-hostel")}
  >
    Expenses Hostel
  </button>

  <button
    className={`tab-pill ${activeTab === "expenses-room-shop" ? "active" : ""}`}
    onClick={() => setActiveTab("expenses-room-shop")}
  >
    Expenses Room + Shop
  </button>

  <button
    className={`tab-pill ${activeTab === 'staff' ? 'active' : ''}`}
    onClick={() => setActiveTab('staff')}
  >
    Staff
  </button>

</div>


    {/* <h5 className="fw-bold mb-3">Bed-wise Rent and Deposit Tracker</h5> */}
    {/* ... your table code continues here ... */}

{/* ---------------- LIGHT BILL TAB ---------------- */}
{/* ---------- LIGHT BILL TAB ---------- */}
{activeTab === "canteen" && (
  <div className="card p-3 mb-4 lightbill-card">
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <div>
        <h5 className="mb-1">Canteen Entries</h5>
        <div className="text-muted small">
          1 meal = Rs. {CANTEEN_MEAL_RATE}. Only tenants marked as canteen yes are shown here.
        </div>
      </div>
      <div className="fw-semibold">
        Total Tenants: {canteenTenants.length}
      </div>
    </div>

    <div className="table-responsive">
      <table className="table table-bordered align-middle">
        <thead className="table-light">
          <tr>
            <th>Name</th>
            <th>Room / Bed</th>
            <th>Phone</th>
            <th>Latest Month</th>
            <th>Meal Count</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {canteenTenants.length ? (
            canteenTenants.map((tenant) => {
              const latestEntry = getLatestCanteenEntry(tenant);
              return (
                <tr key={`canteen-${tenant._id}`}>
                  <td>{tenant.name || "-"}</td>
                  <td>{formatTrackerUnit(tenant.roomNo, tenant.bedNo || tenant.bed?.bedNo)}</td>
                  <td>{tenant.phoneNo || "-"}</td>
                  <td>{formatCanteenMonth(latestEntry?.month)}</td>
                  <td>{latestEntry?.mealCount ?? "-"}</td>
                  <td>
                    {latestEntry ? `Rs. ${Number(latestEntry.amount || 0).toLocaleString("en-IN")}` : "-"}
                  </td>
                  <td>
                    {latestEntry ? (
                      <span className={`badge ${latestEntry.status === "paid" ? "bg-success" : "bg-danger"}`}>
                        {latestEntry.status === "paid" ? "Paid" : "Due"}
                      </span>
                    ) : (
                      <span className="badge bg-secondary">No Entry</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success"
                      onClick={() => openCanteenEntryModal(tenant)}
                    >
                      Add Canteen
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="8" className="text-center text-muted py-4">
                No canteen tenants found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
)}

{['light-hostel', 'light-room-shop', 'light-room', 'light-shop'].includes(activeTab) && (
  <>
    <div className="mb-3 d-flex">
      <button
        type="button"
        className="btn btn-outline-primary"
        onClick={() => setActiveTab("rent")}
      >
        ← Back
      </button>
    </div>
    {/* FULL LIGHT BILL UI INSIDE CARD */}
    <div className="card  p-3 mb-4 lightbill-card">
      <LightBill
        embedded={true}
        propertyScope={lightBillPropertyScope}
        onBillsChange={() => {
          refreshLightBills();
          setRentSummaryRevision((value) => value + 1);
        }}
      />
    </div>
  </> 
)}


{/* ---------------- OTHER EXPENSE TAB ---------------- */}
{/* ---------------- OTHER EXPENSE TAB ---------------- */}
{["expenses-hostel", "expenses-room-shop", "expenses-room", "expenses-shop"].includes(activeTab) && (
  <>
    {/* BACK BUTTON */}
    {/* <div className="mb-3 d-flex">
  <button
    className="btn btn-dark me-3"
    onClick={() => setActiveTab("rent")}
  >
    ← Back
  </button>
</div> */}


    <div className="card  p-3 mb-4 lightbill-card">
      <OtherExpense
        embedded={true}
        propertyScope={expensePropertyScope}
      />
    </div>
  </>
)}
{activeTab === "staff" && (
  <>
    {/* <div className="mb-3 d-flex">
      <button className="btn btn-dark me-3" onClick={() => setActiveTab("rent")}>
        ← Back
      </button>
    </div> */}

    <div className="card  p-3 mb-4 lightbill-card">
      <StaffExpenses
        embedded={true}
        // openAddModal={openStaffModal}
        onModalOpened={() => setOpenStaffModal(false)}
      />
    </div>
  </>
)}

{showCanteenModal && canteenTenant && (
  <div
    className="modal d-block"
    tabIndex="-1"
    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
  >
    <div className="modal-dialog">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Canteen Entry - {canteenTenant.name}</h5>
          <button
            type="button"
            className="modal-x-btn modal-x-btn--soft"
            onClick={closeCanteenModal}
            aria-label="Close"
          >
            x
          </button>
        </div>
        <div className="modal-body">
          <div className="mb-3">
            <label className="form-label">Month</label>
            <input
              type="month"
              className="form-control"
              value={canteenForm.month}
              onChange={(e) =>
                setCanteenForm((prev) => ({ ...prev, month: e.target.value }))
              }
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Meal Count</label>
            <input
              type="number"
              min="0"
              className="form-control"
              value={canteenForm.mealCount}
              onChange={(e) =>
                setCanteenForm((prev) => ({ ...prev, mealCount: e.target.value }))
              }
              placeholder="Enter total meals"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">1 Meal Amount</label>
            <input
              type="text"
              className="form-control"
              value={`Rs. ${CANTEEN_MEAL_RATE}`}
              readOnly
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Amount</label>
            <input
              type="text"
              className="form-control"
              value={`Rs. ${(
                (Number(canteenForm.mealCount || 0) || 0) * CANTEEN_MEAL_RATE
              ).toLocaleString("en-IN")}`}
              readOnly
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={canteenForm.status}
              onChange={(e) =>
                setCanteenForm((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="paid">Paid</option>
              <option value="due">Due</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={closeCanteenModal}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-success"
            onClick={saveCanteenEntry}
            disabled={savingCanteen}
          >
            {savingCanteen ? "Saving..." : "Save Canteen"}
          </button>
        </div>
      </div>
    </div>
  </div>
)}



{showOtherExpenseModal && (
  <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
    <div className="modal-dialog modal-xl modal-dialog-scrollable">
      <div className="modal-content">

        <div className="modal-header">
          <h4 className="modal-title">Other Expenses</h4>
          <button
            className="btn-close"
            onClick={() => setShowOtherExpenseModal(false)}
          ></button>
        </div>

        <div className="modal-body" style={{ padding: 0 }}>
          <OtherExpense embedded={true} />
        </div>

      </div>
    </div>
  </div>
)}




   {activeTab === "rent" && (
  <div className={`table-responsive rent-table-wrapper${showUnassignedTenantsView ? " unassigned-tenants-mode" : ""}`}>

<div className="position-relative d-flex align-items-center justify-content-between gap-3 flex-wrap mb-3">
  <button
    type="button"
    className="btn btn-outline-primary d-inline-flex align-items-center gap-2"
    onClick={handleBackToDashboard}
  >
    <FaArrowLeft />
    <span>Back</span>
  </button>

  <div className="section-title section-text1 mb-0 position-absolute start-50 translate-middle-x">
    <span className="section-icon section-text1">
      <FaThLarge />
    </span>
    <span className="section-text section-text1 ">
      Rent and Deposit Tracker
    </span>
  </div>

  <div className="d-flex align-items-center ms-auto">
    <NotificationBell
      apiUrl={apiUrl}
      onApproved={handleApprovedFromBell}
      onLeaveApproved={({ tenantId, leaveDateISO }) => {
        setLeaveDates((prev) => ({
          ...prev,
          [tenantId]: (leaveDateISO || new Date().toISOString()).slice(0, 10),
        }));
        refreshTenants();
      }}
    />
  </div>
</div>
<input
  ref={importFileInputRef}
  type="file"
  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
  style={{ display: "none" }}
  onChange={handleTenantImportFileSelected}
/>
<RentHeaderBar
  eyebrow={`${trackerGroupLabel} Data`}
  title={
    trackerType === "shop"
      ? "Commercial Shop Rent & Deposit Tracker"
      : trackerType === "room"
        ? "Residential Rooms Rent & Deposit Tracker"
        : "Hostel Rent & Deposit Tracker"
  }
  searchPlaceholder={trackerType === "bed" ? "Search room, bed, name, mobile..." : "Search room, tenant, mobile..."}
  manageRoomsLabel={trackerType === "shop" ? "Manage Shops" : trackerType === "room" ? "Manage Rooms" : "Manage Rooms"}
  addTenantLabel={trackerType === "shop" ? "Add Shop Tenant" : trackerType === "room" ? "Add Room Tenant" : "Add Tenant"}
  selectedYear={selectedYear}
  years={years}
  searchText={searchText}
  searchDisabled={showAddModal}
  onYearChange={handleRentYearChange}
  onSearchChange={handleRentSearchChange}
  onManageRooms={handleManageUnitsNavigation}
  onAddTenant={openAddModal}
  onImportTenants={() => importFileInputRef.current?.click()}
  onDownloadTemplate={() => downloadImportTemplate(trackerType)}
  importingTenants={importingType === trackerType}
  downloadingTemplate={templateType === trackerType}
  onDownloadExcel={handleDownloadExcel}
  onOpenHistory={() => setShowLeavedHistoryView((prev) => !prev)}
  isHistoryView={showLeavedHistoryView}
/>

<div className="rent-tracker-tabs">
  {trackerNavigationTypes.map(({ value: type }) => (
    <button
      key={type}
      type="button"
      className={`rent-tracker-tab ${trackerType === type ? "is-active" : ""}`}
      onClick={() => {
        setShowUnassignedTenantsView(false);
        openTrackerView(type, "rent");
      }}
    >
      {type === "shop" ? "Commercial Shop" : type === "room" ? "Residential Rooms" : "Hostel"}
    </button>
  ))}
  <button
    type="button"
    className={`rent-tracker-tab ${showUnassignedTenantsView ? "is-active" : ""}`}
    onClick={() => setShowUnassignedTenantsView(true)}
  >
    Quick tenant add
    {pendingQuickTenants.length > 0 && <span className="ms-2 badge text-bg-secondary">{pendingQuickTenants.length}</span>}
  </button>
</div>

{showUnassignedTenantsView && (
  <section className="card border-0 shadow-sm my-3 unassigned-tenants-panel" aria-labelledby="unassigned-tenants-title">
    <div className="card-body">
      <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
        <div>
          <h5 id="unassigned-tenants-title" className="mb-1">Unassigned tenants</h5>
          <div className="text-muted small">Saved tenant details waiting for a room, bed, or shop assignment.</div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge text-bg-secondary">{pendingQuickTenants.length} pending</span>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={openQuickTenantModal}>
            <FaPlus className="me-1" /> Quick add tenant
          </button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-hover align-middle mb-0">
          <thead>
            <tr><th>Sr No</th><th>Tenant</th><th>Phone</th><th>Section</th><th>Monthly rent</th><th>Deposit</th><th>Joining date</th><th>Action</th></tr>
          </thead>
          <tbody>
            {pendingQuickTenants.length ? pendingQuickTenants.map((tenant) => (
              <tr key={tenant._id}>
                <td>{tenant.srNo ?? "—"}</td>
                <td className="fw-semibold">{tenant.name || "—"}</td>
                <td>{tenant.phoneNo || "—"}</td>
                <td>{normalizeTenantPropertyType(tenant) === "bed" ? "Hostel" : normalizeTenantPropertyType(tenant) === "room" ? "Residential Room" : "Commercial Shop"}</td>
                <td>Rs. {Number(tenant.baseRent ?? tenant.rentAmount ?? 0).toLocaleString("en-IN")}</td>
                <td>Rs. {Number(tenant.depositAmount || 0).toLocaleString("en-IN")}</td>
                <td>{tenant.joiningDate ? new Date(tenant.joiningDate).toLocaleDateString() : "—"}</td>
                <td>
                  <div className="d-flex gap-2 flex-wrap">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => editQuickTenant(tenant)}>
                      <FaEdit className="me-1" /> Edit
                    </button>
                    <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    disabled={!quickAssignVacantSlots.some((slot) => slot.propertyType === normalizeTenantPropertyType(tenant))}
                    onClick={() => {
                      setQuickTenantError("");
                      setQuickTenantSlotKey("");
                      setAssigningQuickTenant(tenant);
                    }}
                  >
                    Assign unit
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="8" className="text-center text-muted py-3">No unassigned tenants waiting for a unit.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </section>
)}

{/* Rent-only summary cards */}
<RentSummaryCards
  totalBeds={loading ? "—" : summaryCounts.total}
  occupiedBeds={loading ? "—" : summaryCounts.occupied}
  vacantBeds={loading ? "—" : summaryCounts.vacant}
  pendingRents={loading ? "—" : pendingRents}
  upcomingRents={loading ? "—" : upcomingRentEntries.length}
  canteenDues={loading ? "—" : canteenDueEntries.length}
  canteenTenants={loading ? "—" : canteenTenants.length}
  trackerType={trackerType}
  onVacantClick={() => setShowVacantModal(true)}
  onPendingClick={() => setShowPendingModal(true)}
  onUpcomingClick={() => setShowUpcomingModal(true)}
  onCanteenDuesClick={() => setShowCanteenDueModal(true)}
  onCanteenTenantsClick={() => setShowCanteenTenantModal(true)}
/>

  {showMobileVacantBeds ? (
    <VacantBedScreen
      beds={vacantBedsList}
      onAddTenant={openAddForSlot}
      onBack={closeMobileVacantBeds}
      trackerType={trackerType}
      title={trackerType === "shop" ? "Vacant Shops" : trackerType === "room" ? "Vacant Rooms" : "Vacant Beds"}
      subtitle={
        trackerType === "shop"
          ? "Tap a shop to add a tenant"
          : trackerType === "room"
          ? "Tap a room to add a tenant"
          : "Tap a bed to add a tenant"
      }
    />
  ) : showMobileLeavedTenants ? (
    <LeavedTenantScreen
      tenants={filteredDeletedData}
      onOpenHistory={showRentHistory}
      onUndo={handleUndoClick}
      onDownload={handleDownloadForm}
      onBack={closeMobileLeavedTenants}
    />
  ) : showMobileTenantProfile && mobileSelectedTenant ? (
    <RentTenantProfileView
      tenant={mobileSelectedTenant}
      visibleMonths={visibleMonths}
      getTenantPhotoMeta={getTenantPhotoMetaForMobile}
      photoTransformStyle={photoTransformStyle}
      roomColorStyleMap={roomColorStyleMap}
      getMonthCell={getMonthCell}
      getCycleRangeStr={getCycleRangeStr}
      onPrevMonths={goLeft}
      onNextMonths={goRight}
      canPrevMonths={canLeft}
      canNextMonths={canRight}
      onBack={closeMobileTenantProfile}
      onOpenDetails={openDesktopTenantDetails}
      onOpenAdmissionForm={canOpenAdmissionForm ? openAdmissionForm : undefined}
      onEditPhoto={openPhotoEditor}
      onOpenHistory={showRentHistory}
      onEditCurrentMonth={openCurrentMonthEdit}
      onEditTenant={openTenantEditModal}
      onDeleteTenant={openTenantDeleteModal}
      onEditMonth={(tenant, month) =>
        month ? openEditForTenantMonth(tenant._id, month.m, month.y) : null
      }
      onOpenMonthBreakdown={openMonthBreakdownModal}
      onShiftTenant={openShiftTenantModal}
      onLeave={handleLeave}
      // onHoliday={handleHoliday}
      onOpenLeavedTenants={openMobileLeavedTenants}
      onOpenVacantBeds={openMobileVacantBeds}
      onManageRooms={handleManageUnitsNavigation}
      onAddTenant={openAddModal}
      onDownloadExcel={handleDownloadExcel}
    />
  ) : (
    <>
      <RentTenantListView
        loading={loading}
        visibleTenants={visibleTenants}
        visibleMonths={visibleMonths}
        groupedRooms={groupedRooms}
        roomsData={roomsData}
        selectedYear={selectedYear}
        years={years}
        searchText={searchText}
        onYearChange={handleRentYearChange}
        onSearchChange={handleRentSearchChange}
        getTenantPhotoMeta={getTenantPhotoMetaForMobile}
        photoTransformStyle={photoTransformStyle}
        roomColorStyleMap={roomColorStyleMap}
        getMonthCell={getMonthCell}
        getCycleRangeStr={getCycleRangeStr}
        onPrevMonths={goLeft}
        onNextMonths={goRight}
        canPrevMonths={canLeft}
        canNextMonths={canRight}
        onOpenTenant={openTenantDetails}
        onOpenHistory={showRentHistory}
        onEditMonth={(tenant, month) =>
          month ? openEditForTenantMonth(tenant._id, month.m, month.y) : null
        }
        onOpenMonthBreakdown={openMonthBreakdownModal}
        onShiftTenant={openShiftTenantModal}
        onOpenDueMonths={openDueMonthsModal}
        onOpenAdmissionForm={canOpenAdmissionForm ? openAdmissionForm : undefined}
        onEditPhoto={openPhotoEditor}
        onManageRooms={handleManageUnitsNavigation}
        onAddTenant={openAddModal}
        onDownloadExcel={handleDownloadExcel}
        onOpenLeavedTenants={openMobileLeavedTenants}
        onOpenVacantBeds={openMobileVacantBeds}
        onAddTenantForSlot={openAddForSlot}
        onMarkLeave={handleLeave}
      />
    </>
  )}

  <div className="desktop-rent-tables-group">
  {!showLeavedHistoryView && (
  <div className="desktop-rent-table-group">
  <div className="rent-table-desktop d-flex align-items-center justify-content-center">
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary me-2"
      disabled={!canLeft}
      onClick={goLeft}
      title="Previous months"
    >
      &laquo;
    </button>

    {/* 🔽 CLICK HERE TO SORT BY RENT STATUS */}
    <button
      type="button"
      className="btn btn-link p-0 m-0 fw-semibold text-decoration-none text-dark d-inline-flex align-items-center"
      onClick={() => handleSort("status")}
      style={{ cursor: "pointer" }}
    >
      Rent {renderSortIcon("status")}
    </button>

    <button
      type="button"
      className="btn btn-sm btn-outline-secondary ms-2"
      disabled={!canRight}
      onClick={goRight}
      title="Newer months"
    >
      &raquo;
    </button>
  </div>
  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
    <div className="text-muted small">
      Showing {totalTableRows === 0 ? 0 : (currentTablePage - 1) * tableRowsPerPage + 1}
      {" "}-{" "}
      {Math.min(currentTablePage * tableRowsPerPage, totalTableRows)} of {totalTableRows}
    </div>
    <div className="d-flex align-items-center gap-2">
      <label className="small text-muted mb-0">Rows</label>
      <select
        className="form-select form-select-sm"
        style={{ width: 88 }}
        value={tableRowsPerPage}
        onChange={(e) => {
          setTableRowsPerPage(Number(e.target.value) || 25);
          setCurrentTablePage(1);
        }}
      >
        {[10, 25, 50, 100].map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <button
        className="btn btn-sm btn-outline-secondary"
        onClick={() => setCurrentTablePage((prev) => Math.max(1, prev - 1))}
        disabled={currentTablePage === 1}
      >
        Prev
      </button>
      <span className="small text-muted">
        Page {currentTablePage} / {totalTablePages}
      </span>
      <button
        className="btn btn-sm btn-outline-secondary"
        onClick={() =>
          setCurrentTablePage((prev) => Math.min(totalTablePages, prev + 1))
        }
        disabled={currentTablePage === totalTablePages}
      >
        Next
      </button>
    </div>
  </div>
  <div className="rent-table-wrapper">
            <table className="table table-bordered align-middle renttable">

          <thead>
  <tr className="fw-semibold text-secondary">
    <th
      style={{
  width: 90,
  backgroundColor: "#ffc0cb",
  cursor: "pointer",
  textAlign: "center",
}}

      onClick={() => handleSort("sr")}
    >
      Sr{renderSortIcon("sr")}
    </th>

    <th
      style={{ minWidth: 200, backgroundColor: "#ffc0cb", cursor: "pointer" }}
      onClick={() => handleSort("name")}
    >
      Name {renderSortIcon("name")}
    </th>

    {visibleMonths.map((m, i) => (
      <th
        key={`${m.y}-${m.m}-${i}`}
        className="text-center rent-month-header"
        style={{ minWidth: 140, backgroundColor: "#ffc0cb" }}
      >
        {m.label}
      </th>
    ))}

    <th
      style={{ backgroundColor: "#ffc0cb", cursor: "pointer" }}
      onClick={() => handleSort("due")}
    >
      Due {renderSortIcon("due")}
    </th>

    <th style={{ backgroundColor: "#ffc0cb" }}>
      Actions
    </th>
  </tr>
</thead>


              <tbody>
                {combinedRows?.length === 0 && visibleTenants.length === 0 && (
                  <tr>
                    <td
                      colSpan={visibleMonths.length + 4}
                      className="text-center text-muted py-4"
                    >
                      {unitsLoadFailed || tenantsLoadFailed
                        ? "Unable to load all records. Please use Retry above."
                        : loading
                        ? "Loading records..."
                        : trackerType === "room"
                        ? "No other property room data found."
                        : trackerType === "shop"
                          ? "No other property shop data found."
                          : "No hostel bed data found."}
                    </td>
                  </tr>
                )}
                {paginatedTableRows.map((row, rowIdx) => {
                      const isStructuredRow = Boolean(combinedRows);
                      const rowType = isStructuredRow ? row?.type : "tenant";
                      const tenant = rowType === "tenant" ? (isStructuredRow ? row?.tenant : row) : null;
                      const buildingLabel = getPropertyBuildingLabelForRow(row, isStructuredRow);
                      const absoluteRowIdx = (currentTablePage - 1) * tableRowsPerPage + rowIdx;
                      const previousRow = absoluteRowIdx > 0 ? tableRows[absoluteRowIdx - 1] : null;
                      const previousBuildingLabel = previousRow
                        ? getPropertyBuildingLabelForRow(previousRow, isStructuredRow)
                        : "";
                      const showBuildingHeader =
                        buildingLabel &&
                        buildingLabel !== previousBuildingLabel;
                      const currentRoomNo =
                        rowType === "tenant" ? tenant?.roomNo : row?.slot?.roomNo;
                      const currentRoomKey = getTrackerRoomKey(currentRoomNo, buildingLabel);
                      const nextStructuredRow = combinedRows ? tableRows[absoluteRowIdx + 1] : null;
                      const nextRoomNo = nextStructuredRow
                        ? nextStructuredRow.type === "tenant"
                          ? nextStructuredRow.tenant?.roomNo
                          : nextStructuredRow.slot?.roomNo
                        : null;
                      const nextBuildingLabel = nextStructuredRow
                        ? getPropertyBuildingLabelForRow(nextStructuredRow, isStructuredRow)
                        : "";
                      const nextRoomKey = nextStructuredRow
                        ? getTrackerRoomKey(nextRoomNo, nextBuildingLabel)
                        : null;
                      const rowClassName =
                        combinedRows &&
                        String(nextRoomKey ?? "") !== String(currentRoomKey ?? "")
                          ? "room-separator"
                          : undefined;
                      const roomToneClassName =
                        roomColorStyleMap[String(currentRoomNo ?? "").trim()] || {
                          toneClassName: "room-group-tone-b",
                        };

                      if (rowType === "vacant") {
                        const slot = row?.slot;
                        const pendingDetails = Boolean(slot?.isPlaceholder) || /^UNASSIGNED-/i.test(String(slot?.roomNo || ""));
                        const vacantType = slot?.propertyType || trackerType;
                        const vacantTitle = vacantType === "shop" ? "Shop" : vacantType === "room" ? "Rental room" : "Bed";
                        const vacantRent = Number(slot?.price || 0).toLocaleString("en-IN");
                        const vacantLocation = pendingDetails
                          ? `Room or unit number is not set yet | Rs. ${vacantRent}`
                          : [
                              slot?.wingName ? `Wing ${slot.wingName}` : null,
                              `Floor ${slot?.floorNo || "-"}`,
                              vacantType === "shop" ? `Shop ${slot.roomNo}` : vacantType === "room" ? `Rental room ${slot.roomNo}` : `Room ${slot.roomNo}`,
                              vacantType === "bed" && slot?.bedNo ? `Bed ${slot.bedNo}` : null,
                              `Rs. ${vacantRent}`,
                            ].filter(Boolean).join(" | ");
                        const key = `${slot?._id || slot?.roomId || slot?.roomNo}-${slot?.bedNo || "unit"}-${rowIdx}`;
                        const rowKey = `vacant-${key}`;
                        const rowVisibleMonths = getVisibleMonthsForRow(rowKey);

                        return (
                          <React.Fragment key={`vacant-block-${key}`}>
                            {showBuildingHeader && (
                              <tr className="tracker-property-group-row">
                                <td colSpan={visibleMonths.length + 4} className="fw-bold text-start">
                                  {buildingLabel}
                                </td>
                              </tr>
                            )}
                            <tr
                              key={`vacant-${key}`}
                              className={[rowClassName, roomToneClassName.toneClassName].filter(Boolean).join(" ")}
                            >
                              <td className="text-muted text-center">{absoluteRowIdx + 1}</td>
                              <td>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  title={pendingDetails ? "Set unit details" : "Add tenant"}
                                  onClick={() => openUnitSetupForSlot(slot)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      openUnitSetupForSlot(slot);
                                    }
                                  }}
                                  style={{ cursor: "pointer" }}
                                >
                                  <div className="fw-semibold text-decoration-underline">{vacantTitle}</div>
                                  <div className="text-muted small">{vacantLocation}</div>
                                </div>
                              </td>

                              {rowVisibleMonths.map((m, i) => (
                                <td
                                  key={`${key}-${m.y}-${m.m}-${i}`}
                                  className={`text-center text-muted rent-month-window-cell ${i === 0 ? "has-prev-nav" : ""} ${
                                    i === rowVisibleMonths.length - 1 ? "has-next-nav" : ""
                                  }`}
                                >
                                  {renderMonthWindowNav(i, rowKey, rowVisibleMonths)}
                                  —
                                </td>
                              ))}

                              <td>—</td>

                              <td>
                                <button
                                  className="btn btn-sm"
                                  style={{ backgroundColor: "#3db7b1", color: "white" }}
                                  onClick={() => openAddForSlot(slot)}
                                >
                                  <FaPlus className="me-1" /> Add Tenant
                                </button>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      }

                      const rowKey = `tenant-${tenant._id}`;
                      const rowVisibleMonths = getVisibleMonthsForRow(rowKey);
                      const dueAmount = calculateDue(
                        tenant.rents,
                        tenant.joiningDate,
                        tenant,
                        roomsData
                      );

                      return (
                        <React.Fragment key={`tenant-block-${tenant._id}`}>
                          {showBuildingHeader && (
                            <tr className="tracker-property-group-row">
                              <td colSpan={visibleMonths.length + 4} className="fw-bold text-start">
                                {buildingLabel}
                              </td>
                            </tr>
                          )}
                          <tr
                            key={tenant._id}
                            className={[rowClassName, roomToneClassName.toneClassName].filter(Boolean).join(" ")}
                          >
                            {/* Sr */}
                            <td className="text-muted text-center">
                              {absoluteRowIdx + 1}
                            </td>

                            {/* Name + meta */}
                            <td>
                              <div className="tenant-cell">
                                {/* Shift Button */}
                                <button
                                  className="btn btn-sm shift-btn mb-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openShiftTenantModal(tenant);
                                  }}
                                >
                                  <FaExchangeAlt className="me-1" />
                                  {trackerType === "shop" ? "Shift Shop" : trackerType === "room" ? "Shift Room" : "Shift Bed"}
                                </button>

                                {/* CLICKABLE AREA */}
                                <div
                                  className="tenant-open"
                                  role={canOpenAdmissionForm ? "button" : undefined}
                                  tabIndex={canOpenAdmissionForm ? 0 : undefined}
                                  onClick={() => {
                                    if (!canOpenAdmissionForm) return;
                                    openAdmissionForm(tenant);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && canOpenAdmissionForm) {
                                      openAdmissionForm(tenant);
                                    }
                                  }}
                                  title={canOpenAdmissionForm ? "Open Admission Form" : undefined}
                                  style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: "10px",
                                    cursor: canOpenAdmissionForm ? "pointer" : "default",
                                  }}
                                >
                                    {/* PHOTO (only tenant photo) */}
                                    {renderTenantPhoto(tenant)}

                                  {/* TEXT INFO */}
                                  <div>
                                    <div className="tenant-name">{tenant.name}</div>

                                    <div className="tenant-meta">
                                      Deposit: ₹{Number(tenant.depositAmount || 0).toLocaleString("en-IN")}
                                    </div>

                                    <div className="tenant-meta">{tenant.phoneNo}</div>
                                    <div className="mt-1" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                      {tenant.firstRentStatus === "ADVANCE_PAID" ? (
                                        <span className="badge bg-info text-dark">Advance paid</span>
                                      ) : null}
                                      {normalizeCanteenValue(tenant.canteen) === "yes" ? (
                                        <span className="badge" style={{ backgroundColor: "#28a745", color: "white" }}>Canteen</span>
                                      ) : null}
                                    </div>

                                    <span className="room-pill">
                                      {formatTrackerUnit(tenant.roomNo, tenant.bedNo || tenant.bed?.bedNo)}
                                      {trackerType === "room" && getTrackerFlatTypeForTenant(tenant)
                                        ? ` - ${getTrackerFlatTypeForTenant(tenant)}`
                                        : ""}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                          {/* Month cells */}
                          {rowVisibleMonths.map((m, i) => {
                            const c = getMonthCell(tenant, m.y, m.m);
                            const extraNum = 0;
                            const rentAmount = getMonthCellRentAmount(c);
                            const totalAmount = getMonthCellTotalAmount(c);

                            const firstBillYM = getFirstBillYM(tenant);
                            const cellYM = m.y * 12 + m.m;

                            if (cellYM < firstBillYM) {
                              return (
                                <td
                                  key={`${tenant._id}-${m.y}-${m.m}-${i}`}
                                  className={`text-center text-muted rent-month-window-cell ${i === 0 ? "has-prev-nav" : ""} ${
                                    i === rowVisibleMonths.length - 1 ? "has-next-nav" : ""
                                  }`}
                                >
                                  {renderMonthWindowNav(i, rowKey, rowVisibleMonths)}
                                  —
                                </td>
                              );
                            }

                            const cycleIndex = cellYM - firstBillYM;
                            const cycleRangeStr = getCycleRangeStr(tenant, cycleIndex);

                            return (
                              <td
                                key={`${tenant._id}-${m.y}-${m.m}-${i}`}
                                className={`text-center rent-month-window-cell ${i === 0 ? "has-prev-nav" : ""} ${
                                  i === rowVisibleMonths.length - 1 ? "has-next-nav" : ""
                                }`}
                              >
                                {renderMonthWindowNav(i, rowKey, rowVisibleMonths)}
                                <div
                                  style={{ cursor: "pointer" }}
                                  onClick={() => openEditForTenantMonth(tenant._id, m.m, m.y)}
                                  title="Click to edit this tenant's rent"
                                >
                                  {c.label ? (
                                    <span
                                      className="badge rounded-pill px-3 py-2 d-inline-flex flex-column align-items-center"
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 800,
                                        backgroundColor:
                                          c.label === "Paid"
                                            ? "#198754"
                                            : c.label === "Due"
                                            ? "#dc3545"
                                            : c.label === "Upcoming"
                                            ? "#ffb703"
                                            : c.label === "Pending"
                                            ? "#ffc107"
                                            : "#e9ecef",
                                        color: c.label === "Paid" || c.label === "Due" ? "#fff" : "#111",
                                        boxShadow: "0 6px 14px rgba(0,0,0,0.12)",
                                        lineHeight: 1.05,
                                      }}
                                    >
                                      <span>{c.label}</span>
                                      {(c.label === "Paid" || c.label === "Due" || c.label === "Upcoming" || c.label === "Pending") && (
                                        <span
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            opacity: 0.95,
                                            marginTop: 2,
                                          }}
                                        >
                                          {c.label === "Pending"
                                            ? `₹${Number(c.totalBalance || c.outstanding || 0).toLocaleString("en-IN")}`
                                            : c.dateStr}
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}

                                  <div className="small text-muted mt-1" style={{ lineHeight: 1 }}>
                                    {cycleRangeStr}
                                  </div>

                                  <div className="small mt-1" style={{ lineHeight: 1.2 }}>
                                    <div className="fw-semibold">
                                      Rent: ₹{rentAmount.toLocaleString("en-IN")}
                                    </div>
                                  <br />
                                    <button
                                      type="button"
                                      className="btn btn-link p-0 small fw-semibold text-decoration-none"
                                      style={{ color: "#0d6efd", lineHeight: 1.2 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openMonthBreakdownModal(tenant, m, c);
                                      }}
                                    >
                                      Total: ₹{totalAmount.toLocaleString("en-IN")}
                                    </button>
                                  </div>

                                  {false && c.label === "Paid" && (
                                    <div className="small mt-1 fw-semibold" style={{ lineHeight: 1 }}>
                                      ₹{Number(c.amountPaid || 0).toLocaleString("en-IN")}
                                    </div>
                                  )}

                                  {false && c.label === "Pending" && (
                                    <div className="small mt-1 fw-semibold" style={{ lineHeight: 1 }}>
                                      ₹{Number(c.amountPaid || 0).toLocaleString("en-IN")}
                                      <span className="text-muted" style={{ fontWeight: 600 }}>
                                        {" "}
                                        / ₹{Number(c.expected || 0).toLocaleString("en-IN")}
                                      </span>

                                      {Number(c.outstanding || 0) > 0 && (
                                        <div
                                          className={c.isPast ? "text-danger" : ""}
                                          style={{
                                            lineHeight: 1,
                                            marginTop: 2,
                                            fontWeight: 700,
                                          }}
                                        >
                                          {c.isPast ? "Due" : "Balance"}: ₹
                                          {Number(c.outstanding || 0).toLocaleString("en-IN")}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {false && c.label === "Upcoming" && (
                                    <div
                                      className="small mt-1 fw-semibold "
                                      style={{ lineHeight: 1, fontWeight: 800 }}
                                    >
                                      ₹
                                      {Number(c.expected || 0).toLocaleString("en-IN")}
                                    </div>
                                  )}

                                  {false && c.label === "Due" && (
                                    <div
                                      className="small mt-1 fw-semibold "
                                      style={{ lineHeight: 1, fontWeight: 800 }}
                                    >
                                      ₹
                                      {Number(c.expected || 0).toLocaleString("en-IN")}
                                    </div>
                                  )}

                                  {false && Number(c.canteenAmount || 0) > 0 && (
                                    <div
                                      className="small mt-1 fw-semibold"
                                      style={{ lineHeight: 1, color: "#198754" }}
                                    >
                                      + ₹{Number(c.canteenAmount || 0).toLocaleString("en-IN")}
                                      <span style={{ fontWeight: 700 }}> Canteen</span>
                                    </div>
                                  )}

                                  {false && Number(c.lightBillExtraAmount || 0) > 0 && (
                                    <div
                                      className="small mt-1 fw-semibold"
                                      style={{ lineHeight: 1, color: "#fd7e14" }}
                                    >
                                      + {Number(c.lightBillExtraAmount || 0).toLocaleString("en-IN")}
                                      <span style={{ fontWeight: 700 }}> Light Bill</span>
                                    </div>
                                  )}

                                  {false && Number(c.duePenaltyAmount || 0) > 0 && (
                                    <div
                                      className="small mt-1 fw-semibold"
                                      style={{ lineHeight: 1, color: "#dc3545" }}
                                    >
                                      + ₹{Number(c.duePenaltyAmount || 0).toLocaleString("en-IN")}
                                      <span style={{ fontWeight: 700 }}> Penalty</span>
                                    </div>
                                  )}

                                  {false && (
                                    <div
                                      className="small mt-1 fw-semibold"
                                      style={{
                                        color: extraNum > 0 ? "#d63384" : "#198754",
                                      }}
                                    >
                                      {extraNum > 0
                                        ? `+₹${extraNum.toLocaleString("en-IN")}`
                                        : `-₹${Math.abs(extraNum).toLocaleString("en-IN")}`}

                                      {c.note && (
                                        <div
                                          className="small text-muted mt-1"
                                          style={{ lineHeight: 1.1, fontStyle: "italic" }}
                                        >
                                          📝 {c.note}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}

                            <td
                              style={{
                                cursor: "pointer",
                                color: dueAmount > 0 ? "red" : "inherit",
                              }}
                              onClick={() => {
                                openDueMonthsModal(tenant);
                              }}
                            >
                              ₹{dueAmount.toLocaleString("en-IN")}
                            </td>

                            <td>
                              <button
                                className="action-btn action-edit"
                                onClick={() => {
                                  setEditTenantData(tenant);
                                  setEditSelfAadharFile([]);
                                  setEditParentAadharFile([]);
                                  setEditPhotoFile([]);
                                  setEditPanCardFile([]);
                                  setEditDocMsg("");
                                  setShowEditModal(true);
                                }}
                              >
                                <FaEdit />
                              </button>

                              {hasCanteenAccess(tenant) && (
                                <button
                                  className="action-btn"
                                  style={{ backgroundColor: "#198754", color: "#fff" }}
                                  onClick={() => openCanteenEntryModal(tenant)}
                                  title="Add canteen entry"
                                >
                                  <FaUtensils />
                                </button>
                              )}

                              <button
                                className="action-btn action-leave"
                                onClick={() => handleLeave(tenant)}
                              >
                                <FaSignOutAlt />
                              </button>

                              {leaveDates[tenant._id] && isTodayOrFuture(leaveDates[tenant._id]) && (
                                <button
                                  className="btn btn-sm btn-warning me-2"
                                  onClick={() => handleCancelLeave(tenant._id)}
                                  title={`Cancel scheduled leave (${new Date(leaveDates[tenant._id]).toLocaleDateString("en-GB")})`}
                                >
                                  <FaUndo />
                                </button>
                              )}

                              {leaveDates[tenant._id] && (
                                <div
                                  className="text-danger mt-1"
                                  style={{ fontSize: 12 }}
                                >
                                  Leave on{" "}
                                  {new Date(
                                    leaveDates[tenant._id]
                                  ).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </div>
                              )}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
              </tbody>
            </table>
</div>
  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
    <div className="text-muted small">
      Showing {totalTableRows === 0 ? 0 : (currentTablePage - 1) * tableRowsPerPage + 1}
      {" "}-{" "}
      {Math.min(currentTablePage * tableRowsPerPage, totalTableRows)} of {totalTableRows}
    </div>
    <div className="d-flex align-items-center gap-2">
      <label className="small text-muted mb-0">Rows</label>
      <select
        className="form-select form-select-sm"
        style={{ width: 88 }}
        value={tableRowsPerPage}
        onChange={(e) => {
          setTableRowsPerPage(Number(e.target.value) || 25);
          setCurrentTablePage(1);
        }}
      >
        {[10, 25, 50, 100].map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <button
        className="btn btn-sm btn-outline-secondary"
        onClick={() => setCurrentTablePage((prev) => Math.max(1, prev - 1))}
        disabled={currentTablePage === 1}
      >
        Prev
      </button>
      <span className="small text-muted">
        Page {currentTablePage} / {totalTablePages}
      </span>
      <button
        className="btn btn-sm btn-outline-secondary"
        onClick={() =>
          setCurrentTablePage((prev) => Math.min(totalTablePages, prev + 1))
        }
        disabled={currentTablePage === totalTablePages}
      >
        Next
      </button>
    </div>
  </div>
</div>
  )}

  {!showLeavedHistoryView && (
    <div className="mt-5 leaved-tenants-section">
      <h5 style={{ fontWeight: "bold" }} className="leavedtenant">
        Leaved Tenants
      </h5>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="text-muted small">
          Showing {totalLeavedRows === 0 ? 0 : (currentLeavedPage - 1) * leavedRowsPerPage + 1}
          {" "}-{" "}
          {Math.min(currentLeavedPage * leavedRowsPerPage, totalLeavedRows)} of {totalLeavedRows}
        </div>
        <div className="d-flex align-items-center gap-2">
          <label className="small text-muted mb-0">Rows</label>
          <select
            className="form-select form-select-sm"
            style={{ width: 88 }}
            value={leavedRowsPerPage}
            onChange={(e) => {
              setLeavedRowsPerPage(Number(e.target.value) || 10);
              setCurrentLeavedPage(1);
            }}
          >
            {[5, 10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setCurrentLeavedPage((prev) => Math.max(1, prev - 1))}
            disabled={currentLeavedPage === 1}
          >
            Prev
          </button>
          <span className="small text-muted">
            Page {currentLeavedPage} / {totalLeavedPages}
          </span>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() =>
              setCurrentLeavedPage((prev) => Math.min(totalLeavedPages, prev + 1))
            }
            disabled={currentLeavedPage === totalLeavedPages}
          >
            Next
          </button>
        </div>
      </div>

      <table className="table table-bordered">
        <thead>
          <tr>
            <th>{trackerType === "shop" ? "Shop" : "Room No"}</th>
            <th>Name</th>
            <th>Joining Date</th>
            <th>Leave Date</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {paginatedLeavedRows.length === 0 ? (
            <tr><td colSpan={5} className="text-center text-muted py-4">No former tenants match the current property type, year, or search filters.</td></tr>
          ) : paginatedLeavedRows.map((tenant, index) => {
            const leaveDate = parseOccupancyDate(tenant.leaveDate) || new Date(NaN);
            if (!Number.isNaN(leaveDate.getTime())) leaveDate.setHours(0, 0, 0, 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const diffInDays =
              (today.getTime() - leaveDate.getTime()) /
              (1000 * 60 * 60 * 24);

            const isUndoAllowed = diffInDays >= 0 && diffInDays <= 30;

            return (
              <tr key={tenant._id || index}>
                <td>
                  {formatTrackerUnit(tenant.roomNo, tenant.bedNo)}
                </td>


                <td
                  style={{ cursor: "pointer" }}
                  onClick={() => showRentHistory(tenant)}
                >
                  {tenant.name}
                </td>

                <td>{new Date(tenant.joiningDate).toLocaleDateString()}</td>

                <td>{leaveDate.toLocaleDateString()}</td>

                <td>
                  {isUndoAllowed && (
                    <button
                      className="btn btn-sm btn-success me-2"
                      onClick={() => handleUndoClick(tenant._id)}
                      title="Undo leave (allowed within 30 days)"
                    >
                      <FaUndo />
                    </button>
                  )}

                  <button
                    className="btn btn-sm"
                    style={{
                      backgroundColor: "#2d6eef",
                      color: "white",
                    }}
                    onClick={() => handleDownloadForm(tenant)}
                  >
                    <FaDownload />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )}

  {showLeavedHistoryView && (
    <div className="desktop-rent-table-group leaved-tenants-section">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 style={{ fontWeight: "bold" }} className="leavedtenant mb-0">
          Leaved Tenant History
        </h5>
        <span className="text-muted small">{filteredDeletedData.length} tenants</span>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="text-muted small">
          Showing {totalLeavedRows === 0 ? 0 : (currentLeavedPage - 1) * leavedRowsPerPage + 1}
          {" "}-{" "}
          {Math.min(currentLeavedPage * leavedRowsPerPage, totalLeavedRows)} of {totalLeavedRows}
        </div>
        <div className="d-flex align-items-center gap-2">
          <label className="small text-muted mb-0">Rows</label>
          <select
            className="form-select form-select-sm"
            style={{ width: 88 }}
            value={leavedRowsPerPage}
            onChange={(e) => {
              setLeavedRowsPerPage(Number(e.target.value) || 10);
              setCurrentLeavedPage(1);
            }}
          >
            {[5, 10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setCurrentLeavedPage((prev) => Math.max(1, prev - 1))}
            disabled={currentLeavedPage === 1}
          >
            Prev
          </button>
          <span className="small text-muted">
            Page {currentLeavedPage} / {totalLeavedPages}
          </span>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() =>
              setCurrentLeavedPage((prev) => Math.min(totalLeavedPages, prev + 1))
            }
            disabled={currentLeavedPage === totalLeavedPages}
          >
            Next
          </button>
        </div>
      </div>

      {filteredDeletedData.length > 0 ? (
        <div className="table-responsive rent-table-wrapper">
          <table className="table table-bordered align-middle renttable">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>{trackerUnitLabel}</th>
                    <th>Dates</th>
                    <th>Contact</th>
                    <th>Deposit</th>
                    <th>All Rents / Status</th>
                    <th>Documents</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLeavedRows.map((tenant, index) => {
                    const docs = Array.isArray(tenant.documents) ? tenant.documents : [];
                    const rents = Array.isArray(tenant.rents) ? tenant.rents : [];
                    const totalPaid = rents.reduce(
                      (sum, rent) => sum + (Number(rent?.rentAmount) || 0),
                      0
                    );
                    const leaveDate = tenant.leaveDate ? parseOccupancyDate(tenant.leaveDate) : null;
                    const joiningDate = tenant.joiningDate ? parseOccupancyDate(tenant.joiningDate) : null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (leaveDate && !isNaN(leaveDate)) leaveDate.setHours(0, 0, 0, 0);
                    const diffInDays = leaveDate && !isNaN(leaveDate)
                      ? (today.getTime() - leaveDate.getTime()) / (1000 * 60 * 60 * 24)
                      : null;
                    const isUndoAllowed = diffInDays != null && diffInDays >= 0 && diffInDays <= 30;
                    const sortedRents = [...rents].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

                    return (
                      <tr key={tenant._id || index}>
                        <td
                          style={{ cursor: canOpenAdmissionForm ? "pointer" : "default" }}
                          role={canOpenAdmissionForm ? "button" : undefined}
                          tabIndex={canOpenAdmissionForm ? 0 : undefined}
                          title={canOpenAdmissionForm ? "Open Admission Form" : undefined}
                          onClick={() => {
                            if (!canOpenAdmissionForm) return;
                            openAdmissionForm(tenant);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && canOpenAdmissionForm) openAdmissionForm(tenant);
                          }}
                        >
                          <div className="fw-semibold text-primary">{tenant.name || "-"}</div>
                        </td>
                        <td>
                          <div>{formatTrackerUnit(tenant.roomNo, tenant.bedNo)}</div>

                          {tenant.category && (
                            <div className="text-muted small">{tenant.category}</div>
                          )}
                        </td>
                        <td>
                          <div>
                            Joining:{" "}
                            {joiningDate && !isNaN(joiningDate)
                              ? joiningDate.toLocaleDateString("en-IN")
                              : "-"}
                          </div>
                          <div className="text-danger">
                            Leave:{" "}
                            {leaveDate && !isNaN(leaveDate)
                              ? leaveDate.toLocaleDateString("en-IN")
                              : "-"}
                          </div>
                        </td>
                        <td>
                          <div>{tenant.phoneNo || "-"}</div>
                          {tenant.relative1Phone && (
                            <div className="text-muted small">
                              Relative: {tenant.relative1Phone}
                            </div>
                          )}
                        </td>
                        <td>
                          Rs. {Number(tenant.depositAmount || 0).toLocaleString("en-IN")}
                          {tenant.leaveSettlement?.refundableDeposit != null && (
                            <div className="text-muted small">
                              Refund: Rs.{" "}
                              {Number(tenant.leaveSettlement.refundableDeposit || 0).toLocaleString("en-IN")}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="fw-semibold">
                            Total Paid: Rs. {totalPaid.toLocaleString("en-IN")}
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary mt-2"
                            onClick={() => showRentHistory(tenant)}
                            disabled={sortedRents.length === 0}
                          >
                            View Rents
                          </button>
                          {sortedRents.length === 0 && (
                            <div className="text-muted small mt-1">No rent payments saved.</div>
                          )}
                        </td>
                        <td>
                          <div>{docs.length} documents</div>
                          {docs.length > 0 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary mt-1"
                              onClick={() => setHistoryDocsTenant(tenant)}
                            >
                              View Documents
                            </button>
                          )}
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-2">
                            {isUndoAllowed && (
                              <button
                                type="button"
                                className="btn btn-sm text-white d-inline-flex align-items-center justify-content-center"
                                style={{ backgroundColor: "#198754", width: 32, height: 32 }}
                                onClick={() => handleUndoClick(tenant._id)}
                                title="Undo leave"
                              >
                                <FaUndo />
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm text-white d-inline-flex align-items-center justify-content-center"
                              style={{ backgroundColor: "#2d6eef", width: 32, height: 32 }}
                              onClick={() => handleDownloadForm(tenant)}
                              title="Download Excel"
                            >
                              <FaDownload />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
        </div>
      ) : (
        <div className="text-muted">No leaved tenant history found.</div>
      )}
    </div>
  )}

  </div>

          </div>
          )}

        </div>
      </div>


     
{showFormModal && (
  <>
    {/* BACKDROP (BEHIND modal) */}
    <div
      className="modal-backdrop fade show"
      style={{ zIndex: 1040 }}
      onClick={() => setShowFormModal(false)}
    />

    {/* MODAL (ABOVE backdrop) */}
    <div
      className="modal fade show"
      style={{ display: "block", zIndex: 1050 }}
      tabIndex="-1"
      role="dialog"
      onClick={(e) => {
        // close only if click happens on outside grey area (not inside content)
        if (e.target === e.currentTarget) setShowFormModal(false);
      }}
    >
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Admission Form — {formTenant?.name || ""}
            </h5>
   <button
  type="button"
  className="btn-close p-0"
  onClick={() => setShowFormModal(false)}
>
  x
</button>


          </div>

          <div className="modal-body">
            {formTenant ? <FormDownload formData={formTenant} /> : null}
          </div>
        </div>
      </div>
    </div>
  </>
)}

{historyDocsTenant && (
  <div
    className="modal d-block"
    tabIndex="-1"
    style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1060 }}
  >
    <div className="modal-dialog modal-lg modal-dialog-scrollable">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">
            Documents - {historyDocsTenant.name || "Tenant"}
          </h5>
          <button
            type="button"
            className="btn-close p-0"
            onClick={() => setHistoryDocsTenant(null)}
          >
            x
          </button>
        </div>
        <div className="modal-body">
          {Array.isArray(historyDocsTenant.documents) && historyDocsTenant.documents.length > 0 ? (
            <div className="d-grid gap-2">
              {historyDocsTenant.documents.map((doc, index) => {
                const href = docHrefSafe(doc);
                const label = doc.relation || doc.fileName || `Document ${index + 1}`;
                return (
                  <div
                    key={`${historyDocsTenant._id}-history-doc-${index}`}
                    className="border rounded p-2"
                  >
                    <div className="fw-semibold">{index + 1}. {label}</div>
                    <div className="text-muted small">
                      {doc.fileName || doc.contentType || "Uploaded document"}
                    </div>
                    {href ? (
                      <div className="mt-2 d-flex flex-wrap gap-2">
                        <a
                          className="btn btn-sm btn-outline-primary"
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open Document
                        </a>
                        {/* <a
                          className="small align-self-center"
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {href}
                        </a> */}
                      </div>
                    ) : (
                      <div className="text-muted small mt-2">No document link available.</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-muted">No documents uploaded for this tenant.</div>
          )}
        </div>
      </div>
    </div>
  </div>
)}
 {showQuickTenantModal && (
  <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}>
    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
      <form className="modal-content" onSubmit={saveQuickTenant}>
        <div className="modal-header">
          <div>
            <h5 className="modal-title">{quickTenantEditing ? "Edit unassigned tenant" : "Quick add tenant"}</h5>
            <div className="small text-muted">{quickTenantEditing ? "Update the saved tenant details before assigning a unit." : "Save tenant details now and assign a unit later."}</div>
          </div>
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowQuickTenantModal(false)} />
        </div>
        <div className="modal-body">
          <div className="mb-3">
            <label className="form-label">Section <span className="text-danger">*</span></label>
            <select className="form-select" value={quickTenantSection} onChange={(event) => setQuickTenantSection(event.target.value)} required>
              <option value="">Select section</option>
              {trackerNavigationTypes.map(({ value }) => (
                <option key={value} value={value}>
                  {value === "bed" ? "Hostel" : value === "room" ? "Residential Room" : "Commercial Shop"}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Tenant name <span className="text-danger">*</span></label>
            <input className="form-control" autoFocus value={quickTenantForm.name} onChange={(event) => setQuickTenantForm((prev) => ({ ...prev, name: event.target.value }))} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Phone number <span className="text-danger">*</span></label>
            <input className="form-control" type="tel" inputMode="numeric" maxLength="10" value={quickTenantForm.phoneNo} onChange={(event) => setQuickTenantForm((prev) => ({ ...prev, phoneNo: event.target.value.replace(/\D/g, "").slice(0, 10) }))} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Joining date <span className="text-danger">*</span></label>
            <input className="form-control" type="date" value={quickTenantForm.joiningDate} onChange={(event) => setQuickTenantForm((prev) => ({ ...prev, joiningDate: event.target.value }))} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Pincode</label>
            <input className="form-control" type="text" inputMode="numeric" maxLength={6} value={quickTenantForm.pincode} onChange={(event) => setQuickTenantForm((prev) => ({ ...prev, pincode: event.target.value.replace(/\D/g, "").slice(0, 6), city: "", state: "", nearbyPlace: "" }))} placeholder="6-digit pincode" />
            {quickTenantPinStatus === "loading" && <small>Finding city and location...</small>}
            {quickTenantPinStatus === "error" && <small className="text-muted">PIN code not found. Enter city and nearby place manually.</small>}
          </div>
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6">
              <label className="form-label">City</label>
              <input className="form-control" value={quickTenantForm.city} onChange={(event) => setQuickTenantForm((prev) => ({ ...prev, city: event.target.value }))} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">State</label>
              <input className="form-control" value={quickTenantForm.state} onChange={(event) => setQuickTenantForm((prev) => ({ ...prev, state: event.target.value }))} />
            </div>
            <div className="col-12">
              <label className="form-label">Local Address</label>
              <input className="form-control" value={quickTenantForm.address} onChange={(event) => setQuickTenantForm((prev) => ({ ...prev, address: event.target.value }))} placeholder="House, Street, Area" />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">House No</label>
              <input className="form-control" value={quickTenantForm.houseNo} onChange={(event) => setQuickTenantForm((prev) => ({ ...prev, houseNo: event.target.value }))} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Nearby Place</label>
              <input className="form-control" value={quickTenantForm.nearbyPlace} onChange={(event) => setQuickTenantForm((prev) => ({ ...prev, nearbyPlace: event.target.value }))} />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Deposit amount (Rs.) <span className="text-danger">*</span></label>
            <input className="form-control" type="text" inputMode="numeric" value={quickTenantForm.depositAmount} onChange={(event) => setQuickTenantForm((prev) => ({ ...prev, depositAmount: event.target.value.replace(/\D/g, "") }))} required />
          </div>
          <div className="mb-2">
            <label className="form-label">Monthly rent (Rs.) <span className="text-danger">*</span></label>
            <input className="form-control" type="text" inputMode="numeric" value={quickTenantForm.rentAmount} onChange={(event) => setQuickTenantForm((prev) => ({ ...prev, rentAmount: event.target.value.replace(/\D/g, "") }))} required />
            <div className="form-text">You can assign the property, floor, room, or bed later.</div>
          </div>
          <div className="mb-2">
            <label className="form-label fw-semibold">Rent Cycle</label>
            <div className="d-flex flex-column gap-2" role="radiogroup" aria-label="Rent cycle at joining">
              <label className="form-check mb-0">
                <input className="form-check-input" type="radio" name="quickFirstRentStatus" required checked={quickTenantForm.firstRentStatus === "ADVANCE_PAID"} onChange={() => setQuickTenantForm((prev) => ({ ...prev, firstRentStatus: "ADVANCE_PAID" }))} />
                <span className="form-check-label">Pay at Joining (Advance)</span>
              </label>
              <label className="form-check mb-0">
                <input className="form-check-input" type="radio" name="quickFirstRentStatus" required checked={quickTenantForm.firstRentStatus === "NOT_PAID"} onChange={() => setQuickTenantForm((prev) => ({ ...prev, firstRentStatus: "NOT_PAID" }))} />
                <span className="form-check-label">Pay at Month End (Normal cycle)</span>
              </label>
            </div>
            <small className="text-muted mt-1 d-block">Advance rent is recorded in the joining month; normal cycle rent starts at month end.</small>
          </div>
          {quickTenantError && <div className="alert alert-danger py-2 mt-3 mb-0">{quickTenantError}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline-secondary" onClick={() => setShowQuickTenantModal(false)} disabled={quickTenantSaving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={quickTenantSaving}>{quickTenantSaving ? "Saving…" : quickTenantEditing ? "Save changes" : "Save unassigned tenant"}</button>
        </div>
      </form>
    </div>
  </div>
)}

{assigningQuickTenant && (
  <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h5 className="modal-title">Assign a unit</h5>
            <div className="small text-muted">{assigningQuickTenant.name} · {assigningQuickTenant.phoneNo}</div>
          </div>
          <button type="button" className="btn-close" aria-label="Close" onClick={() => { setAssigningQuickTenant(null); setQuickTenantError(""); }} />
        </div>
        <div className="modal-body">
          <label className="form-label">Available {assigningQuickTenantType === "bed" ? "bed" : assigningQuickTenantType === "shop" ? "shop" : "room"}</label>
          <select className="form-select" value={quickTenantSlotKey} onChange={(event) => { setQuickTenantSlotKey(event.target.value); setQuickTenantError(""); }}>
            <option value="">Select an available unit</option>
            {quickAssignVacantSlots.filter((slot) => slot.propertyType === assigningQuickTenantType).map((slot) => {
              const key = `${slot.roomId}::${slot.bedNo}`;
              const location = [slot.propertyLabel, slot.wingName && `Wing ${slot.wingName}`, slot.floorNo && `Floor ${slot.floorNo}`].filter(Boolean).join(" · ");
              const unit = assigningQuickTenantType === "bed" ? `Room ${slot.roomNo} · Bed ${slot.bedNo}` : `${assigningQuickTenantType === "shop" ? "Shop" : "Room"} ${slot.roomNo}`;
              return <option key={key} value={key}>{[location, unit, `Rs. ${Number(slot.price || 0).toLocaleString("en-IN")}`].filter(Boolean).join(" — ")}</option>;
            })}
          </select>
          {!quickAssignVacantSlots.some((slot) => slot.propertyType === assigningQuickTenantType) && <div className="form-text text-danger">There are no vacant units in this section yet.</div>}
          {quickTenantError && <div className="alert alert-danger py-2 mt-3 mb-0">{quickTenantError}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline-secondary" onClick={() => { setAssigningQuickTenant(null); setQuickTenantError(""); }} disabled={quickTenantAssigning}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={assignQuickTenantToSlot} disabled={!quickTenantSlotKey || quickTenantAssigning}>{quickTenantAssigning ? "Assigning…" : "Assign unit"}</button>
        </div>
      </div>
    </div>
  </div>
)}

 {/* add tenant modal */}
     {showAddModal && (
  <div
    className="modal d-block"
    tabIndex="-1"
    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
  >
    <div className="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-md-down">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Add New Tenant</h5>
          <button
            type="button"
            className="btn-close p-0"
            // onClick={() => setShowAddModal(false)}
           onClick={closeAddTenantModal}

          >
            x
          </button>
        </div>

        <div className="modal-body">
          <div className="container-fluid">
            <div className="row g-3">
              {/* Sr No + Name */}
              <div className="col-12 col-md-6">
                <label className="form-label">Sr No</label>
                <input
                  type="text"
                  className="form-control"
                  value={newTenant.srNo || ""}
                  readOnly
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">
                  Name <span className="text-danger">*</span>
                </label>
                <BufferedInput
                  type="text"
                  className="form-control"
                  value={newTenant.name || ""}
                  onCommit={(nextValue) =>
                    setNewTenant((prev) => ({ ...prev, name: nextValue }))
                  }
                />
              </div>

              {trackerType === "shop" && (
                <div className="col-12 col-md-6">
                  <label className="form-label">Shop Name</label>
                  <BufferedInput
                    type="text"
                    className="form-control"
                    value={newTenant.shopName || ""}
                    onCommit={(nextValue) =>
                      setNewTenant((prev) => ({ ...prev, shopName: nextValue }))
                    }
                    placeholder="Enter shop name"
                  />
                </div>
              )}

              {/* Phone */}
              <div className="col-12 col-md-6">
                <label className="form-label">
                  Phone No <span className="text-danger">*</span>
                </label>
                <BufferedInput
                  type="tel"
                  name="tenantPhoneNo"
                  autoComplete="tel"
                  className="form-control"
                  value={newTenant.phoneNo || ""}
                  onCommit={(nextValue) =>
                    setNewTenant((prev) => ({
                      ...prev,
                      phoneNo: nextValue,
                    }))
                  }
                  placeholder="10-digit number"
                />
                {newTenant.phoneNo &&
                  !/^\d{10}$/.test(String(newTenant.phoneNo).trim()) && (
                    <small className="text-danger">
                      Enter 10-digit number
                    </small>
                  )}
              </div>
            

              {/* Joining + DOB */}
              <div className="col-12 col-md-6">
                <label className="form-label">Joining Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={newTenant.joiningDate || ""}
                  onChange={(e) =>
                    setNewTenant({
                      ...newTenant,
                      joiningDate: e.target.value,
                    })
                  }
                />
              </div>

              {/* Address Section */}
              <div className="col-12 col-md-6">
                <label className="form-label">Pincode</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="form-control"
                  value={newTenant.pincode || ""}
                  onChange={(event) =>
                    setNewTenant((prev) => ({
                      ...prev,
                      pincode: event.target.value.replace(/\D/g, "").slice(0, 6),
                      city: "",
                      state: "",
                      nearbyPlace: "",
                    }))
                  }
                  placeholder="6-digit pincode"
                />
                {newTenantPinStatus === "loading" && <small>Finding city and location...</small>}
                {newTenantPinStatus === "error" && <small className="text-muted">PIN code not found. Enter city and nearby place manually.</small>}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">City</label>
                <BufferedInput
                  type="text"
                  className="form-control"
                  value={newTenant.city || ""}
                  onCommit={(nextValue) =>
                    setNewTenant((prev) => ({
                      ...prev,
                      city: nextValue,
                    }))
                  }
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">State</label>
                <BufferedInput
                  type="text"
                  className="form-control"
                  value={newTenant.state || ""}
                  onCommit={(nextValue) =>
                    setNewTenant((prev) => ({
                      ...prev,
                      state: nextValue,
                    }))
                  }
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Local Address</label>
                <BufferedInput
                  type="text"
                  className="form-control"
                  value={newTenant.address || ""}
                  onCommit={(nextValue) =>
                    setNewTenant((prev) => ({
                      ...prev,
                      address: nextValue,
                    }))
                  }
                  placeholder="House, Street, Area"
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">House No</label>
                <BufferedInput
                  type="text"
                  className="form-control"
                  value={newTenant.houseNo || ""}
                  onCommit={(nextValue) =>
                    setNewTenant((prev) => ({
                      ...prev,
                      houseNo: nextValue,
                    }))
                  }
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Nearby Place</label>
                <BufferedInput
                  type="text"
                  className="form-control"
                  value={newTenant.nearbyPlace || ""}
                  onCommit={(nextValue) =>
                    setNewTenant((prev) => ({
                      ...prev,
                      nearbyPlace: nextValue,
                    }))
                  }
                />
              </div>

    {/* Deposit + DOJ */}
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">
                  Deposit Amount <span className="text-danger">*</span>
                </label>
                <BufferedInput
                  type="number"
                  className="form-control my-0"
                  value={newTenant.depositAmount || ""}
                  onCommit={(nextValue) =>
                    setNewTenant((prev) => ({
                      ...prev,
                      depositAmount: nextValue,
                    }))
                  }
                  min="0"
                />
              </div>

              {trackerType === "bed" && (
                <div className="col-12 col-md-6">
                  <label className="form-label">Canteen</label>
                  <select
                    className="form-select"
                    value={newTenant.canteen || "no"}
                    onChange={(e) =>
                      setNewTenant({
                        ...newTenant,
                        canteen: normalizeCanteenValue(e.target.value),
                      })
                    }
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              )}
              {trackerType === "bed" && <CanteenTenantRates tenant={newTenant} setTenant={setNewTenant} settings={canteenSettings} />}

              {addTenantNeedsUnitSetup && (
                <div className="col-12">
                  <div className="alert alert-warning d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-0">
                    <div>
                      <strong>Unit details are not set yet.</strong>
                      <div className="small">
                        Set property, floor and {getTenantSetupUnitLabel(addTenantSelectedRoom).toLowerCase()} number before adding a tenant.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => openTenantUnitSetupModal(addTenantSelectedRoom)}
                    >
                      Set unit details
                    </button>
                  </div>
                </div>
              )}

             {/* Room + Bed */}
{trackerType === "room" ? (
  <>
    <div className="col-12 col-md-6">
      <label className="form-label">
        Building <span className="text-danger">*</span>
      </label>
      <select
        className="form-select"
        value={newTenant.category || ""}
        onChange={(e) =>
          setNewTenant((prev) => ({
            ...prev,
            category: e.target.value,
            wingName: "",
            floorNo: "",
            roomId: "",
            roomNo: "",
            flatType: "",
            bedNo: "",
            baseRent: "",
            rentAmount: "",
            bedPrice: "",
          }))
        }
      >
        <option value="">Select Building</option>
        {residentialBuildingOptions.map((building) => (
          <option key={`building-${building}`} value={building}>
            {building}
          </option>
        ))}
      </select>
    </div>

    <div className="col-12 col-md-6">
      <label className="form-label">
        Wing {residentialWingOptions.length > 1 ? <span className="text-danger">*</span> : null}
      </label>
      <select
        className="form-select"
        value={residentialWingOptions.length <= 1 ? (residentialWingOptions[0] || "") : (newTenant.wingName || "")}
        disabled={!newTenant.category || residentialWingOptions.length <= 1}
        onChange={(e) =>
          setNewTenant((prev) => ({
            ...prev,
            wingName: e.target.value,
            floorNo: "",
            roomId: "",
            roomNo: "",
            flatType: "",
            bedNo: "",
            baseRent: "",
            rentAmount: "",
            bedPrice: "",
          }))
        }
      >
        <option value="">
          {!newTenant.category ? "Select building first" : "Select Wing"}
        </option>
        {residentialWingOptions.map((wing) => (
          <option key={`wing-${wing || "no-wing"}`} value={wing}>
            {formatWingOptionLabel(wing)}
          </option>
        ))}
      </select>
    </div>

    <div className="col-12 col-md-6">
      <label className="form-label">
        Floor <span className="text-danger">*</span>
      </label>
      <select
        className="form-select"
        value={newTenant.floorNo || ""}
        disabled={
          !newTenant.category ||
          (residentialWingOptions.length > 1 && !newTenant.wingName)
        }
        onChange={(e) =>
          setNewTenant((prev) => ({
            ...prev,
            floorNo: e.target.value,
            roomId: "",
            roomNo: "",
            flatType: "",
            bedNo: "",
            baseRent: "",
            rentAmount: "",
            bedPrice: "",
          }))
        }
      >
        <option value="">
          {!newTenant.category
            ? "Select building first"
            : residentialWingOptions.length > 1 && !newTenant.wingName
            ? "Select wing first"
            : "Select Floor"}
        </option>
        {residentialFloorOptions.map((floor) => (
          <option key={`floor-${floor}`} value={floor}>
            Floor {floor}
          </option>
        ))}
      </select>
    </div>

    <div className="col-12 col-md-6">
      <label className="form-label">
        Flat <span className="text-danger">*</span>
      </label>
      <select
        className="form-select"
        value={newTenant.roomId || ""}
        disabled={!newTenant.floorNo}
        onChange={(e) => {
          const selectedRoom = residentialFlatOptions.find(
            (room) => String(room._id) === String(e.target.value)
          );
          applySelectedTrackerRoom(selectedRoom);
        }}
      >
        <option value="">
          {newTenant.floorNo ? "Select Flat" : "Select floor first"}
        </option>
        {residentialFlatOptions.map((room) => (
          <option key={`room-${room._id}`} value={room._id}>
            {room.roomNo}
            {room.flatType ? ` • ${room.flatType}` : ""}
            {room.floorNo ? ` • Floor ${room.floorNo}` : ""}
          </option>
        ))}
      </select>
    </div>
  </>
) : (
<div className="col-12 col-md-6">
  <label className="form-label">
    {trackerType === "shop" ? "Shop" : "Room"} <span className="text-danger">*</span>
  </label>

  <select
    className="form-select"
    value={newTenant.roomId || ""}
    onChange={(e) => {
      const roomId = e.target.value;
      const selectedRoom = roomsData.find((r) => String(r._id) === String(roomId));
      applySelectedTrackerRoom(selectedRoom);
    }}
  >
    <option value="">{trackerType === "shop" ? "Select Shop" : "Select Room"}</option>
    {roomsData
      .filter(roomHasVacantBed)
      .map((room) => (
        <option key={`room-${room._id}`} value={room._id}>
          {room.roomNo} • {room.category} • Floor {room.floorNo}
        </option>
      ))}
  </select>
</div>
)}

{trackerType === "bed" && (
<div className="col-12 col-md-6">
  <label className="form-label">
    Bed No <span className="text-danger">*</span>
  </label>

  <select
    className="form-select"
    value={newTenant.bedNo || ""}
    disabled={!newTenant.roomId}
    onChange={(e) => {
      const bedNo = e.target.value;

      // OTHER (add new bed...)
      if (bedNo === "__other__") {
        setNewTenant((prev) => ({
          ...prev,
          bedNo: "__other__",
          bedPrice: "",           // ✅ NEW
          baseRent: "",
          rentAmount: "",
          __priceMode: "current", // ✅ NEW
          __newBedPriceEdit: "",  // ✅ NEW
          __priceMsg: "",         // ✅ NEW
          __savingPrice: false,   // ✅ NEW

          newBedNo: prev.newBedNo || "",
          newBedPrice: prev.newBedPrice || "",
          newBedCategory: prev.newBedCategory || "",
          __bedMsg: "",
          __savingBed: false,
        }));
        return;
      }

      const selectedRoom = roomsData.find(
        (r) => String(r._id) === String(newTenant.roomId)
      );
      const selectedBed = selectedRoom?.beds?.find(
        (b) => String(b.bedNo) === String(bedNo)
      );

      const price = selectedBed?.price ?? "";

      setNewTenant((prev) => ({
        ...prev,
        bedNo,

        bedPrice: price,         // ✅ NEW (store separately)
        baseRent: price,
        rentAmount: price,       // tenant rent defaults to bed price

        __priceMode: "current",  // ✅ NEW
        __newBedPriceEdit: "",   // ✅ NEW
        __priceMsg: "",          // ✅ NEW
        __savingPrice: false,    // ✅ NEW

        newBedNo: "",
        newBedPrice: "",
        newBedCategory: "",
        __bedMsg: "",
        __savingBed: false,
      }));
    }}
  >
    <option value="">
      {trackerType === "bed"
        ? newTenant.roomId
          ? "Select Bed"
          : "Select a Room first"
        : newTenant.roomId
        ? "Unit auto-selected"
        : trackerType === "shop"
        ? "Select a shop first"
        : "Select a room first"}
    </option>

    {roomsData
      .find((r) => String(r._id) === String(newTenant.roomId))
      ?.beds?.filter((bed) => {
        const selectedRoom = roomsData.find(
          (r) => String(r._id) === String(newTenant.roomId)
        );
        return !occupiedBeds.has(occKey(selectedRoom?.roomNo, bed.bedNo));
      })
      .filter((bed, index, beds) => beds.findIndex((item) => String(item?.bedNo) === String(bed?.bedNo)) === index)
      .map((bed) => (
        <option
          key={`bed-${newTenant.roomId}-${bed.bedNo}`}
          value={bed.bedNo}
        >
          {/* ✅ NO PRICE HERE */}
          {bed.bedNo} - {bed.bedCategory || "—"}
        </option>
      ))}

    {!!newTenant.roomId && (
      <option value="__other__">Other (add new bed…)</option>
    )}
  </select>
</div>
)}

{/* ✅ NEW: Bed Price field (separate + update option) */}
<div className="col-12 col-md-12">
  <label className="form-label">
    {trackerType === "room"
      ? "Flat / Room Price (Monthly Rent)"
      : trackerType === "shop"
      ? "Shop Price (Monthly Rent)"
      : "Bed Price (Monthly Rent)"}{" "}
    <span className="text-danger">*</span>
  </label>

  {/* ✅ make select + input in same row */}
  <div className="row g-2 align-items-start">
    {/* LEFT: select */}
    <div className="col-12 col-md-6">
      <select
        className="form-select"
        value={newTenant.__priceMode || "current"}
        disabled={
          !newTenant.roomId ||
          (trackerType === "bed" &&
            (!newTenant.bedNo || newTenant.bedNo === "__other__"))
        }
        onChange={(e) => {
          const mode = e.target.value;
          setNewTenant((prev) => ({
            ...prev,
            __priceMode: mode,
            __priceMsg: "",
            __newBedPriceEdit:
              mode === "update"
                ? String(prev.bedPrice ?? prev.rentAmount ?? "")
                : "",
          }));
        }}
      >
        <option value="current">
          ₹{Number(newTenant.bedPrice || 0).toLocaleString("en-IN")} (current)
        </option>
        <option value="update">Update bed price…</option>
      </select>
    </div>

    {/* RIGHT: input */}
    <div className="col-12 col-md-6">
      {(newTenant.__priceMode || "current") === "current" ? (
        <input
          type="number"
          className="form-control mt-0"
          value={newTenant.bedPrice ?? ""}
          readOnly 
        />
      ) : (
        <input
          type="number"
          className="form-control mt-0"
          value={newTenant.__newBedPriceEdit ?? ""}
          onChange={(e) =>
            setNewTenant((prev) => ({
              ...prev,
              __newBedPriceEdit: e.target.value,
              __priceMsg: "",
            }))
          }
          min="0"
          placeholder="Enter new bed price"
        />
      )}
    </div>

    {/* Buttons + message BELOW (full width) only in update mode */}
    {newTenant.__priceMode === "update" && (
      <div className="col-12">
        <div className="d-flex gap-2 mt-2 flex-wrap">
          <button
            type="button"
            className="btn btn-primary"
            disabled={
              newTenant.__savingPrice ||
              !newTenant.roomId ||
              (trackerType === "bed" &&
                (!newTenant.bedNo || newTenant.bedNo === "__other__")) ||
              Number(newTenant.__newBedPriceEdit) < 0 ||
              Number.isNaN(Number(newTenant.__newBedPriceEdit))
            }
            onClick={async () => {
              try {
                const roomId = newTenant.roomId;
                const bedNo = newTenant.bedNo;
                const priceNum = Number(newTenant.__newBedPriceEdit);

                setNewTenant((prev) => ({
                  ...prev,
                  __savingPrice: true,
                  __priceMsg: "",
                }));

                await axios.patch(`${ROOMS_API}/${roomId}/bed/${bedNo}`, {
                  price: priceNum,
                });

                updateBedPriceInRoomLists(roomId, bedNo, priceNum);

                setNewTenant((prev) => ({
                  ...prev,
                  bedPrice: priceNum,
                  baseRent: priceNum,
                  rentAmount: priceNum,
                  __priceMode: "current",
                  __savingPrice: false,
                  __priceMsg: "✔ Bed price updated",
                }));
              } catch (err) {
                console.error(err);
                setNewTenant((prev) => ({
                  ...prev,
                  __savingPrice: false,
                  __priceMsg:
                    err.response?.data?.message || "Could not update bed price.",
                }));
              }
            }}
          >
            {newTenant.__savingPrice ? "Saving…" : "Save Price"}
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() =>
              setNewTenant((prev) => ({
                ...prev,
                __priceMode: "current",
                __newBedPriceEdit: "",
                __priceMsg: "",
                __savingPrice: false,
              }))
            }
          >
            Cancel
          </button>
        </div>

        {newTenant.__priceMsg ? (
          <small
            className={`d-block mt-2 ${
              newTenant.__priceMsg.startsWith("✔")
                ? "text-success"
                : "text-danger"
            }`}
          >
            {newTenant.__priceMsg}
          </small>
        ) : null}
      </div>
    )}
  </div>
</div>


{/* Inline "Other" Bed */}
{trackerType === "bed" && newTenant.bedNo === "__other__" && (
  <div className="col-12">
    <div className="mt-1 p-3 border rounded bg-light">
      <div className="row g-2">
        <div className="col-12 col-md-4">
          <label className="form-label">New Bed No</label>
          <input
            className="form-control"
            value={newTenant.newBedNo || ""}
            onChange={(e) =>
              setNewTenant((prev) => ({
                ...prev,
                newBedNo: e.target.value,
                __bedMsg: "",
              }))
            }
            placeholder="e.g., B4"
          />
          {!(newTenant.newBedNo || "").trim() && (
            <small className="text-danger">Bed No is required</small>
          )}
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label">Bed Category</label>
          <input
            className="form-control"
            value={newTenant.newBedCategory || ""}
            onChange={(e) =>
              setNewTenant((prev) => ({
                ...prev,
                newBedCategory: e.target.value,
                __bedMsg: "",
              }))
            }
            placeholder="Upper / Lower"
          />
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label">
            Price <span className="text-muted">(optional)</span>
          </label>
          <input
            type="number"
            className="form-control"
            value={newTenant.newBedPrice ?? ""}
            onChange={(e) =>
              setNewTenant((prev) => ({
                ...prev,
                newBedPrice: e.target.value,
                __bedMsg: "",
              }))
            }
            placeholder="e.g., 3500"
            min="0"
          />
          {newTenant.newBedPrice !== "" &&
            newTenant.newBedPrice != null &&
            (Number(newTenant.newBedPrice) < 0 ||
              Number.isNaN(Number(newTenant.newBedPrice))) && (
              <small className="text-danger">Enter a non-negative number</small>
            )}
        </div>
      </div>

      {newTenant.__bedMsg ? (
        <div className="mt-2">
          <small
            className={
              newTenant.__bedMsg.startsWith("✔")
                ? "text-success"
                : "text-danger"
            }
          >
            {newTenant.__bedMsg}
          </small>
        </div>
      ) : null}

      <div className="mt-3 d-flex gap-2 flex-wrap">
        <button
          type="button"
          className="btn btn-success"
          disabled={
            newTenant.__savingBed ||
            !(newTenant.newBedNo || "").trim() ||
            (newTenant.newBedPrice !== "" &&
              newTenant.newBedPrice != null &&
              (Number(newTenant.newBedPrice) < 0 ||
                Number.isNaN(Number(newTenant.newBedPrice))))
          }
          onClick={async () => {
            const roomId = newTenant.roomId;
            const bedNoToAdd = (newTenant.newBedNo || "").trim();
            const bedCategoryToAdd = (newTenant.newBedCategory || "").trim();
            const priceStr = newTenant.newBedPrice;

            const priceProvided = priceStr !== "" && priceStr != null;
            const priceNum = priceProvided ? Number(priceStr) : null;

            const roomIdx = roomsData.findIndex(
              (r) => String(r._id) === String(roomId)
            );
            if (roomIdx === -1) {
              setNewTenant((prev) => ({ ...prev, __bedMsg: "Room not found." }));
              return;
            }

            const exists = roomsData[roomIdx].beds?.some(
              (b) =>
                String(b.bedNo).trim().toLowerCase() === bedNoToAdd.toLowerCase()
            );
            if (exists) {
              setNewTenant((prev) => ({
                ...prev,
                __bedMsg: "A bed with this number already exists in this room.",
              }));
              return;
            }

            try {
              setNewTenant((prev) => ({
                ...prev,
                __savingBed: true,
                __bedMsg: "",
              }));

              const payload = { bedNo: bedNoToAdd, bedCategory: bedCategoryToAdd };
              if (priceProvided) payload.price = priceNum;

              await axios.post(`${ROOMS_API}/${roomId}/bed`, payload);

              setRoomsData((prev) => {
                const copy = [...prev];
                const r = { ...copy[roomIdx] };
                r.beds = [
                  ...(r.beds || []),
                  {
                    bedNo: bedNoToAdd,
                    bedCategory: bedCategoryToAdd,
                    ...(priceProvided ? { price: priceNum } : {}),
                  },
                ];
                copy[roomIdx] = r;
                return copy;
              });

              setNewTenant((prev) => ({
                ...prev,
                bedNo: bedNoToAdd,
                bedPrice: priceProvided ? priceNum : "", // ✅ NEW
                baseRent: priceProvided ? priceNum : "",
                rentAmount: priceProvided ? priceNum : "",
                __priceMode: "current",                  // ✅ NEW
                __newBedPriceEdit: "",                   // ✅ NEW
                __priceMsg: "",                          // ✅ NEW
                __savingPrice: false,                    // ✅ NEW

                newBedNo: "",
                newBedPrice: "",
                newBedCategory: "",
                __bedMsg: "✔ Bed added successfully",
                __savingBed: false,
              }));
            } catch (err) {
              console.error(err);
              setNewTenant((prev) => ({
                ...prev,
                __bedMsg: err.response?.data?.message || "Could not save the bed.",
                __savingBed: false,
              }));
            }
          }}
        >
          {newTenant.__savingBed ? "Saving…" : "Add & Save"}
        </button>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() =>
            setNewTenant((prev) => ({
              ...prev,
              bedNo: "",
              bedPrice: "",          // ✅ NEW
              __priceMode: "current",// ✅ NEW
              __newBedPriceEdit: "", // ✅ NEW
              __priceMsg: "",        // ✅ NEW
              __savingPrice: false,  // ✅ NEW

              newBedNo: "",
              newBedPrice: "",
              newBedCategory: "",
              __bedMsg: "",
              __savingBed: false,
            }))
          }
        >
          Cancel
        </button>


        
      </div>

    </div>
  </div>
)}
<div className="col-12 col-md-12">
  <label className="form-label fw-semibold">
    Rent Cycle
  </label>

  <div role="radiogroup" aria-label="Rent at Joining" style={{display:"flex", gap:"10px"}}>
    <div className="form-check" style={{fontSize:15}} >
      <input
        type="radio" 
        className="form-check-input"
        name="firstRentStatus"
        id="firstRentStatusAdvance"
        checked={firstRentStatusSelection === "ADVANCE_PAID"}
        onChange={() => syncFirstRentStatusForAdd("ADVANCE_PAID")}
      />
      <label className="form-check-label" htmlFor="firstRentStatusAdvance">
        Pay at Joining (Advance)
      </label>
    </div>

    <div className="form-check ">
      <input
        type="radio"
        className="form-check-input"
        name="firstRentStatus"
        id="firstRentStatusNormal"
        checked={firstRentStatusSelection === "NOT_PAID"}
        onChange={() => syncFirstRentStatusForAdd("NOT_PAID")}
      />
      <label className="form-check-label" htmlFor="firstRentStatusNormal">
        Pay at Month End(Normal cycle)
      </label>
    </div>
  </div>

  <small className="text-muted mt-1 d-block">
    • Normal cycle → rent appears in month end<br />
    • Pay at joining → rent recorded in month joining
  </small>
</div>


              {/* Base Rent + Rent Amount */}
              {/* <div className="col-12 col-md-6">
                <label className="form-label">
                  Base Rent Amount (Auto-Filled)
                </label>
                <input
                  className="form-control"
                  value={newTenant.baseRent || ""}
                  onChange={(e) =>
                    setNewTenant((prev) => ({ ...prev, baseRent: e.target.value }))
                  }
                />
              </div> */}
              {/* <div className="col-12 col-md-6">
                <label className="form-label">
                  Rent Amount (Auto-Filled){" "}
                  <span className="text-danger">*</span>
                </label>
                <input
                  className="form-control"
                  value={newTenant.rentAmount || ""}
                  onChange={(e) =>
                    setNewTenant((prev) => ({
                      ...prev,
                      rentAmount: e.target.value,
                    }))
                  }
                />
              </div> */}

          

              {trackerType === "bed" && (
                <>
                  {/* Relatives */}
                  <div className="col-12 col-md-6">
                    <div className="border rounded p-3 h-100">
                      <h6 className="mb-3">Relative 1</h6>
                      <label className="form-label">Relation</label>
                      <select
                        className="form-select mb-2"
                        value={newTenant.relative1Relation || "Self"}
                        onChange={(e) =>
                          setNewTenant({
                            ...newTenant,
                            relative1Relation: e.target.value,
                          })
                        }
                      >
                        {["Self", "Sister", "Brother", "Father", "Husband", "Mother"].map(
                          (r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          )
                        )}
                      </select>
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        className="form-control mb-2"
                        placeholder="Name"
                        value={newTenant.relative1Name || ""}
                        onChange={(e) =>
                          setNewTenant({
                            ...newTenant,
                            relative1Name: e.target.value,
                          })
                        }
                      />
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="Phone"
                        value={newTenant.relative1Phone || ""}
                        onChange={(e) =>
                          setNewTenant({
                            ...newTenant,
                            relative1Phone: e.target.value,
                          })
                        }
                      />
                      {newTenant.relative1Phone &&
                        !/^\d{10}$/.test(
                          String(newTenant.relative1Phone).trim()
                        ) && (
                          <small className="text-danger">
                            Enter 10-digit number
                          </small>
                        )}
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="border rounded p-3 h-100">
                      <h6 className="mb-3">Relative 2</h6>
                      <label className="form-label">Relation</label>
                      <select
                        className="form-select mb-2"
                        value={newTenant.relative2Relation || "Self"}
                        onChange={(e) =>
                          setNewTenant({
                            ...newTenant,
                            relative2Relation: e.target.value,
                          })
                        }
                      >
                        {["Self", "Sister", "Brother", "Father", "Husband", "Mother"].map(
                          (r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          )
                        )}
                      </select>
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        className="form-control mb-2"
                        placeholder="Name"
                        value={newTenant.relative2Name || ""}
                        onChange={(e) =>
                          setNewTenant({
                            ...newTenant,
                            relative2Name: e.target.value,
                          })
                        }
                      />
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="Phone"
                        value={newTenant.relative2Phone || ""}
                        onChange={(e) =>
                          setNewTenant({
                            ...newTenant,
                            relative2Phone: e.target.value,
                          })
                        }
                      />
                      {newTenant.relative2Phone &&
                        !/^\d{10}$/.test(
                          String(newTenant.relative2Phone).trim()
                        ) && (
                          <small className="text-danger">
                            Enter 10-digit number
                          </small>
                        )}
                    </div>
                  </div>
                </>
              )}




    {trackerType === "shop" ? (
                <div className="col-12 col-md-6">
                  <label className="form-label">
                    What are you selling/doing in shop
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={newTenant.shopBusiness || ""}
                    onChange={(e) =>
                      setNewTenant({
                        ...newTenant,
                        shopBusiness: e.target.value,
                      })
                    }
                    placeholder="Example: Grocery, mobile repair, salon, tailoring..."
                  />
                </div>
              ) : (
                <>
                  {trackerType === "room" && (
                    <div className="col-12 col-md-6">
                      <label className="form-label">No. of Family Members</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={newTenant.familyMembers || ""}
                        onChange={(e) =>
                          setNewTenant({
                            ...newTenant,
                            familyMembers: e.target.value,
                          })
                        }
                        placeholder="Enter family members count"
                      />
                    </div>
                  )}
                  

             

          
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Company Address / College
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={newTenant.companyAddress || ""}
                      onChange={(e) =>
                        setNewTenant({
                          ...newTenant,
                          companyAddress: e.target.value,
                        })
                      }
                    />
                  </div>
 <div className="col-12 col-md-6">
                <label className="form-label">
                  Date of Birth <span className="text-muted">(optional)</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={newTenant.dob || ""}
                  onChange={(e) =>
                    setNewTenant({ ...newTenant, dob: e.target.value })
                  }
                />
              </div>


                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Date of Joining College / Company
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={newTenant.dateOfJoiningCollege || ""}
                      onChange={(e) =>
                        setNewTenant({
                          ...newTenant,
                          dateOfJoiningCollege: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}

              {/* Upload Docs – Self / Parent Aadhaar + Photo */}
              <div className="col-12 col-md-12">
                <label className="form-label d-block mb-2">
                  Upload Documents
                </label>

                <div className="row g-3">
                  {/* Self Aadhaar */}
                  <div className="col-12 col-md-4">
                    {renderDocumentUploader({ id: "add-self-aadhaar", label: "Self Aadhaar Card", files: selfAadharFile, setFiles: setSelfAadharFile, messageSetter: setDocMsg })}
                  </div>

                  {trackerType !== "shop" && (
                    
                    
                    <div className="col-12 col-md-4">
                      {renderDocumentUploader({ id: "add-parent-aadhaar", label: trackerType === "room" ? "Partner Aadhaar Card" : "Parent Aadhaar Card", files: parentAadharFile, setFiles: setParentAadharFile, messageSetter: setDocMsg })}
                    </div>
                  )}

                  {/* Tenant Photo / Selfie */}
                  <div className="col-12 col-md-4">
                    {renderDocumentUploader({ id: "add-tenant-photo", label: "Tenant Photograph (Selfie)", files: photoFile, setFiles: setPhotoFile, messageSetter: setDocMsg, capture: true, hint: "JPG, JPEG, or PNG only. On mobile, this opens the camera." })}
                  </div>
                  {trackerType === "shop" && (
                    <div className="col-12 col-md-4">
                      {renderDocumentUploader({ id: "add-pan-card", label: "PAN Card", files: panCardFile, setFiles: setPanCardFile, messageSetter: setDocMsg })}
                    </div>
                  )}
                </div>

                {docMsg && (
                  <small className="d-block mt-2 text-danger">{docMsg}</small>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer d-flex flex-wrap gap-2">
          {/* NEW: Share + Import (now local handlers) */}
          {/* 
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={handleShareAddTenantModal}
            title="Share a link that opens the tenant form page"
          >
            Share Form
          </button> 
          */}

         <button
  type="button"
  className="btn btn-outline-dark"
  disabled={creatingInvite || submittingAdd || addTenantNeedsUnitSetup}   // ✅ lock
  onClick={async () => {
    if (creatingInvite || submittingAdd || addTenantNeedsUnitSetup) return; // ✅ guard

    try {
      setCreatingInvite(true);

      const INVITES_URL = `${String(apiUrl).replace(/\/+$/, "")}/invites`;

      const roomFromId = roomsData.find(
        (r) => String(r._id) === String(newTenant.roomId)
      );
      const roomFromNo = roomsData.find(
        (r) => String(r.roomNo) === String(newTenant.roomNo)
      );
      const pickedRoom = roomFromId || roomFromNo;

      const unitValidation = validateAssignableTenantUnit({
        ...newTenant,
        roomId: newTenant.roomId || pickedRoom?._id || "",
        roomNo: newTenant.roomNo || pickedRoom?.roomNo || "",
        category: newTenant.category || pickedRoom?.category || "",
      });
      if (!unitValidation.ok) {
        alert(unitValidation.message);
        setCreatingInvite(false);
        return;
      }

      const category = String(
        newTenant.category || pickedRoom?.category || ""
      ).trim();
      const roomNo = String(newTenant.roomNo || pickedRoom?.roomNo || "").trim();
      const bedNo = String(newTenant.bedNo || "").trim();

      const phone10 = String(newTenant.phoneNo || "")
        .replace(/\D/g, "")
        .slice(0, 10);

      const joinDate = newTenant.joiningDate ? new Date(newTenant.joiningDate) : null;
      const firstRentStatus =
        firstRentStatusSelection || newTenant.firstRentStatus || "ADVANCE_PAID";
      const firstRentMonth =
        joinDate
          ? (firstRentStatus === "ADVANCE_PAID"
              ? fmtMonthKey(joinDate.getFullYear(), joinDate.getMonth())
              : fmtMonthKey(joinDate.getFullYear(), joinDate.getMonth() + 1))
          : undefined;

      const invitePayload = {
        roomId: newTenant.roomId || pickedRoom?._id || undefined,
        category,
        roomNo,
        wingName:
          trackerType === "room"
            ? String(newTenant.wingName || pickedRoom?.wingName || "").trim() || undefined
            : undefined,
        floorNo:
          trackerType === "room"
            ? String(newTenant.floorNo || pickedRoom?.floorNo || "").trim() || undefined
            : undefined,
        trackerType,
        propertyType: trackerType,
        bedNo,
        name: String(newTenant.name || "").trim() || undefined,
        phoneNo: phone10 || undefined,
        address: String(newTenant.address || "").trim() || undefined,
        pincode: String(newTenant.pincode || "").trim() || undefined,
        city: String(newTenant.city || "").trim() || undefined,
        state: String(newTenant.state || "").trim() || undefined,
        houseNo: String(newTenant.houseNo || "").trim() || undefined,
        nearbyPlace: String(newTenant.nearbyPlace || "").trim() || undefined,
        relativeAddress:
          trackerType === "bed"
            ? String(newTenant.relativeAddress || "").trim() || undefined
            : undefined,
        relative1Relation: trackerType === "bed" ? newTenant.relative1Relation || undefined : undefined,
        relative1Name:
          trackerType === "bed"
            ? String(newTenant.relative1Name || "").trim() || undefined
            : undefined,
        relative1Phone:
          trackerType === "bed"
            ? String(newTenant.relative1Phone || "").trim() || undefined
            : undefined,
        relative2Relation: trackerType === "bed" ? newTenant.relative2Relation || undefined : undefined,
        relative2Name:
          trackerType === "bed"
            ? String(newTenant.relative2Name || "").trim() || undefined
            : undefined,
        relative2Phone:
          trackerType === "bed"
            ? String(newTenant.relative2Phone || "").trim() || undefined
            : undefined,
        familyMembers:
          trackerType === "room" && String(newTenant.familyMembers || "").trim() !== ""
            ? Number(newTenant.familyMembers)
            : undefined,
        companyAddress: String(newTenant.companyAddress || "").trim() || undefined,
        shopBusiness: String(newTenant.shopBusiness || "").trim() || undefined,
        shopName: String(newTenant.shopName || "").trim() || undefined,
        dateOfJoiningCollege: newTenant.dateOfJoiningCollege || undefined,
        dob: newTenant.dob || undefined,
        canteen: trackerType === "bed" ? normalizeCanteenValue(newTenant.canteen) : undefined,
        hasCanteen: trackerType === "bed" && normalizeCanteenValue(newTenant.canteen) === "yes",
        ...tenantCanteenFields(newTenant, canteenSettings, trackerType),
        joiningDate: newTenant.joiningDate || undefined,
        rentAmount: toNum(
          newTenant.baseRent !== "" && newTenant.baseRent != null
            ? newTenant.baseRent
            : newTenant.rentAmount
        ),
        depositAmount: toNum(newTenant.depositAmount),
        firstRentStatus,
        firstRentMonth,
        firstRentPaidDate:
          firstRentStatus === "ADVANCE_PAID"
            ? newTenant.firstRentPaidDate || getTodayISODate()
            : "",
      };

      // ✅ validations
      if (!invitePayload.category) { alert("Category missing. Select Room again."); setCreatingInvite(false); return; }
      if (!invitePayload.roomNo) { alert("Room No missing. Please select a Room."); setCreatingInvite(false); return; }
      if (trackerType === "bed" && (!invitePayload.bedNo || invitePayload.bedNo === "__other__")) { alert("Select valid Bed."); setCreatingInvite(false); return; }
      if (invitePayload.phoneNo && invitePayload.phoneNo.length !== 10) { alert("Phone number must be 10 digits."); setCreatingInvite(false); return; }

      // ✅ IMPORTANT: idempotency key (prevents duplicates)
      const idempotencyKey = `${invitePayload.roomNo}-${invitePayload.bedNo || trackerType}-${invitePayload.phoneNo || "noPhone"}-${invitePayload.joiningDate || "noDate"}`;

      const res = await axios.post(INVITES_URL, invitePayload, {
        headers: {
          "X-Origin": window.location.origin,
          "X-Idempotency-Key": idempotencyKey, // ✅ backend should use this
        },
      });

      const url = getWebTenantInviteUrl(res.data, appBasePath);
      if (!url) {
        alert("Invite created but URL missing.");
        console.log("INVITE RESPONSE =>", res.data);
        setCreatingInvite(false);
        return;
      }

      const shareData = { title: "Tenant Form (One-Time)", text: "Please fill this form:", url };

      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        alert("One-time link copied to clipboard.");
      }

      // ✅ close modal after successful share/copy
      closeAddTenantModal();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        (typeof e?.response?.data === "string" ? e.response.data : "") ||
        e.message;

      console.error("INVITE ERROR =>", e?.response?.data || e);
      alert(`Could not create invite link.\n\n${msg}`);
      setCreatingInvite(false); // ✅ unlock on error only
    }
  }}
>
  {creatingInvite ? "Creating…" : "Share Link"}
</button>


          <div className="flex" />

          {/* <button
            className="btn"
            onClick={handleAddTenantWithDocs}
            style={{
              backgroundColor: "rgb(94, 182, 92)",
              color: "white",
            }}
          >
            Save
            
          </button> */}


<button
  className="btn"
  onClick={async () => {
    if (submittingAdd || creatingInvite) return; // ✅ block
    try {
      setSubmittingAdd(true);
      await handleAddTenantWithDocs();
      // If save succeeded, keep locked OR close modal.
      // If you close modal, lock reset happens anyway.
    } catch (e) {
      setSubmittingAdd(false); // ✅ unlock on error only
      throw e;
    }
  }}
  disabled={submittingAdd || creatingInvite || addTenantNeedsUnitSetup || invLoading || (invToken && !formId) || !!invError}
  style={{ backgroundColor: "rgb(94, 182, 92)", color: "white" }}
>
  {submittingAdd ? "Saving…" : "Save"}
</button>




          {/* 
          <button
            className="btn btn-secondary"
            onClick={() => setShowAddModal(false)}
          >
            Cancel
          </button> 
          */}
        </div>
      </div>
    </div>
  </div>
)}


      {showStatusModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Tenant</h5>
                <button
                  type="button"
                  className="btn-close p-0"
                  onClick={() => setShowAddModal(false)}
                >x</button>
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  {/* Standard Inputs */}
                  {[
                    {
                      label: "Sr No",
                      key: "srNo",
                      type: "text",
                      readOnly: true,
                    },
                    { label: "Name", key: "name" },
                    { label: "Joining Date", key: "joiningDate", type: "date" },
                    {
                      label: "Deposit Amount",
                      key: "depositAmount",
                      type: "number",
                    },
                    { label: "Phone No", key: "phoneNo" },
                    { label: "Address", key: "address" },
                    { label: "Relative Address 1", key: "relativeAddress1" },
                    { label: "Relative Address 2", key: "relativeAddress2" },
                    // { label: 'Floor No', key: 'floorNo' },
                    {
                      label: "Company Address / College",
                      key: "companyAddress",
                    },
                    {
                      label: "Date of Joining College",
                      key: "dateOfJoiningCollege",
                      type: "date",
                    },
                    { label: "Date of Birth", key: "dob", type: "date" },
                  ].map(({ label, key, type = "text", readOnly = false }) => (
                    <div className="col-md-6" key={key}>
                      <label className="form-label">{label}</label>
                      <input
                        type={type}
                        name={key === "phoneNo" ? "tenantPhoneNo" : undefined}
                        autoComplete={key === "phoneNo" ? "tel" : undefined}
                        className="form-control"
                        value={newTenant[key] || ""}
                        readOnly={readOnly}
                        onChange={(e) =>
                          setNewTenant({ ...newTenant, [key]: e.target.value })
                        }
                      />
                    </div>
                  ))}

                  {addTenantNeedsUnitSetup && (
                    <div className="col-12">
                      <div className="alert alert-warning d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-0">
                        <div>
                          <strong>Unit details are not set yet.</strong>
                          <div className="small">
                            Set property, floor and {getTenantSetupUnitLabel(addTenantSelectedRoom).toLowerCase()} number before adding a tenant.
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => openTenantUnitSetupModal(addTenantSelectedRoom)}
                        >
                          Set unit details
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Room / Flat Dropdowns */}
                  {trackerType === "room" ? (
                    <>
                      <div className="col-md-6">
                        <label className="form-label">Building</label>
                        <select
                          className="form-control"
                          value={newTenant.category || ""}
                          onChange={(e) =>
                            setNewTenant((prev) => ({
                              ...prev,
                              category: e.target.value,
                              wingName: "",
                              floorNo: "",
                              roomId: "",
                              roomNo: "",
                              flatType: "",
                              bedNo: "",
                              baseRent: "",
                              rentAmount: "",
                              bedPrice: "",
                            }))
                          }
                        >
                          <option value="">Select Building</option>
                          {residentialBuildingOptions.map((building) => (
                            <option key={`mobile-building-${building}`} value={building}>
                              {building}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Wing</label>
                        <select
                          className="form-control"
                          value={residentialWingOptions.length <= 1 ? (residentialWingOptions[0] || "") : (newTenant.wingName || "")}
                          disabled={!newTenant.category || residentialWingOptions.length <= 1}
                          onChange={(e) =>
                            setNewTenant((prev) => ({
                              ...prev,
                              wingName: e.target.value,
                              floorNo: "",
                              roomId: "",
                              roomNo: "",
                              flatType: "",
                              bedNo: "",
                              baseRent: "",
                              rentAmount: "",
                              bedPrice: "",
                            }))
                          }
                        >
                          <option value="">
                            {!newTenant.category ? "Select building first" : "Select Wing"}
                          </option>
                          {residentialWingOptions.map((wing) => (
                            <option key={`mobile-wing-${wing || "no-wing"}`} value={wing}>
                              {formatWingOptionLabel(wing)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Floor</label>
                        <select
                          className="form-control"
                          value={newTenant.floorNo || ""}
                          disabled={
                            !newTenant.category ||
                            (residentialWingOptions.length > 1 && !newTenant.wingName)
                          }
                          onChange={(e) =>
                            setNewTenant((prev) => ({
                              ...prev,
                              floorNo: e.target.value,
                              roomId: "",
                              roomNo: "",
                              flatType: "",
                              bedNo: "",
                              baseRent: "",
                              rentAmount: "",
                              bedPrice: "",
                            }))
                          }
                        >
                          <option value="">
                            {!newTenant.category
                              ? "Select building first"
                              : residentialWingOptions.length > 1 && !newTenant.wingName
                              ? "Select wing first"
                              : "Select Floor"}
                          </option>
                          {residentialFloorOptions.map((floor) => (
                            <option key={`mobile-floor-${floor}`} value={floor}>
                              Floor {floor}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Flat</label>
                        <select
                          className="form-control"
                          value={newTenant.roomId || ""}
                          disabled={!newTenant.floorNo}
                          onChange={(e) => {
                            const selectedRoom = residentialFlatOptions.find(
                              (room) => String(room._id) === String(e.target.value)
                            );
                            applySelectedTrackerRoom(selectedRoom);
                          }}
                        >
                          <option value="">
                            {newTenant.floorNo ? "Select Flat" : "Select floor first"}
                          </option>
                          {residentialFlatOptions.map((room) => (
                            <option key={`mobile-room-${room._id}`} value={room._id}>
                              {room.roomNo}
                              {room.flatType ? ` • ${room.flatType}` : ""}
                              {room.floorNo ? ` • Floor ${room.floorNo}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="col-md-6">
                      <label className="form-label">Room No</label>
                      <select
                        className="form-control"
                        value={newTenant.roomId || ""}
                        onChange={(e) => {
                          const roomId = e.target.value;
                          const selectedRoom = roomsData.find(
                            (room) => String(room._id) === String(roomId)
                          );
                          applySelectedTrackerRoom(selectedRoom);
                        }}
                      >
                        <option value="">Select Room</option>
                        {roomsData
                          .filter(roomHasVacantBed)
                          .map((room) => (
                            <option key={`room-${room._id || room.roomNo}`} value={room._id || room.roomNo}>
                              {room.roomNo} (Floor {room.floorNo})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Bed No Dropdown + inline "Other" form (price optional) */}
                  {trackerType === "bed" && (
                  <div className="col-md-6">
                    <label className="form-label">Bed No</label>
                    <select
                      className="form-control"
                      value={newTenant.bedNo || ""}
                      onChange={(e) => {
                        const bedNo = e.target.value;

                        // If "Other", switch to inline form
                        if (bedNo === "__other__") {
                          setNewTenant((prev) => ({
                            ...prev,
                            bedNo: "__other__",
                            baseRent: "",
                            rentAmount: "",
                            newBedNo: prev.newBedNo || "",
                            newBedPrice: prev.newBedPrice || "",
                          }));
                          return;
                        }

                        // Normal path: pick existing bed
                        const selectedRoom = roomsData.find(
                          (r) => String(r.roomNo) === String(newTenant.roomNo)
                        );
                        const selectedBed = selectedRoom?.beds.find(
                          (b) => String(b.bedNo) === String(bedNo)
                        );

                        setNewTenant((prev) => ({
                          ...prev,
                          bedNo,
                          baseRent: selectedBed?.price ?? "",
                          rentAmount: selectedBed?.price ?? "",
                          newBedNo: "",
                          newBedPrice: "",
                        }));
                      }}
                      disabled={!newTenant.roomNo}
                    >
                      <option value="">
                        {newTenant.roomNo
                          ? "Select Bed"
                          : "Select a Room first"}
                      </option>

                      {roomsData
                        .find(
                          (r) => String(r._id) === String(newTenant.roomId)
                        )
                        ?.beds.filter(
                          (bed) => !occupiedBeds.has(occKey(newTenant.roomNo, bed.bedNo))
                        ) // only unoccupied beds
                        .filter((bed, index, beds) => beds.findIndex((item) => String(item?.bedNo) === String(bed?.bedNo)) === index)
                        .map((bed) => (
                          <option key={bed.bedNo} value={bed.bedNo}>
                            {bed.bedNo} - {bed.category || "—"} - ₹
                            {bed.price ?? "—"}
                          </option>
                        ))}

                      {!!newTenant.roomNo && (
                        <option value="__other__">Other (add new bed…)</option>
                      )}
                    </select>

                    {/* Inline "Other" form (no popup) */}
                    {newTenant.bedNo === "__other__" && (
                      <div className="mt-3 p-3 border rounded bg-light">
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="form-label">New Bed No</label>
                            <input
                              className="form-control"
                              value={newTenant.newBedNo || ""}
                              onChange={(e) =>
                                setNewTenant((prev) => ({
                                  ...prev,
                                  newBedNo: e.target.value,
                                }))
                              }
                              placeholder="e.g., B4"
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label">
                              Price{" "}
                              <span className="text-muted">(optional)</span>
                            </label>
                            <input
                              type="number"
                              className="form-control"
                              value={newTenant.newBedPrice ?? ""}
                              onChange={(e) =>
                                setNewTenant((prev) => ({
                                  ...prev,
                                  newBedPrice: e.target.value,
                                }))
                              }
                              placeholder="e.g., 3500 (optional)"
                              min="0"
                            />
                          </div>
                        </div>

                        <div className="mt-3 d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-success"
                            onClick={async () => {
                              const roomNo = newTenant.roomNo;
                              if (!roomNo) return alert("Select a Room first.");
                              const bedNoToAdd = (
                                newTenant.newBedNo || ""
                              ).trim();
                              if (!bedNoToAdd)
                                return alert("Bed No is required.");

                              // validate optional price if provided
                              let priceNum = null;
                              if (
                                newTenant.newBedPrice !== "" &&
                                newTenant.newBedPrice !== undefined &&
                                newTenant.newBedPrice !== null
                              ) {
                                priceNum = Number(newTenant.newBedPrice);
                                if (isNaN(priceNum) || priceNum < 0) {
                                  return alert(
                                    "Enter a valid non-negative price, or leave it blank."
                                  );
                                }
                              }

                              // duplicate check (within room)
                              const roomIdx = roomsData.findIndex(
                                (r) => String(r.roomNo) === String(roomNo)
                              );
                              if (roomIdx === -1)
                                return alert("Room not found.");
                              const exists = roomsData[roomIdx].beds?.some(
                                (b) =>
                                  String(b.bedNo).trim().toLowerCase() ===
                                  bedNoToAdd.toLowerCase()
                              );
                              if (exists)
                                return alert(
                                  "A bed with this number already exists in this room."
                                );

                              try {
                                // 1) persist to backend (send price only if provided)
                                const payload = { bedNo: bedNoToAdd };
                                if (priceNum !== null) payload.price = priceNum;
                                await axios.post(
                                  `/api/rooms/${encodeURIComponent(
                                    roomNo
                                  )}/beds`,
                                  payload
                                );

                                // 2) update roomsData locally
                                setRoomsData((prev) => {
                                  const copy = [...prev];
                                  const r = { ...copy[roomIdx] };
                                  r.beds = [
                                    ...(r.beds || []),
                                    {
                                      bedNo: bedNoToAdd,
                                      ...(priceNum !== null
                                        ? { price: priceNum }
                                        : {}),
                                    },
                                  ];
                                  copy[roomIdx] = r;
                                  return copy;
                                });

                                // 3) select new bed & fill rents only if price provided
                                setNewTenant((prev) => ({
                                  ...prev,
                                  bedNo: bedNoToAdd,
                                  baseRent: priceNum !== null ? priceNum : "",
                                  rentAmount: priceNum !== null ? priceNum : "",
                                  newBedNo: "",
                                  newBedPrice: "",
                                }));
                              } catch (err) {
                                console.error(err);
                                alert(
                                  "Could not save the new bed. Please try again."
                                );
                              }
                            }}
                          >
                            Add & Save
                          </button>

                          {/* <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              // cancel inline form
                              setNewTenant((prev) => ({
                                ...prev,
                                bedNo: "",
                                newBedNo: "",
                                newBedPrice: "",
                              }));
                            }}
                          >
                            Cancel
                          </button> */}
                        </div>
                      </div>
                    )}
                  </div>
                  )}

                  {/* <div className="col-md-6">
                    <label className="form-label">
                      Base Rent Amount (Auto-Filled)
                    </label>
                    <input
                      className="form-control"
                      value={newTenant.baseRent || ""}
                      readOnly
                    />
                  </div>

                  {/* Auto-Filled Rent Price */}
                  {/* <div className="col-md-6">
                    <label className="form-label">
                      Rent Amount (Auto-Filled)
                    </label>
                    <input
                      className="form-control"
                      value={newTenant.rentAmount || ""}
                      readOnly
                    />
                  </div>  */}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  // onClick={handleAddTenant}
                  onClick={handleAddTenantWithDocs}
                  disabled={addTenantNeedsUnitSetup}
                  style={{
                    backgroundColor: "rgb(94, 182, 92)",
                    color: "white",
                  }}
                >
                  <FaPlus className="me-2" /> Save Tenant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tenantUnitSetupTarget && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.62)", zIndex: 1065 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title mb-0">Set unit details</h5>
                  <small className="text-muted">
                    Complete this first, then continue adding tenant.
                  </small>
                </div>
                <button
                  type="button"
                  className="btn-close p-0"
                  onClick={closeTenantUnitSetupModal}
                  disabled={tenantUnitSetupSaving}
                >
                  x
                </button>
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">
                      {getTenantSetupCategoryLabel(tenantUnitSetupTarget)} <span className="text-danger">*</span>
                    </label>
                    {tenantUnitBuildingOptions.length > 0 && (
                      <select
                        className="form-select"
                        value={tenantUnitSetupCustom.category ? "__custom__" : getSetupDropdownValue(tenantUnitBuildingOptions, tenantUnitSetupForm.category)}
                        onChange={(e) => {
                          setTenantUnitSetupCustom((prev) => ({ ...prev, category: e.target.value === "__custom__", wingName: false, floorNo: false }));
                          setTenantUnitSetupForm((prev) => ({
                            ...prev,
                            category: e.target.value === "__custom__" ? "" : e.target.value,
                            wingName: "",
                            floorNo: "",
                          }));
                        }}
                      >
                        <option value="">Select existing property</option>
                        {tenantUnitBuildingOptions.map((option) => (
                          <option key={`tenant-setup-building-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                        <option value="__custom__">Add new property...</option>
                      </select>
                    )}
                    {(tenantUnitSetupCustom.category || tenantUnitBuildingOptions.length === 0 ||
                      getSetupDropdownValue(tenantUnitBuildingOptions, tenantUnitSetupForm.category) === "__custom__") && (
                      <input
                        className={`form-control ${tenantUnitBuildingOptions.length > 0 ? "mt-2" : ""}`}
                        value={tenantUnitSetupForm.category}
                        onChange={(e) =>
                          setTenantUnitSetupForm((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        placeholder={
                          getTenantSetupUnitType(tenantUnitSetupTarget) === "shop"
                            ? "Example: Main Market"
                            : "Example: Sadanand"
                        }
                      />
                    )}
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Wing</label>
                    <select
                      className="form-select"
                      value={tenantUnitSetupForm.hasWing ? "yes" : "no"}
                      onChange={(e) =>
                        setTenantUnitSetupForm((prev) => ({
                          ...prev,
                          hasWing: e.target.value === "yes",
                          wingName: e.target.value === "yes" ? prev.wingName : "",
                        }))
                      }
                    >
                      <option value="no">No wing</option>
                      <option value="yes">Has wing</option>
                    </select>
                  </div>

                  {tenantUnitSetupForm.hasWing && (
                    <div className="col-12 col-md-6">
                      <label className="form-label">Wing name</label>
                      {tenantUnitWingOptions.length > 0 && (
                        <select
                          className="form-select"
                          value={tenantUnitSetupCustom.wingName ? "__custom__" : getSetupDropdownValue(tenantUnitWingOptions, tenantUnitSetupForm.wingName)}
                          onChange={(e) => {
                            setTenantUnitSetupCustom((prev) => ({ ...prev, wingName: e.target.value === "__custom__", floorNo: false }));
                            setTenantUnitSetupForm((prev) => ({
                              ...prev,
                              wingName: e.target.value === "__custom__" ? "" : e.target.value,
                              floorNo: "",
                            }));
                          }}
                        >
                          <option value="">Select existing wing</option>
                          {tenantUnitWingOptions.map((option) => (
                            <option key={`tenant-setup-wing-${option}`} value={option}>
                              {option}
                            </option>
                          ))}
                          <option value="__custom__">Add new wing...</option>
                        </select>
                      )}
                      {(tenantUnitSetupCustom.wingName || tenantUnitWingOptions.length === 0 ||
                        getSetupDropdownValue(tenantUnitWingOptions, tenantUnitSetupForm.wingName) === "__custom__") && (
                        <input
                          className={`form-control ${tenantUnitWingOptions.length > 0 ? "mt-2" : ""}`}
                          value={tenantUnitSetupForm.wingName}
                          onChange={(e) =>
                            setTenantUnitSetupForm((prev) => ({
                              ...prev,
                              wingName: e.target.value,
                            }))
                          }
                          placeholder="Example: A"
                        />
                      )}
                    </div>
                  )}

                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Floor <span className="text-danger">*</span>
                    </label>
                    {tenantUnitFloorOptions.length > 0 && (
                      <select
                        className="form-select"
                        value={tenantUnitSetupCustom.floorNo ? "__custom__" : getSetupDropdownValue(tenantUnitFloorOptions, tenantUnitSetupForm.floorNo)}
                        onChange={(e) => {
                          setTenantUnitSetupCustom((prev) => ({ ...prev, floorNo: e.target.value === "__custom__" }));
                          setTenantUnitSetupForm((prev) => ({
                            ...prev,
                            floorNo: e.target.value === "__custom__" ? "" : e.target.value,
                          }));
                        }}
                      >
                        <option value="">Select existing floor</option>
                        {tenantUnitFloorOptions.map((option) => (
                          <option key={`tenant-setup-floor-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                        <option value="__custom__">Add new floor...</option>
                      </select>
                    )}
                    {(tenantUnitSetupCustom.floorNo || tenantUnitFloorOptions.length === 0 ||
                      getSetupDropdownValue(tenantUnitFloorOptions, tenantUnitSetupForm.floorNo) === "__custom__") && (
                      <input
                        className={`form-control ${tenantUnitFloorOptions.length > 0 ? "mt-2" : ""}`}
                        value={tenantUnitSetupForm.floorNo}
                        onChange={(e) =>
                          setTenantUnitSetupForm((prev) => ({
                            ...prev,
                            floorNo: e.target.value,
                          }))
                        }
                        placeholder="Example: Ground, 1, 2"
                      />
                    )}
                  </div>

                  {getTenantSetupUnitType(tenantUnitSetupTarget) === "room" && (
                    <div className="col-12 col-md-6">
                      <label className="form-label">
                        Flat type <span className="text-danger">*</span>
                      </label>
                      {tenantUnitFlatTypeOptions.length > 0 && (
                        <select
                          className="form-select"
                          value={tenantUnitSetupCustom.flatType ? "__custom__" : getSetupDropdownValue(tenantUnitFlatTypeOptions, tenantUnitSetupForm.flatType)}
                          onChange={(e) => {
                            setTenantUnitSetupCustom((prev) => ({ ...prev, flatType: e.target.value === "__custom__" }));
                            setTenantUnitSetupForm((prev) => ({
                              ...prev,
                              flatType: e.target.value === "__custom__" ? "" : e.target.value,
                            }));
                          }}
                        >
                          <option value="">Select existing flat type</option>
                          {tenantUnitFlatTypeOptions.map((option) => (
                            <option key={`tenant-setup-flat-type-${option}`} value={option}>
                              {option}
                            </option>
                          ))}
                          <option value="__custom__">Add new flat type...</option>
                        </select>
                      )}
                      {(tenantUnitSetupCustom.flatType || tenantUnitFlatTypeOptions.length === 0 ||
                        getSetupDropdownValue(tenantUnitFlatTypeOptions, tenantUnitSetupForm.flatType) === "__custom__") && (
                        <input
                          className={`form-control ${tenantUnitFlatTypeOptions.length > 0 ? "mt-2" : ""}`}
                          value={tenantUnitSetupForm.flatType}
                          onChange={(e) =>
                            setTenantUnitSetupForm((prev) => ({
                              ...prev,
                              flatType: e.target.value,
                            }))
                          }
                          placeholder="Example: 1 BHK"
                        />
                      )}
                    </div>
                  )}

                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {getTenantSetupUnitLabel(tenantUnitSetupTarget)} number <span className="text-danger">*</span>
                    </label>
                    <input
                      className="form-control"
                      value={tenantUnitSetupForm.roomNo}
                      onChange={(e) =>
                        setTenantUnitSetupForm((prev) => ({
                          ...prev,
                          roomNo: e.target.value,
                        }))
                      }
                      placeholder={getTenantSetupUnitPlaceholder(tenantUnitSetupTarget)}
                    />
                  </div>

                  {getTenantSetupUnitType(tenantUnitSetupTarget) === "bed" && (
                    <div className="col-12 col-md-6">
                      <label className="form-label">Bed type</label>
                      {tenantUnitBedTypeOptions.length > 0 && (
                        <select
                          className="form-select"
                          value={tenantUnitSetupCustom.bedCategory ? "__custom__" : getSetupDropdownValue(tenantUnitBedTypeOptions, tenantUnitSetupForm.bedCategory)}
                          onChange={(e) => {
                            setTenantUnitSetupCustom((prev) => ({ ...prev, bedCategory: e.target.value === "__custom__" }));
                            setTenantUnitSetupForm((prev) => ({
                              ...prev,
                              bedCategory: e.target.value === "__custom__" ? "" : e.target.value,
                            }));
                          }}
                        >
                          <option value="">Select existing bed type</option>
                          {tenantUnitBedTypeOptions.map((option) => (
                            <option key={`tenant-setup-bed-type-${option}`} value={option}>
                              {option}
                            </option>
                          ))}
                          <option value="__custom__">Add new bed type...</option>
                        </select>
                      )}
                      {(tenantUnitSetupCustom.bedCategory || tenantUnitBedTypeOptions.length === 0 ||
                        getSetupDropdownValue(tenantUnitBedTypeOptions, tenantUnitSetupForm.bedCategory) === "__custom__") && (
                        <input
                          className={`form-control ${tenantUnitBedTypeOptions.length > 0 ? "mt-2" : ""}`}
                          value={tenantUnitSetupForm.bedCategory}
                          onChange={(e) =>
                            setTenantUnitSetupForm((prev) => ({
                              ...prev,
                              bedCategory: e.target.value,
                            }))
                          }
                          placeholder="Example: Upper, Lower"
                        />
                      )}
                    </div>
                  )}

                  <div className="col-12 col-md-6">
                    <label className="form-label">Monthly rent</label>
                    <input
                      type="number"
                      className="form-control"
                      value={tenantUnitSetupForm.price}
                      onChange={(e) =>
                        setTenantUnitSetupForm((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      min="0"
                      placeholder="Enter monthly rent"
                    />
                  </div>

                  {docMsg && (
                    <div className="col-12">
                      <small className="text-danger">{docMsg}</small>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={closeTenantUnitSetupModal}
                  disabled={tenantUnitSetupSaving}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={saveTenantUnitSetup}
                  disabled={tenantUnitSetupSaving}
                >
                  {tenantUnitSetupSaving ? "Saving..." : "Save details"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDueModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Due Months for {selectedTenantName}
                </h5>
                <button
                  type="button"
                  className="btn-close p-0"
                  onClick={() => setShowDueModal(false)}
                >x</button>
              </div>
              <div className="modal-body">
                {dueMonths.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Month</th>
                          <th>Cycle</th>
                          <th className="text-end">Due</th>
                          <th className="text-end">Paid</th>
                          <th className="text-end">Balance</th>
                          <th className="text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dueMonths.map((month, idx) => {
                          const item =
                            typeof month === "string"
                              ? {
                                  label: month,
                                  cycle: "",
                                  expected: 0,
                                  paid: 0,
                                  outstanding: 0,
                                }
                              : month;

                          return (
                            <tr key={item.key || `${item.label}-${idx}`}>
                              <td>
                                <div className="fw-semibold">{item.label}</div>
                                {item.dueDate ? (
                                  <div className="small text-muted">
                                    Due {item.dueDate}
                                  </div>
                                ) : null}
                              </td>
                              <td>{item.cycle || "-"}</td>
                              <td className="text-end">
                                ₹{Number(item.expected || 0).toLocaleString("en-IN")}
                              </td>
                              <td className="text-end">
                                ₹{Number(item.paid || 0).toLocaleString("en-IN")}
                              </td>
                              <td className="text-end fw-semibold text-danger">
                                ₹{Number(item.outstanding || 0).toLocaleString("en-IN")}
                              </td>
                              <td className="text-center">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary"
                                  disabled={!selectedTenant?._id || item.y == null || item.m == null}
                                  onClick={() => {
                                    setShowDueModal(false);
                                    openEditForTenantMonth(
                                      selectedTenant._id,
                                      item.m,
                                      item.y
                                    );
                                  }}
                                >
                                  Add Rent
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-success">No dues!</p>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDueModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

 {showEditModal && editTenantData && (
  <div
    className="modal d-block"
    tabIndex="-1"
    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
  >
    <div className="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-md-down">
      <div className="modal-content">

{/* ===== ACTIONS SECTION ===== */}
<div className="px-3 pb-3">
  
        {/* ===== Header ===== */}
        <div className="modal-header">


          
          <h5 className="modal-title">
            Edit Tenant – {editTenantData.name}
          </h5>
          <button className="btn-close p-0" onClick={closeEditTenantModal}>
            x
          </button>
        </div>


  <div className="edit-tenant-actions d-flex flex-wrap gap-2 align-items-center">
    {/* Shift Unit */}
    {/* <button
      className="btn btn-outline-secondary btn-sm"
      onClick={() => {
        setShiftTenant(editTenantData);
        setShiftTargetKey("");
        setShowShiftModal(true);
      }}
    >
      <FaExchangeAlt /> {trackerType === "shop" ? "Shift Shop" : trackerType === "room" ? "Shift Room" : "Shift Bed"}
    </button> */}

    {/* View Details */}
    <button
      className="btn btn-outline-info btn-sm"
      onClick={() => {
        setSelectedTenant(editTenantData);
        setShowDetailsModal(true);
      }}
    >
      <FaEye /> View Details
    </button>

    {/* Share Link */}
    <button
      className="btn btn-outline-dark btn-sm"
      disabled={creatingEditInvite}
      onClick={handleShareEditTenantLink}
    >
      {creatingEditInvite ? "Creating…" : "Share Link"}
    </button>

    {/* Schedule Leave */}
    <button
      className="btn btn-warning btn-sm"
      onClick={() => handleLeave(editTenantData)}
    >
      <FaSignOutAlt /> Schedule Leave
    </button>

    {/* Cancel Leave */}
    {leaveDates[editTenantData._id] &&
      isTodayOrFuture(leaveDates[editTenantData._id]) && (
        <button
          className="btn btn-outline-warning btn-sm"
          onClick={() => handleCancelLeave(editTenantData._id)}
        >
          <FaUndo /> Cancel Leave
        </button>
      )}

    {/* Delete Tenant (right aligned) */}
    <button
      className="btn btn-danger btn-sm edit-tenant-delete-btn"
      onClick={() => openDeleteConfirmation(editTenantData._id)}
    >
      <FaTrash /> Delete Tenant
    </button>
  </div>
</div>


<hr/>
        {/* ===== BODY ===== */}
        <div className="modal-body">
          <div className="container-fluid">
            <div className="row g-3">

              {/* NAME */}
              <div className="col-12 col-md-6">
                <label className="form-label">Name</label>
                <input
                  className="form-control"
                  value={editTenantData.name || ""}
                  onChange={(e) =>
                    setEditTenantData({ ...editTenantData, name: e.target.value })
                  }
                />
              </div>

              {trackerType === "shop" && (
                <div className="col-12 col-md-6">
                  <label className="form-label">Shop Name</label>
                  <input
                    className="form-control"
                    value={editTenantData.shopName || ""}
                    onChange={(e) =>
                      setEditTenantData({ ...editTenantData, shopName: e.target.value })
                    }
                    placeholder="Enter shop name"
                  />
                </div>
              )}

              {/* PHONE */}
              <div className="col-12 col-md-6">
                <label className="form-label">Phone</label>
                <input
                  className="form-control"
                  value={editTenantData.phoneNo || ""}
                  onChange={(e) =>
                    setEditTenantData({ ...editTenantData, phoneNo: e.target.value })
                  }
                />
              </div>

              {/* ADDRESS */}
              <div className="col-12 col-md-6">
                <label className="form-label">Pincode</label>
                <input
                  className="form-control"
                  inputMode="numeric"
                  maxLength={6}
                  value={editTenantData.pincode || ""}
                  onChange={(e) =>
                    setEditTenantData({
                      ...editTenantData,
                      pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                      city: "",
                      state: "",
                      nearbyPlace: "",
                    })
                  }
                />
                {editTenantPinStatus === "loading" && <small>Finding city and location...</small>}
                {editTenantPinStatus === "error" && <small className="text-muted">PIN code not found. Enter city and nearby place manually.</small>}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">City</label>
                <input
                  className="form-control"
                  value={editTenantData.city || ""}
                  onChange={(e) =>
                    setEditTenantData({ ...editTenantData, city: e.target.value })
                  }
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">State</label>
                <input
                  className="form-control"
                  value={editTenantData.state || ""}
                  onChange={(e) =>
                    setEditTenantData({ ...editTenantData, state: e.target.value })
                  }
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Local Address</label>
                <input
                  className="form-control"
                  value={editTenantData.address || ""}
                  onChange={(e) =>
                    setEditTenantData({ ...editTenantData, address: e.target.value })
                  }
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">House No</label>
                <input
                  className="form-control"
                  value={editTenantData.houseNo || ""}
                  onChange={(e) =>
                    setEditTenantData({ ...editTenantData, houseNo: e.target.value })
                  }
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Nearby Place</label>
                <input
                  className="form-control"
                  value={editTenantData.nearbyPlace || ""}
                  onChange={(e) =>
                    setEditTenantData({ ...editTenantData, nearbyPlace: e.target.value })
                  }
                />
              </div>

              {/* COMPANY ADDRESS */}
              <div className="col-12 col-md-6">
                <label className="form-label">
                  {trackerType === "shop" ? "What are you selling/doing in shop" : "Company Address / College"}
                </label>
                {trackerType === "shop" ? (
                  <textarea
                    className="form-control"
                    rows="3"
                    value={editTenantData.shopBusiness || ""}
                    onChange={(e) =>
                      setEditTenantData({ ...editTenantData, shopBusiness: e.target.value })
                    }
                    placeholder="Example: Grocery, mobile repair, salon, tailoring..."
                  />
                ) : (
                  <input
                    className="form-control"
                    value={editTenantData.companyAddress || ""}
                    onChange={(e) =>
                      setEditTenantData({ ...editTenantData, companyAddress: e.target.value })
                    }
                  />
                )}
              </div>

              {/* JOINING DATE */}
              <div className="col-12 col-md-6">
                <label className="form-label">Joining Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={editTenantData.joiningDate?.split("T")[0] || ""}
                  onChange={(e) =>
                    setEditTenantData((prev) => {
                      const nextStatus = String(prev?.firstRentStatus || "NOT_PAID").trim();
                      return {
                        ...prev,
                        joiningDate: e.target.value,
                        firstRentMonth: getFirstRentMonthForStatus(
                          e.target.value,
                          nextStatus
                        ),
                      };
                    })
                  }
                />
              </div>

              {isEditRentAtJoiningVisible && (
                <div className="col-12 col-md-6">
                
                  <label className="form-label fw-semibold d-block">
                    Rent at Joining
                  </label>
                  <small className="text-muted mt-1 d-block">
                    Current payment cycle:{" "}
                    <strong>
                      {(editTenantData.firstRentStatus || "ADVANCE_PAID") ===
                      "ADVANCE_PAID"
                        ? "Paid at Joining (Advance)"
                        : "Not Paid (Normal cycle)"}
                    </strong>
                    .
                  </small>
                  <div className="btn-group w-100" role="group" aria-label="Rent at Joining">
                    <label className={`btn btn-outline-primary ${
                      (editTenantData.firstRentStatus || "ADVANCE_PAID") ===
                      "ADVANCE_PAID"
                        ? "active"
                        : ""
                    }`}>
                    
                      <input
                        type="radio"
                        name="rentAtJoining"
                        value="ADVANCE_PAID"
                        checked={
                          (editTenantData.firstRentStatus || "ADVANCE_PAID") ===
                          "ADVANCE_PAID"
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          setEditTenantData((prev) => ({
                            ...prev,
                            firstRentStatus: value,
                            firstRentMonth: getFirstRentMonthForStatus(
                              prev?.joiningDate,
                              value
                            ),
                            firstRentPaidDate:
                              value === "ADVANCE_PAID"
                                ? new Date().toISOString().slice(0, 10)
                                : "",
                          }));
                        }}
                        className="btn-check"
                      />
                      Paid at Joining (Advance)
                    </label>
                    <label className={`btn btn-outline-primary ${
                      (editTenantData.firstRentStatus || "ADVANCE_PAID") ===
                      "NOT_PAID"
                        ? "active"
                        : ""
                    }`}>
                      <input
                        type="radio"
                        name="rentAtJoining"
                        value="NOT_PAID"
                        checked={
                          (editTenantData.firstRentStatus || "ADVANCE_PAID") ===
                          "NOT_PAID"
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          setEditTenantData((prev) => ({
                            ...prev,
                            firstRentStatus: value,
                            firstRentMonth: getFirstRentMonthForStatus(
                              prev?.joiningDate,
                              value
                            ),
                            firstRentPaidDate: "",
                          }));
                        }}
                        className="btn-check"
                      />
                      Not Paid (Normal cycle)
                    </label>
                 
                  </div>
                
                </div>
              )}

              {trackerType === "bed" && (
                <div className="col-12 col-md-6">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="form-control"
                    value={editTenantData.dob?.split("T")[0] || ""}
                    onChange={(e) =>
                      setEditTenantData({ ...editTenantData, dob: e.target.value })
                    }
                  />
                </div>
              )}

              {trackerType === "bed" && (
                <>
                  {/* RELATIVE ADDRESS */}
                  <div className="col-12 col-md-6">
                    <label className="form-label">Relative Address</label>
                    <input
                      className="form-control"
                      value={editTenantData.relativeAddress || ""}
                      onChange={(e) =>
                        setEditTenantData({
                          ...editTenantData,
                          relativeAddress: e.target.value,
                        })
                      }
                    />
                  </div>

                </>
              )}

              {trackerType !== "shop" && (
                <>
                  {trackerType === "room" && (
                    <div className="col-12 col-md-6">
                      <label className="form-label">No. of Family Members</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={editTenantData.familyMembers || ""}
                        onChange={(e) =>
                          setEditTenantData({
                            ...editTenantData,
                            familyMembers: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  {/* COLLEGE/COMPANY JOINING DATE */}
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Date of Joining College / Company
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={editTenantData.dateOfJoiningCollege?.split("T")[0] || ""}
                      onChange={(e) =>
                        setEditTenantData({
                          ...editTenantData,
                          dateOfJoiningCollege: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}

              {trackerType === "room" ? (
                <>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Building <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={editTenantData.category || ""}
                      onChange={(e) =>
                        setEditTenantData((prev) => ({
                          ...prev,
                          category: e.target.value,
                          wingName: "",
                          floorNo: "",
                          roomId: "",
                          roomNo: "",
                          flatType: "",
                          bedNo: "",
                          bedPrice: "",
                          baseRent: "",
                          rentAmount: "",
                          __priceMode: "current",
                          __newBedPriceEdit: "",
                          __priceMsg: "",
                          __savingPrice: false,
                        }))
                      }
                    >
                      <option value="">Select Building</option>
                      {editResidentialBuildingOptions.map((building) => (
                        <option key={`edit-building-${building}`} value={building}>
                          {building}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Wing {editResidentialWingOptions.length > 1 ? <span className="text-danger">*</span> : null}
                    </label>
                    <select
                      className="form-select"
                      value={
                        editResidentialWingOptions.length <= 1
                          ? (editResidentialWingOptions[0] || "")
                          : (editTenantData.wingName || "")
                      }
                      disabled={!editTenantData.category || editResidentialWingOptions.length <= 1}
                      onChange={(e) =>
                        setEditTenantData((prev) => ({
                          ...prev,
                          wingName: e.target.value,
                          floorNo: "",
                          roomId: "",
                          roomNo: "",
                          flatType: "",
                          bedNo: "",
                          bedPrice: "",
                          baseRent: "",
                          rentAmount: "",
                          __priceMode: "current",
                          __newBedPriceEdit: "",
                          __priceMsg: "",
                          __savingPrice: false,
                        }))
                      }
                    >
                      <option value="">
                        {!editTenantData.category ? "Select building first" : "Select Wing"}
                      </option>
                      {editResidentialWingOptions.map((wing) => (
                        <option key={`edit-wing-${wing || "no-wing"}`} value={wing}>
                          {formatWingOptionLabel(wing)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Floor <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={editTenantData.floorNo || ""}
                      disabled={
                        !editTenantData.category ||
                        (editResidentialWingOptions.length > 1 && !editTenantData.wingName)
                      }
                      onChange={(e) =>
                        setEditTenantData((prev) => ({
                          ...prev,
                          floorNo: e.target.value,
                          roomId: "",
                          roomNo: "",
                          flatType: "",
                          bedNo: "",
                          bedPrice: "",
                          baseRent: "",
                          rentAmount: "",
                          __priceMode: "current",
                          __newBedPriceEdit: "",
                          __priceMsg: "",
                          __savingPrice: false,
                        }))
                      }
                    >
                      <option value="">
                        {!editTenantData.category
                          ? "Select building first"
                          : editResidentialWingOptions.length > 1 && !editTenantData.wingName
                          ? "Select wing first"
                          : "Select Floor"}
                      </option>
                      {editResidentialFloorOptions.map((floor) => (
                        <option key={`edit-floor-${floor}`} value={floor}>
                          Floor {floor}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Flat <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={editTenantData.roomId || ""}
                      disabled={!editTenantData.floorNo}
                      onChange={(e) => {
                        const selectedRoom = editResidentialFlatOptions.find(
                          (room) => String(room._id) === String(e.target.value)
                        );
                        applySelectedEditTrackerRoom(selectedRoom);
                      }}
                    >
                      <option value="">
                        {editTenantData.floorNo ? "Select Flat" : "Select floor first"}
                      </option>
                      {editResidentialFlatOptions.map((room) => (
                        <option key={`edit-room-${room._id}`} value={room._id}>
                          {room.roomNo}
                          {room.flatType ? ` • ${room.flatType}` : ""}
                          {room.floorNo ? ` • Floor ${room.floorNo}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="col-12 col-md-6">
                  <label className="form-label">
                    {trackerType === "shop" ? "Shop No" : "Room No"}
                  </label>
                  <select
                    className="form-select"
                    value={editTenantData.roomNo || ""}
                    onChange={(e) => {
                      const roomNo = e.target.value;
                      const selectedRoom = roomsData.find(
                        (r) => String(r.roomNo) === String(roomNo)
                      );
                      const autoSlot =
                        trackerType !== "bed"
                          ? (selectedRoom?.beds || []).find(
                              (bed) =>
                                !occupiedBeds.has(
                                  occKey(selectedRoom?.roomNo, bed.bedNo)
                                )
                            )
                          : null;

                      setEditTenantData((prev) => ({
                        ...prev,
                        roomNo,
                        bedNo: autoSlot?.bedNo || "",
                        floorNo: selectedRoom?.floorNo || "",
                        baseRent: autoSlot?.price ?? "",
                        rentAmount: autoSlot?.price ?? "",
                      }));
                    }}
                  >
                    <option value="">
                      {trackerType === "shop" ? "Select Shop" : "Select Room"}
                    </option>
                    {roomsData.map((room) => (
                      <option key={room._id} value={room.roomNo}>
                        {room.roomNo} (Floor {room.floorNo})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* BED */}
              {trackerType === "bed" && (
              <div className="col-12 col-md-6">
                <label className="form-label">Bed No</label>
                <select
                  className="form-select"
                  value={editTenantData.bedNo || ""}
                  onChange={(e) => {
                    const bedNo = e.target.value;

                    const selectedRoom = roomsData.find(
                      (r) => String(r.roomNo) === String(editTenantData.roomNo)
                    );
                    const selectedBed = selectedRoom?.beds.find(
                      (b) => String(b.bedNo) === String(bedNo)
                    );

                    setEditTenantData((prev) => ({
                      ...prev,
                      bedNo,
                      baseRent: selectedBed?.price ?? "",
                      rentAmount: selectedBed?.price ?? "",
                    }));
                  }}
                >
                  <option value="">Select Bed</option>
                  {roomsData
                    .find((r) => String(r.roomNo) === String(editTenantData.roomNo))
                    ?.beds?.filter((bed, index, beds) => beds.findIndex((item) => String(item?.bedNo) === String(bed?.bedNo)) === index).map((bed) => (
                      <option key={bed.bedNo} value={bed.bedNo}>
                        {bed.bedNo} - {bed.category || "—"} - ₹{bed.price}
                      </option>
                    ))}
                </select>
              </div>
              )}

              {trackerType === "room" ? (
                <div className="col-12 col-md-12">
                  <label className="form-label">
                    Flat / Room Price (Monthly Rent) <span className="text-danger">*</span>
                  </label>
                  <div className="row g-2 align-items-start">
                    <div className="col-12 col-md-6">
                      <select
                        className="form-select"
                        value={editTenantData.__priceMode || "current"}
                        disabled={!editTenantData.roomId}
                        onChange={(e) => {
                          const mode = e.target.value;
                          setEditTenantData((prev) => ({
                            ...prev,
                            __priceMode: mode,
                            __priceMsg: "",
                            __newBedPriceEdit:
                              mode === "update"
                                ? String(prev.bedPrice ?? prev.rentAmount ?? "")
                                : "",
                          }));
                        }}
                      >
                        <option value="current">
                          ₹{Number(editTenantData.bedPrice || 0).toLocaleString("en-IN")} (current)
                        </option>
                        <option value="update">Update bed price…</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      {(editTenantData.__priceMode || "current") === "current" ? (
                        <input
                          type="number"
                          className="form-control mt-0"
                          value={editTenantData.bedPrice ?? ""}
                          readOnly
                        />
                      ) : (
                        <input
                          type="number"
                          className="form-control mt-0"
                          value={editTenantData.__newBedPriceEdit ?? ""}
                          onChange={(e) =>
                            setEditTenantData((prev) => ({
                              ...prev,
                              __newBedPriceEdit: e.target.value,
                              __priceMsg: "",
                            }))
                          }
                          min="0"
                          placeholder="Enter new bed price"
                        />
                      )}
                    </div>

                    {editTenantData.__priceMode === "update" && (
                      <div className="col-12">
                        <div className="d-flex gap-2 mt-2 flex-wrap">
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={
                              editTenantData.__savingPrice ||
                              !editTenantData.roomId ||
                              Number(editTenantData.__newBedPriceEdit) < 0 ||
                              Number.isNaN(Number(editTenantData.__newBedPriceEdit))
                            }
                            onClick={async () => {
                              try {
                                const roomId = editTenantData.roomId;
                                const bedNo = editTenantData.bedNo || getPrimaryUnitBedNo("room");
                                const priceNum = Number(editTenantData.__newBedPriceEdit);

                                setEditTenantData((prev) => ({
                                  ...prev,
                                  __savingPrice: true,
                                  __priceMsg: "",
                                }));

                                await axios.patch(`${ROOMS_API}/${roomId}/bed/${bedNo}`, {
                                  price: priceNum,
                                });

                                updateBedPriceInRoomLists(roomId, bedNo, priceNum);

                                setEditTenantData((prev) => ({
                                  ...prev,
                                  bedPrice: priceNum,
                                  baseRent: priceNum,
                                  rentAmount: priceNum,
                                  __priceMode: "current",
                                  __savingPrice: false,
                                  __priceMsg: "✔ Bed price updated",
                                }));
                              } catch (err) {
                                console.error(err);
                                setEditTenantData((prev) => ({
                                  ...prev,
                                  __savingPrice: false,
                                  __priceMsg:
                                    err.response?.data?.message || "Could not update bed price.",
                                }));
                              }
                            }}
                          >
                            {editTenantData.__savingPrice ? "Saving…" : "Save Price"}
                          </button>

                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() =>
                              setEditTenantData((prev) => ({
                                ...prev,
                                __priceMode: "current",
                                __newBedPriceEdit: "",
                                __priceMsg: "",
                                __savingPrice: false,
                              }))
                            }
                          >
                            Cancel
                          </button>
                        </div>

                        {editTenantData.__priceMsg ? (
                          <small
                            className={`d-block mt-2 ${
                              editTenantData.__priceMsg.startsWith("✔")
                                ? "text-success"
                                : "text-danger"
                            }`}
                          >
                            {editTenantData.__priceMsg}
                          </small>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="col-12 col-md-6">
                  <label className="form-label">Rent Amount</label>
                  <input
                    className="form-control"
                    value={editTenantData.rentAmount || ""}
                    onChange={(e) =>
                      setEditTenantData({
                        ...editTenantData,
                        rentAmount: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              {/* DEPOSIT */}
              <div className="col-12 col-md-6">
                <label className="form-label">Deposit Amount</label>
                <input
                  type="number"
                  className="form-control"
                  value={editTenantData.depositAmount || ""}
                  onChange={(e) =>
                    setEditTenantData({
                      ...editTenantData,
                      depositAmount: e.target.value,
                    })
                  }
                />
              </div>

              {trackerType === "bed" && (
                <>
                  {/* CANTEEN */}
                  <div className="col-12 col-md-6">
                    <label className="form-label">Canteen</label>
                    <select
                      className="form-select"
                      value={normalizeCanteenValue(editTenantData.canteen || editTenantData.hasCanteen)}
                      onChange={(e) =>
                        setEditTenantData({
                          ...editTenantData,
                          canteen: normalizeCanteenValue(e.target.value),
                          hasCanteen: normalizeCanteenValue(e.target.value) === "yes",
                        })
                      }
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                  {trackerType === "bed" && <CanteenTenantRates tenant={editTenantData} setTenant={setEditTenantData} settings={canteenSettings} />}
                  {trackerType === "bed" && (
                    <div className="col-12">
                      <div className="row g-3">
                        <div className="col-12 col-md-6">
                          <div className="p-3 border rounded h-100">
                            <h6>Relative 1</h6>

                            <label className="form-label">Relation</label>
                            <select
                              className="form-select mb-2"
                              value={editTenantData.relative1Relation || "Self"}
                              onChange={(e) =>
                                setEditTenantData({
                                  ...editTenantData,
                                  relative1Relation: e.target.value,
                                })
                              }
                            >
                              {["Self", "Sister", "Brother", "Father", "Husband", "Mother"].map(
                                (r) => (
                                  <option key={r}>{r}</option>
                                )
                              )}
                            </select>

                            <label className="form-label">Name</label>
                            <input
                              className="form-control mb-2"
                              value={editTenantData.relative1Name || ""}
                              onChange={(e) =>
                                setEditTenantData({
                                  ...editTenantData,
                                  relative1Name: e.target.value,
                                })
                              }
                            />

                            <label className="form-label">Phone</label>
                            <input
                              className="form-control"
                              value={editTenantData.relative1Phone || ""}
                              onChange={(e) =>
                                setEditTenantData({
                                  ...editTenantData,
                                  relative1Phone: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="col-12 col-md-6">
                          <div className="p-3 border rounded h-100">
                            <h6>Relative 2</h6>

                            <label className="form-label">Relation</label>
                            <select
                              className="form-select mb-2"
                              value={editTenantData.relative2Relation || "Self"}
                              onChange={(e) =>
                                setEditTenantData({
                                  ...editTenantData,
                                  relative2Relation: e.target.value,
                                })
                              }
                            >
                              {["Self", "Sister", "Brother", "Father", "Husband", "Mother"].map(
                                (r) => (
                                  <option key={r}>{r}</option>
                                )
                              )}
                            </select>

                            <label className="form-label">Name</label>
                            <input
                              className="form-control mb-2"
                              value={editTenantData.relative2Name || ""}
                              onChange={(e) =>
                                setEditTenantData({
                                  ...editTenantData,
                                  relative2Name: e.target.value,
                                })
                              }
                            />

                            <label className="form-label">Phone</label>
                            <input
                              className="form-control"
                              value={editTenantData.relative2Phone || ""}
                              onChange={(e) =>
                                setEditTenantData({
                                  ...editTenantData,
                                  relative2Phone: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Upload Documents (Edit) */}
              <div className="col-12 col-md-12">
                <label className="form-label d-block mb-2">
                  Upload Documents (Add More)
                </label>

                {Array.isArray(editTenantData.documents) && editTenantData.documents.length > 0 && (
                  <div className="mb-3">
                    <small className="text-muted d-block mb-2">Saved documents</small>
                    <div className="d-flex flex-column gap-2">
                      {editTenantData.documents.map((document, index) => {
                        const documentUrl = docHrefSafe(document);
                        return <div className="border rounded p-2 d-flex align-items-center justify-content-between gap-2" key={`${document.fileId || document.url || document.fileName || "document"}-${index}`}>
                          <div className="small text-truncate"><strong>{document.relation || "Document"}</strong>{document.fileName ? ` - ${document.fileName}` : ""}</div>
                          <div className="d-flex gap-2 flex-shrink-0">
                            <button type="button" className="btn btn-outline-primary btn-sm" aria-label={`View ${document.fileName || document.relation || "tenant document"}`} title="View document" disabled={!documentUrl} onClick={() => documentUrl && setDocumentPreview({ src: documentUrl, title: document.fileName || document.relation || "Tenant document" })}><FaEye /></button>
                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => deleteSavedTenantDocument(index)}>Delete</button>
                          </div>
                        </div>;
                      })}
                    </div>
                  </div>
                )}

                <div className="row g-3">
                  {/* Self Aadhaar */}
                  <div className="col-12 col-md-4">
                    {renderDocumentUploader({ id: "edit-self-aadhaar", label: "Self Aadhaar Card", files: editSelfAadharFile, setFiles: setEditSelfAadharFile, messageSetter: setEditDocMsg })}
                  </div>

                  {trackerType !== "shop" && (
                    <div className="col-12 col-md-4">
                      {renderDocumentUploader({ id: "edit-parent-aadhaar", label: trackerType === "room" ? "Partner Aadhaar Card" : "Parent Aadhaar Card", files: editParentAadharFile, setFiles: setEditParentAadharFile, messageSetter: setEditDocMsg })}
                    </div>
                  )}

                  {/* Tenant Photo */}
                  <div className="col-12 col-md-4">
                    {renderDocumentUploader({ id: "edit-tenant-photo", label: "Tenant Photograph (Selfie)", files: editPhotoFile, setFiles: setEditPhotoFile, messageSetter: setEditDocMsg, capture: true, hint: "JPG, JPEG, or PNG only. On mobile, this opens the camera." })}
                  </div>
                  {trackerType === "shop" && (
                    <div className="col-12 col-md-4">
                      {renderDocumentUploader({ id: "edit-pan-card", label: "PAN Card", files: editPanCardFile, setFiles: setEditPanCardFile, messageSetter: setEditDocMsg })}
                    </div>
                  )}
                </div>

                {editDocMsg && (
                  <small className="d-block mt-2 text-danger">
                    {editDocMsg}
                  </small>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={handleTenantUpdate}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
)}

      {showShiftModal && shiftTenant && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {trackerType === "shop" ? "Shift Shop" : trackerType === "room" ? "Shift Room" : "Shift Bed"} - {shiftTenant.name}
                </h5>
                <button
                  type="button"
                  className="btn-close p-0"
                  onClick={() => {
                    setShowShiftModal(false);
                    setShiftTenant(null);
                    setShiftTargetKey("");
                    setShiftEffectiveDate("");
                  }}
                >
                  x
                </button>
              </div>

              <div className="modal-body">
                {(() => {
                  const shiftDate = shiftEffectiveDate ? new Date(`${shiftEffectiveDate}T00:00:00`) : new Date();
                  const shiftMonth = { y: shiftDate.getFullYear(), m: shiftDate.getMonth() };
                  const rentMonthCell = getMonthCell(shiftTenant, shiftMonth.y, shiftMonth.m) || {};
                  const splitItems = getMonthCellBreakdownItems(rentMonthCell, shiftTenant, shiftMonth);
                  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  const dueMonths = [...rentSummaryByMonth.keys()]
                    .map((monthKey) => {
                      const [monthName, yearPart] = String(monthKey).split("-");
                      const monthIndex = monthNames.indexOf(monthName);
                      const year = 2000 + Number(yearPart);
                      if (monthIndex < 0 || !Number.isFinite(year)) return null;
                      return { y: year, m: monthIndex, cell: getMonthCell(shiftTenant, year, monthIndex) || {} };
                    })
                    .filter((entry) => entry && (entry.y < shiftMonth.y || (entry.y === shiftMonth.y && entry.m <= shiftMonth.m)) && Number(entry.cell.totalBalance || entry.cell.outstanding || 0) > 0);
                  if (!dueMonths.some((entry) => entry.y === shiftMonth.y && entry.m === shiftMonth.m) && Number(rentMonthCell.totalBalance || rentMonthCell.outstanding || 0) > 0) {
                    dueMonths.push({ y: shiftMonth.y, m: shiftMonth.m, cell: rentMonthCell });
                  }
                  dueMonths.sort((a, b) => a.y - b.y || a.m - b.m);
                  const totalDue = dueMonths.reduce((sum, entry) => sum + Number(entry.cell.totalBalance || entry.cell.outstanding || 0), 0);
                  const isHostelTenant = trackerType === "bed";
                  return (
                    <>
                      <div className="web-rent-due-panel mb-3">
                        <div><strong>Outstanding balance</strong><small>All unpaid charges up to the shift effective date</small></div>
                        <strong>₹{totalDue.toLocaleString("en-IN")}</strong>
                      </div>
                      <div className="web-rent-split-card mb-3">
                        <h6>Due by month</h6>
                        {dueMonths.length ? dueMonths.map((entry) => (
                          <div className="web-rent-split-row" key={`${entry.y}-${entry.m}`}>
                            <span>{new Date(entry.y, entry.m, 1).toLocaleString("en-IN", { month: "short", year: "numeric" })}</span><strong>₹{Number(entry.cell.totalBalance || entry.cell.outstanding || 0).toLocaleString("en-IN")}</strong><small>{entry.cell.label || "Due"}</small>
                          </div>
                        )) : <div className="small text-muted">No unpaid charges before this shift date.</div>}
                        <div className="web-rent-total-row"><span>Total due</span><strong>₹{totalDue.toLocaleString("en-IN")}</strong></div>
                        {isHostelTenant && !splitItems.some((item) => item.type === "canteen") && <div className="small text-muted mt-2">Canteen is available only for Hostel tenants.</div>}
                        {!splitItems.some((item) => item.type === "light-bill") && (
                          <button type="button" className="btn btn-outline-primary btn-sm mt-3" onClick={() => setShowTenantLightBillModal({ unitId: shiftTenant?.roomId?._id || shiftTenant?.roomId || "", propertyType: normalizeRoomPropertyType(shiftTenant), billingMonth: fmtMonthKey(shiftMonth.y, shiftMonth.m) })}>+ Add light bill for this tenant</button>
                        )}
                      </div>
                    </>
                  );
                })()}
                <div className="mb-3">
                  <label className="form-label">
                    {trackerType === "shop"
                      ? "Select Vacant Shop"
                      : trackerType === "room"
                      ? "Select Vacant Room"
                      : "Select Vacant Bed"}
                  </label>
                  <select
                    className="form-select"
                    value={shiftTargetKey}
                    onChange={(e) => setShiftTargetKey(e.target.value)}
                  >
                    <option value="">
                      {trackerType === "shop"
                        ? "-- Select shop --"
                        : trackerType === "room"
                        ? "-- Select vacant room --"
                        : "-- Select vacant bed --"}
                    </option>
                    {allVacantSlots.map((slot) => {
                      const key = getShiftSlotKey(slot);
                      return (
                        <option key={key} value={key}>
                          {formatVacantBedOption(slot)}
                          {slot.category ? ` • ${slot.category}` : ""}{" "}
                          {slot.price
                            ? ` • ₹${toNum(slot.price).toLocaleString("en-IN")}`
                            : ""}
                        </option>
                      );
                    })}
                  </select>
                  {selectedShiftSlotNeedsDetails && (
                    <div className="alert alert-warning py-2 mt-2 mb-0 d-flex align-items-center justify-content-between gap-2">
                      <span>This vacant {trackerType === "shop" ? "shop" : trackerType === "room" ? "room" : "bed"} needs details before it can be used.</span>
                      <button type="button" className="btn btn-sm btn-primary flex-shrink-0" onClick={() => openUnitSetupForSlot(selectedShiftSlot)}>
                        Set unit details
                      </button>
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label">Shift effective date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={shiftEffectiveDate}
                    onChange={(e) => setShiftEffectiveDate(e.target.value)}
                  />
                </div>

                <p className="small text-muted">
                  Current: {formatTrackerUnit(shiftTenant.roomNo, shiftTenant.bedNo)}
                </p>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowShiftModal(false);
                    setShiftTenant(null);
                    setShiftTargetKey("");
                    setShiftEffectiveDate("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!shiftTargetKey || !shiftEffectiveDate || selectedShiftSlotNeedsDetails}
                  onClick={handleShiftSave}
                >
                  Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}




{showPendingModal && (
  <div
    className="modal d-block"
    tabIndex="-1"
    style={{
      background: "rgba(0,0,0,0.5)",
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      overflowY: "auto",
    }}
  >
    <div className="modal-dialog modal-lg modal-dialog-centered">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Pending Rents ({pendingTenants.length})</h5>
         <button
  type="button"
  className="modal-x-btn"
  onClick={() => setShowPendingModal(false)}
  aria-label="Close"
>
  ×
</button>

        </div>

        <div className="modal-body">
          {pendingTenants.length === 0 ? (
            <div className="text-success">No pending rents 🎉</div>
          ) : (
            <div className="table-responsive ">
              <table className="table table-bordered align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>
                      {trackerType === "shop"
                        ? "Shop"
                        : trackerType === "room"
                        ? "Room No"
                        : "Room/Bed"}
                    </th>
                    <th>Month</th>
                    <th>Due</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTenants.map((p) => (
                    <tr key={p.tenant?._id}>
                      <td>{p.tenant?.name}</td>
                      <td>
                        {trackerType === "bed"
                          ? `${p.tenant?.roomNo || "-"} / ${p.tenant?.bedNo || "-"}`
                          : p.tenant?.roomNo || "-"}
                      </td>
                      <td>{p.reason}</td>
                      <td className="fw-bold text-danger">
                        {p.dueAmount != null
                          ? `₹${Number(p.dueAmount).toLocaleString("en-IN")}`
                          : "-"}
                      </td>
                      <td>
                       <button
  className="btn btn-sm btn-outline-primary"
  onClick={() => {
    setShowPendingModal(false);

    // ✅ Open Edit Rent modal for that tenant & billing month
    openEditForTenantMonth(p.tenant?._id, p.billMonth, p.billYear);
  }}
>
  Edit Rent
</button>

                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* <div style={{ fontSize: 12, opacity: 0.7 }}>
                Note: If Due shows “-”, it means rent is not paid for the billing month, but no explicit rentDue amount is stored.
              </div> */}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowPendingModal(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}




{showUpcomingModal && (
  <div
    className="modal d-block"
    tabIndex="-1"
    style={{
      background: "rgba(0,0,0,0.5)",
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      overflowY: "auto",
    }}
  >
    <div className="modal-dialog modal-lg modal-dialog-centered">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Upcoming Rents ({upcomingRentEntries.length})</h5>
          <button
            type="button"
            className="modal-x-btn"
            onClick={() => setShowUpcomingModal(false)}
            aria-label="Close"
          >
          x
          </button>
        </div>

        <div className="modal-body">
          {upcomingRentEntries.length === 0 ? (
            <div className="text-success">No upcoming rents found 🎉</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>
                      {trackerType === "shop"
                        ? "Shop"
                        : trackerType === "room"
                        ? "Room No"
                        : "Room/Bed"}
                    </th>
                    <th>Month</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingRentEntries.map((item) => (
                    <tr key={item.key}>
                      <td>{item.tenant?.name}</td>
                      <td>
                        {trackerType === "bed"
                          ? `${item.tenant?.roomNo || "-"} / ${item.tenant?.bedNo || "-"}`
                          : item.tenant?.roomNo || "-"}
                      </td>
                      <td>{item.monthText}</td>
                      <td className="fw-semibold text-primary">{item.dateStr}</td>
                      <td className="fw-bold">
                        ₹{Number(item.amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => {
                            setShowUpcomingModal(false);
                            openEditForTenantMonth(
                              item.tenant?._id,
                              item.billMonth,
                              item.billYear
                            );
                          }}
                        >
                          Edit Rent
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowUpcomingModal(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{showMonthBreakdownModal && selectedMonthBreakdown && (
  <div
    className="modal d-block"
    tabIndex="-1"
    style={{
      background: "rgba(0,0,0,0.5)",
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      overflowY: "auto",
    }}
    onClick={() => setShowMonthBreakdownModal(false)}
  >
    <div
      className="modal-dialog modal-dialog-centered"
      style={{ maxWidth: 420, width: "calc(100% - 24px)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h5 className="modal-title mb-1">{selectedMonthBreakdown.tenantName}</h5>
            <div className="small text-muted">
              {selectedMonthBreakdown.roomLabel} | {selectedMonthBreakdown.monthLabel}
            </div>
          </div>
          <button
            type="button"
            className="modal-x-btn"
            onClick={() => setShowMonthBreakdownModal(false)}
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="modal-body">
          <div className="small text-muted mb-2">{selectedMonthBreakdown.rangeText}</div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="fw-semibold">Total</span>
            <span className="fw-bold text-primary">
              ₹{Number(selectedMonthBreakdown.totalAmount || 0).toLocaleString("en-IN")}
            </span>
          </div>

          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th style={{ width: "42%" }}>Item</th>
                <th className="text-end" style={{ width: "28%" }}>Amount</th>
                <th className="text-end" style={{ width: "30%" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(selectedMonthBreakdown.items || []).map((item) => {
                const status = String(item?.status || "").trim().toLowerCase();
                const statusBg = status.startsWith("paid")
                  ? "#198754"
                  : status.startsWith("due")
                  ? "#dc3545"
                  : status.startsWith("pend")
                  ? "#ffc107"
                  : "#6c757d";
                const statusColor = status.startsWith("pend") ? "#111" : "#fff";

                return (
                  <tr key={`${selectedMonthBreakdown.monthLabel}-${item.label}`}>
                    <td className="fw-semibold">{item.label}</td>
                    <td className="text-end">₹{Number(item.amount || 0).toLocaleString("en-IN")}</td>
                    <td className="text-end">
                      {item.editable ? (
                        <select
                          className="form-select form-select-sm d-inline-block"
                          style={{ width: 92, minWidth: 92 }}
                          value={status.startsWith("paid") ? "paid" : "due"}
                          disabled={updatingBreakdownStatusKey === item.key}
                          onChange={(e) => updateBreakdownItemStatus(item, e.target.value)}
                        >
                          <option value="due">Due</option>
                          <option value="paid">Paid</option>
                        </select>
                      ) : (
                        <span
                          className="badge rounded-pill"
                          style={{ backgroundColor: statusBg, color: statusColor }}
                        >
                          {item.status}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!(selectedMonthBreakdown.items || []).some((item) => item.type === "light-bill") &&
            selectedMonthBreakdown.tenantId && (
              <button
                type="button"
                className="btn btn-outline-primary btn-sm mt-3"
                onClick={() => {
                  setShowMonthBreakdownModal(false);
                  setShowTenantLightBillModal({
                    unitId: selectedMonthBreakdown.unitId,
                    propertyType: selectedMonthBreakdown.propertyType,
                    billingMonth: selectedMonthBreakdown.billingMonth,
                  });
                }}
              >
                Add light bill for this tenant
              </button>
            )}
          {selectedMonthBreakdown.tenantId && selectedMonthBreakdown.monthYear != null && selectedMonthBreakdown.monthIndex != null && (
            <button
              type="button"
              className="btn btn-primary btn-sm mt-3 ms-2"
              onClick={() => {
                const tenant = (Array.isArray(allTenantsData) ? allTenantsData : []).find((entry) => String(entry?._id) === String(selectedMonthBreakdown.tenantId));
                setShowMonthBreakdownModal(false);
                if (tenant) openEditForTenantMonth(tenant._id, selectedMonthBreakdown.monthIndex, selectedMonthBreakdown.monthYear);
              }}
            >
              Add rent
            </button>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowMonthBreakdownModal(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{showTenantLightBillModal && (
  <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.55)", position: "fixed", inset: 0, zIndex: 10000, overflowY: "auto" }}>
    <div className="modal-dialog modal-xl modal-dialog-centered">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Add light bill</h5>
          <button type="button" className="modal-x-btn" onClick={() => setShowTenantLightBillModal(false)}>x</button>
        </div>
        <div className="modal-body">
          <LightBill
            embedded
            onClose={() => setShowTenantLightBillModal(false)}
            initialAdd
            initialUnitId={showTenantLightBillModal.unitId}
            initialPropertyType={showTenantLightBillModal.propertyType}
            initialBillingMonth={showTenantLightBillModal.billingMonth}
            onBillsChange={async () => {
              setShowTenantLightBillModal(false);
              await refreshTenants();
              setRentSummaryRevision((value) => value + 1);
            }}
          />
        </div>
      </div>
    </div>
  </div>
)}

{showCanteenDueModal && (
  <div
    className="modal d-block"
    tabIndex="-1"
    style={{
      background: "rgba(0,0,0,0.5)",
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      overflowY: "auto",
    }}
  >
    <div className="modal-dialog modal-lg modal-dialog-centered">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Canteen Dues ({canteenDueEntries.length})</h5>
          <button
            type="button"
            className="modal-x-btn"
            onClick={() => setShowCanteenDueModal(false)}
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="modal-body">
          {canteenDueEntries.length === 0 ? (
            <div className="text-success">No canteen dues found</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>
                      {trackerType === "shop"
                        ? "Shop"
                        : trackerType === "room"
                        ? "Room No"
                        : "Room/Bed"}
                    </th>
                    <th>Month</th>
                    <th>Meals</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {canteenDueEntries.map((item) => (
                    <tr key={item.key}>
                      <td>{item.tenant?.name || "-"}</td>
                      <td>
                        {trackerType === "bed"
                          ? `${item.tenant?.roomNo || "-"} / ${item.tenant?.bedNo || "-"}`
                          : item.tenant?.roomNo || "-"}
                      </td>
                      <td>{item.monthLabel || item.month || "-"}</td>
                      <td>{item.mealCount || 0}</td>
                      <td className="fw-bold text-danger">
                        ₹{Number(item.amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="text-uppercase">{item.status || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowCanteenDueModal(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{showCanteenTenantModal && (
  <div
    className="modal d-block"
    tabIndex="-1"
    style={{
      background: "rgba(0,0,0,0.5)",
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      overflowY: "auto",
    }}
  >
    <div className="modal-dialog modal-lg modal-dialog-centered">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Canteen Tenants ({canteenTenants.length})</h5>
          <button
            type="button"
            className="modal-x-btn"
            onClick={() => setShowCanteenTenantModal(false)}
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="modal-body">
          {canteenTenants.length === 0 ? (
            <div className="text-success">No canteen tenants found</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>
                      {trackerType === "shop"
                        ? "Shop"
                        : trackerType === "room"
                        ? "Room No"
                        : "Room/Bed"}
                    </th>
                    <th>Phone</th>
                    <th>Latest Month</th>
                    <th>Latest Status</th>
                  </tr>
                </thead>
                <tbody>
                  {canteenTenants.map((tenant) => {
                    const latestEntry = getLatestCanteenEntry(tenant);

                    return (
                      <tr key={tenant?._id || `${tenant?.name}-${tenant?.roomNo}-${tenant?.bedNo}`}>
                        <td>{tenant?.name || "-"}</td>
                        <td>
                          {trackerType === "bed"
                            ? `${tenant?.roomNo || "-"} / ${tenant?.bedNo || "-"}`
                            : tenant?.roomNo || "-"}
                        </td>
                        <td>{tenant?.phoneNo || "-"}</td>
                        <td>{latestEntry?.month ? formatCanteenMonth(latestEntry.month) : "-"}</td>
                        <td className="text-uppercase">
                          {latestEntry?.status ? String(latestEntry.status) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowCanteenTenantModal(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}


      {showFModal && (
        <div
          className="modal-backdrop-custom"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1050,
          }}
          onClick={() => setShowFModal(false)} // ✅ Close on backdrop click
        >
          <div
            className="modal-dialog modal-lg"
            style={{ zIndex: 1060 }}
            onClick={(e) => e.stopPropagation()} // ❌ Prevent close when clicking inside
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Tenant Admission Form</h5>
                <button
                  className="btn-close p-0"
                  onClick={() => setShowFModal(false)}
                >x</button>
              </div>
              <div className="modal-body">
                {selectedRowData && <FormDownload formData={selectedRowData} />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* show details model */}

      {showDetailsModal && selectedTenant && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Tenant Details - {selectedTenant.name}
                </h5>
                <button
                  className="btn-close p-0"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setDocumentPreview(null);
                  }}
                >x</button>
              </div>

              <div className="modal-body">
                {/* Tabs */}
                <ul className="nav nav-tabs" id="tenantTabs" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button
                      className="nav-link"
                      id="personal-tab"
                      data-bs-toggle="tab"
                      data-bs-target="#personal"
                      type="button"
                      role="tab"
                      aria-controls="personal"
                      aria-selected="false"
                    >
                      Personal Information
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className="nav-link active"
                      id="rent-tab"
                      data-bs-toggle="tab"
                      data-bs-target="#rent"
                      type="button"
                      role="tab"
                      aria-controls="rent"
                      aria-selected="true"
                    >
                      Rent History
                    </button>
                  </li>
                  {trackerType !== "shop" && (
                    <li className="nav-item" role="presentation">
                      <button
                        className="nav-link"
                        id="canteen-history-tab"
                        data-bs-toggle="tab"
                        data-bs-target="#canteen-history"
                        type="button"
                        role="tab"
                        aria-controls="canteen-history"
                        aria-selected="false"
                      >
                        Canteen History
                      </button>
                    </li>
                  )}
                </ul>

                {/* Tab Content */}
                <div className="tab-content mt-3">
                  {/* Personal Info Tab */}
                  <div
                    className="tab-pane fade"
                    id="personal"
                    role="tabpanel"
                    aria-labelledby="personal-tab"
                  >
                    <h6>Personal Information</h6>
                    <ul className="list-group mb-3">
                      <li className="list-group-item">
                        Name: {selectedTenant.name}
                      </li>
                      <li className="list-group-item">
                        {trackerType === "shop" ? "Shop No" : "Room No"}: {selectedTenant.roomNo}
                      </li>
                      {trackerType === "shop" && (
                        <li className="list-group-item">
                          Shop Name: {selectedTenant.shopName || "—"}
                        </li>
                      )}
                      {trackerType === "shop" && (
                        <li className="list-group-item">
                          What are you selling/doing in shop: {selectedTenant.shopBusiness || "—"}
                        </li>
                      )}
                      {trackerType === "bed" && (
                        <li className="list-group-item">
                          Bed No: {selectedTenant.bedNo}
                        </li>
                      )}
                      <li className="list-group-item">
                        Phone: {selectedTenant.phoneNo}
                      </li>
                      <li className="list-group-item">
                        Joining Date:{" "}
                        {selectedTenant.joiningDate
                          ? new Date(
                              selectedTenant.joiningDate
                            ).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "â€”"}
                      </li>
                      <li className="list-group-item">
                        Joining Payment:{" "}
                        <span
                          className={`badge ${
                            selectedTenant.firstRentStatus === "ADVANCE_PAID"
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {getJoiningPaymentLabel(selectedTenant)}
                        </span>
                      </li>
                      <li className="list-group-item">
                        Deposit: ₹
                        {Number(
                          selectedTenant.depositAmount || 0
                        ).toLocaleString("en-IN")}
                      </li>
                      <li className="list-group-item">
                        Address: {selectedTenant.address}
                      </li>
                      {trackerType !== "shop" && (
                        <li className="list-group-item">
                          Company Address: {selectedTenant.companyAddress}
                        </li>
                      )}
                      <li className="list-group-item">
                        Date of Birth:{" "}
                        {selectedTenant.dob
                          ? new Date(selectedTenant.dob).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              }
                            )
                          : "—"}
                      </li>
                      <li className="list-group-item">
                        Date of Joining College/Company:{" "}
                        {selectedTenant.dateOfJoiningCollege
                          ? new Date(
                              selectedTenant.dateOfJoiningCollege
                            ).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "—"}
                      </li>
                    </ul>

                    {/* Documents Section */}
                    <h6>Uploaded Documents</h6>
                                    {selectedTenant.documents?.length > 0 ? (
  <ul className="list-group mb-3">
    {selectedTenant.documents.map((doc, i) => {
      const url = docHrefSafe(doc);
      const imageDoc = isImageDoc(doc) && !!url;

      return (
      <li
        key={i}
        className="list-group-item d-flex justify-content-between align-items-center"
      >
        <span>
          <strong>{doc.relation}</strong> — {doc.fileName}
        </span>

        {imageDoc && (
          <button
            type="button"
            className="border-0 bg-transparent p-0 me-2"
            onClick={(e) => {
              e.stopPropagation();
              setDocumentPreview({ src: url, title: doc.relation || doc.fileName || `Document ${i + 1}` });
            }}
            title="Open document preview"
          >
            <img
              src={url}
              alt={doc.relation || doc.fileName || "Uploaded document"}
              style={{ width: 72, height: 52, objectFit: "cover", borderRadius: 6, border: "1px solid #dbe3f0" }}
            />
          </button>
        )}

        <div className="btn-group">
          {/* View Button */}
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            title={imageDoc ? "Zoom document" : "View document"}
            onClick={(e) => {
              e.stopPropagation();
              if (!url) {
                alert("No file URL available for this document.");
                return;
              }
              if (imageDoc) {
                setDocumentPreview({
                  src: url,
                  title: doc.relation || doc.fileName || `Document ${i + 1}`,
                });
                return;
              }
              window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            {imageDoc ? "Zoom" : "View"}
          </button>

          {/* ✅ Download Button (ImageKit-safe) */}
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={(e) => {
              e.stopPropagation();
              if (!url) {
                alert("No file URL available for download.");
                return;
              }

              // ✅ ImageKit download (works on localhost + live)
              window.open(
                `${url}${url.includes("?") ? "&" : "?"}ik-attachment=true`,
                "_blank",
                "noopener,noreferrer"
              );
            }}
          >
            Download
          </button>
        </div>
      </li>
      );
    })}
  </ul>
) : (
  <p className="text-muted">No documents uploaded</p>
)}
                  </div>

                  {/* Rent History Tab */}
                  <div
                    className="tab-pane fade show active"
                    id="rent"
                    role="tabpanel"
                    aria-labelledby="rent-tab"
                  >
                    <h6>Rent History ({new Date().getFullYear()})</h6>

                    <div className="tenant-rent-history-wrapper">
                      <table
                        className="table tenant-rent-history-table rentHistoryTable align-middle mb-0"
                      >
                        <thead>
                          <tr>
                            <th style={{ width: "32%" }}>Month</th>
                            <th style={{ width: "17%" }}>Date</th>
                            <th style={{ width: "16%" }}>Mode</th>
                            <th style={{ width: "17%" }}>Amount</th>
                            <th style={{ width: "18%" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
  {Array.from({ length: 12 }, (_, i) => {
    const monthDate = new Date(new Date().getFullYear(), i, 1);

    // 🔄 Find the rent record for this month using getYMFromRecord
    const rent = selectedTenant.rents?.find((r) => {
      const ym = getYMFromRecord(r); // already defined above in your component
      return ym && ym.m === i && ym.y === monthDate.getFullYear();
    });

    // 📆 Billing now starts from the *joining month* (not +1)
    const joiningDate = new Date(selectedTenant.joiningDate);
    const joinMonthStart = new Date(
      joiningDate.getFullYear(),
      joiningDate.getMonth(),
      1
    );

    const today = new Date();
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const isFutureMonth = monthDate > thisMonthStart;
    const isBeforeJoinMonth = monthDate < joinMonthStart;

    return (
      // <tr key={i}>
      <tr key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}>
        {/* Month */}
        <td>
          <div className="tenant-rent-month-cell">
            <span className="tenant-rent-month-label">
              {monthDate.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </span>
            {monthDate.getFullYear() * 12 + monthDate.getMonth() ===
              getFirstBillYM(selectedTenant) && (
              <span className="tenant-rent-inline-note">
                {selectedTenant.firstRentStatus === "ADVANCE_PAID"
                  ? "Advance paid"
                  : "First billing month"}
              </span>
            )}
          </div>
        </td>

        {/* Date */}
        <td style={{ whiteSpace: "nowrap" }}>
          {rent
            ? new Date(rent.date || new Date(rent.y || 2000, rent.m || 0, 1))
                .toLocaleDateString()
            : "—"}
        </td>

        {/* Payment Mode */}
        <td style={{ whiteSpace: "nowrap" }}>{rent ? rent.paymentMode || "Cash" : "—"}</td>

        {/* Amount */}
        <td style={{ whiteSpace: "nowrap" }}>
          {rent
            ? `₹${Number(rent.rentAmount || 0).toLocaleString("en-IN")}`
            : "—"}
        </td>

        {/* Status */}
        <td>
          {isBeforeJoinMonth ? (
            <span className="tenant-rent-status-badge is-na">Not Applicable</span>
          ) : rent ? (
            <span className="tenant-rent-status-badge is-paid">Paid</span>
          ) : isFutureMonth ? (
            <span className="tenant-rent-status-badge is-upcoming">Upcoming</span>
          ) : (
            <span className="tenant-rent-status-badge is-pending">Pending</span>
          )}
        </td>
      </tr>
    );
  })}
</tbody>

                      </table>
                    </div>
                  </div>

                  <div
                    className="tab-pane fade"
                    id="canteen-history"
                    role="tabpanel"
                    aria-labelledby="canteen-history-tab"
                  >
                    <h6>Canteen History</h6>

                    {Array.isArray(selectedTenant.canteenHistory) &&
                    selectedTenant.canteenHistory.length > 0 ? (
                      <div style={{ overflowX: "hidden" }}>
                        <table
                          className="table table-striped table-hover table-sm align-middle mb-0"
                          style={{ tableLayout: "fixed", width: "100%" }}
                        >
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: "24%" }}>Month</th>
                              <th style={{ width: "19%" }}>Meals</th>
                              <th style={{ width: "17%" }}>Rate</th>
                              <th style={{ width: "20%" }}>Amount</th>
                              <th style={{ width: "20%" }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...selectedTenant.canteenHistory]
                              .sort((a, b) =>
                                String(b?.month || "").localeCompare(String(a?.month || ""))
                              )
                              .map((entry, index) => (
                                <tr key={`${entry?.month || "canteen"}-${index}`}>
                                  <td style={{ whiteSpace: "nowrap" }}>{formatCanteenMonth(entry?.month)}</td>
                                  <td>{Number(entry?.mealCount || 0).toLocaleString("en-IN")}</td>
                                  <td style={{ whiteSpace: "nowrap" }}>
                                    ₹{Number(entry?.rate || CANTEEN_MEAL_RATE).toLocaleString("en-IN")}
                                  </td>
                                  <td style={{ whiteSpace: "nowrap" }}>
                                    ₹{Number(entry?.amount || 0).toLocaleString("en-IN")}
                                  </td>
                                  <td>
                                    <span
                                      className={`badge ${
                                        String(entry?.status || "").trim().toLowerCase() === "paid"
                                          ? "bg-success"
                                          : "bg-danger"
                                      }`}
                                    >
                                      {String(entry?.status || "").trim().toLowerCase() === "paid"
                                        ? "Paid"
                                        : "Due"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted mb-0">No canteen history available.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                {/* <button
                  className="btn btn-secondary"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button> */}
              </div>
            </div>
          </div>
        </div>
      )}

      {documentPreview?.src && (
        <div
          className="tenant-document-preview-backdrop"
          onClick={() => setDocumentPreview(null)}
        >
          <div
            className="tenant-document-preview-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-x-btn tenant-document-preview-close"
              onClick={() => setDocumentPreview(null)}
            >
              x
            </button>
            <div className="tenant-document-preview-title">
              {documentPreview.title}
            </div>
            <img
              src={documentPreview.src}
              alt={documentPreview.title || "Document preview"}
              className="tenant-document-preview-image"
            />
          </div>
        </div>
      )}

      {/* editmodel */}
      {editingTenant && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Edit Rent for {editingTenant.name}
                </h5>
                <button
                  type="button"
                  className="btn-close p-0"
                  onClick={() => {
                    setEditRentCanteen("no");
                    setEditRentCanteenAmount("");
                    setEditRentDiscount("");
                    setEditingTenant(null);
                  }}
                >x</button>
              </div>
              <div className="modal-body">
                {(() => {
                  const rentMonthCell = getMonthCell(editingTenant, editMonthYM.y, editMonthYM.m) || {};
                  const splitItems = getMonthCellBreakdownItems(rentMonthCell, editingTenant, editMonthYM);
                  const discountAmount = Number(rentMonthCell.discountAmount || 0);
                  const payableRent = Number(getMonthCellRentAmount(rentMonthCell) || 0);
                  const actualRent = payableRent + discountAmount;
                  const lightBillType = normalizeTenantPropertyType(editingTenant);
                  const lightBillRule = rentLightBillSettings?.[lightBillType];
                  const hasLightBillCharge = splitItems.some((item) => item.type === "light-bill");
                  const rentSegments = Array.isArray(editRentQuote?.segments)
                    ? editRentQuote.segments.filter((segment) => Number(segment?.days || 0) > 0)
                    : [];
                  const formatCycleDate = (value) => {
                    const date = new Date(value);
                    return Number.isNaN(date.getTime())
                      ? "-"
                      : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                  };
                  const formatInclusiveCycleEnd = (value) => {
                    const date = new Date(value);
                    if (Number.isNaN(date.getTime())) return "-";
                    date.setDate(date.getDate() - 1);
                    return formatCycleDate(date);
                  };
                  const previousCycleDate = new Date(editMonthYM.y, editMonthYM.m - 1, 1);
                  const previousCycle = getMonthCell(
                    editingTenant,
                    previousCycleDate.getFullYear(),
                    previousCycleDate.getMonth()
                  ) || {};
                  const previousRentDue = Math.max(Number(previousCycle.rentOutstanding || 0), 0);
                  const previousRentExpected = Number(getMonthCellRentAmount(previousCycle) || 0);
                  const previousRentPaid = Number(previousCycle.amountPaid || 0);
                  const latestShiftHistory = (Array.isArray(editingTenant?.rentHistory)
                    ? editingTenant.rentHistory
                    : [])
                    .filter((entry) => String(entry?.source || "").trim() === "shift")
                    .sort((a, b) => new Date(b?.effectiveFrom || 0) - new Date(a?.effectiveFrom || 0))[0];
                  const previousUnitLabel = latestShiftHistory?.previousRoomNo
                    ? formatTrackerUnit(latestShiftHistory.previousRoomNo, latestShiftHistory.previousBedNo)
                    : "previous unit";
                  const previousUnitRate = Number(
                    latestShiftHistory?.previousBaseRent ?? latestShiftHistory?.previousRentAmount ?? 0
                  );
                  const paidForItem = (item) => Number(
                    item.type === "rent" ? rentMonthCell.amountPaid
                      : item.type === "canteen" ? rentMonthCell.canteenPaid
                      : item.type === "light-bill" ? rentMonthCell.lightBillPaid
                      : 0
                  ) || 0;
                  return (
                    <div className="web-rent-split-card mb-3">
                      <h6>Payment split</h6>
                      <div className="small text-muted mb-2">For {new Date(editMonthYM.y, editMonthYM.m, 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}</div>
                      {editRentQuoteLoading && <div className="small text-muted mb-2">Updating attendance and payment amounts…</div>}
                      {editRentQuoteError && <div className="alert alert-warning py-2">{editRentQuoteError}</div>}
                      <div className="web-rent-discount-summary">
                        <span>Actual rent <strong>₹{actualRent.toLocaleString("en-IN")}</strong></span>
                        {discountAmount > 0 && <span>Monthly discount applied <strong>- ₹{discountAmount.toLocaleString("en-IN")}</strong></span>}
                        <span>Current rent payable <strong>₹{payableRent.toLocaleString("en-IN")}</strong></span>
                      </div>
                      {rentSegments.length > 1 && (
                        <div className="web-rent-cycle-breakdown">
                          <strong>How the rent changed after the shift</strong>
                          <small>
                            This cycle is {formatCycleDate(editRentQuote?.cycleStart)} to {formatInclusiveCycleEnd(editRentQuote?.cycleEnd)}.
                          </small>
                          {rentSegments.map((segment, index) => (
                            <div className="web-rent-cycle-segment" key={`${segment.from || "segment"}-${index}`}>
                              <span>{index === 0 ? "Previous unit rate" : index === rentSegments.length - 1 ? "New unit rate after shift" : "Rate change"}</span>
                              <strong>₹{Math.round(Number(segment.amount || 0)).toLocaleString("en-IN")}</strong>
                              <small>
                                {formatCycleDate(segment.from)} to {formatInclusiveCycleEnd(segment.to)} • {Number(segment.days || 0)} day{Number(segment.days || 0) === 1 ? "" : "s"} at ₹{Number(segment.monthlyRate || 0).toLocaleString("en-IN")} per month
                              </small>
                            </div>
                          ))}
                          <small className="web-rent-cycle-note">The rates are prorated by the days in this billing cycle.</small>
                        </div>
                      )}
                      {previousRentDue > 0 && (
                        <div className="web-rent-previous-due">
                          <span>Previous cycle still pending</span>
                          <strong>₹{previousRentDue.toLocaleString("en-IN")}</strong>
                          <small>
                            {previousCycleDate.toLocaleString("en-IN", { month: "long", year: "numeric" })}: paid ₹{previousRentPaid.toLocaleString("en-IN")} of ₹{previousRentExpected.toLocaleString("en-IN")}.
                          </small>
                          <small>
                            Previous unit: {previousUnitLabel}{previousUnitRate > 0 ? ` (₹${previousUnitRate.toLocaleString("en-IN")}/month)` : ""}. The ₹{previousRentPaid.toLocaleString("en-IN")} payment and ₹{previousRentDue.toLocaleString("en-IN")} pending balance remain linked to that earlier cycle; they are separate from this cycle's new-unit rent.
                          </small>
                        </div>
                      )}
                      {splitItems.map((item) => {
                        const paid = paidForItem(item);
                        const due = Math.max(Number(item.amount || 0) - paid, 0);
                        return <div className="web-rent-split-row" key={item.key || item.label}>
                          <span>{item.label}</span>
                          <strong>₹{Number(item.amount || 0).toLocaleString("en-IN")}</strong>
                          <small>Paid ₹{paid.toLocaleString("en-IN")} | Due ₹{due.toLocaleString("en-IN")}</small>
                          {item.type === "canteen" && Array.isArray(editRentQuote?.canteen?.breakdown) && editRentQuote.canteen.breakdown.length > 0 && (
                            <small>{editRentQuote.canteen.breakdown.map((part) => `${part.label || "Meals"}${part.count ? ` × ${part.count}` : part.presentDays ? ` · ${part.presentDays} day${part.presentDays === 1 ? "" : "s"}` : ""}: ₹${Number(part.amount || 0).toLocaleString("en-IN")}`).join(" · ")}</small>
                          )}
                        </div>;
                      })}
                      <div className="web-rent-total-row"><span>Total payable</span><strong>₹{Number(getMonthCellTotalAmount(rentMonthCell) || 0).toLocaleString("en-IN")}</strong></div>
                      <div className="web-rent-total-row"><span>Total paid</span><strong>₹{Number(rentMonthCell.totalPaid || 0).toLocaleString("en-IN")}</strong></div>
                      <div className="web-rent-total-row"><span>Balance</span><strong>₹{Number(rentMonthCell.totalBalance || 0).toLocaleString("en-IN")}</strong></div>
                      {rentLightBillSettingsError && <div className="alert alert-warning mt-3 mb-0">Unable to load light bill settings. Please try again before adding a bill.</div>}
                      {!rentLightBillSettingsError && rentLightBillSettings && !lightBillRule?.enabled && (
                        <div className="alert alert-warning mt-3 mb-0">Light bill is not configured for this property type. Set it up before adding a bill. <button type="button" className="btn btn-sm btn-outline-primary ms-2" onClick={() => setShowTenantLightBillModal({ unitId: editingTenant?.roomId?._id || editingTenant?.roomId || "", propertyType: lightBillType, billingMonth: fmtMonthKey(editMonthYM.y, editMonthYM.m) })}>Open light bill settings</button></div>
                      )}
                      {lightBillRule?.enabled && ["fixed_monthly", "fixed_per_tenant"].includes(lightBillRule.mode) && <div className="alert alert-info mt-3 mb-0">The fixed light bill amount is added to rent automatically. No separate bill entry is needed.</div>}
                      {lightBillRule?.enabled && ["owner_only", "common_owner_bill", "common_hostel_bill"].includes(lightBillRule.mode) && <div className="alert alert-info mt-3 mb-0">The owner pays this light bill, so it is not added to tenant rent.</div>}
                      {lightBillRule?.enabled && !["fixed_monthly", "fixed_per_tenant", "owner_only", "common_owner_bill", "common_hostel_bill"].includes(lightBillRule.mode) && !hasLightBillCharge && <button type="button" className="btn btn-outline-primary btn-sm mt-3" onClick={() => setShowTenantLightBillModal({ unitId: editingTenant?.roomId?._id || editingTenant?.roomId || "", propertyType: lightBillType, billingMonth: fmtMonthKey(editMonthYM.y, editMonthYM.m) })}>+ Add light bill for this tenant</button>}
                    </div>
                  );
                })()}
                <div className="mb-3">
                  <label className="form-label">Rent payment amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    value={editRentAmount}
                    onChange={(e) => setEditRentAmount(e.target.value)}
                  />
                </div>
                {trackerType === "bed" && (editingTenant.hasCanteen === true || normalizeCanteenValue(editingTenant.canteen) === "yes") && (
                  <div className="mb-3">
                    <label className="form-label">Canteen payment amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control"
                      value={editRentCanteenAmount}
                      onChange={(e) => setEditRentCanteenAmount(e.target.value)}
                      placeholder="0"
                    />
                    <small className="text-muted">Canteen due for {new Date(editMonthYM.y, editMonthYM.m, 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}: ₹{Math.max(Number(editRentQuote?.canteen?.balance || 0), 0).toLocaleString("en-IN")}. Payments are applied to rent first.</small>
                  </div>
                )}
                <div className="mb-3 fw-semibold">Total payment: ₹{(Number(editRentAmount || 0) + Number(editRentCanteenAmount || 0)).toLocaleString("en-IN")}</div>
                <div className="mb-3">
                  <label className="form-label">Update Type</label>
                  <div className="d-flex gap-3 flex-wrap">
                    <label className="form-check-label">
                      <input
                        type="radio"
                        className="form-check-input me-2 form-check-input1"
                        name="rentUpdateMode"
                        value="add"
                        checked={rentUpdateMode === "add"}
                        onChange={(e) => setRentUpdateMode(e.target.value)}
                      />
                      Add to existing
                    </label>
                    <label className="form-check-label">
                      <input
                        type="radio"
                        className="form-check-input me-2 form-check-input1"
                        name="rentUpdateMode"
                        value="replace"
                        checked={rentUpdateMode === "replace"}
                        onChange={(e) => setRentUpdateMode(e.target.value)}
                      />
                      Replace final value
                    </label>
                  </div>
                  <small className="text-muted">
                    Use replace when duplicate rent was added and this amount should be the final paid value for the month.
                  </small>
                </div>
                {trackerType === "bed" && (
                  <div className="mb-3 small text-muted">
                    Canteen service: {editingTenant.hasCanteen === true ? "Yes" : "No"}. Change this in Edit Tenant; attendance charges appear above for the selected month.
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">Monthly Discount (Enter 0 if not applicable)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={editRentDiscount}
                    onChange={(e) => {
                      const nextDiscount = e.target.value;
                      setEditRentDiscount(nextDiscount);
                      setEditRentAmount(
                        getSuggestedEditRentAmount(
                          editingTenant,
                          editMonthYM.y,
                          editMonthYM.m,
                          editRentCanteen,
                          nextDiscount
                        )
                      );
                    }}
                    placeholder="Enter month discount"
                  />
                  <small className="text-muted">
                   

If this month has a discount, enter the amount. Otherwise, keep it as ₹0.

                  </small>
                </div>
                {/* <div className="mb-3">
  <label className="form-label">Note (optional)</label>
  <input
    type="text"
    className="form-control"
    placeholder="Eg: Rent: 8000, Advance: 2000"
    value={editNote}
    onChange={(e) => setEditNote(e.target.value)}
  />
</div> */}

 <div className="mb-3">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={editRentDate}
                    onChange={(e) => setEditRentDate(e.target.value)}
                  />
                </div> 
<div className="mb-3">
  <label className="form-label">Month</label>
  <input
    type="month"
    className="form-control"
    value={
      editMonthYM.y != null && editMonthYM.m != null
        ? `${editMonthYM.y}-${String(editMonthYM.m + 1).padStart(2, "0")}`
        : ""
    }
    onChange={(e) => {
      const [yy, mm] = e.target.value.split("-").map(Number);
      if (Number.isFinite(yy) && Number.isFinite(mm)) {
        setEditMonthYM({ y: yy, m: mm - 1 });
      }
    }}
  />
  <small className="text-muted">
    This picks the **rent month**. The payment date stored will be today.
  </small>
</div>
                {/* ✅ New Payment Mode field */}
                <div className="mb-3">
                  <label className="form-label">Payment Mode</label>
                  <select
                    className="form-control"
                    value={editPaymentMode}
                    onChange={(e) => setEditPaymentMode(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
                {editPaymentMode === "Online" && (
                  <div className="mb-3">
                    <label className="form-label">UTR / Reference Number (optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editUtr}
                      onChange={(e) => setEditUtr(e.target.value)}
                      placeholder="Enter payment reference"
                    />
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">Payment Note (optional)</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Add a note for this payment"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Receipt URL (optional)</label>
                  <input
                    type="url"
                    className="form-control"
                    value={editReceiptUrl}
                    onChange={(e) => setEditReceiptUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <small className="text-muted">Paste the receipt link for this payment.</small>
                </div>
                {(() => {
                  const currentMonthKey = fmtMonthKey(editMonthYM.y, editMonthYM.m);
                  const rentEntry = (editingTenant?.rents || []).find((rent) => String(rent?.month || "") === currentMonthKey);
                  const payments = Array.isArray(rentEntry?.payments) && rentEntry.payments.length
                    ? rentEntry.payments
                    : rentEntry?.rentAmount > 0 ? [{ amount: rentEntry.rentAmount, date: rentEntry.date, paymentMode: rentEntry.paymentMode, utr: rentEntry.utr, note: rentEntry.note }] : [];
                  if (!payments.length) return null;
                  return <div className="web-previous-receipts"><strong>Previous receipts for {currentMonthKey}</strong>{payments.map((payment, index) => <button type="button" className="btn btn-outline-primary btn-sm" key={payment?._id || `${payment?.date || "payment"}-${index}`} onClick={() => setPaymentReceipt({ tenant: editingTenant, rent: rentEntry, payment })}><FaReceipt className="me-1" /> Receipt {index + 1} · ₹{Number(payment?.amount ?? payment?.rentAmount ?? 0).toLocaleString("en-IN")}</button>)}</div>;
                })()}
              </div>

              <div className="modal-footer">
                 <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditRentCanteen("no");
                    setEditRentCanteenAmount("");
                    setEditRentDiscount("");
                    setEditingTenant(null);
                  }}
                >
                  Cancel
                </button> 
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={editRentQuoteLoading}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {undoBedModal.show && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {trackerType === "shop"
                    ? "Select Vacant Shop"
                    : trackerType === "room"
                    ? "Select Vacant Room"
                    : "Select Vacant Bed"}
                </h5>
                <button
                  type="button"
                  className="btn-close p-0"
                  disabled={undoBedModal.busy}
                  onClick={() =>
                    setUndoBedModal({
                      show: false,
                      tenantId: "",
                      message: "",
                      vacantBeds: [],
                      selectedIndex: "",
                      busy: false,
                    })
                  }
                >
                  x
                </button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning mb-3">
                  {undoBedModal.message}
                </div>
                <label className="form-label fw-semibold">
                  {trackerType === "shop"
                    ? "Choose another vacant shop"
                    : trackerType === "room"
                    ? "Choose another vacant room"
                    : "Choose another vacant bed"}
                </label>
                <select
                  className="form-select"
                  value={undoBedModal.selectedIndex}
                  disabled={undoBedModal.busy}
                  onChange={(e) =>
                    setUndoBedModal((prev) => ({
                      ...prev,
                      selectedIndex: e.target.value,
                    }))
                  }
                >
                  <option value="">
                    {trackerType === "shop"
                      ? "Select vacant shop"
                      : trackerType === "room"
                      ? "Select vacant room"
                      : "Select vacant bed"}
                  </option>
                  {undoBedModal.vacantBeds.map((bed, index) => (
                    <option
                      key={`${bed.roomNo}-${bed.bedNo}-${index}`}
                      value={String(index)}
                    >
                      {formatVacantBedOption(bed)}
                    </option>
                  ))}
                </select>
                <div className="small text-muted mt-2">
                  The tenant will be restored to the Rent & Deposit Tracker only after this vacant
                  {trackerType === "shop"
                    ? " shop"
                    : trackerType === "room"
                    ? " room"
                    : " bed"} is assigned.
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={undoBedModal.busy}
                  onClick={() =>
                    setUndoBedModal({
                      show: false,
                      tenantId: "",
                      message: "",
                      vacantBeds: [],
                      selectedIndex: "",
                      busy: false,
                    })
                  }
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={undoBedModal.busy || undoBedModal.selectedIndex === ""}
                  onClick={handleConfirmUndoWithSelectedBed}
                >
                  {undoBedModal.busy
                    ? "Assigning..."
                    : trackerType === "shop"
                    ? "Assign Shop & Undo"
                    : trackerType === "room"
                    ? "Assign Room & Undo"
                    : "Assign Bed & Undo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Select Leave Date</h5>
                <button
                  type="button"
                  className="btn-close p-0"
                  onClick={closeLeaveModal}
                >x</button>
              </div>
              <div className="modal-body">
                <input
                  type="date"
                  className="form-control"
                  value={selectedLeaveDate}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    setSelectedLeaveDate(nextDate);
                    if (leaveDeductFromDeposit) {
                      const nextMonths = getLeaveSettlementMonths(
                        currentLeaveTenant,
                        nextDate
                      );
                      setLeaveSelectedMonths(nextMonths.map((month) => month.key));
                    }
                  }}
                />
                <p className="mt-3">
                  Are you sure you want <strong>{currentLeaveName}</strong> to
                  leave on <strong>{selectedLeaveDate || "..."}</strong>?
                </p>
                <div className="border rounded p-3 mt-3">
                  <label className="form-label fw-semibold d-block mb-2">
                    Will you cut pending rent from deposit?
                  </label>
                  <div className="btn-group w-100" role="group" aria-label="Deposit deduction">
                    <button
                      type="button"
                      className={`btn ${leaveDeductFromDeposit ? "btn-outline-secondary" : "btn-primary"}`}
                      onClick={() => {
                        setLeaveDeductFromDeposit(false);
                        setLeaveSelectedMonths([]);
                      }}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      className={`btn ${leaveDeductFromDeposit ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => {
                        setLeaveDeductFromDeposit(true);
                        setLeaveSelectedMonths(
                          leaveSettlementMonths.map((month) => month.key)
                        );
                      }}
                    >
                      Yes
                    </button>
                  </div>
                  <div className="mt-2 small text-muted">
                    If the deductions are higher than the deposit, the
                    remaining balance will be shown as an additional amount to
                    receive from the tenant.
                  </div>

                  {leaveDeductFromDeposit && (
                    <div className="mt-3">
                      <div className="small text-muted mb-2">
                        Select the pending months to deduct from the deposit.
                      </div>
                      {leaveSettlementMonths.length > 0 ? (
                        <div className="d-grid gap-2">
                          {leaveSettlementMonths.map((month) => {
                            const checked = leaveSelectedMonths.includes(month.key);
                            return (
                              <label
                                key={month.key}
                                className="d-flex align-items-center justify-content-between border rounded p-2"
                              >
                                <span>
                                  <input
                                    type="checkbox"
                                    className="form-check-input me-2"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? [...leaveSelectedMonths, month.key]
                                        : leaveSelectedMonths.filter((k) => k !== month.key);
                                      setLeaveSelectedMonths(next);
                                    }}
                                  />
                                  {month.label}
                                </span>
                                <strong>
                                  ₹{Number(month.amount || 0).toLocaleString("en-IN")}
                                </strong>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-success small">
                          No pending months found for deduction.
                        </div>
                      )}

                      {leaveProratedAdjustment && (
                        <div className="border rounded p-2 mt-3">
                          <div className="d-flex align-items-center justify-content-between">
                            <div>
                              <div className="fw-semibold">
                                {leaveProratedAdjustment.label}
                              </div>
                              <div className="small text-muted">
                                {leaveProratedAdjustment.cycleRange} | Rs.{" "}
                                {Math.round(
                                  Number(leaveProratedAdjustment.dailyRent || 0)
                                ).toLocaleString("en-IN")}{" "}
                                per day
                              </div>
                              <div className="small text-muted">
                                Monthly Rent: Rs.{" "}
                                {Number(
                                  leaveProratedAdjustment.monthlyRent || 0
                                ).toLocaleString("en-IN")}{" "}
                                | Paid: Rs.{" "}
                                {Number(
                                  leaveProratedAdjustment.paidAmount || 0
                                ).toLocaleString("en-IN")}
                              </div>
                            </div>
                            <div className="text-end">
                              <strong className="d-block">
                                Charge: Rs.{" "}
                                {Number(
                                  leaveProratedAdjustment.proratedAmount || 0
                                ).toLocaleString("en-IN")}
                              </strong>
                              {leaveProratedAdjustment.refundAmount > 0 && (
                                <div className="text-success small">
                                  Unused Rent Refund: Rs.{" "}
                                  {Number(
                                    leaveProratedAdjustment.refundAmount || 0
                                  ).toLocaleString("en-IN")}
                                </div>
                              )}
                              {leaveProratedAdjustment.deductionAmount > 0 && (
                                <div className="text-danger small">
                                  Deduction From Deposit: Rs.{" "}
                                  {Number(
                                    leaveProratedAdjustment.deductionAmount || 0
                                  ).toLocaleString("en-IN")}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-3 small">
                        <div>
                          Gross Deposit: ₹{Number(leaveSettlementSummary.grossDeposit || 0).toLocaleString("en-IN")}
                        </div>
                        <div>
                          Deduction: ₹
                          {Number(leaveSettlementSummary.totalDeduction || 0).toLocaleString("en-IN")}
                        </div>
                        <div className="text-muted">
                          Full Month Deduction: Rs.{" "}
                          {Number(leaveSettlementSummary.monthDeduction || 0).toLocaleString("en-IN")}
                        </div>
                        {leaveSettlementSummary.proratedDeduction > 0 && (
                          <div className="text-muted">
                            Prorated Stay Deduction: Rs.{" "}
                            {Number(leaveSettlementSummary.proratedDeduction || 0).toLocaleString("en-IN")}
                          </div>
                        )}
                        {leaveSettlementSummary.rentRefund > 0 && (
                          <div className="text-success">
                            Unused Rent Refund: Rs.{" "}
                            {Number(leaveSettlementSummary.rentRefund || 0).toLocaleString("en-IN")}
                          </div>
                        )}
                        {leaveSettlementSummary.amountDueFromTenant > 0 ? (
                          <>
                            <div className="fw-semibold text-danger">
                              Additional Amount to Receive: ₹
                              {Number(
                                leaveSettlementSummary.amountDueFromTenant || 0
                              ).toLocaleString("en-IN")}
                            </div>
                            <div>Return Amount: ₹0</div>
                          </>
                        ) : (
                          <div className="fw-semibold">
                            Return Amount: ₹
                            {Number(
                              leaveSettlementSummary.refundableDeposit || 0
                            ).toLocaleString("en-IN")}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                {/* <button
                  className="btn btn-secondary"
                  onClick={() => setShowLeaveModal(false)}
                >
                  Cancel
                </button> */}
                <button className="btn btn-danger" onClick={confirmLeave}>
                  Confirm Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showRentModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  All Rents / Status - {selectedTenantName}
                </h5>
                <button
                  type="button"
                  className="btn-close p-0"
                  onClick={() => setShowRentModal(false)}
                >x</button>
              </div>
              <div className="modal-body">
                {selectedRentDetails.length > 0 ? (
                  <>
                    <div className="fw-semibold mb-3">
                      Total Paid: Rs.{" "}
                      {selectedRentDetails
                        .reduce((sum, rent) => sum + Number(rent?.rentAmount || 0), 0)
                        .toLocaleString("en-IN")}
                    </div>
                    <div className="d-grid gap-2">
                      {selectedRentDetails.map((rent, index) => {
                        const amount = Number(rent?.rentAmount || 0);
                        const paidDate = rent?.date ? new Date(rent.date) : null;
                        return (
                          <div
                            className="border rounded px-2 py-2 small"
                            key={`${amount}-${rent?.month || ""}-${rent?.date || index}`}
                          >
                            <span
                              className={
                                amount > 0
                                  ? "text-success fw-semibold"
                                  : "text-danger fw-semibold"
                              }
                            >
                              {amount > 0 ? "Paid" : "Due"}
                            </span>
                            {" | "}
                            {rent?.month || "Month -"}
                            {" | Rs. "}
                            {amount.toLocaleString("en-IN")}
                            {" | "}
                            {paidDate && !isNaN(paidDate)
                              ? paidDate.toLocaleDateString("en-IN")
                              : "No date"}
                            {rent?.paymentMode ? ` | ${rent.paymentMode}` : ""}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary ms-2"
                              onClick={() => setPaymentReceipt({ tenant: selectedRentTenant, rent, payment: rent?.payments?.[0] || rent })}
                            >
                              <FaReceipt className="me-1" /> Receipt
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  {/* legacy hidden list */}
                  <div className="d-none">
                 {false && selectedRentDetails.map((rent, index) => (
                      <li className="list-group-item" key={index}>
                        ₹{Number(rent.rentAmount).toLocaleString("en-IN")} –{" "}
                        {new Date(rent.date).toLocaleDateString()}
                      </li>
                    ))} 
                    {selectedRentDetails.map((rent, index) => (
  <li
    className="list-group-item"
    key={`${Number(rent.rentAmount) || 0}-${rent.date || index}`}
  >
    ₹{Number(rent.rentAmount).toLocaleString("en-IN")} – {new Date(rent.date).toLocaleDateString()}
  </li>
))}

                  </div>
                  </>
                ) : (
                  <p>No rent data available.</p>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowRentModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {paymentReceipt && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content web-payment-receipt" id="web-payment-receipt">
              <div className="modal-header web-payment-receipt-header">
                <h5 className="modal-title"><FaReceipt className="me-2" />Payment receipt</h5>
                <button type="button" className="web-receipt-close" onClick={() => setPaymentReceipt(null)}>×</button>
              </div>
              <div className="modal-body web-payment-receipt-body">
                <div className="web-receipt-card">
                  <div className="web-receipt-brand">{paymentReceipt.tenant?.category || selectedRentTenant?.category || "Rent Management"}</div>
                  <div className="web-receipt-type">Rent payment receipt</div>
                  <div className="web-receipt-meta"><span>Receipt: R-{String(paymentReceipt.tenant?.srNo || "0").padStart(4, "0")}-{String(paymentReceipt.rent?._id || paymentReceipt.rent?.month || "").slice(-6).toUpperCase()}-1</span><span>Date: {paymentReceipt.payment?.date ? new Date(paymentReceipt.payment.date).toLocaleDateString("en-IN", {day:"2-digit", month:"short", year:"numeric"}) : "-"}</span></div>
                  <div className="web-receipt-amount">Rs. {Number(paymentReceipt.payment?.amount ?? paymentReceipt.rent?.rentAmount ?? 0).toLocaleString("en-IN")}</div>
                  {[['Received from', paymentReceipt.tenant?.name || selectedRentTenant?.name || '-'], ['Rent month', paymentReceipt.rent?.month || '-'], ['Unit', paymentReceipt.tenant?.roomNo || paymentReceipt.tenant?.roomId?.roomNo || '-'], ['Payment mode', paymentReceipt.payment?.paymentMode || 'Cash'], ['Reference', paymentReceipt.payment?.utr], ['Note', paymentReceipt.payment?.note]].map(([label, value]) => value ? <div className="web-receipt-row" key={label}><span>{label}</span><strong>{value}</strong></div> : null)}
                  <div className="web-receipt-footer">Computer-generated receipt. No signature is required.</div>
                </div>
              </div>
              <div className="modal-footer web-receipt-actions"><button className="web-receipt-print" onClick={() => window.print()}>🖨 &nbsp; Print</button><button className="web-receipt-share" onClick={sharePaymentReceipt}>↗ &nbsp; Share</button><button className="web-receipt-close-action" onClick={() => setPaymentReceipt(null)}>Close</button></div>
            </div>
          </div>
        </div>
      )}
      {showPasswordPrompt && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Enter security PIN</h5>
                <button
                  className="btn-close p-0"
                  onClick={() => setShowPasswordPrompt(false)}
                >x</button>
              </div>
              <div className="modal-body">
                <input
                  type="password"
                  className="form-control"
                  inputMode="numeric"
                  maxLength="8"
                  placeholder="Enter 4 to 8 digit security PIN"
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 8))}
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordPrompt(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={verifyPassword}>
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirmation && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Deletion</h5>
                <button
                  className="btn-close p-0"
                  onClick={() => setShowDeleteConfirmation(false)}
                >x</button>
              </div>
              <div className="modal-body">
                Are you sure you want to delete this tenant?
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteConfirmation(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleDeleteConfirm}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {photoEditTenant && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Edit Photo - {photoEditTenant.name}
                </h5>
                <button
                  className="btn-close p-0"
                  onClick={() => setPhotoEditTenant(null)}
                >x</button>
              </div>
              <div className="modal-body">
                {(() => {
                  const latestTenant =
                    formData.find((t) => t._id === photoEditTenant._id) ||
                    photoEditTenant;
                  const doc = getTenantPhotoDoc(latestTenant);
                  const t = normalizePhotoTransform(doc);
                  const rotate = clampRotate(t.rotate || 0);
                  const scaleX = t.flipX ? -1 : 1;
                  const scaleY = t.flipY ? -1 : 1;
                  const photoUrl = getTenantPhotoUrl(latestTenant);
                  return (
                    <>
                      <div className="photo-edit-preview">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt="Tenant"
                            crossOrigin="anonymous"
                            className="photo-edit-img"
                            style={{
                              transform: `rotate(${rotate}deg) scale(${scaleX}, ${scaleY})`,
                            }}
                          />
                        ) : (
                          <div className="photo-edit-empty">No Photo</div>
                        )}
                      </div>
                      <div className="photo-edit-actions">
                        <button
                          type="button"
                          className="photo-action-btn"
                          onClick={() =>
                            updateTenantPhotoTransform(
                              latestTenant,
                              (cur) => ({ ...cur, rotate: (cur.rotate || 0) - 90 }),
                              setFormData,
                              setTenants,
                              apiUrl
                            )
                          }
                        >
                          Rotate L
                        </button>
                        <button
                          type="button"
                          className="photo-action-btn"
                          onClick={() =>
                            updateTenantPhotoTransform(
                              latestTenant,
                              (cur) => ({ ...cur, rotate: (cur.rotate || 0) + 90 }),
                              setFormData,
                              setTenants,
                              apiUrl
                            )
                          }
                        >
                          Rotate R
                        </button>
                        <button
                          type="button"
                          className="photo-action-btn"
                          onClick={() =>
                            updateTenantPhotoTransform(
                              latestTenant,
                              (cur) => ({ ...cur, flipX: !cur.flipX }),
                              setFormData,
                              setTenants,
                              apiUrl
                            )
                          }
                        >
                          Flip H
                        </button>
                        <button
                          type="button"
                          className="photo-action-btn"
                          onClick={() =>
                            updateTenantPhotoTransform(
                              latestTenant,
                              () => ({ rotate: 0, flipX: false, flipY: false }),
                              setFormData,
                              setTenants,
                              apiUrl
                            )
                          }
                        >
                          Reset
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
 {/* {showExpensesModal && (
  <div
    className="modal d-block"
    tabIndex="-1"
    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
  >
     <div className="modal-dialog">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Staff </h5>
          <button
            className="btn-close p-0"
            onClick={() => setShowExpensesModal(false)}
          >
            x
          </button>
        </div>

        <div className="modal-body">
          <div className="mb-3">
            <label className="form-label">Expense Type</label>
            <select
              className="form-select"
              value={expensesForm.type}
              onChange={(e) =>
                setExpensesForm((prev) => ({ ...prev, type: e.target.value }))
              }
            >
              <option value="Employee">Employee Salary</option>
              <option value="Cleaning Lady">Maushi</option>
              <option value="Security">Security</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">
              Name (Employee / Cleaning Lady)
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Sunita (Cleaning Lady)"
              value={expensesForm.name}
              onChange={(e) =>
                setExpensesForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Month</label>
            <input
              type="month"
              className="form-control"
              value={expensesForm.month}
              onChange={(e) =>
                setExpensesForm((prev) => ({ ...prev, month: e.target.value }))
              }
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              className="form-control"
              min="0"
              value={expensesForm.amount}
              onChange={(e) =>
                setExpensesForm((prev) => ({ ...prev, amount: e.target.value }))
              }
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Notes / Details</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="e.g. Monthly salary, extra cleaning on weekend, etc."
              value={expensesForm.notes}
              onChange={(e) =>
                setExpensesForm((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={() => setShowExpensesModal(false)}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
       onClick={handleSaveStaffExpense}

          >
            Save Expense
          </button>
        </div>
      </div>
    </div> 
  </div>
)}  */}

      <>
        {/* ...your existing JSX... */}
        <TenantChatbot
          formData={formData}
          roomsData={roomsData}
          leaveDates={leaveDates}
          // lang={lang}
          helpers={{
            calculateDue,
            expectFromTenant: (tenant, roomsData) =>
              expectFromTenant(tenant, roomsData),
            toNum: (v) => Number(String(v).replace(/[,₹\s]/g, "")) || 0,
          }}
         onOpenEditRent={openEditForTenantMonth}  // <--- NEW
        />
      </>
    </div>
  );
}
export default NewComponant;
