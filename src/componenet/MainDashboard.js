import { FiBarChart2 } from "react-icons/fi";
import {
  MdOutlineBedroomParent,
  MdLightbulbOutline,
  MdOutlineReceiptLong,
} from "react-icons/md";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { clearAuthSession } from "../authStorage";
import { getAppBootstrap, getSystemDashboard } from "../saasApi";
import { api } from "../api";
import { useDashboardMenuItems } from "./dashboardMenuItems";
import { allowedUnitTypes } from "../utils/subscriptionAccess";
const COLORS = [
  "#1e3a8a",
  "#FBBF24",
  "#3B82F6",
  "#10B981",
  "#EF4444",
  "#6366F1",
];

const MainDashboard = () => {
  const navigate = useNavigate();
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [enabledUnitTypes, setEnabledUnitTypes] = useState(null);



  const [summary, setSummary] = useState({
    rent: {},
    beds: {},
    light: {},
    maintenance: {},
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  const menuItems = useDashboardMenuItems();

  useEffect(() => {
    let active = true;
    getAppBootstrap()
      .then((bootstrap) => {
        if (active) setEnabledUnitTypes(new Set(allowedUnitTypes(bootstrap).map((item) => item.value)));
      })
      .catch(() => {
        if (active) setEnabledUnitTypes(new Set());
      });
    return () => { active = false; };
  }, []);

  const hasUnitType = (type) => Boolean(enabledUnitTypes?.has(type));

  const handleNavigation = (path, state) => navigate(path, state ? { state } : undefined);
  const toggleSubmenu = (label) => {
    setOpenSubmenu((current) => (current === label ? null : label));
  };

 const handleLogout = () => {
  clearAuthSession();
  navigate("/");
};

  const [showVacantModal, setShowVacantModal] = useState(false);
  const [showTotalModal, setShowTotalModal] = useState(false);
  const [vacantSummary, setVacantSummary] = useState({
    hostel: [],
    residential: [],
    shops: [],
    total: 0,
  });
  const [showFutureLeaveModal, setShowFutureLeaveModal] = useState(false);

  const [rooms, setRooms] = useState([]);
  const [commercialUnits, setCommercialUnits] = useState([]);
  const [tenantsState, setTenantsState] = useState([]);

  const [showPendingRentModal, setShowPendingRentModal] = useState(false);
  const [pendingRentList, setPendingRentList] = useState([]);

  // ------------------------ helpers ------------------------
  const toNum = (v) => {
    if (v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/[,\u20B9\s]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const norm = (s) => String(s ?? "").trim().toLowerCase();

  const hasBed = (t) =>
    t?.bedNo !== null &&
    t?.bedNo !== undefined &&
    String(t.bedNo).trim() !== "";

  const hasRoom = (t) =>
    t?.roomNo !== null &&
    t?.roomNo !== undefined &&
    String(t.roomNo).trim() !== "";

  const normalizeRoomPropertyType = (room) => {
    const explicitType = String(room?.propertyType || room?.unitType || "")
      .trim()
      .toLowerCase();

    if (["bed", "room", "shop"].includes(explicitType)) {
      return explicitType;
    }

    const bedNos = Array.isArray(room?.beds)
      ? room.beds.map((bed) => String(bed?.bedNo || "").trim().toUpperCase())
      : [];

    if (bedNos.includes("SHOP-1")) return "shop";
    if (bedNos.includes("ROOM-1")) return "room";

    return "bed";
  };

  const getPrimaryUnitBedNo = (type) => (type === "shop" ? "SHOP-1" : "ROOM-1");

  const mapCommercialUnitToTrackerRoom = (unit) => ({
    _id: unit?._id,
    propertyType:
      String(unit?.unitType || "").trim().toLowerCase() === "shop"
        ? "shop"
        : "room",
    category: String(unit?.buildingName || unit?.category || "").trim(),
    commercialCategory: String(unit?.category || "").trim(),
    buildingName: String(unit?.buildingName || "").trim(),
    floorNo: String(unit?.floorNo || "").trim(),
    roomNo: String(unit?.unitNo || "").trim(),
    beds: [
      {
        bedNo: getPrimaryUnitBedNo(
          String(unit?.unitType || "").trim().toLowerCase() === "shop"
            ? "shop"
            : "room"
        ),
        bedCategory: "Primary",
        price: unit?.price ?? null,
      },
    ],
  });

  const getUnitIdentityKey = (unit, explicitType) => {
    const unitType = explicitType || normalizeRoomPropertyType(unit);
    const scope =
      unit?.commercialCategory || unit?.buildingName || unit?.category || "";
    return `${unitType}|${String(unit?.roomNo || unit?.unitNo || "").trim().toLowerCase()}|${String(scope).trim().toLowerCase()}`;
  };

  const findUnitForTenant = (tenant, units = []) => {
    const tenantCategory = String(tenant?.category || "").trim().toLowerCase();

    return (units || []).find((unit) => {
      const tenantRoomId = tenant?.roomId?._id || tenant?.roomId;
      if (tenantRoomId && String(unit?._id) === String(tenantRoomId)) {
        return true;
      }

      if (!tenant?.roomNo || String(unit?.roomNo) !== String(tenant.roomNo)) {
        return false;
      }

      if (!tenantCategory) return true;

      const unitCategories = [
        unit?.category,
        unit?.commercialCategory,
        unit?.buildingName,
      ]
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean);

      return unitCategories.includes(tenantCategory);
    });
  };

  const isActiveTenant = (t) => {
    if (!t?.leaveDate) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leave = new Date(t.leaveDate);
    leave.setHours(0, 0, 0, 0);
    return leave > today;
  };

  /**
   * âœ… Paid amount resolver (kept; useful if you add paidAmount later)
   * Your rent object doesn't have paidAmount; it only has rentAmount + paymentMode + date.
   */
  const getPaidAmt = (r, monthlyRent = 0) => {
    const explicit = toNum(
      r?.paidAmount ?? r?.amountPaid ?? r?.paid ?? r?.amount ?? 0
    );
    if (explicit > 0) return explicit;

    const status = norm(r?.status || r?.paymentStatus || r?.label || "");
    const hasPaymentProof =
      !!String(r?.paymentMode || "").trim() || status === "paid";

    if (hasPaymentProof) {
      return toNum(r?.rentAmount ?? monthlyRent ?? 0);
    }

    return 0;
  };

  const monthIdx = (mon) => {
    const key = String(mon || "").trim().slice(0, 3).toLowerCase();
    const arr = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];
    const i = arr.indexOf(key);
    return i >= 0 ? i : null;
  };

  const getRentYM = (r) => {
    if (!r) return null;

    if (r.month) {
      const s = String(r.month).trim();

      if (/^\d{4}-\d{1,2}$/.test(s)) {
        const [yy, mm] = s.split("-").map(Number);
        return { y: yy, m: mm - 1 };
      }

      const parts = s.split("-");
      if (parts.length === 2) {
        const m = monthIdx(parts[0]);
        if (m !== null) {
          const yRaw = String(parts[1]).trim();
          const y = yRaw.length === 2 ? Number("20" + yRaw) : Number(yRaw);
          if (Number.isFinite(y)) return { y, m };
        }
      }
    }

    if (r.date) {
      const d = new Date(r.date);
      if (!isNaN(d)) return { y: d.getFullYear(), m: d.getMonth() };
    }

    return null;
  };

  // âœ… Monthly rent getter (baseRent -> rentAmount -> bed.price from rooms)
  const getMonthlyRent = (t, unitsArr = rooms) => {
    const direct = toNum(
      t?.baseRent ??
        t?.rentAmount ??
        t?.rent ??
        t?.expectedRent ??
        t?.defaultRent ??
        t?.monthlyRent ??
        0
    );
    if (direct > 0) return direct;

    const latestPaidRent = (Array.isArray(t?.rents) ? t.rents : [])
      .map((r) => toNum(r?.rentAmount))
      .filter((amount) => amount > 0)
      .pop();
    if (latestPaidRent > 0) return latestPaidRent;

    const room = findUnitForTenant(t, unitsArr || []);
    if (!room) return 0;

    const unitType = normalizeRoomPropertyType(room);
    const primaryBedNo = getPrimaryUnitBedNo(unitType);
    const targetBedNo =
      unitType === "bed" ? String(t?.bedNo || "").trim().toLowerCase() : primaryBedNo.toLowerCase();

    const bed = (room?.beds || []).find((b) => {
      return String(b?.bedNo || "").trim().toLowerCase() === targetBedNo;
    });

    return toNum(bed?.price || 0);
  };

  // âœ… Vacant matching KEY = roomNo + bedNo ONLY
  const bedKey = (roomNo, bedNo) => `${norm(roomNo)}|${norm(bedNo)}`;

  // Month record helpers
  const getMonthRecords = (t, Y, M) =>
    (t?.rents || []).filter((r) => {
      const ym = getRentYM(r);
      return ym && ym.y === Y && ym.m === M;
    });

  // Match the tracker logic: past/current red Due or Pending only.
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

  const formatMonYY = (y, m) => {
    const arr = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const yy = String(y).slice(-2);
    return `${arr[m]}-${yy}`;
  };

  const ymToKey = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;

  const getFirstBillYM = (tenant) => {
    if (tenant?.firstRentMonth) {
      const ym = getRentYM({ month: tenant.firstRentMonth });
      if (ym) return ym.y * 12 + ym.m;
    }

    const joiningDate = new Date(tenant?.joiningDate);
    if (isNaN(joiningDate)) return null;

    const isAdvance = tenant?.firstRentStatus === "ADVANCE_PAID";
    return (
      joiningDate.getFullYear() * 12 +
      joiningDate.getMonth() +
      (isAdvance ? 0 : 1)
    );
  };

  const getBillingMonthsUpToNow = (tenant) => {
    const firstBillYM = getFirstBillYM(tenant);
    if (firstBillYM === null) return [];

    const now = new Date();
    const lastYM = now.getFullYear() * 12 + now.getMonth();
    const months = [];

    for (let ym = firstBillYM; ym <= lastYM; ym += 1) {
      months.push({ y: Math.floor(ym / 12), m: ym % 12 });
    }

    return months;
  };

  const getDashboardMonthCell = (
    tenant,
    y,
    m,
    monthlyRent = getMonthlyRent(tenant)
  ) => {
    if (!tenant?.joiningDate) {
      return { label: "", outstanding: 0, isPast: false, beforeRentStart: true };
    }

    const joinDate = new Date(tenant.joiningDate);
    const firstBillYM = getFirstBillYM(tenant);
    if (isNaN(joinDate) || firstBillYM === null) {
      return { label: "", outstanding: 0, isPast: false, beforeRentStart: true };
    }

    const cellYM = y * 12 + m;
    if (cellYM < firstBillYM) {
      return { label: "", outstanding: 0, isPast: false, beforeRentStart: true };
    }

    const cycleIndex = cellYM - firstBillYM;
    const periodStart = new Date(joinDate);
    periodStart.setMonth(periodStart.getMonth() + cycleIndex);

    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const expected = toNum(monthlyRent);
    const paidAmount = getMonthRecords(tenant, y, m).reduce(
      (sum, rent) => sum + getPaidAmt(rent, monthlyRent),
      0
    );
    const outstanding = Math.max(0, expected - paidAmount);
    const today = new Date();
    const isAdvanceCycle = tenant?.firstRentStatus === "ADVANCE_PAID";
    const isPast = isAdvanceCycle ? today >= periodStart : today >= periodEnd;

    let label = "Upcoming";
    if (paidAmount > 0 && expected > 0 && paidAmount < expected) {
      label = "Pending";
    } else if (paidAmount >= expected && expected > 0) {
      label = "Paid";
    } else if (isPast) {
      label = "Due";
    }

    return { label, outstanding, isPast, beforeRentStart: false };
  };

  const getPendingMonths = (tenant, monthlyRent = getMonthlyRent(tenant)) =>
    getBillingMonthsUpToNow(tenant).filter(({ y, m }) => {
      const cell = getDashboardMonthCell(tenant, y, m, monthlyRent);
      const isRealDue =
        !cell.beforeRentStart &&
        cell.isPast &&
        (cell.label === "Due" || cell.label === "Pending");

      return isRealDue && Number(cell.outstanding || 0) > 0;
    });

  // ---------------------------------------------------------
  // FUTURE LEAVES
  // ---------------------------------------------------------
  const futureLeaveTenants = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (tenantsState || []).filter((t) => {
      if (!t.leaveDate) return false;

      const leaveDate = new Date(t.leaveDate);
      leaveDate.setHours(0, 0, 0, 0);

      return leaveDate > today;
    });
  }, [tenantsState]);

  const futureLeaveCount = futureLeaveTenants.length;

  const calculateRefund = (t) => {
    const deposit = Number(t.depositAmount || 0);
    const monthlyRent = Number(t.baseRent || t.rentAmount || 0);

    if (!t.leaveDate || !monthlyRent) {
      return { deposit, refundable: deposit, isNegative: false };
    }

    const leaveDate = new Date(t.leaveDate);
    const year = leaveDate.getFullYear();
    const month = leaveDate.getMonth();

    const totalDays = new Date(year, month + 1, 0).getDate();
    const occupiedDays = leaveDate.getDate();

    const perDayRent = monthlyRent / totalDays;
    const usedRent = perDayRent * occupiedDays;

    let pendingDue = 0;

    (t.rents || []).forEach((r) => {
      if (!r) return;

      let rentDate = null;

      if (r.month) {
        try {
          const [mon, yy] = r.month.split("-");
          rentDate = new Date(`${mon} 01, 20${yy}`);
        } catch {}
      }

      if (!rentDate && r.date) {
        rentDate = new Date(r.date);
      }

      if (!rentDate) return;

      if (
        rentDate.getFullYear() < year ||
        (rentDate.getFullYear() === year && rentDate.getMonth() < month)
      ) {
        pendingDue += Number(r.rentAmount || 0);
      }
    });

    const refundable = deposit - usedRent - pendingDue;

    return {
      deposit,
      refundable: Math.round(refundable * 100) / 100,
      isNegative: refundable < 0,
    };
  };

  // ---------------------------------------------------------
  // Category Report
  // ---------------------------------------------------------
  const handleDownloadCategoryReport = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isActive = (t) => {
      if (!t?.leaveDate) return true;
      const leave = new Date(t.leaveDate);
      leave.setHours(0, 0, 0, 0);
      return leave > today;
    };

    const allUnits = [...(rooms || []), ...(commercialUnits || []).map(mapCommercialUnitToTrackerRoom)];
    const sectionDefinitions = [
      { key: "bed", title: "Hostel" },
      { key: "room", title: "Residential Rooms" },
      { key: "shop", title: "Commercial Shops" },
    ];
    const headers = [
      "SR NO",
      "LOCATION",
      "TOTAL CAPACITY",
      "TOTAL Occupied",
      "VACANT BED",
      "DEPOSITE AMT",
      "BALANCE AMT (Deposit)",
      "RENT AMT",
      "BALANCE AMT (Rent)",
      "REMARK",
    ];

    const buildSectionRows = (sectionKey, title) => {
      const sectionUnits = allUnits.filter(
        (unit) => normalizeRoomPropertyType(unit) === sectionKey
      );
      const sectionTenants = (tenantsState || []).filter((tenant) => {
        if (!isActive(tenant)) return false;
        const matchedUnit = findUnitForTenant(tenant, allUnits);
        if (!matchedUnit) return false;
        return normalizeRoomPropertyType(matchedUnit) === sectionKey;
      });

      const statsMap = new Map();
      const ensureRow = (location) => {
        const key = String(location || "Uncategorized").trim() || "Uncategorized";
        if (!statsMap.has(key)) {
          statsMap.set(key, {
            location: key,
            totalCapacity: 0,
            totalOccupied: 0,
            depositAmount: 0,
            rentAmount: 0,
          });
        }
        return statsMap.get(key);
      };

      sectionUnits.forEach((unit) => {
        const location = String(unit?.category || unit?.buildingName || "").trim();
        const row = ensureRow(location);
        row.totalCapacity += sectionKey === "bed" ? (unit?.beds || []).length : 1;
      });

      sectionTenants.forEach((tenant) => {
        const location = String(tenant?.category || "").trim();
        const row = ensureRow(location);
        row.totalOccupied += 1;
        row.depositAmount += toNum(tenant?.depositAmount);
        row.rentAmount += toNum(getMonthlyRent(tenant, allUnits));
      });

      const locations = Array.from(statsMap.values()).sort((a, b) =>
        a.location.localeCompare(b.location)
      );

      const rows = locations.map((item, index) => [
        index + 1,
        item.location,
        item.totalCapacity,
        item.totalOccupied,
        Math.max(0, item.totalCapacity - item.totalOccupied),
        item.depositAmount,
        "",
        item.rentAmount,
        "",
        "",
      ]);

      const totals = locations.reduce(
        (acc, item) => {
          acc.totalCapacity += item.totalCapacity;
          acc.totalOccupied += item.totalOccupied;
          acc.vacant += Math.max(0, item.totalCapacity - item.totalOccupied);
          acc.depositAmount += item.depositAmount;
          acc.rentAmount += item.rentAmount;
          return acc;
        },
        {
          totalCapacity: 0,
          totalOccupied: 0,
          vacant: 0,
          depositAmount: 0,
          rentAmount: 0,
        }
      );

      return [
        [title],
        headers,
        ...rows,
        [
          "",
          "TOTAL",
          totals.totalCapacity,
          totals.totalOccupied,
          totals.vacant,
          totals.depositAmount,
          "",
          totals.rentAmount,
          "",
          "",
        ],
        [],
      ];
    };

    const sheetRows = sectionDefinitions.flatMap((section) =>
      buildSectionRows(section.key, section.title)
    );

    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    ws["!cols"] = [
      { wch: 7 },
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
      { wch: 20 },
      { wch: 14 },
      { wch: 18 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Category Report");

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Category_Report_${stamp}.xlsx`);
  };

  // ---------------------------------------------------------
  // TIME ticker
  // ---------------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ---------------------------------------------------------
  // âœ… Vacant finder
  // ---------------------------------------------------------
  const findVacantUnits = (
    hostelRoomsArg = rooms,
    commercialUnitsArg = commercialUnits,
    tenantsArg = tenantsState
  ) => {
    const hostelRooms = (hostelRoomsArg || []).filter(
      (room) => normalizeRoomPropertyType(room) === "bed"
    );
    const residentialRooms = (hostelRoomsArg || []).filter(
      (room) => normalizeRoomPropertyType(room) === "room"
    );
    const mappedCommercialUnits = (commercialUnitsArg || []).map(
      mapCommercialUnitToTrackerRoom
    );
    const allUnits = [...(hostelRoomsArg || []), ...mappedCommercialUnits];
    const shopUnits = allUnits.filter(
      (unit) => normalizeRoomPropertyType(unit) === "shop"
    );

    const occupiedHostelKeys = new Set();
    const occupiedResidentialKeys = new Set();
    const occupiedShopKeys = new Set();

    (tenantsArg || [])
      .filter(isActiveTenant)
      .filter(hasRoom)
      .forEach((tenant) => {
        const matchedUnit = findUnitForTenant(tenant, allUnits);
        if (!matchedUnit) return;

        const unitType = normalizeRoomPropertyType(matchedUnit);
        if (unitType === "bed" && hasBed(tenant)) {
          occupiedHostelKeys.add(bedKey(tenant.roomNo, tenant.bedNo));
          return;
        }

        const unitKey = getUnitIdentityKey(matchedUnit, unitType);

        if (unitType === "room") occupiedResidentialKeys.add(unitKey);
        if (unitType === "shop") occupiedShopKeys.add(unitKey);
      });

    const hostelVacants = [];
    hostelRooms.forEach((room) => {
      const roomNo = room?.roomNo;
      const seenBedsInRoom = new Set();

      (room?.beds || []).forEach((bed) => {
        const bedNo = bed?.bedNo;
        const localKey = norm(bedNo);
        if (seenBedsInRoom.has(localKey)) return;
        seenBedsInRoom.add(localKey);

        if (occupiedHostelKeys.has(bedKey(roomNo, bedNo))) return;

        hostelVacants.push({
          roomNo,
          bedNo,
          price: Number(bed?.price || 0),
          floorNo: room?.floorNo,
          category: room?.category,
        });
      });
    });

    const residentialVacants = residentialRooms
      .filter((room) => {
        const unitKey = getUnitIdentityKey(room, "room");
        return !occupiedResidentialKeys.has(unitKey);
      })
      .map((room) => ({
        roomNo: room?.roomNo,
        floorNo: room?.floorNo,
        category: room?.category,
        price: Number(room?.beds?.[0]?.price || 0),
      }));

    const shopVacants = shopUnits
      .filter((unit) => {
        const unitKey = getUnitIdentityKey(unit, "shop");
        return !occupiedShopKeys.has(unitKey);
      })
      .map((unit) => ({
        roomNo: unit?.roomNo || unit?.unitNo,
        floorNo: unit?.floorNo,
        category: unit?.buildingName || unit?.category,
        commercialCategory: unit?.commercialCategory || unit?.category,
        price: Number(unit?.price || 0),
      }));

    const sortByRoomNo = (a, b) =>
      String(a.roomNo).localeCompare(String(b.roomNo), undefined, {
        numeric: true,
      });

    hostelVacants.sort((a, b) => {
      const r = sortByRoomNo(a, b);
      if (r !== 0) return r;
      return String(a.bedNo).localeCompare(String(b.bedNo), undefined, {
        numeric: true,
      });
    });
    residentialVacants.sort(sortByRoomNo);
    shopVacants.sort(sortByRoomNo);

    setVacantSummary({
      hostel: hostelVacants,
      residential: residentialVacants,
      shops: shopVacants,
      total: hostelVacants.length + residentialVacants.length + shopVacants.length,
    });
    setShowVacantModal(true);
  };

  // ---------------------------------------------------------
  // FETCH + SUMMARY (âœ… Completed-month pending rent logic)
  // ---------------------------------------------------------
useEffect(() => {
  Promise.all([
    api.get("/"),
    api.get("/light-bill/all"),
    api.get("/other-expense/all"),
    api.get("/rooms"),
    api.get("/commercial-units"),
  ])
    .then(
      ([
        tenantsResponse,
        lightBillsResponse,
        otherExpensesResponse,
        roomsResponse,
        commercialUnitsResponse,
      ]) => {
        const tenants = Array.isArray(tenantsResponse.data)
          ? tenantsResponse.data
          : [];

        const lightBills = Array.isArray(lightBillsResponse.data)
          ? lightBillsResponse.data
          : [];

        const otherExpenses = Array.isArray(otherExpensesResponse.data)
          ? otherExpensesResponse.data
          : [];

        const rooms = Array.isArray(roomsResponse.data)
          ? roomsResponse.data
          : [];

        const commercialUnits = Array.isArray(commercialUnitsResponse.data)
          ? commercialUnitsResponse.data
          : [];
      setRooms(rooms);
      setCommercialUnits(commercialUnits);
      setTenantsState(tenants);

      const hostelRooms = (rooms || []).filter(
        (room) => normalizeRoomPropertyType(room) === "bed"
      );
      const residentialRooms = (rooms || []).filter(
        (room) => normalizeRoomPropertyType(room) === "room"
      );
      const mappedCommercialUnits = (commercialUnits || []).map(
        mapCommercialUnitToTrackerRoom
      );
      const allResidentialUnits = [
        ...residentialRooms,
        ...mappedCommercialUnits.filter(
          (unit) => normalizeRoomPropertyType(unit) === "room"
        ),
      ];
      const allShopUnits = [
        ...(rooms || []).filter(
          (room) => normalizeRoomPropertyType(room) === "shop"
        ),
        ...mappedCommercialUnits.filter(
          (unit) => normalizeRoomPropertyType(unit) === "shop"
        ),
      ];

      const totalBeds = hostelRooms.reduce(
        (sum, room) => sum + (room.beds?.length || 0),
        0
      );
      const totalResidentialRooms = new Set(
        allResidentialUnits.map((unit) => getUnitIdentityKey(unit, "room"))
      ).size;
      const totalShops = new Set(
        allShopUnits.map((unit) => getUnitIdentityKey(unit, "shop"))
      ).size;
      const totalUnits = totalBeds + totalResidentialRooms + totalShops;

      const allUnits = [...(rooms || []), ...mappedCommercialUnits];
      const occKeys = new Set();
      const occupiedResidentialKeys = new Set();
      const occupiedShopKeys = new Set();

      (tenants || [])
        .filter(isActiveTenant)
        .filter(hasRoom)
        .forEach((tenant) => {
          const matchedUnit = findUnitForTenant(tenant, allUnits);
          if (!matchedUnit) return;

          const unitType = normalizeRoomPropertyType(matchedUnit);
          if (unitType === "bed" && hasBed(tenant)) {
            occKeys.add(bedKey(tenant.roomNo, tenant.bedNo));
            return;
          }

          const unitKey = getUnitIdentityKey(matchedUnit, unitType);

          if (unitType === "room") occupiedResidentialKeys.add(unitKey);
          if (unitType === "shop") occupiedShopKeys.add(unitKey);
        });

      const occupied = occKeys.size;
      const vacant = Math.max(0, totalBeds - occupied);

      const hostelVacants = hostelRooms.reduce((sum, room) => {
        const seenBedsInRoom = new Set();
        const roomVacantCount = (room?.beds || []).reduce((bedCount, bed) => {
          const bedNo = bed?.bedNo;
          const localKey = norm(bedNo);
          if (seenBedsInRoom.has(localKey)) return bedCount;
          seenBedsInRoom.add(localKey);
          return occKeys.has(bedKey(room?.roomNo, bedNo)) ? bedCount : bedCount + 1;
        }, 0);
        return sum + roomVacantCount;
      }, 0);

      const residentialVacants = new Set(
        allResidentialUnits
          .filter((room) => {
            const unitKey = getUnitIdentityKey(room, "room");
            return !occupiedResidentialKeys.has(unitKey);
          })
          .map((room) => getUnitIdentityKey(room, "room"))
      ).size;

      const shopVacants = new Set(
        allShopUnits
          .filter((unit) => {
            const unitKey = getUnitIdentityKey(unit, "shop");
            return !occupiedShopKeys.has(unitKey);
          })
          .map((unit) => getUnitIdentityKey(unit, "shop"))
      ).size;

      setVacantSummary({
        hostel: [],
        residential: [],
        shops: [],
        total: hostelVacants + residentialVacants + shopVacants,
      });

      const deposits = (tenants || []).filter((t) => Number(t.depositAmount) > 0)
        .length;

      // Match tracker red Due/Pending rows only.
      const pendingList = (tenants || [])
        .filter(isActiveTenant)
        .map((t) => {
          const matchedUnit = findUnitForTenant(t, allUnits);
          const unitType = matchedUnit ? normalizeRoomPropertyType(matchedUnit) : "bed";
          const monthlyRent = getMonthlyRent(t, allUnits);
          const pendingMonths = getPendingMonths(t, monthlyRent);
          const dueTotal = pendingMonths.reduce((sum, month) => {
            const cell = getDashboardMonthCell(t, month.y, month.m, monthlyRent);
            return sum + Number(cell.outstanding || 0);
          }, 0);
          const displayUnit =
            unitType === "bed"
              ? `${t.roomNo || "-"} / ${t.bedNo || "-"}`
              : t.roomNo || "-";

          return {
            ...t,
            _unitType: unitType,
            _monthlyRent: monthlyRent,
            _displayUnit: displayUnit,
            _pendingMonths: pendingMonths,
            _dueTotal: dueTotal,
          };
        })
        .filter((t) => (t._pendingMonths || []).length > 0 && (t._dueTotal || 0) > 0);

      setPendingRentList(pendingList);
      const pendingRents = pendingList.length;

      // LIGHT BILL & MAINTENANCE
      const totalLight = (lightBills || []).reduce(
        (s, b) => s + Number(b.amount || 0),
        0
      );
      const paidLight = (lightBills || [])
        .filter((b) => b.status === "paid")
        .reduce((s, b) => s + Number(b.amount), 0);
      const pendingLight = totalLight - paidLight;

      const totalMaint = (otherExpenses || []).reduce(
        (s, x) => s + Number(x.mainAmount || 0),
        0
      );
      const paidMaint = (otherExpenses || [])
        .filter((x) => x.status === "paid")
        .reduce((s, x) => s + Number(x.mainAmount), 0);
      const pendingMaint = totalMaint - paidMaint;

      setSummary({
        beds: {
          total: totalBeds,
          totalUnits,
          hostelTotal: totalBeds,
          residentialTotal: totalResidentialRooms,
          shopTotal: totalShops,
          occupied,
          vacant,
          totalVacant: hostelVacants + residentialVacants + shopVacants,
          hostelVacant: hostelVacants,
          residentialVacant: residentialVacants,
          shopVacant: shopVacants,
        },
        rent: { pending: pendingRents, deposits },
        light: { paid: paidLight, pending: pendingLight },
        maintenance: { paid: paidMaint, pending: pendingMaint },
           });
    })
    .catch((error) => {
      console.error(
        "DASHBOARD DATA ERROR:",
        error.response?.data || error
      );

      setRooms([]);
      setCommercialUnits([]);
      setTenantsState([]);
    });
}, []);

  // ==== Mobile drawer (UNCHANGED) ====
  const [open, setOpen] = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target))
        setOpen(false);
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const dayName = currentTime.toLocaleDateString(undefined, { weekday: "long" });
  const dateString = currentTime.toLocaleDateString();
  const timeString = currentTime.toLocaleTimeString();

  const renderCard = (label, value, bgColor, icon, onClick) => (
    <div className="col-6 col-md-4 col-lg-3 mb-2">
      <div
        className="card border-0 shadow-sm h-100"
        style={{
          backgroundColor: bgColor,
          borderRadius: "12px",
          padding: "10px 8px",
          cursor: onClick ? "pointer" : "default",
        }}
        onClick={onClick}
      >
        <div className="card-body text-center p-2">
          <div className="fs-5 mb-1">{icon}</div>
          <div
            className="small text-uppercase text-muted"
            style={{ fontSize: "0.75rem" }}
          >
            {label}
          </div>
          <div className="fw-semibold" style={{ fontSize: "1rem" }}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );

  const renderVacantModalBody = () => {
    const visibleVacantTotal =
      (hasUnitType("bed") ? vacantSummary.hostel.length : 0) +
      (hasUnitType("room") ? vacantSummary.residential.length : 0) +
      (hasUnitType("shop") ? vacantSummary.shops.length : 0);
    if (visibleVacantTotal === 0) {
      return <p>No vacant units found.</p>;
    }

    return (
      <>
        {hasUnitType("bed") ? <div className="mb-4">
          <h6 className="fw-bold text-primary">
            Hostel Vacant ({vacantSummary.hostel.length})
          </h6>
          {vacantSummary.hostel.length === 0 ? (
            <p className="mb-0">No hostel beds vacant.</p>
          ) : (
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Room No</th>
                  <th>Bed No</th>
                  <th>Floor No</th>
                  <th>Category</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {vacantSummary.hostel.map((bed, i) => (
                  <tr key={`hostel-${i}`}>
                    <td>{bed.roomNo}</td>
                    <td>{bed.bedNo}</td>
                    <td>{bed.floorNo}</td>
                    <td>{bed.category}</td>
                    <td>
                      {Number(bed.price || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div> : null}

        {hasUnitType("room") ? <div className="mb-4">
          <h6 className="fw-bold text-primary">
            Residential Room Vacant ({vacantSummary.residential.length})
          </h6>
          {vacantSummary.residential.length === 0 ? (
            <p className="mb-0">No residential rooms vacant.</p>
          ) : (
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Room No</th>
                  <th>Floor No</th>
                  <th>Building</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {vacantSummary.residential.map((room, i) => (
                  <tr key={`residential-${i}`}>
                    <td>{room.roomNo}</td>
                    <td>{room.floorNo}</td>
                    <td>{room.category}</td>
                    <td>
                      {Number(room.price || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div> : null}

        {hasUnitType("shop") ? <div>
          <h6 className="fw-bold text-primary">
            Shop Vacant ({vacantSummary.shops.length})
          </h6>
          {vacantSummary.shops.length === 0 ? (
            <p className="mb-0">No shops vacant.</p>
          ) : (
            <table className="table table-bordered mb-0">
              <thead>
                <tr>
                  <th>Shop No</th>
                  <th>Floor No</th>
                  <th>Building</th>
                  <th>Category</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {vacantSummary.shops.map((shop, i) => (
                  <tr key={`shop-${i}`}>
                    <td>{shop.roomNo}</td>
                    <td>{shop.floorNo}</td>
                    <td>{shop.category}</td>
                    <td>{shop.commercialCategory || "-"}</td>
                    <td>
                      {Number(shop.price || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div> : null}
      </>
    );
  };

  const renderTotalModalBody = () => (
    <table className="table table-bordered mb-0">
      <thead>
        <tr>
          <th>Type</th>
          <th>Total Count</th>
        </tr>
      </thead>
      <tbody>
        {hasUnitType("bed") ? <tr>
          <td>Hostel</td>
          <td>{summary.beds.hostelTotal || 0}</td>
        </tr> : null}
        {hasUnitType("room") ? <tr>
          <td>Residential</td>
          <td>{summary.beds.residentialTotal || 0}</td>
        </tr> : null}
        {hasUnitType("shop") ? <tr>
          <td>Shops</td>
          <td>{summary.beds.shopTotal || 0}</td>
        </tr> : null}
        <tr className="fw-bold">
          <td>Total</td>
          <td>
            {(hasUnitType("bed") ? summary.beds.hostelTotal || 0 : 0) +
              (hasUnitType("room") ? summary.beds.residentialTotal || 0 : 0) +
              (hasUnitType("shop") ? summary.beds.shopTotal || 0 : 0)}
          </td>
        </tr>
      </tbody>
    </table>
  );

  const renderPendingRentSection = (title, items, unitLabel) => (
    <div className="mb-4">
      <h6 className="fw-bold text-primary">
        {title} ({items.length})
      </h6>
      {items.length === 0 ? (
        <p className="mb-0">No pending rents.</p>
      ) : (
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Name</th>
              <th>{unitLabel}</th>
              <th>Phone</th>
              <th>Monthly Rent</th>
              <th>Due Month</th>
              <th>Due Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((tenant, i) => {
              const pendingMonths = tenant._pendingMonths || [];
              const pendingMonthsStr = pendingMonths
                .map((x) => formatMonYY(x.y, x.m))
                .join(", ");
              return (
                <tr key={`${title}-${tenant._id || i}`}>
                  <td>{tenant.name}</td>
                  <td>{tenant._displayUnit || tenant.roomNo || "-"}</td>
                  <td>{tenant.phoneNo || tenant.mobile || "-"}</td>
                  <td>₹{Number(tenant._monthlyRent || 0).toLocaleString("en-IN")}</td>
                  <td>{pendingMonthsStr || "-"}</td>
                  <td className="fw-semibold text-danger">
                    ₹{Number(tenant._dueTotal || 0).toLocaleString("en-IN")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderPendingRentModalBody = () => {
    const hostel = pendingRentList.filter((tenant) => tenant._unitType === "bed");
    const residential = pendingRentList.filter((tenant) => tenant._unitType === "room");
    const commercial = pendingRentList.filter((tenant) => tenant._unitType === "shop");

    const visiblePendingCount =
      (hasUnitType("bed") ? hostel.length : 0) +
      (hasUnitType("room") ? residential.length : 0) +
      (hasUnitType("shop") ? commercial.length : 0);
    if (visiblePendingCount === 0) {
      return <p>No past-due pending rents.</p>;
    }

    return (
      <>
        {hasUnitType("bed") ? renderPendingRentSection("Hostel Pending Rents", hostel, "Room / Bed") : null}
        {hasUnitType("room") ? renderPendingRentSection("Residential Pending Rents", residential, "Room") : null}
        {hasUnitType("shop") ? renderPendingRentSection("Commercial Pending Rents", commercial, "Shop") : null}
      </>
    );
  };

  const renderBarChart = () => {
    const totalLight = (summary.light.paid || 0) + (summary.light.pending || 0);
    const totalMaintenance =
      (summary.maintenance.paid || 0) + (summary.maintenance.pending || 0);
    const totalRent = (summary.rent.deposits || 0) + (summary.rent.pending || 0);

    const getPercent = (value, total) => (total ? (value / total) * 100 : 0);

    const data = [
      {
        name: "Light Bill",
        paid: getPercent(summary.light.paid, totalLight),
        pending: getPercent(summary.light.pending, totalLight),
      },
      {
        name: "Maintenance",
        paid: getPercent(summary.maintenance.paid, totalMaintenance),
        pending: getPercent(summary.maintenance.pending, totalMaintenance),
      },
      {
        name: "Rent",
        paid: getPercent(summary.rent.deposits, totalRent),
        pending: getPercent(summary.rent.pending, totalRent),
      },
    ];

    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value.toFixed(0)}%`}
          />
          <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
          <Legend verticalAlign="top" height={36} />
          <Bar
            dataKey="paid"
            name="Paid"
            fill="#3db7b1"
            radius={[10, 10, 0, 0]}
          />
          <Bar
            dataKey="pending"
            name="Pending"
            fill="#1e3a8a"
            radius={[10, 10, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderPieCharts = () => {
    const pieData = [
      {
        title: "Rent Status",
        data: [
          { name: "Deposits", value: summary.rent.deposits || 0 },
          { name: "Pending", value: summary.rent.pending || 0 },
        ],
      },
      {
        title: "Light Bill Status",
        data: [
          { name: "Paid", value: summary.light.paid || 0 },
          { name: "Pending", value: summary.light.pending || 0 },
        ],
      },
      {
        title: "Maintenance Status",
        data: [
          { name: "Paid", value: summary.maintenance.paid || 0 },
          { name: "Pending", value: summary.maintenance.pending || 0 },
        ],
      },
      {
        title: "Bed Occupancy",
        data: [
          { name: "Occupied", value: summary.beds.occupied || 0 },
          { name: "Vacant", value: summary.beds.vacant || 0 },
        ],
      },
    ];

    return (
      <div className="row g-3 mt-2 px-2">
        {pieData.map((chart, idx) => (
          <div className="col-12 col-md-6 col-lg-3" key={idx}>
            <div className="bg-white p-2 rounded shadow-sm h-100 text-center">
              <h6 className="text-primary mb-2">{chart.title}</h6>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={chart.data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label
                  >
                    {chart.data.map((entry, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className="d-flex"
      style={{
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
        backgroundColor: "#f8f9fa",
      }}
    >
      {/* Topbar */}
      <style>{`
        .md-topbar { display:none; }
        @media (max-width: 991.98px){
          .md-topbar{
            display:flex;
            position: fixed; top:0; left:0; right:0; height:56px; z-index: 1040;
            align-items:center; justify-content:space-between;
            padding:12px 16px; background:#1e3a8a; color:#fff;
            box-shadow:0 2px 10px rgba(0,0,0,0.2);
          }
          .md-iconbtn{
            display:inline-flex; align-items:center; justify-content:center;
            padding:8px; border:0; border-radius:8px; background:transparent; color:#fff; cursor:pointer;
          }
          .md-backdrop{
            position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1035;
          }
          nav.md-drawer{
            transform: translateX(-100%);
            transition: transform .3s ease-in-out;
            top:56px;
            height: calc(100vh - 56px) !important;
          }
          nav.md-drawer.open{ transform: translateX(0); }
          nav.md-drawer .md-desktop-heading{ display:none !important; }
          main.md-shell{
            margin-left: 0 !important;
            padding-top: 72px !important;
          }
        }
      `}</style>

      <div className="md-topbar">
        <button
          className="md-iconbtn"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeWidth="2"
              strokeLinecap="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>
          Hostel Manager
        </div>
        <span style={{ width: 24 }} />
      </div>

      {open && <div className="md-backdrop" onClick={() => setOpen(false)} />}

      {/* SIDEBAR */}
      <nav
        ref={drawerRef}
        className={`position-fixed text-white p-3 md-drawer ${
          open ? "open" : ""
        }`}
        style={{
          width: 250,
          height: "100vh",
          backgroundColor: "#1e3a8a",
          zIndex: 1045,
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div>
          <h2 className="text-center fw-bold mb-4 mt-2 md-desktop-heading">
            Hostel Manager
          </h2>

          <ul className="list-unstyled mt-3" style={{ textAlign: "left" }}>
            {menuItems.map((item, idx) => {
              const hasChildren = Array.isArray(item.children) && item.children.length > 0;
              const isOpen = openSubmenu === item.label;

              if (!hasChildren) {
                return (
                  <li
                    key={idx}
                    onClick={() => {
                      handleNavigation(item.path, item.state);
                      setOpen(false);
                      setOpenSubmenu(null);
                    }}
                    className="mb-2 px-3 py-2 rounded"
                    style={{ cursor: "pointer" }}
                  >
                    {item.icon} <span className="ms-2">{item.label}</span>
                  </li>
                );
              }

              return (
                <li
                  key={idx}
                  className="mb-2 rounded"
                  onMouseEnter={() => setOpenSubmenu(item.label)}
                  onMouseLeave={() => setOpenSubmenu((current) => (current === item.label ? null : current))}
                >
                  <div
                    onClick={() => toggleSubmenu(item.label)}
                    className="px-3 py-2 rounded d-flex align-items-center"
                    style={{ cursor: "pointer" }}
                  >
                    <span>
                      {item.icon} <span className="ms-2">{item.label}</span>
                    </span>
                  </div>

                  <ul
                    className="list-unstyled ms-4 mt-1"
                    style={{ display: isOpen ? "block" : "none" }}
                  >
                    {item.children.map((child) => (
                      <li
                        key={child.label}
                        onClick={() => {
                          handleNavigation(child.path, child.state);
                          setOpen(false);
                          setOpenSubmenu(null);
                        }}
                        className="px-3 py-2 rounded mb-1"
                        style={{
                          cursor: "pointer",
                          fontSize: "0.95rem",
                          backgroundColor: "rgba(255,255,255,0.08)",
                        }}
                      >
                        {child.label}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
            <li
              onClick={() => {
                handleLogout();
                setOpen(false);
              }}
              className="px-3 py-2 rounded"
              style={{ cursor: "pointer" }}
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="me-2" /> Logout
            </li>
          </ul>
        </div>
        <div className="text-center text-white-50 small mt-4">
          <p>v1.0.0</p>
          <p>Hostel Manager</p>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main
        className="container-fluid md-shell"
        style={{ marginLeft: 250, paddingTop: 24 }}
      >
        {/* Summary Cards */}
        <section className="row g-2 mb-3 px-2">
          {renderCard(
            "Total",
            summary.beds.totalUnits || 0,
            "#76b1d9",
            <MdOutlineBedroomParent />,
            () => setShowTotalModal(true)
          )}
          {renderCard(
            "Total Vacant",
            summary.beds.totalVacant || 0,
            "#efe89e",
            <MdOutlineBedroomParent />,
            () => findVacantUnits()
          )}

          {renderCard(
            "Pending Rents",
            summary.rent.pending || 0,
            "#ffe0e0",
            <FiBarChart2 />,
            () => setShowPendingRentModal(true)
          )}

          {renderCard(
            "Upcoming Leaves",
            futureLeaveCount,
            "#fde68a",
            <FiBarChart2 />,
            () => setShowFutureLeaveModal(true)
          )}

          {renderCard(
            "Light Bill Paid",
            `${summary.light.paid || 0}`,
            "#7897af",
            <MdLightbulbOutline />
          )}
          {renderCard(
            "Light Bill Pending",
            `${summary.light.pending || 0}`,
            "#f5d4a0",
            <MdLightbulbOutline />
          )}

          {renderCard(
            "Category Report",
            "Download",
            "#cebaed",
            <MdOutlineReceiptLong />,
            handleDownloadCategoryReport
          )}

          {renderCard(
            "Maintenance Pending",
            `${summary.maintenance.pending || 0}`,
            "#afe6f3",
            <MdOutlineReceiptLong />
          )}
        </section>

        {/* WELCOME & BAR CHART */}
        <section className="row g-3 mt-2 px-2">
          <div className="col-12 col-lg-6">
            <div className="bg-white p-3 rounded shadow-sm h-100 text-center">
              <h1 className="text-primary pt-3">Welcome Admin</h1>
              <p>
                Today is <strong>{dayName}</strong>, {dateString},{" "}
                <strong>{timeString}</strong>
              </p>
              <p className="text-muted">
                This dashboard provides a complete overview of the hostel
                management system including bed occupancy, rent collection, light
                bill, and maintenance expenses.
              </p>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="bg-white p-3 rounded shadow-sm h-100">
              <h5 className="text-primary mb-3 text-center">
                Overall Payment Status (%)
              </h5>
              {renderBarChart()}
            </div>
          </div>
        </section>

        {/* PIE CHARTS */}
        {renderPieCharts()}

        {/* TOTAL MODAL */}
        {showTotalModal && (
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
            <div className="modal-dialog modal-md modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Total Count</h5>
                  <button
                    type="button"
                    className="modal-x-btn"
                    onClick={() => setShowTotalModal(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="modal-body">{renderTotalModalBody()}</div>

                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowTotalModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VACANT MODAL */}
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
                  <h5 className="modal-title">Total Vacant</h5>
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
                  {renderVacantModalBody()}
                  
                </div>

                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowVacantModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FUTURE LEAVE MODAL */}
        {showFutureLeaveModal && (
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
                  <h5 className="modal-title">Upcoming Leave Tenants</h5>
                  <button
                    type="button"
                    className="modal-x-btn"
                    onClick={() => setShowFutureLeaveModal(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="modal-body">
                  {futureLeaveTenants.length === 0 ? (
                    <p>No upcoming leave tenants.</p>
                  ) : (
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Room</th>
                          <th>Bed</th>
                          <th>Leave Date</th>
                          <th>Deposit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {futureLeaveTenants.map((t, i) => {
                          const { deposit } = calculateRefund(t);
                          return (
                            <tr key={t._id || i}>
                              <td>{t.name}</td>
                              <td>{t.roomNo}</td>
                              <td>{t.bedNo}</td>
                              <td>
                                {new Date(t.leaveDate).toLocaleDateString()}
                              </td>
                              <td className="fw-semibold text-primary">
                                {deposit.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowFutureLeaveModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PENDING RENT MODAL */}
        {/* PENDING RENT MODAL */}
        {showPendingRentModal && (
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
                  <h5 className="modal-title">Pending Rents</h5>

                  <button
                    type="button"
                    className="modal-x-btn"
                    onClick={() => setShowPendingRentModal(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="modal-body">{renderPendingRentModalBody()}</div>

                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowPendingRentModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MainDashboard;
