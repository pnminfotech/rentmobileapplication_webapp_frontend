// src/pages/RoomManager.js
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { API_BASE, api } from "../api";
import {
  FaArrowLeft,
  FaBed,
  FaBuilding,
  FaChevronDown,
  FaChevronUp,
  FaCube,
  FaEdit,
  FaFilter,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaPlus,
  FaRedoAlt,
  FaSearch,
  FaSlidersH,
  FaTags,
  FaTrash,
  FaTimes,
} from "react-icons/fa";
import "../Pages/RoomManager.css";
const ROOM_COLORS = [
  "#eef5ff",
  "#e8f8f5",
  "#fff4e6",
  "#f3e8ff",
  "#eafaf1",
  "#fdecec",
  "#e1f5fe",
  "#f0f4c3",
];

const getRoomColor = (room) => {
  const key = String(room.roomNo || room._id || "");
  let hash = 0;

  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }

  return ROOM_COLORS[Math.abs(hash) % ROOM_COLORS.length];
};
const apiUrl = `${API_BASE}/rooms`;
const axios = api;

/* Editable default categories – used only for filter dropdown & optional limits */
const DEFAULT_CATEGORIES = ["Category 1", "Category 2", "Category 3", "Other"];
const NEW_CATEGORY_VALUE = "__new_category__";
const STRUCTURE_DRAFTS_KEY = "room_structure_drafts";
const MAX_HOSTEL_BEDS = 200;

function normalizeFloorKey(value) {
  const s = String(value ?? "").toLowerCase();
  if (/\bground\b|^g$/.test(s)) return "0";
  if (/\b(first|1st)\b/.test(s) || /^\s*1(\D|$)/.test(s)) return "1";
  if (/\b(second|2nd)\b/.test(s) || /^\s*2(\D|$)/.test(s)) return "2";
  if (/\b(third|3rd)\b/.test(s) || /^\s*3(\D|$)/.test(s)) return "3";
  const m = s.match(/\d+/);
  return m ? String(Number(m[0])) : "";
}

function floorLabelFromKey(k) {
  if (k === "0") return "Ground";
  if (k === "1") return "1st";
  if (k === "2") return "2nd";
  if (k === "3") return "3rd";
  return k || "Unknown";
}

function getPrimaryUnitBedNo(propertyType) {
  return propertyType === "shop" ? "SHOP-1" : "ROOM-1";
}

function normalizeCategoryName(value) {
  return String(value || "").trim();
}

function mergeCategoryNames(...lists) {
  const seen = new Set();
  const output = [];

  lists
    .flat()
    .map(normalizeCategoryName)
    .filter(Boolean)
    .forEach((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      output.push(name);
    });

  return output;
}

function normalizePropertyType(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "room" || raw === "shop") return raw;
  return "bed";
}

function getPropertyTypeLabel(value) {
  const propertyType = normalizePropertyType(value);
  if (propertyType === "shop") return "Commercial Shop";
  if (propertyType === "room") return "Residential Room";
  return "Hostel";
}

function getCategoryLabel(value) {
  const propertyType = normalizePropertyType(value);
  if (propertyType === "shop") return "Commercial Property Name";
  if (propertyType === "room") return "Residential Property Name";
  return "Category";
}

function getUnitLabel(value) {
  const propertyType = normalizePropertyType(value);
  if (propertyType === "shop") return "Shop";
  if (propertyType === "room") return "Flat";
  return "Room";
}

function getUnitPlaceholder(value) {
  const propertyType = normalizePropertyType(value);
  if (propertyType === "shop") return "Shop No (e.g., S-1)";
  if (propertyType === "room") return "Flat No (e.g., A-203)";
  return "Room No (e.g., 203)";
}

function getRoomMetaSummary(room) {
  const parts = [];
  if (room?.category) parts.push(room.category);
  if (room?.wingName) parts.push(`Wing ${room.wingName}`);
  if (room?.floorNo) parts.push(`Floor ${room.floorNo}`);
  if (room?.flatType) parts.push(room.flatType);
  return parts.join(" • ");
}

function isPlaceholderUnit(room) {
  const roomNo = String(room?.roomNo || "").trim().toUpperCase();
  return Boolean(room?.isPlaceholder) || roomNo.startsWith("UNASSIGNED-");
}

function getSetupUnitTitle(room, index) {
  const type = normalizePropertyType(room?.propertyType);
  const label = type === "shop" ? "Shop" : type === "room" ? "Room" : "Bed";
  return `${label} ${index + 1}`;
}

function getSetupHelpText(room) {
  const type = normalizePropertyType(room?.propertyType);
  if (type === "shop") return "Set shop property, floor and shop number";
  if (type === "room") return "Set building, floor and room number";
  return "Set hostel property, floor and room number";
}

function getSetupDetailLabels(value) {
  const propertyType = normalizePropertyType(value);
  if (propertyType === "shop") {
    return {
      category: "Property name",
      number: "Shop number",
      numberPlaceholder: "Example: S-01",
      price: "Monthly shop rent",
    };
  }
  if (propertyType === "room") {
    return {
      category: "Building or property name",
      number: "Room or flat number",
      numberPlaceholder: "Example: 101 or A-101",
      price: "Monthly room rent",
    };
  }
  return {
    category: "Building or hostel name",
    number: "Room number",
    numberPlaceholder: "Example: 101",
    price: "Monthly bed rent",
  };
}

const FLAT_TYPE_OPTIONS = ["1RK", "1BHK", "2BHK", "3BHK"];


// 🔵 Room color helper (safe – no side effects)



// ✅ deterministic hash -> hue
function hashStr(s) {
  const str = String(s ?? "");
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function roomKey(room) {
  // use _id if available (best), else composite key
  return (
    room?._id ||
    room?.id ||
    `${String(room?.category ?? "").trim()}|${String(room?.floorNo ?? "").trim()}|${String(
      room?.roomNo ?? ""
    ).trim()}`
  );
}

function roomColors(room) {
  const key = roomKey(room);
  const h = hashStr(key);

  // deterministic RGB from hash (more unique than hue-only)
  const r = (h & 255);
  const g = ((h >> 8) & 255);
  const b = ((h >> 16) & 255);

  // darker foreground for text/border
  const fr = Math.floor(r * 0.55);
  const fg = Math.floor(g * 0.55);
  const fb = Math.floor(b * 0.55);

  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.18)`,
    fg: `rgb(${fr}, ${fg}, ${fb})`,
  };
}



export default function RoomManager() {
  const PROPERTY_TYPE_OPTIONS = [
    { value: "bed", label: "Hostel" },
    { value: "room", label: "Residential Room" },
    { value: "shop", label: "Commercial Shop" },
  ];
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);

  // ✅ all typeable, including bedCategory
  const [roomForm, setRoomForm] = useState({
    propertyType: "bed",
    category: "",
    hasWing: false,
    wingName: "",
    floorNo: "",
    flatType: "",
    roomNo: "",
    bedNo: "",
    bedCategory: "",
    bedPrice: "",
  });

  const [showAddBedModal, setShowAddBedModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bedForm, setBedForm] = useState({
    bedNo: "",
    bedCategory: "",
    price: "",
  });

  const [showEditModal, setShowEditModal] = useState(false);
const [editTarget, setEditTarget] = useState({
  roomId: "",
  roomNo: "",
  bedNo: "",
   bedCategory: "",
  price: "",
});


  // 🔴 NEW: Delete bed modal state
  const [showDeleteBedModal, setShowDeleteBedModal] = useState(false);
  const [deleteBedState, setDeleteBedState] = useState({
    roomId: "",
    roomNo: "",
    beds: [],
    selectedBedNo: "",
    password: "",
  });
  const [showDeleteRoomModal, setShowDeleteRoomModal] = useState(false);
  const [deleteRoomState, setDeleteRoomState] = useState({
    roomId: "",
    roomNo: "",
    propertyType: "",
    password: "",
  });

  const [showCatEditor, setShowCatEditor] = useState(false);
  const [catDrafts, setCatDrafts] = useState([]);
  const [setupTarget, setSetupTarget] = useState(null);
  const [setupForm, setSetupForm] = useState({
    category: "",
    wingName: "",
    floorNo: "",
    flatType: "",
    roomNo: "",
    meterNo: "",
    lastMeterReading: "",
    bedCategory: "",
    price: "",
  });
  const [setupSaving, setSetupSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("bed");
  const [wingFilter, setWingFilter] = useState("");
  const [floorFilter, setFloorFilter] = useState("");
  const [mobileSection, setMobileSection] = useState("room");
  const [showQuickAddForm, setShowQuickAddForm] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [structureDrafts, setStructureDrafts] = useState({});
  const roomSectionRef = React.useRef(null);
  const filterSectionRef = React.useRef(null);
  const categorySectionRef = React.useRef(null);

  const navigate = useNavigate();
  const handleNavigation = (path) => navigate(path);
  const persistCategories = (nextCategories) => {
    const cleaned = mergeCategoryNames(nextCategories);
    setCategories(cleaned);
    localStorage.setItem("room_categories", JSON.stringify(cleaned));
  };
  const persistStructureDrafts = (updater) => {
    setStructureDrafts((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      localStorage.setItem(STRUCTURE_DRAFTS_KEY, JSON.stringify(next));
      return next;
    });
  };
  const scrollToSection = (ref) => {
    ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* -------- Load data -------- */

  useEffect(() => {
    const saved = localStorage.getItem("room_categories");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCategories(mergeCategoryNames(parsed));
        }
      } catch (_) {}
    }
    const savedDrafts = localStorage.getItem(STRUCTURE_DRAFTS_KEY);
    if (savedDrafts) {
      try {
        const parsedDrafts = JSON.parse(savedDrafts);
        if (parsedDrafts && typeof parsedDrafts === "object") {
          setStructureDrafts(parsedDrafts);
        }
      } catch (_) {}
    }
    fetchRooms();
  }, []);

  useEffect(() => {
    if (search || catFilter || wingFilter || floorFilter) {
      setShowMobileFilters(true);
    }
  }, [search, catFilter, wingFilter, floorFilter]);

  useEffect(() => {
    setRoomForm((prev) =>
      prev.propertyType === propertyFilter
        ? prev
        : {
            ...prev,
            propertyType: propertyFilter,
            hasWing: false,
            wingName: "",
            flatType: "",
            bedNo: propertyFilter === "bed" ? prev.bedNo : "",
            bedCategory: propertyFilter === "bed" ? prev.bedCategory : "",
          }
    );
  }, [propertyFilter]);

  const fetchRooms = async () => {
    try {
      const res = await axios.get(apiUrl);
      const nextRooms = res.data || [];
      setRooms(nextRooms);
      const mergedCategories = mergeCategoryNames(
        categories,
        nextRooms.map((room) => room?.category)
      );
      if (mergedCategories.length !== categories.length) {
        persistCategories(mergedCategories);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  /* -------- Derived values & limits (optional) -------- */

  const readyRooms = useMemo(
    () => rooms.filter((room) => !isPlaceholderUnit(room)),
    [rooms]
  );

  const setupRooms = useMemo(
    () => rooms.filter((room) => isPlaceholderUnit(room)),
    [rooms]
  );

  const setupRoomsForFilter = useMemo(
    () =>
      setupRooms
        .filter((room) => normalizePropertyType(room?.propertyType || "bed") === propertyFilter)
        .sort((a, b) =>
          String(a?.roomNo || "").localeCompare(String(b?.roomNo || ""), undefined, {
            numeric: true,
          })
        ),
    [setupRooms, propertyFilter]
  );

  const reusableHostelBedSlots = useMemo(
    () =>
      setupRooms
        .filter((room) => normalizePropertyType(room?.propertyType || "bed") === "bed")
        .sort((a, b) =>
          String(a?.roomNo || "").localeCompare(String(b?.roomNo || ""), undefined, {
            numeric: true,
          })
        ),
    [setupRooms]
  );

  // Same saved-location suggestions used by the mobile Units screen.
  const setupPropertyOptions = useMemo(
    () => mergeCategoryNames(readyRooms.map((room) => room?.category)),
    [readyRooms]
  );

  const setupFloorOptions = useMemo(() => {
    const categoryKey = normalizeCategoryName(setupForm.category).toLowerCase();
    return mergeCategoryNames(
      readyRooms
        .filter(
          (room) =>
            !categoryKey ||
            normalizeCategoryName(room?.category).toLowerCase() === categoryKey
        )
        .map((room) => room?.floorNo)
    );
  }, [readyRooms, setupForm.category]);

  const setupWingOptions = useMemo(() => {
    const categoryKey = normalizeCategoryName(setupForm.category).toLowerCase();
    const floorKey = normalizeCategoryName(setupForm.floorNo).toLowerCase();
    return mergeCategoryNames(
      readyRooms
        .filter((room) => {
          if (categoryKey && normalizeCategoryName(room?.category).toLowerCase() !== categoryKey) return false;
          if (floorKey && normalizeCategoryName(room?.floorNo).toLowerCase() !== floorKey) return false;
          return Boolean(normalizeCategoryName(room?.wingName));
        })
        .map((room) => room?.wingName)
    );
  }, [readyRooms, setupForm.category, setupForm.floorNo]);

  const setupFlatTypeOptions = useMemo(() => {
    const categoryKey = normalizeCategoryName(setupForm.category).toLowerCase();
    const floorKey = normalizeCategoryName(setupForm.floorNo).toLowerCase();
    return mergeCategoryNames(
      FLAT_TYPE_OPTIONS,
      readyRooms
        .filter((room) => {
          if (categoryKey && normalizeCategoryName(room?.category).toLowerCase() !== categoryKey) return false;
          if (floorKey && normalizeCategoryName(room?.floorNo).toLowerCase() !== floorKey) return false;
          return Boolean(normalizeCategoryName(room?.flatType));
        })
        .map((room) => room?.flatType)
    );
  }, [readyRooms, setupForm.category, setupForm.floorNo]);

  const buildingOptions = useMemo(() => {
    const selectedType = normalizePropertyType(roomForm.propertyType);
    const roomCategoriesForType = readyRooms
      .filter((room) => normalizePropertyType(room?.propertyType) === selectedType)
      .map((room) => room?.category);

    const savedCategoriesForType = categories.filter((category) =>
      readyRooms.some(
        (room) =>
          normalizePropertyType(room?.propertyType) === selectedType &&
          String(room?.category || "").trim().toLowerCase() ===
            String(category || "").trim().toLowerCase()
      )
    );

    return mergeCategoryNames(savedCategoriesForType, roomCategoriesForType);
  }, [categories, readyRooms, roomForm.propertyType]);

  const selectedBuildingOption = useMemo(() => {
    const current = normalizeCategoryName(roomForm.category);
    if (!current) return "";
    const matched = buildingOptions.find(
      (name) => name.toLowerCase() === current.toLowerCase()
    );
    return matched || NEW_CATEGORY_VALUE;
  }, [buildingOptions, roomForm.category]);

  const structureScopeKey = useMemo(() => {
    const propertyType = normalizePropertyType(roomForm.propertyType);
    const category = normalizeCategoryName(roomForm.category).toLowerCase();
    if (propertyType === "bed" || !category) return "";
    return `${propertyType}::${category}`;
  }, [roomForm.propertyType, roomForm.category]);

  const scopedStructureDraft = useMemo(() => {
    if (!structureScopeKey) {
      return { wings: [], floorsNoWing: [], floorsByWing: {} };
    }
    return (
      structureDrafts[structureScopeKey] || {
        wings: [],
        floorsNoWing: [],
        floorsByWing: {},
      }
    );
  }, [structureDrafts, structureScopeKey]);

  const scopedPropertyRooms = useMemo(() => {
    const propertyType = normalizePropertyType(roomForm.propertyType);
    const category = normalizeCategoryName(roomForm.category).toLowerCase();
    if (propertyType === "bed" || !category) return [];
    return readyRooms.filter(
      (room) =>
        normalizePropertyType(room?.propertyType) === propertyType &&
        String(room?.category || "").trim().toLowerCase() === category
    );
  }, [readyRooms, roomForm.propertyType, roomForm.category]);

  const existingWingNames = useMemo(() => {
    return mergeCategoryNames(
      scopedPropertyRooms.map((room) => String(room?.wingName || "").trim()).filter(Boolean)
    );
  }, [scopedPropertyRooms]);

  const availableWingNames = useMemo(() => {
    return mergeCategoryNames(existingWingNames, scopedStructureDraft.wings || []);
  }, [existingWingNames, scopedStructureDraft]);

  const activeWingName = roomForm.hasWing ? normalizeCategoryName(roomForm.wingName) : "";

  const existingFloorNames = useMemo(() => {
    const filtered = scopedPropertyRooms.filter((room) =>
      roomForm.hasWing
        ? String(room?.wingName || "").trim().toLowerCase() === activeWingName.toLowerCase()
        : !String(room?.wingName || "").trim()
    );
    return mergeCategoryNames(filtered.map((room) => room?.floorNo));
  }, [scopedPropertyRooms, roomForm.hasWing, activeWingName]);

  const draftFloorNames = useMemo(() => {
    if (!roomForm.hasWing) {
      return scopedStructureDraft.floorsNoWing || [];
    }
    return scopedStructureDraft.floorsByWing?.[activeWingName] || [];
  }, [scopedStructureDraft, roomForm.hasWing, activeWingName]);

  const availableFloorNames = useMemo(() => {
    return mergeCategoryNames(existingFloorNames, draftFloorNames);
  }, [existingFloorNames, draftFloorNames]);

  const filterCategoryOptions = useMemo(() => {
    const selectedType = normalizePropertyType(propertyFilter);
    return mergeCategoryNames(
      readyRooms
        .filter((room) => normalizePropertyType(room?.propertyType) === selectedType)
        .map((room) => room?.category)
    );
  }, [readyRooms, propertyFilter]);
  const filterWingOptions = useMemo(() => {
    const selectedType = normalizePropertyType(propertyFilter);
    return mergeCategoryNames(
      readyRooms
        .filter((room) => normalizePropertyType(room?.propertyType) === selectedType)
        .map((room) => String(room?.wingName || "").trim())
        .filter(Boolean)
    );
  }, [readyRooms, propertyFilter]);
  const filterFloorOptions = useMemo(() => {
    const selectedType = normalizePropertyType(propertyFilter);
    return mergeCategoryNames(
      readyRooms
        .filter((room) => normalizePropertyType(room?.propertyType) === selectedType)
        .map((room) => String(room?.floorNo || "").trim())
        .filter(Boolean)
    );
  }, [readyRooms, propertyFilter]);

  const totalHostelBeds = useMemo(() => {
    return rooms.reduce((sum, room) => {
      if (normalizePropertyType(room?.propertyType) !== "bed") return sum;
      return sum + (Array.isArray(room?.beds) ? room.beds.length : 0);
    }, 0);
  }, [rooms]);

  const hasReachedHostelBedLimit = totalHostelBeds >= MAX_HOSTEL_BEDS;
  const canAddHostelBed = !hasReachedHostelBedLimit || reusableHostelBedSlots.length > 0;

  /* -------- Add Room (with optional first bed) -------- */

 const addRoom = async () => {
  const propertyType = String(roomForm.propertyType || "bed").trim().toLowerCase();
  const category = normalizeCategoryName(roomForm.category);
  const hasWing = propertyType !== "bed" ? Boolean(roomForm.hasWing) : false;
  const wingName = hasWing ? String(roomForm.wingName || "").trim() : "";
  const floorNo = roomForm.floorNo.trim();
  const flatType = propertyType === "room" ? String(roomForm.flatType || "").trim() : "";
  const roomNo = roomForm.roomNo.trim();
  const firstBedNo = propertyType === "bed" ? roomForm.bedNo.trim() : "";
  const firstBedCategory = roomForm.bedCategory.trim();
  const priceInput = String(roomForm.bedPrice ?? "").trim();
  const firstBedPrice = priceInput === "" ? null : Number(priceInput);

  if (!category) {
    alert(`Please enter ${getCategoryLabel(propertyType)}.`);
    return;
  }
  if (!roomNo) {
    alert(`${getUnitLabel(propertyType)} number is required.`);
    return;
  }
  if (!floorNo) {
    alert("Please enter a Floor.");
    return;
  }
  if ((propertyType === "room" || propertyType === "shop") && hasWing && !wingName) {
    alert("Please enter a Wing name.");
    return;
  }
  if (propertyType === "room" && !flatType) {
    alert("Please select a flat type.");
    return;
  }
  if (propertyType === "bed" && firstBedNo && hasReachedHostelBedLimit) {
    alert(`Maximum ${MAX_HOSTEL_BEDS} hostel beds reached. You cannot add more beds.`);
    return;
  }
  if (priceInput !== "" && (Number.isNaN(firstBedPrice) || firstBedPrice < 0)) {
    alert("Please enter a valid price.");
    return;
  }

const dup = readyRooms.some(
  (r) =>
    normalizePropertyType(r.propertyType) === propertyType &&
    String(r.roomNo).trim().toLowerCase() === roomNo.toLowerCase() &&
    String(r.category || "").trim().toLowerCase() === category.toLowerCase() &&
    String(r.floorNo || "").trim().toLowerCase() === floorNo.toLowerCase() &&
    String(r.wingName || "").trim().toLowerCase() === wingName.toLowerCase()
);
if (dup) {
  alert(`${getUnitLabel(propertyType)} already exists in this location.`);
  return;
}


  try {
    // 1) Create room
  const created = await axios.post(apiUrl, {
    category,
    hasWing,
    wingName,
    floorNo,
    flatType,
    roomNo,
    propertyType,
  });
const createdRoom = created.data; // must include _id

if (propertyType === "bed" && firstBedNo) {
  await axios.post(`${apiUrl}/${createdRoom._id}/bed`, {
    bedNo: firstBedNo,
    bedCategory: firstBedCategory || "",
    price: firstBedPrice,
  });
}

if (propertyType !== "bed" && firstBedPrice != null) {
  await axios.put(
    `${apiUrl}/${createdRoom._id}/bed/${getPrimaryUnitBedNo(propertyType)}`,
    {
      price: firstBedPrice,
    }
  );
}


    // reset form
    setRoomForm({
      propertyType: "bed",
      category: "",
      hasWing: false,
      wingName: "",
      floorNo: "",
      flatType: "",
      roomNo: "",
      bedNo: "",
      bedCategory: "",
      bedPrice: "", // ✅ reset
    });

    persistCategories([...buildingOptions, category]);
    setRoomForm((prev) => ({
      ...prev,
      propertyType,
      category,
      hasWing,
      wingName,
      floorNo,
      flatType,
      roomNo: "",
      bedNo: "",
      bedCategory: "",
      bedPrice: "",
   }));

    // Show the newly created property in the desktop list immediately.
    setPropertyFilter(propertyType);
    setSearch("");
    setCatFilter("");
    setWingFilter("");
    setFloorFilter("");

    fetchRooms();
  } catch (error) {
    console.error("Error adding room:", error);
    alert(
      error.response?.data?.message ||
        "Failed to add room (check console for details)."
    );
  }
};


  /* -------- Bed operations -------- */

  const openAddBedModal = (room) => {
    if (!canAddHostelBed) {
      alert(`Maximum ${MAX_HOSTEL_BEDS} hostel beds reached. No pending units are available to use.`);
      return;
    }
    setSelectedRoom(room);
    setBedForm({ bedNo: "", bedCategory: "", price: "" });
    setShowAddBedModal(true);
  };

  const addBedToRoom = async () => {
    if (!selectedRoom || !bedForm.bedNo.trim()) {
      alert("Bed No is required.");
      return;
    }
    if (!canAddHostelBed) {
      alert(`Maximum ${MAX_HOSTEL_BEDS} hostel beds reached. No pending units are available to use.`);
      return;
    }
    const bedPayload = {
      bedNo: bedForm.bedNo.trim(),
      bedCategory: bedForm.bedCategory.trim(),
      price: bedForm.price ? Number(bedForm.price) : null,
    };
    const reusableSlot = reusableHostelBedSlots[0];
    const requestPayload = reusableSlot?._id
      ? {
          ...bedPayload,
          usePlaceholder: true,
          placeholderRoomId: reusableSlot._id,
        }
      : bedPayload;

    try {
      await axios.post(`${apiUrl}/${selectedRoom._id}/bed`, requestPayload);


      fetchRooms();
      setShowAddBedModal(false);
      setBedForm({ bedNo: "", bedCategory: "", price: "" });
    } catch (err) {
      console.error("Failed to add bed:", err.response?.data || err.message);
      alert("Failed to add bed: " + (err.response?.data?.message || err.message));
    }
  };

const openEditModal = (roomId, roomNo, bedNo, bedCategory, currentPrice) => {
  setEditTarget({
    roomId,
    roomNo,
    bedNo: String(bedNo ?? ""),                 // ✅ correct identifier
    bedCategory: bedCategory ?? "",             // ✅ Upper/Lower
    price: currentPrice ?? "",
  });
  setShowEditModal(true);
};


const updateBedPrice = async () => {
  const isRoomEdit = propertyFilter === "room";
  const bedCategory = isRoomEdit ? undefined : (editTarget.bedCategory || "").trim();
  // ✅ price can be blank => clear (backend will set null)
  let priceToSend = undefined;

  if (editTarget.price === "") {
    priceToSend = ""; // tells backend to clear price
  } else {
    const num = Number(editTarget.price);
    if (Number.isNaN(num)) {
      alert("Invalid price.");
      return;
    }
    priceToSend = num;
  }
console.log("PUT URL =>", `${apiUrl}/${editTarget.roomId}/bed/${editTarget.bedNo}`);
console.log("Payload =>", { price: priceToSend, bedCategory, propertyFilter });
  try {
    await axios.put(`${apiUrl}/${editTarget.roomId}/bed/${editTarget.bedNo}`, {
      price: priceToSend,
      ...(isRoomEdit ? {} : { bedCategory }),
    });
    setShowEditModal(false);
    fetchRooms();
  } catch (error) {
    console.error("Error updating bed:", error);
    alert(error?.response?.data?.message || "Failed to update bed.");

    console.log("STATUS:", error?.response?.status);
    console.log("DATA:", error?.response?.data);
    console.log("MSG:", error?.message);
  }
};


  /* -------- NEW: Delete bed operations -------- */

  const openDeleteBedModal = (room) => {
    const beds = room.beds || [];
    setDeleteBedState({
      roomId: room._id || "",
      roomNo: room.roomNo,
      beds,
      selectedBedNo: beds[0]?.bedNo || "",
      password: "",
    });
    setShowDeleteBedModal(true);
  };

  const handleDeleteBed = async () => {
    const { roomId, selectedBedNo, password } = deleteBedState;

    if (!selectedBedNo) {
      alert("Please select a bed to delete.");
      return;
    }
    if (!roomId) {
      alert("Room id is missing. Please refresh and try again.");
      return;
    }

    if (password !== "987654") {
      alert("Invalid password. Bed not deleted.");
      return;
    }

    try {
      await axios.delete(`${apiUrl}/${roomId}/bed/${encodeURIComponent(selectedBedNo)}`);
      setShowDeleteBedModal(false);
      setDeleteBedState({
        roomId: "",
        roomNo: "",
        beds: [],
        selectedBedNo: "",
        password: "",
      });
      fetchRooms();
    } catch (err) {
      console.error("Failed to delete bed:", err.response?.data || err.message);
      alert(
        "Failed to delete bed: " +
          (err.response?.data?.message || err.message || "")
      );
    }
  };

  /* -------- Category editor -------- */

  const openCategoryEditor = () => {
    setCatDrafts([...categories]);
    setShowCatEditor(true);
  };

  const saveCategoryNames = () => {
    const cleaned = mergeCategoryNames(catDrafts);
    if (!cleaned.length) {
      alert("Please provide at least one building name.");
      return;
    }
    persistCategories(cleaned);
    setShowCatEditor(false);
  };

  const addWingDraft = () => {
    const propertyType = normalizePropertyType(roomForm.propertyType);
    const category = normalizeCategoryName(roomForm.category);
    const wingName = normalizeCategoryName(roomForm.wingName);

    if (propertyType === "bed") return;
    if (!category) {
      alert(`Please enter ${getCategoryLabel(propertyType)} first.`);
      return;
    }
    if (!roomForm.hasWing) {
      alert("Please choose Wing: Yes first.");
      return;
    }
    if (!wingName) {
      alert("Please enter a wing name first.");
      return;
    }

    persistStructureDrafts((prev) => {
      const current = prev[structureScopeKey] || { wings: [], floorsNoWing: [], floorsByWing: {} };
      return {
        ...prev,
        [structureScopeKey]: {
          ...current,
          wings: mergeCategoryNames(current.wings || [], [wingName]),
          floorsByWing: {
            ...(current.floorsByWing || {}),
            [wingName]: current.floorsByWing?.[wingName] || [],
          },
        },
      };
    });
    setRoomForm((prev) => ({ ...prev, hasWing: true, wingName }));
  };

  const addFloorDraft = () => {
    const propertyType = normalizePropertyType(roomForm.propertyType);
    const category = normalizeCategoryName(roomForm.category);
    const floorNo = normalizeCategoryName(roomForm.floorNo);
    const wingName = normalizeCategoryName(roomForm.wingName);

    if (propertyType === "bed") return;
    if (!category) {
      alert(`Please enter ${getCategoryLabel(propertyType)} first.`);
      return;
    }
    if (roomForm.hasWing && !wingName) {
      alert("Please select or enter a wing first.");
      return;
    }
    if (!floorNo) {
      alert("Please enter a floor first.");
      return;
    }

    persistStructureDrafts((prev) => {
      const current = prev[structureScopeKey] || { wings: [], floorsNoWing: [], floorsByWing: {} };
      if (roomForm.hasWing) {
        return {
          ...prev,
          [structureScopeKey]: {
            ...current,
            wings: mergeCategoryNames(current.wings || [], [wingName]),
            floorsByWing: {
              ...(current.floorsByWing || {}),
              [wingName]: mergeCategoryNames(current.floorsByWing?.[wingName] || [], [floorNo]),
            },
          },
        };
      }
      return {
        ...prev,
        [structureScopeKey]: {
          ...current,
          floorsNoWing: mergeCategoryNames(current.floorsNoWing || [], [floorNo]),
        },
      };
    });
    setRoomForm((prev) => ({ ...prev, floorNo }));
  };

  const resetDefaultCategories = () => {
    setCatDrafts([...DEFAULT_CATEGORIES]);
  };

  /* -------- UI helpers -------- */

  const modalBackdropStyle = {
    backgroundColor: "rgba(0,0,0,0.5)",
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    overflowY: "auto",
    padding: "12px",
    boxSizing: "border-box",
    zIndex: 9999,
  };

  const scopedRooms = useMemo(
    () =>
      rooms.filter(
        (r) => normalizePropertyType(r.propertyType || "bed") === propertyFilter
      ),
    [rooms, propertyFilter]
  );
  const scopedRoomCount = scopedRooms.length;
  const scopedUnitCount = scopedRooms.reduce((sum, r) => sum + (r.beds?.length || 0), 0);
  const statsMeta = useMemo(() => {
    if (propertyFilter === "shop") {
      return {
        heroLabel: "Shops",
        heroValue: scopedRoomCount,
        heroSubtext: `${scopedUnitCount} shop units total`,
        primaryLabel: "Total Shops",
        primaryValue: scopedRoomCount,
        primaryHelp: "Managed shops",
        secondaryLabel: "Total Shop Units",
        secondaryValue: scopedUnitCount,
        secondaryHelp: "Across all shops",
      };
    }

    if (propertyFilter === "room") {
      return {
        heroLabel: "Rooms",
        heroValue: scopedRoomCount,
        heroSubtext: `${scopedUnitCount} room units total`,
        primaryLabel: "Total Rooms",
        primaryValue: scopedRoomCount,
        primaryHelp: "Managed rooms",
        secondaryLabel: "Total Room Units",
        secondaryValue: scopedUnitCount,
        secondaryHelp: "Across all rooms",
      };
    }

    return {
      heroLabel: "Rooms",
      heroValue: scopedRoomCount,
      heroSubtext: `${scopedUnitCount} beds total`,
      primaryLabel: "Total Rooms",
      primaryValue: scopedRoomCount,
      primaryHelp: "Managed rooms",
      secondaryLabel: "Total Beds",
      secondaryValue: scopedUnitCount,
      secondaryHelp: "Across all floors",
    };
  }, [propertyFilter, scopedRoomCount, scopedUnitCount]);

  const baseFiltered = useMemo(() => {
    const q = (search || "").toLowerCase();
    let list = readyRooms.filter(
      (r) => normalizePropertyType(r.propertyType || "bed") === propertyFilter
    );

    if (catFilter) {
      list = list.filter((r) => (r.category || "") === catFilter);
    }
    if (wingFilter) {
      list = list.filter((r) => String(r.wingName || "").trim() === wingFilter);
    }
    if (floorFilter) {
      list = list.filter((r) => String(r.floorNo || "").trim() === floorFilter);
    }
    if (!q) return list;
    return list.filter((r) => {
      const inRoom = String(r.roomNo).toLowerCase().includes(q);
      const inFloor =
        (r.floorNo || "").toLowerCase().includes(q) ||
        floorLabelFromKey(normalizeFloorKey(r.floorNo)).toLowerCase().includes(q);
      const inCat = (r.category || "").toLowerCase().includes(q);
      const inWing = String(r.wingName || "").toLowerCase().includes(q);
      const inFlatType = String(r.flatType || "").toLowerCase().includes(q);
      const inBeds = (r.beds || []).some(
        (b) =>
          String(b.bedNo).toLowerCase().includes(q) ||
          String(b.bedCategory || "").toLowerCase().includes(q) ||
          String(b.price ?? "").toLowerCase().includes(q)
      );
      return inRoom || inFloor || inCat || inWing || inFlatType || inBeds;
    });
  }, [readyRooms, search, catFilter, wingFilter, floorFilter, propertyFilter]);

  const displayedRooms = useMemo(() => {
    return [...baseFiltered].sort((a, b) => {
      const categoryCompare = String(a?.category || "").localeCompare(
        String(b?.category || ""),
        undefined,
        { numeric: true }
      );
      if (categoryCompare) return categoryCompare;

      const wingCompare = String(a?.wingName || "").localeCompare(
        String(b?.wingName || ""),
        undefined,
        { numeric: true }
      );
      if (wingCompare) return wingCompare;

      const floorCompare = String(a?.floorNo || "").localeCompare(
        String(b?.floorNo || ""),
        undefined,
        { numeric: true }
      );
      if (floorCompare) return floorCompare;

      return String(a?.roomNo || "").localeCompare(String(b?.roomNo || ""), undefined, {
        numeric: true,
      });
    });
  }, [baseFiltered]);

  const groupedDisplayedRooms = useMemo(() => {
    const grouped = displayedRooms.reduce((acc, room) => {
      const buildingKey = String(room?.category || "Unassigned").trim() || "Unassigned";
      const wingKey = String(room?.wingName || "No Wing").trim() || "No Wing";
      const floorKey = String(room?.floorNo || "No Floor").trim() || "No Floor";

      if (!acc[buildingKey]) acc[buildingKey] = {};
      if (!acc[buildingKey][wingKey]) acc[buildingKey][wingKey] = {};
      if (!acc[buildingKey][wingKey][floorKey]) acc[buildingKey][wingKey][floorKey] = [];
      acc[buildingKey][wingKey][floorKey].push(room);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([building, wings]) => ({
        building,
        wings: Object.entries(wings)
          .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
          .map(([wing, floors]) => ({
            wing,
            floors: Object.entries(floors)
              .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
              .map(([floor, units]) => ({
                floor,
                units: units.sort((a, b) =>
                  String(a.roomNo).localeCompare(String(b.roomNo), undefined, {
                    numeric: true,
                  })
                ),
              })),
          })),
      }));
  }, [displayedRooms]);
  const clearFilters = () => {
    setSearch("");
    setCatFilter("");
    setWingFilter("");
    setFloorFilter("");
  };

  const openSetupUnitModal = (room) => {
    const propertyType = normalizePropertyType(room?.propertyType);
    const firstBed = Array.isArray(room?.beds) ? room.beds[0] : null;
    const pending = isPlaceholderUnit(room);

    setSetupTarget(room);
    setSetupForm({
      category: pending ? "" : String(room?.category || ""),
      wingName: pending ? "" : String(room?.wingName || ""),
      floorNo: pending ? "" : String(room?.floorNo || ""),
      flatType: pending ? "" : String(room?.flatType || ""),
      roomNo: pending ? "" : String(room?.roomNo || ""),
      meterNo: pending ? "" : String(room?.meterNo || ""),
      lastMeterReading:
        room?.lastMeterReading === undefined || room?.lastMeterReading === null
          ? ""
          : String(room.lastMeterReading),
      bedCategory:
        propertyType === "bed" &&
        String(firstBed?.bedCategory || "").trim().toLowerCase() !== "unassigned"
          ? String(firstBed?.bedCategory || "")
          : "",
      price:
        firstBed?.price === undefined || firstBed?.price === null
          ? ""
          : String(firstBed.price),
    });
  };

  const closeSetupUnitModal = () => {
    setSetupTarget(null);
    setSetupSaving(false);
    setSetupForm({
      category: "",
      wingName: "",
      floorNo: "",
      flatType: "",
      roomNo: "",
      meterNo: "",
      lastMeterReading: "",
      bedCategory: "",
      price: "",
    });
  };

  const saveSetupUnit = async () => {
    if (!setupTarget?._id) return;

    const propertyType = normalizePropertyType(setupTarget.propertyType);
    const isPendingSetup = isPlaceholderUnit(setupTarget);
    const labels = getSetupDetailLabels(propertyType);
    const category = normalizeCategoryName(setupForm.category);
    const floorNo = normalizeCategoryName(setupForm.floorNo);
    const roomNo = String(setupForm.roomNo || "").trim();
    const wingName = normalizeCategoryName(setupForm.wingName);
    const hasWing = Boolean(wingName);
    const flatType = propertyType === "room" ? normalizeCategoryName(setupForm.flatType) : "";
    const meterNo = String(setupForm.meterNo || "").trim();
    const price = Number(setupForm.price);
    const meterReading = setupForm.lastMeterReading === "" ? null : Number(setupForm.lastMeterReading);

    if (!category || !floorNo || !roomNo) {
      alert(`${labels.category}, floor and ${labels.number.toLowerCase()} are required.`);
      return;
    }

    if (propertyType === "room" && !flatType) {
      alert("Please enter flat type.");
      return;
    }

    // Mobile parity:
    // - Hostel room details are edited separately from individual bed price/category.
    // - Residential/Commercial units keep their monthly rent on the primary unit slot.
    // - A pending Hostel unit still needs its first bed price/category during setup.
    const shouldUpdatePrimarySlot = isPendingSetup || propertyType !== "bed";

    if (shouldUpdatePrimarySlot && (!Number.isFinite(price) || price <= 0)) {
      alert("Please enter a valid monthly rent.");
      return;
    }

    if (setupForm.lastMeterReading !== "" && (!Number.isFinite(meterReading) || meterReading < 0)) {
      alert("Please enter a valid last meter reading.");
      return;
    }

    const duplicate = readyRooms.some(
      (room) =>
        String(room?._id || "") !== String(setupTarget?._id || "") &&
        normalizePropertyType(room.propertyType) === propertyType &&
        String(room.roomNo || "").trim().toLowerCase() === roomNo.toLowerCase() &&
        String(room.category || "").trim().toLowerCase() === category.toLowerCase() &&
        String(room.floorNo || "").trim().toLowerCase() === floorNo.toLowerCase() &&
        String(room.wingName || "").trim().toLowerCase() === wingName.toLowerCase()
    );
    if (duplicate) {
      alert(`${getUnitLabel(propertyType)} already exists in this location.`);
      return;
    }

    const primaryBedNo = setupTarget.beds?.[0]?.bedNo;
    if (shouldUpdatePrimarySlot && !primaryBedNo) {
      alert("Unable to find the unit slot. Please refresh and try again.");
      return;
    }

    const bedCategory =
      propertyType === "shop"
        ? "Shop"
        : propertyType === "room"
          ? "Rental Room"
          : String(setupForm.bedCategory || "").trim() || "Standard";

    try {
      setSetupSaving(true);

      const updated = await axios.put(`${apiUrl}/${setupTarget._id}`, {
        category,
        hasWing,
        wingName,
        floorNo,
        flatType,
        roomNo,
        meterNo,
        lastMeterReading: meterReading,
      });

      if (shouldUpdatePrimarySlot) {
        await axios.put(`${apiUrl}/${updated.data?._id || setupTarget._id}/bed/${primaryBedNo}`, {
          price,
          bedCategory,
        });
      }

      persistCategories([...buildingOptions, category]);
      setPropertyFilter(propertyType);
      setSearch("");
      setCatFilter("");
      setWingFilter("");
      setFloorFilter("");
      closeSetupUnitModal();
      fetchRooms();
    } catch (err) {
      console.error("Failed to save unit:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Failed to save unit details.");
    } finally {
      setSetupSaving(false);
    }
  };


  const openDeleteRoomModal = (room) => {
    setDeleteRoomState({
      roomId: room?._id || "",
      roomNo: room?.roomNo || "",
      propertyType: String(room?.propertyType || "room").trim().toLowerCase(),
      password: "",
    });
    setShowDeleteRoomModal(true);
  };

  const deleteRoomOrShop = async () => {
    const propertyType = normalizePropertyType(deleteRoomState.propertyType);
    const unitLabel =
      propertyType === "shop"
        ? "shop"
        : propertyType === "room"
          ? "residential room"
          : "hostel room";

    try {
      await axios.delete(`${apiUrl}/${deleteRoomState.roomId}`);
      setShowDeleteRoomModal(false);
      setDeleteRoomState({
        roomId: "",
        roomNo: "",
        propertyType: "",
        password: "",
      });
      fetchRooms();
    } catch (err) {
      console.error("Failed to delete unit:", err.response?.data || err.message);
      alert(
        err.response?.data?.message || `Failed to delete ${unitLabel}.`
      );
    }
  };
  const renderModal = (node) =>
    typeof document !== "undefined" ? createPortal(node, document.body) : node;

  useEffect(() => {
    setRoomForm((prev) => ({
      ...prev,
      propertyType: propertyFilter,
      hasWing: propertyFilter === "bed" ? false : prev.hasWing,
      wingName: propertyFilter === "bed" ? "" : prev.wingName,
      flatType: propertyFilter === "room" ? prev.flatType : "",
      bedNo: propertyFilter === "bed" ? prev.bedNo : "",
      bedCategory: propertyFilter === "bed" ? prev.bedCategory : "",
    }));
  }, [propertyFilter]);

  /* -------- JSX -------- */
  const editRoomCategoryQuick = async (room) => {
  const current = (room.category || "").trim();
  const next = window.prompt(
    `Edit Category for Room ${room.roomNo}`,
    current
  );

  // user pressed Cancel
  if (next === null) return;

  const category = next.trim();
  if (!category) {
    alert("Category cannot be empty.");
    return;
  }

  const hasConflict = rooms.some(
    (item) =>
      String(item?._id || "") !== String(room?._id || "") &&
      String(item?.roomNo || "").trim().toLowerCase() ===
        String(room?.roomNo || "").trim().toLowerCase() &&
      String(item?.category || "").trim().toLowerCase() === category.toLowerCase()
  );
  if (hasConflict) {
    alert(`Room ${room.roomNo} already exists in category ${category}.`);
    return;
  }

  try {
    // ✅ IMPORTANT: use room._id (not roomNo)
    await axios.put(`${apiUrl}/${room._id}`, { category });

    persistCategories([...categories, category]);

    fetchRooms();
  } catch (err) {
    console.error("Failed to update room category:", err.response?.data || err.message);
    alert(err.response?.data?.message || "Failed to update room category.");
  }
  };
  const renderStructureBuilder = (isMobile = false) => {
    if (normalizePropertyType(roomForm.propertyType) === "bed" || !normalizeCategoryName(roomForm.category)) {
      return null;
    }

    const isResidential = roomForm.propertyType === "room";
    const currentFloor = normalizeCategoryName(roomForm.floorNo);
    const unitLabel = roomForm.propertyType === "room" ? "flat" : "shop";
    const unitLabelTitle = roomForm.propertyType === "room" ? "Flat" : "Shop";
    const currentFloorUnits = scopedPropertyRooms.filter((room) => {
      const sameFloor = String(room?.floorNo || "").trim().toLowerCase() === currentFloor.toLowerCase();
      const sameWing = roomForm.hasWing
        ? String(room?.wingName || "").trim().toLowerCase() === activeWingName.toLowerCase()
        : !String(room?.wingName || "").trim();
      return sameFloor && sameWing;
    }).length;

    const containerClass = isMobile ? "border rounded-3 p-3 bg-light" : "border rounded-3 p-3 bg-light";
    const chipButtonClass = isMobile ? "btn btn-sm btn-outline-primary" : "btn btn-sm btn-outline-primary";
    const selectedWingFloors = roomForm.hasWing
      ? mergeCategoryNames(
          scopedPropertyRooms
            .filter((room) => String(room?.wingName || "").trim().toLowerCase() === activeWingName.toLowerCase())
            .map((room) => room?.floorNo),
          scopedStructureDraft.floorsByWing?.[activeWingName] || []
        )
      : [];

    return (
      <div className={containerClass}>
        <div className="mb-3">
          <div>
            <strong>{roomForm.propertyType === "room" ? "Residential Setup" : "Commercial Setup"}</strong>
            <div className="text-muted small">
              Building: {roomForm.category}
            </div>
            <div className="text-primary small mt-1">
              {roomForm.hasWing
                ? `Selected: ${activeWingName || "Choose wing"} -> ${currentFloor || "Choose floor"} -> Add ${unitLabelTitle}`
                : `Selected: ${currentFloor || "Choose floor"} -> Add ${unitLabelTitle}`}
            </div>
          </div>
        </div>

        {isResidential && (
          <div className="mb-3">
            <div className="border rounded-3 bg-white p-3">
              <div className="fw-semibold mb-2">Setup Details</div>
              <div className="d-grid" style={{ gap: "10px" }}>
                <select
                  className="form-select"
                  value={roomForm.hasWing ? "yes" : "no"}
                  onChange={(e) =>
                    setRoomForm((prev) => ({
                      ...prev,
                      hasWing: e.target.value === "yes",
                      wingName: e.target.value === "yes" ? prev.wingName : "",
                    }))
                  }
                >
                  <option value="no">Has Wing: No</option>
                  <option value="yes">Has Wing: Yes</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {roomForm.hasWing && (
          <div className="mb-3">
            <div className="border rounded-3 bg-white p-3">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                <div>
                  <div className="fw-semibold">Step 1: Add Or Select Wing</div>
                  <div className="text-muted small">Enter a wing name, then click `Add Wing`.</div>
                </div>
              </div>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                <input
                  type="text"
                  className="form-control"
                  style={{ flex: "1 1 240px" }}
                  placeholder="Wing Name (e.g., A Wing)"
                  value={roomForm.wingName}
                  onChange={(e) =>
                    setRoomForm((prev) => ({ ...prev, wingName: e.target.value }))
                  }
                />
                <button type="button" className="btn btn-sm btn-primary" onClick={addWingDraft}>
                  Add Wing
                </button>
              </div>
              <div className="d-flex flex-wrap gap-2">
                {availableWingNames.map((wing) => {
                  const wingFloorCount = mergeCategoryNames(
                    scopedPropertyRooms
                      .filter((room) => String(room?.wingName || "").trim().toLowerCase() === wing.toLowerCase())
                      .map((room) => room?.floorNo),
                    scopedStructureDraft.floorsByWing?.[wing] || []
                  ).length;
                  const wingUnitCount = scopedPropertyRooms.filter(
                    (room) => String(room?.wingName || "").trim().toLowerCase() === wing.toLowerCase()
                  ).length;
                  return (
                    <button
                      key={wing}
                      type="button"
                      className={`${chipButtonClass} ${activeWingName.toLowerCase() === wing.toLowerCase() ? "active" : ""}`}
                      onClick={() =>
                        setRoomForm((prev) => ({
                          ...prev,
                          wingName: wing,
                          hasWing: true,
                          floorNo: "",
                        }))
                      }
                    >
                      {wing} • {wingFloorCount} floor(s) • {wingUnitCount} {unitLabel}(s)
                    </button>
                  );
                })}
                {!availableWingNames.length && <span className="text-muted small">No wings added yet.</span>}
              </div>
            </div>
          </div>
        )}

        <div className="mb-2">
          <div className="border rounded-3 bg-white p-3">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
              <div>
                <div className="fw-semibold">
                  Step 2: {roomForm.hasWing ? `Add Or Select Floor In ${activeWingName || "Selected Wing"}` : "Add Or Select Floor"}
                </div>
                <div className="text-muted small">
                  Enter the floor, then click `Add Floor`.
                </div>
              </div>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              <input
                type="text"
                className="form-control"
                style={{ flex: "1 1 240px" }}
                placeholder="Floor No (Ground, 1, 2)"
                value={roomForm.floorNo}
                onChange={(e) =>
                  setRoomForm((prev) => ({
                    ...prev,
                    floorNo: e.target.value,
                  }))
                }
              />
              <button
                type="button"
                className="btn btn-sm btn-outline-dark"
                onClick={addFloorDraft}
                disabled={roomForm.hasWing && !activeWingName}
              >
                Add Floor
              </button>
            </div>

            {roomForm.hasWing && !activeWingName ? (
              <span className="text-muted small">Select a wing first.</span>
            ) : (
              <div className="d-flex flex-wrap gap-2">
                {(roomForm.hasWing ? selectedWingFloors : availableFloorNames).map((floor) => {
                  const unitCount = scopedPropertyRooms.filter((room) => {
                    const sameFloor = String(room?.floorNo || "").trim().toLowerCase() === floor.toLowerCase();
                    const sameWing = roomForm.hasWing
                      ? String(room?.wingName || "").trim().toLowerCase() === activeWingName.toLowerCase()
                      : !String(room?.wingName || "").trim();
                    return sameFloor && sameWing;
                  }).length;

                  return (
                    <button
                      key={floor}
                      type="button"
                      className={`${chipButtonClass} ${currentFloor.toLowerCase() === floor.toLowerCase() ? "active" : ""}`}
                      onClick={() =>
                        setRoomForm((prev) => ({
                          ...prev,
                          floorNo: floor,
                        }))
                      }
                    >
                      {floor} • {unitCount} {unitLabel}(s)
                    </button>
                  );
                })}
                {!(roomForm.hasWing ? selectedWingFloors : availableFloorNames).length && (
                  <span className="text-muted small">No floors added yet.</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border rounded-3 bg-white p-3">
          <div className="fw-semibold mb-1">Step 3: Add {unitLabelTitle}</div>
          <div className="text-muted small">
            {currentFloor
              ? `Selected location: ${roomForm.hasWing ? `${activeWingName} -> ` : ""}${currentFloor}. Current count: ${currentFloorUnits}`
              : `Select ${roomForm.hasWing ? "a wing and floor" : "a floor"} first, then fill ${unitLabel} type/number below.`}
          </div>
          {isResidential && (
            <div className="d-grid mt-3" style={{ gap: "10px" }}>
              <select
                className="form-select"
                value={roomForm.flatType}
                onChange={(e) =>
                  setRoomForm((prev) => ({ ...prev, flatType: e.target.value }))
                }
              >
                <option value="">Select Flat Type</option>
                {FLAT_TYPE_OPTIONS.map((flatType) => (
                  <option key={flatType} value={flatType}>
                    {flatType}
                  </option>
                ))}
              </select>

              <input
                className="form-control"
                placeholder={getUnitPlaceholder(roomForm.propertyType)}
                value={roomForm.roomNo}
                onChange={(e) =>
                  setRoomForm((prev) => ({ ...prev, roomNo: e.target.value }))
                }
              />

              <input
                type="number"
                className="form-control"
                placeholder="Flat Price (₹)"
                value={roomForm.bedPrice}
                onChange={(e) =>
                  setRoomForm((prev) => ({ ...prev, bedPrice: e.target.value }))
                }
              />
            </div>
          )}
        </div>
      </div>
    );
  };
  const renderDesktopQuickAddModal = () =>
    renderModal(
        <div style={modalBackdropStyle} onClick={() => setShowQuickAddForm(false)}>
          <div
          className="modal-dialog modal-dialog-centered room-manager-quickadd-dialog"
          style={{ width: "100%", maxWidth: "720px", margin: "0 12px" }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-content room-manager-quickadd-modal"
            style={{
              maxHeight: "calc(100vh - 24px)",
              display: "flex",
              flexDirection: "column",
              width: "100%",
              borderRadius: "18px",
              overflow: "hidden",
            }}
          >
            <div className="modal-header bg-white sticky-top py-2 px-3 room-manager-quickadd-header" style={{ zIndex: 1 }}>
              <h5 className="modal-title mb-0">Add Property</h5>
              <button
                type="button"
                className="btn btn-sm text-white room-manager-quickadd-close"
                style={{ backgroundColor: "#5f7dfc", minWidth: 88 }}
                onClick={() => setShowQuickAddForm(false)}
              >
                Close
              </button>
            </div>

            <div className="modal-body bg-white px-3 py-3 room-manager-quickadd-body" style={{ overflowY: "auto" }}>
              <div className="d-grid room-manager-quickadd-form" style={{ gap: "10px" }}>
                <select
                  className="form-select"
                  value={roomForm.propertyType}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                >
                  {PROPERTY_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  className="form-control"
                  placeholder={
                    roomForm.propertyType === "bed"
                      ? "Category (Private / Double Sharing / 3 Sharing)"
                      : getCategoryLabel(roomForm.propertyType)
                  }
                  value={roomForm.category}
                  onChange={(e) =>
                    setRoomForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                />

                {roomForm.propertyType === "shop" && (
                  <select
                    className="form-select"
                    value={roomForm.hasWing ? "yes" : "no"}
                    onChange={(e) =>
                      setRoomForm((prev) => ({
                        ...prev,
                        hasWing: e.target.value === "yes",
                        wingName: e.target.value === "yes" ? prev.wingName : "",
                      }))
                    }
                  >
                    <option value="no">Has Wing: No</option>
                    <option value="yes">Has Wing: Yes</option>
                  </select>
                )}

                {roomForm.propertyType === "shop" && roomForm.hasWing && (
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Wing Name (e.g., A Wing)"
                    value={roomForm.wingName}
                    onChange={(e) =>
                      setRoomForm((prev) => ({
                        ...prev,
                        wingName: e.target.value,
                      }))
                    }
                  />
                )}

                {roomForm.propertyType !== "room" && (
                  <div>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Floor No (Ground, 1, 2)"
                      value={roomForm.floorNo}
                      onChange={(e) =>
                        setRoomForm((prev) => ({
                          ...prev,
                          floorNo: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}

                {renderStructureBuilder(false)}

                {roomForm.propertyType === "shop" && (
                  <select
                    className="form-select"
                    value={roomForm.flatType}
                    onChange={(e) =>
                      setRoomForm((prev) => ({
                        ...prev,
                        flatType: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select Flat Type</option>
                    {FLAT_TYPE_OPTIONS.map((flatType) => (
                      <option key={flatType} value={flatType}>
                        {flatType}
                      </option>
                    ))}
                  </select>
                )}

                {roomForm.propertyType !== "room" && (
                  <input
                    className="form-control"
                    placeholder={getUnitPlaceholder(roomForm.propertyType)}
                    value={roomForm.roomNo}
                    onChange={(e) =>
                      setRoomForm((prev) => ({
                        ...prev,
                        roomNo: e.target.value,
                      }))
                    }
                  />
                )}

                {roomForm.propertyType === "bed" && (
                  <input
                    className="form-control"
                    placeholder="Bed No (e.g., B1)"
                    value={roomForm.bedNo}
                    onChange={(e) =>
                      setRoomForm((prev) => ({
                        ...prev,
                        bedNo: e.target.value,
                      }))
                    }
                  />
                )}

                {roomForm.propertyType === "bed" && (
                  <input
                    className="form-control"
                    placeholder="Bed Category (e.g., Upper, Lower)"
                    value={roomForm.bedCategory}
                    onChange={(e) =>
                      setRoomForm((prev) => ({
                        ...prev,
                        bedCategory: e.target.value,
                      }))
                    }
                  />
                )}

                {roomForm.propertyType !== "room" && (
                  <input
                    type="number"
                    className="form-control"
                    placeholder={
                      roomForm.propertyType === "bed"
                        ? "Bed Price (₹)"
                        : roomForm.propertyType === "shop"
                        ? "Shop Price (₹)"
                        : "Flat Price (₹)"
                    }
                    value={roomForm.bedPrice}
                    onChange={(e) =>
                      setRoomForm((prev) => ({
                        ...prev,
                        bedPrice: e.target.value,
                      }))
                    }
                  />
                )}

                <button
                  className="btn px-3 text-white"
                  style={{ backgroundColor: "#5f7dfc" }}
                  onClick={addRoom}
                >
                  Add {getUnitLabel(roomForm.propertyType)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  const renderSetupUnits = ({ mobile = false } = {}) => {
    if (!setupRoomsForFilter.length) return null;

    if (mobile) {
      return (
        <section className="room-manager-mobile-section">
          <div className="room-manager-mobile-section-title">
            <div>
              <h5>{getPropertyTypeLabel(propertyFilter)} units to set up</h5>
              <span>Set these details after the ready units below</span>
            </div>
          </div>
          <div className="room-manager-mobile-room-list">
            {setupRoomsForFilter.map((room, index) => (
              <article key={room._id || room.roomNo} className="room-manager-mobile-room-card">
                <div className="room-manager-mobile-room-head">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="roomNoPill room-manager-mobile-room-pill">
                      {getSetupUnitTitle(room, index)}
                    </span>
                    <div className="room-manager-mobile-room-meta">
                      {getSetupHelpText(room)}
                    </div>
                  </div>
                  <span className="badge bg-warning text-dark">Pending</span>
                </div>
                <button
                  type="button"
                  className="room-manager-mobile-room-action room-manager-mobile-room-action--primary"
                  onClick={() => openSetupUnitModal(room)}
                >
                  <span>Set details</span>
                </button>
              </article>
            ))}
          </div>
        </section>
      );
    }

    return (
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-2">
            <div className="d-flex align-items-start gap-3">
              <div
                className="rounded-circle d-inline-flex justify-content-center align-items-center"
                style={{ width: 44, height: 44, background: "#eaf6ff", color: "#1e5f87" }}
              >
                <FaBuilding />
              </div>
              <div>
                <h5 className="fw-bold mb-1">{getPropertyTypeLabel(propertyFilter)} units to set up</h5>
                <div className="text-muted small">Set property, floor and unit number before assigning tenants.</div>
              </div>
            </div>
            <span className="badge text-bg-warning">{setupRoomsForFilter.length} Pending</span>
          </div>

          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Type</th>
                  <th>Needed details</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {setupRoomsForFilter.map((room, index) => (
                  <tr key={room._id || room.roomNo}>
                    <td className="fw-semibold">{getSetupUnitTitle(room, index)}</td>
                    <td>{getPropertyTypeLabel(room.propertyType)}</td>
                    <td className="text-muted">{getSetupHelpText(room)}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => openSetupUnitModal(room)}>
                        <FaEdit className="me-2" />
                        Set details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderGroupedUnitsDesktop = () => {
    if (!groupedDisplayedRooms.length) {
      return <div className="text-center text-muted py-4">No units match your filters.</div>;
    }

    return (
      <div className="room-manager-grouped-list">
        {groupedDisplayedRooms.map((buildingGroup) => (
          <section key={buildingGroup.building} className="room-manager-building-card">
            <div className="room-manager-building-head">
              <div className="room-manager-building-head-main">
                <div className="room-manager-building-icon">
                  <FaBuilding />
                </div>
                <div>
                  <h5>{buildingGroup.building}</h5>
                  <span>
                    <FaMapMarkerAlt className="me-2" />
                    {buildingGroup.wings[0]?.wing === "No Wing"
                      ? "No Wing"
                      : `Wing ${buildingGroup.wings[0]?.wing || "-"}`}
                  </span>
                </div>
              </div>

              <div className="room-manager-building-meta">
                <div className="room-manager-building-badge">
                  <FaCube className="me-2" />
                  {buildingGroup.wings.reduce(
                    (sum, wing) =>
                      sum + wing.floors.reduce((fSum, floor) => fSum + floor.units.length, 0),
                    0
                  )}{" "}
                  Units
                </div>
                <div className="room-manager-building-badge">
                  <FaLayerGroup className="me-2" />
                  {buildingGroup.wings.reduce((sum, wing) => sum + wing.floors.length, 0)} Floors
                </div>
              </div>
            </div>

            <div className="room-manager-building-table-wrap">
              <div className="room-manager-building-table-head">
                <div>Unit / Room</div>
                <div>Room Type</div>
                <div>Floor</div>
                <div>Price (₹)</div>
                <div>Actions</div>
              </div>

              {buildingGroup.wings.flatMap((wingGroup) =>
                wingGroup.floors.flatMap((floorGroup) =>
                  floorGroup.units.map((room) => {
                    const primaryBed = (room.beds || [])[0];
                    return (
                      <div
                        key={room._id || `${room.category}-${room.floorNo}-${room.roomNo}`}
                        className="room-manager-building-table-row"
                      >
                        <div className="room-manager-building-cell room-manager-building-cell-main">
                          <span
                            className="roomNoPill"
                            style={{ "--bg": roomColors(room).bg, "--fg": roomColors(room).fg }}
                          >
                            {room.roomNo}
                          </span>
                          <div className="room-manager-unit-copy">
                            <div className="room-manager-unit-title">
                              {getPropertyTypeLabel(room.propertyType)}
                            </div>
                            <div className="room-manager-unit-sub">
                              {wingGroup.wing === "No Wing" ? "No Wing" : `Wing ${wingGroup.wing}`}
                            </div>
                          </div>
                        </div>

                        <div className="room-manager-building-cell">
                          {room.flatType || getPropertyTypeLabel(room.propertyType)}
                        </div>

                        <div className="room-manager-building-cell">{floorGroup.floor}</div>

                        <div className="room-manager-building-cell">
                          {primaryBed?.price != null
                            ? Number(primaryBed.price).toLocaleString("en-IN")
                            : "-"}
                        </div>

                        <div className="room-manager-building-cell room-manager-unit-actions">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openSetupUnitModal(room)}
                          >
                            <FaEdit className="me-2" />
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger px-2 py-1"
                            style={{ fontSize: "0.8rem", lineHeight: 1.2 }}
                            onClick={() => openDeleteRoomModal(room)}
                          >
                            <FaTrash className="me-1" />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </section>
        ))}
      </div>
    );
  };

  const renderBedRoomsDesktop = () => {
    if (!groupedDisplayedRooms.length) {
      return (
        <div className="table-responsive">
          <table className="table table-bordered table-sm align-middle">
            <thead>
              <tr className="fw-semibold text-secondary">
                <th style={{ whiteSpace: "nowrap" }}>Unit No</th>
                <th style={{ whiteSpace: "nowrap" }}>Floor</th>
                <th style={{ whiteSpace: "nowrap" }}>Type</th>
                <th style={{ whiteSpace: "nowrap" }}>Category</th>
                <th style={{ minWidth: 320 }}>Beds</th>
                <th style={{ whiteSpace: "nowrap" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="text-center text-muted py-4">
                  No rooms match your filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="table-responsive">
        <table className="table table-bordered table-sm align-middle">
          <thead>
            <tr className="fw-semibold text-secondary">
              <th style={{ whiteSpace: "nowrap" }}>Unit No</th>
              <th style={{ whiteSpace: "nowrap" }}>Floor</th>
              <th style={{ whiteSpace: "nowrap" }}>Type</th>
              <th style={{ whiteSpace: "nowrap" }}>Category</th>
              <th style={{ minWidth: 320 }}>Beds</th>
              <th style={{ whiteSpace: "nowrap" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groupedDisplayedRooms.flatMap((buildingGroup) => [
              <tr key={`building-${buildingGroup.building}`} className="table-light">
                <td colSpan={6} className="fw-bold">
                  {getPropertyTypeLabel(propertyFilter)} - {buildingGroup.building}
                </td>
              </tr>,
              ...buildingGroup.wings.flatMap((wingGroup) =>
                wingGroup.floors.flatMap((floorGroup) => [
                  <tr key={`floor-${buildingGroup.building}-${wingGroup.wing}-${floorGroup.floor}`}>
                    <td colSpan={6} className="text-muted small fw-semibold">
                      {wingGroup.wing === "No Wing" ? "No Wing" : `Wing ${wingGroup.wing}`} / Floor{" "}
                      {floorGroup.floor === "No Floor"
                        ? "-"
                        : floorLabelFromKey(normalizeFloorKey(floorGroup.floor)) || floorGroup.floor}
                    </td>
                  </tr>,
                  ...floorGroup.units.map((room) => {
                    const norm = normalizeFloorKey(room.floorNo);
                    const displayFloor = norm ? floorLabelFromKey(norm) : room.floorNo || "-";

                    return (
                      <tr
                        key={`${room.category}-${room.floorNo}-${room.roomNo}`}
                        style={{ backgroundColor: getRoomColor(room) }}
                      >
                        <td className="fw-semibold">
                          {(() => {
                            const { bg, fg } = roomColors(room);
                            return (
                              <span className="roomNoPill" style={{ "--bg": bg, "--fg": fg }}>
                                {room.roomNo}
                              </span>
                            );
                          })()}
                        </td>

                        <td>{displayFloor}</td>
                        <td>{getPropertyTypeLabel(room.propertyType)}</td>
                        <td>
                          <span
                            className="badge bg-light text-dark border"
                            role="button"
                            title="Click to edit category"
                            style={{ cursor: "pointer" }}
                            onClick={() => editRoomCategoryQuick(room)}
                          >
                            <div>{room.category || "-"}</div>
                            {(room.wingName || room.flatType) && (
                              <small className="d-block text-muted">
                                {[room.wingName ? `Wing ${room.wingName}` : "", room.flatType || ""]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </small>
                            )}
                          </span>
                        </td>

                        <td>
                          {(room.beds?.length ? room.beds : []).map((bed, idx, arr) => {
                            const isLast = idx === arr.length - 1;
                            return (
                              <div
                                key={`${room.roomNo}-${bed.bedNo}-${idx}`}
                                className="d-flex justify-content-between align-items-center py-1 flex-wrap"
                                style={!isLast ? { borderBottom: "1px solid #9aa0a6" } : {}}
                              >
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                  <span className="badge rounded-pill bg-secondary">
                                    Bed {bed.bedNo}
                                  </span>
                                  {bed.bedCategory && (
                                    <span className="badge rounded-pill bg-light text-dark border">
                                      {bed.bedCategory}
                                    </span>
                                  )}
                                  <small className="text-muted">
                                    Price:{" "}
                                    {bed.price != null
                                      ? `Rs. ${Number(bed.price).toLocaleString("en-IN")}`
                                      : "-"}
                                  </small>
                                </div>
                                <button
                                  className="btn btn-sm btn-outline-primary ms-2"
                                  onClick={() =>
                                    openEditModal(
                                      room._id,
                                      room.roomNo,
                                      bed.bedNo,
                                      bed.bedCategory ?? "",
                                      bed.price ?? ""
                                    )
                                  }
                                >
                                  Edit Price
                                </button>
                              </div>
                            );
                          })}
                          {!room.beds?.length && <span className="text-muted">No beds yet</span>}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm"
                            style={{ backgroundColor: "#5f7dfc", color: "white" }}
                            onClick={() => openAddBedModal(room)}
                            disabled={!canAddHostelBed}
                            title={
                              !canAddHostelBed
                                ? `Maximum ${MAX_HOSTEL_BEDS} hostel beds reached`
                                : reusableHostelBedSlots.length
                                ? "Add a bed using an available pending unit"
                                : "Add a new bed"
                            }
                          >
                            + Add Bed
                          </button>

                          {room.beds?.length > 0 && (
                            <button
                              className="btn btn-sm btn-outline-primary ms-2"
                              style={{ color: "#2ea3f2", borderColor: "#2ea3f2" }}
                              onClick={() => openDeleteBedModal(room)}
                            >
                              Delete Bed
                            </button>
                          )}

                          <button
                            className="btn btn-sm btn-outline-secondary ms-2"
                            onClick={() => openSetupUnitModal(room)}
                          >
                            <FaEdit className="me-1" />
                            Edit Room
                          </button>

                          <button
                            className="btn btn-sm btn-outline-danger ms-2"
                            onClick={() => openDeleteRoomModal(room)}
                          >
                            <FaTrash className="me-1" />
                            Delete Room
                          </button>
                        </td>
                      </tr>
                    );
                  }),
                ])
              ),
            ])}
          </tbody>
        </table>
      </div>
    );
  };
  return (
    <div
      className="container-fluid px-3 px-md-4 py-3"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      <div className="room-manager-mobile d-lg-none">
        <div className="room-manager-mobile-topbar">
          <button
            type="button"
            className="room-manager-mobile-back"
            onClick={() => handleNavigation("/admin")}
          >
            <FaArrowLeft />
            <span>Back</span>
          </button>

          <div className="room-manager-mobile-topbadge">Beds, Rooms &amp; Shops</div>
        </div>

        <div className="room-manager-mobile-stats">
          <div className="room-manager-mobile-stat-card">
            <span>{statsMeta.primaryLabel}</span>
            <strong>{statsMeta.primaryValue}</strong>
            <small>{statsMeta.primaryHelp}</small>
          </div>
          <div className="room-manager-mobile-stat-card">
            <span>{statsMeta.secondaryLabel}</span>
            <strong>{statsMeta.secondaryValue}</strong>
            <small>{statsMeta.secondaryHelp}</small>
          </div>
        </div>

        {/* <div className="room-manager-mobile-actions">
          <button
            type="button"
            className={`room-manager-mobile-action is-primary ${mobileSection === "room" ? "is-active" : ""}`}
            onClick={() => {
              setMobileSection("room");
              setShowQuickAddForm(true);
              scrollToSection(roomSectionRef);
            }}
          >
            <FaPlus />
            <span>Add Room</span>
          </button>
          <button
            type="button"
            className={`room-manager-mobile-action ${mobileSection === "filters" ? "is-active" : ""}`}
            onClick={() => {
              setMobileSection("filters");
              scrollToSection(filterSectionRef);
            }}
          >
            <FaSlidersH />
            <span>Filters</span>
          </button>
          <button
            type="button"
            className={`room-manager-mobile-action ${mobileSection === "categories" ? "is-active" : ""}`}
            onClick={() => {
              setMobileSection("categories");
              openCategoryEditor();
              scrollToSection(categorySectionRef);
            }}
          >
            <FaTags />
            <span>Categories</span>
          </button>
        </div> */}

        <section ref={filterSectionRef} className="room-manager-mobile-filter-wrap">
          <button
            type="button"
            className="room-manager-mobile-filter-toggle"
            onClick={() => setShowMobileFilters((prev) => !prev)}
            aria-expanded={showMobileFilters}
          >
            <span className="room-manager-mobile-filter-toggle-left">
              <FaFilter />
              <span>Room Filters</span>
            </span>
            <span className="room-manager-mobile-filter-toggle-right">
              <span className="room-manager-mobile-filter-toggle-label">
                {displayedRooms.length} shown
              </span>
              {showMobileFilters ? <FaChevronUp /> : <FaChevronDown />}
            </span>
          </button>

          {showMobileFilters ? (
            <div className="room-manager-mobile-filter-panel">
              <div className="room-manager-mobile-filter-summary">
                <strong>Refine your room list</strong>
                <span>{displayedRooms.length} rooms currently visible</span>
              </div>

              <label className="room-manager-mobile-filter-field">
                <span>Property Type</span>
                <select
                  className="form-select"
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                >
                  {PROPERTY_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="room-manager-mobile-filter-field">
                <span>Category</span>
                <select
                  className="form-select"
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {filterCategoryOptions.map((c, idx) => (
                    <option key={idx} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              {propertyFilter !== "bed" ? (
                <label className="room-manager-mobile-filter-field">
                  <span>Wing</span>
                  <select
                    className="form-select"
                    value={wingFilter}
                    onChange={(e) => setWingFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    {filterWingOptions.map((wing) => (
                      <option key={wing} value={wing}>
                        {wing}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="room-manager-mobile-filter-field">
                <span>Floor</span>
                <select
                  className="form-select"
                  value={floorFilter}
                  onChange={(e) => setFloorFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {filterFloorOptions.map((floor) => (
                    <option key={floor} value={floor}>
                      {floor}
                    </option>
                  ))}
                </select>
              </label>

              <div className="room-manager-mobile-filter-actions">
                <button
                  type="button"
                  className="room-manager-mobile-filter-chip room-manager-mobile-filter-chip--ghost"
                  onClick={clearFilters}
                  disabled={!search && !catFilter && !wingFilter && !floorFilter}
                >
                  <FaRedoAlt />
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>
          ) : null}
        </section>

        {showQuickAddForm ? (
          <section ref={roomSectionRef} className="room-manager-mobile-panel">
          <div className="room-manager-mobile-panel-title">
            <div>
              <h5>Quick Add Unit</h5>
              <span>Fast entry</span>
            </div>
            <div className="room-manager-mobile-panel-actions">
              <div className="room-manager-mobile-panel-badge room-manager-mobile-panel-badge--soft">
                <FaBed />
                <span>{displayedRooms.length} rooms</span>
              </div>
              <button
                type="button"
                className="room-manager-mobile-close-btn"
                onClick={() => setShowQuickAddForm(false)}
                aria-label="Close quick add form"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          <div className="room-manager-mobile-form-grid">
            <select
              className="form-select"
              value={roomForm.propertyType}
              onChange={(e) => setPropertyFilter(e.target.value)}
            >
              {PROPERTY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="form-select"
              value={selectedBuildingOption}
              onChange={(e) => {
                const nextValue = e.target.value;
                setRoomForm((prev) => ({
                  ...prev,
                  category: nextValue === NEW_CATEGORY_VALUE ? "" : nextValue,
                }));
              }}
            >
              <option value="">
                {roomForm.propertyType === "bed" ? "Select Category" : `Select ${getCategoryLabel(roomForm.propertyType)}`}
              </option>
              {buildingOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value={NEW_CATEGORY_VALUE}>+ Add New Building</option>
            </select>

            {selectedBuildingOption === NEW_CATEGORY_VALUE || !roomForm.category ? (
              <input
                type="text"
                className="form-control"
                placeholder={
                  roomForm.propertyType === "bed"
                    ? "New Category (e.g., Private)"
                    : `${getCategoryLabel(roomForm.propertyType)}`
                }
                value={roomForm.category}
                onChange={(e) =>
                  setRoomForm((prev) => ({ ...prev, category: e.target.value }))
                }
              />
            ) : null}

            {roomForm.propertyType !== "bed" && (
              <select
                className="form-select"
                value={roomForm.hasWing ? "yes" : "no"}
                onChange={(e) =>
                  setRoomForm((prev) => ({
                    ...prev,
                    hasWing: e.target.value === "yes",
                    wingName: e.target.value === "yes" ? prev.wingName : "",
                  }))
                }
              >
                <option value="no">Has Wing: No</option>
                <option value="yes">Has Wing: Yes</option>
              </select>
            )}

            {roomForm.propertyType !== "bed" && roomForm.hasWing && (
              <input
                type="text"
                className="form-control"
                placeholder="Wing Name (e.g., A Wing)"
                value={roomForm.wingName}
                onChange={(e) =>
                  setRoomForm((prev) => ({ ...prev, wingName: e.target.value }))
                }
              />
            )}

            <input
              type="text"
              className="form-control"
              placeholder="Floor No (e.g., Ground, 1, 2, 3, Basement)"
              value={roomForm.floorNo}
              onChange={(e) =>
                setRoomForm((prev) => ({ ...prev, floorNo: e.target.value }))
              }
            />

            {renderStructureBuilder(true)}

            {roomForm.propertyType === "room" && (
              <select
                className="form-select"
                value={roomForm.flatType}
                onChange={(e) =>
                  setRoomForm((prev) => ({ ...prev, flatType: e.target.value }))
                }
              >
                <option value="">Select Flat Type</option>
                {FLAT_TYPE_OPTIONS.map((flatType) => (
                  <option key={flatType} value={flatType}>
                    {flatType}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              className="form-control"
              placeholder={getUnitPlaceholder(roomForm.propertyType)}
              value={roomForm.roomNo}
              onChange={(e) =>
                setRoomForm((prev) => ({ ...prev, roomNo: e.target.value }))
              }
            />

            {roomForm.propertyType === "bed" && (
              <input
                type="text"
                className="form-control"
                placeholder="Bed No (e.g., B1)"
                value={roomForm.bedNo}
                onChange={(e) =>
                  setRoomForm((prev) => ({ ...prev, bedNo: e.target.value }))
                }
              />
            )}

            {roomForm.propertyType === "bed" && (
              <input
                type="text"
                className="form-control"
                placeholder="Bed Category (e.g., Upper, Lower)"
                value={roomForm.bedCategory}
                onChange={(e) =>
                  setRoomForm((prev) => ({ ...prev, bedCategory: e.target.value }))
                }
              />
            )}

            <input
              type="number"
              className="form-control"
              placeholder={
                roomForm.propertyType === "bed"
                  ? "Bed Price (Rs.)"
                  : roomForm.propertyType === "shop"
                  ? "Shop Price (Rs.)"
                  : "Flat Price (Rs.)"
              }
              value={roomForm.bedPrice}
              onChange={(e) =>
                setRoomForm((prev) => ({ ...prev, bedPrice: e.target.value }))
              }
            />

            <button
              type="button"
              className="room-manager-mobile-submit"
              onClick={addRoom}
            >
              <FaPlus />
              <span>{getUnitLabel(roomForm.propertyType)}</span>
            </button>
          </div>
          </section>
        ) : null}

        <section className="room-manager-mobile-section">
          <div className="room-manager-mobile-section-title">
            <div>
              <h5>{getPropertyTypeLabel(propertyFilter)} units</h5>
              <span>{displayedRooms.length} ready units</span>
            </div>
          </div>

          <div className="room-manager-mobile-room-list">
            {displayedRooms.map((room) => {
              const norm = normalizeFloorKey(room.floorNo);
              const displayFloor = norm ? floorLabelFromKey(norm) : room.floorNo || "-";
              const bedCount = room.beds?.length || 0;
              const { bg, fg } = roomColors(room);
              const roomStyle = { "--bg": bg, "--fg": fg };

              return (
                <article
                  key={`mobile-${room.category}-${room.floorNo}-${room.roomNo}`}
                  className="room-manager-mobile-room-card"
                >
                  <div className="room-manager-mobile-room-head">
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", flex: 1 }}>
                      <span
                        className="roomNoPill room-manager-mobile-room-pill"
                        style={{
                          ...roomStyle,
                          fontSize: "0.8rem",
                          padding: "0.28rem 0.6rem",
                          alignSelf: "flex-start",
                          marginRight: "auto",
                        }}
                      >
                        {getUnitLabel(room.propertyType)} {room.roomNo}
                      </span>
                      <div className="room-manager-mobile-room-meta">
                        {getRoomMetaSummary({ ...room, floorNo: displayFloor })}{" "}
                        {(room.propertyType || "bed") === "bed" ? `${bedCount} bed(s)` : ""}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="room-manager-mobile-category-pill"
                      onClick={() => editRoomCategoryQuick(room)}
                    >
                      {room.category || "Category"}
                    </button>
                  </div>

                  <div className="room-manager-mobile-bed-list">
                    {(room.beds?.length ? room.beds : []).map((bed, idx) => (
                      <div key={`mobile-${room.roomNo}-${bed.bedNo}-${idx}`} className="room-manager-mobile-bed-row">
                        <div className="room-manager-mobile-bed-copy">
                          <div className="room-manager-mobile-bed-pill-row">
                            <span className="room-manager-mobile-bed-pill">
                              {(room.propertyType || "bed") === "bed" ? `Bed ${bed.bedNo}` : `Unit ${bed.bedNo}`}
                            </span>
                            {bed.bedCategory ? (
                              <span className="room-manager-mobile-bed-pill room-manager-mobile-bed-pill--alt">
                                {bed.bedCategory}
                              </span>
                            ) : null}
                          </div>
                          <div className="room-manager-mobile-bed-price" style={{ textAlign: "left", justifyContent: "flex-start" }}>
                            Price:{" "}
                            {bed.price != null ? `Rs. ${Number(bed.price).toLocaleString("en-IN")}` : "—"}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="room-manager-mobile-edit-btn"
                          onClick={() =>
                            openEditModal(
                              room._id,
                              room.roomNo,
                              bed.bedNo,
                              bed.bedCategory ?? "",
                              bed.price ?? ""
                            )
                          }
                        >
                          <FaEdit />
                         
                        </button>
                      </div>
                    ))}

                    {!room.beds?.length && (
                      <div className="room-manager-mobile-empty-bed">No beds yet</div>
                    )}
                  </div>

                  <div className="room-manager-mobile-room-actions">
                    {(room.propertyType || "bed") === "bed" && (
                    <button
                      type="button"
                      className="room-manager-mobile-room-action room-manager-mobile-room-action--primary"
                      onClick={() => openAddBedModal(room)}
                    >
                      <span>Add Bed</span>
                    </button>
                    )}

                    {(room.propertyType || "bed") === "bed" && (room.beds?.length > 0 ? (
                      <button
                        type="button"
                        className="room-manager-mobile-room-action room-manager-mobile-room-action--danger"
                        onClick={() => openDeleteBedModal(room)}
                      >
                        <span>Delete Bed</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="room-manager-mobile-room-action room-manager-mobile-room-action--ghost"
                        onClick={() => openAddBedModal(room)}
                      >
                        <FaPlus />
                        <span>Add First Bed</span>
                      </button>
                    ))}

                    <button
                      type="button"
                      className="room-manager-mobile-room-action room-manager-mobile-room-action--ghost"
                      style={{
                        padding: "0.2rem 0.45rem",
                        fontSize: "0.78rem",
                        minHeight: "auto",
                        width: "fit-content",
                        minWidth: "72px",
                        alignSelf: "flex-start",
                      }}
                      onClick={() => openSetupUnitModal(room)}
                    >
                      <FaEdit />
                      <span>{(room.propertyType || "bed") === "bed" ? "Edit Room" : "Edit Unit"}</span>
                    </button>

                    <button
                      type="button"
                      className="room-manager-mobile-room-action room-manager-mobile-room-action--danger"
                      style={{
                        padding: "0.2rem 0.45rem",
                        fontSize: "0.78rem",
                        minHeight: "auto",
                        width: "fit-content",
                        minWidth: "72px",
                        alignSelf: "flex-start",
                      }}
                      onClick={() => openDeleteRoomModal(room)}
                    >
                      <FaTrash />
                      <span>{(room.propertyType || "bed") === "bed" ? "Delete Room" : "Delete"}</span>
                    </button>
                  </div>
                </article>
              );
            })}

            {!displayedRooms.length && (
              <div className="room-manager-mobile-empty">No rooms match your filters.</div>
            )}
          </div>
        </section>

        {renderSetupUnits({ mobile: true })}

        <div className="room-manager-mobile-bottom-nav">
          <button
            type="button"
            className={`room-manager-mobile-bottom-action ${mobileSection === "room" ? "is-active" : ""}`}
            onClick={() => {
              setMobileSection("room");
              setShowQuickAddForm(true);
              scrollToSection(roomSectionRef);
            }}
          >
            <span className="room-manager-mobile-bottom-icon">
              <FaPlus />
            </span>
            <span>Add Room</span>
          </button>
          <button
            type="button"
            className={`room-manager-mobile-bottom-action ${mobileSection === "filters" ? "is-active" : ""}`}
            onClick={() => {
              setMobileSection("filters");
              scrollToSection(filterSectionRef);
            }}
          >
            <span className="room-manager-mobile-bottom-icon">
              <FaSlidersH />
            </span>
            <span>Filters</span>
          </button>
          <button
            type="button"
            className={`room-manager-mobile-bottom-action ${mobileSection === "categories" ? "is-active" : ""}`}
            onClick={() => {
              setMobileSection("categories");
              openCategoryEditor();
              scrollToSection(categorySectionRef);
            }}
          >
            <span className="room-manager-mobile-bottom-icon">
              <FaTags />
            </span>
            <span>Categories</span>
          </button>
        </div>
      </div>

      <div className="d-none d-lg-block">
        <div className="room-manager-desktop-header mb-4">
          <button
            type="button"
            className="btn room-manager-back-btn"
            onClick={() => handleNavigation("/admin")}
          >
            <FaArrowLeft className="me-1" />
            Back
          </button>

          <h1 className="room-manager-page-title mb-0">
            Room &amp; Bed Management
          </h1>
        </div>

        <div className="room-manager-header-tools mb-3">
              <button
                type="button"
                className="btn text-white room-manager-top-card-btn"
                onClick={() => setShowQuickAddForm(true)}
              >
                <FaPlus className="me-1" /> Add Property
              </button>
              <div className="room-manager-header-search">
                <span className="room-manager-header-search-icon">
                  <FaSearch />
                </span>
                <input
                  type="text"
                  name="room-manager-desktop-search"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="form-control"
                  placeholder="Search unit / bed / floor / category / wing"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="btn btn-outline-secondary room-manager-outline-btn"
                onClick={openCategoryEditor}
                title="Edit category names"
              >
                <FaEdit className="room-manager-outline-btn-icon" />
                ✏️ Edit Categories
              </button>
            </div>
        </div>

        <div className="row g-3 mb-4 room-manager-top-strip">
        <div className="col-12 col-lg room-manager-top-strip-title">
          <h1 className="room-manager-top-strip-page-title mb-0">
            Room &amp; Bed Management
          </h1>
        </div>
        {/* Quick Add */}
      <div className="col-12 col-lg-6 room-manager-top-strip-action">
    <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
      <button
        type="button"
        className="btn text-white room-manager-top-card-btn"
        onClick={() => setShowQuickAddForm(true)}
      >
        <FaPlus className="me-1" /> Add Property
      </button>
    </div>

      {false ? (
    <div className="d-grid" style={{ gap: "8px" }}>
      <select
        className="form-select form-select-sm"
        value={roomForm.propertyType}
        onChange={(e) => setPropertyFilter(e.target.value)}
      >
        {PROPERTY_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <input
        type="text"
        className="form-control form-control-sm"
        placeholder={
          roomForm.propertyType === "bed"
            ? "Category (Private / Double Sharing / 3 Sharing)"
            : getCategoryLabel(roomForm.propertyType)
        }
        value={roomForm.category}
        onChange={(e) =>
          setRoomForm((prev) => ({
            ...prev,
            category: e.target.value,
          }))
        }
      />

      {roomForm.propertyType !== "bed" && (
        <select
          className="form-select form-select-sm"
          value={roomForm.hasWing ? "yes" : "no"}
          onChange={(e) =>
            setRoomForm((prev) => ({
              ...prev,
              hasWing: e.target.value === "yes",
              wingName: e.target.value === "yes" ? prev.wingName : "",
            }))
          }
        >
          <option value="no">Has Wing: No</option>
          <option value="yes">Has Wing: Yes</option>
        </select>
      )}

      {roomForm.propertyType !== "bed" && roomForm.hasWing && (
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Wing Name (e.g., A Wing)"
          value={roomForm.wingName}
          onChange={(e) =>
            setRoomForm((prev) => ({
              ...prev,
              wingName: e.target.value,
            }))
          }
        />
      )}

      <div>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Floor No (Ground, 1, 2)"
          value={roomForm.floorNo}
          onChange={(e) =>
            setRoomForm((prev) => ({
              ...prev,
              floorNo: e.target.value,
            }))
          }
        />
      </div>

      {renderStructureBuilder(false)}

      {roomForm.propertyType === "room" && (
        <select
          className="form-select form-select-sm"
          value={roomForm.flatType}
          onChange={(e) =>
            setRoomForm((prev) => ({
              ...prev,
              flatType: e.target.value,
            }))
          }
        >
          <option value="">Select Flat Type</option>
          {FLAT_TYPE_OPTIONS.map((flatType) => (
            <option key={flatType} value={flatType}>
              {flatType}
            </option>
          ))}
        </select>
      )}

      <input
        className="form-control form-control-sm"
        placeholder={getUnitPlaceholder(roomForm.propertyType)}
        value={roomForm.roomNo}
        onChange={(e) =>
          setRoomForm((prev) => ({
            ...prev,
            roomNo: e.target.value,
          }))
        }
      />

      {roomForm.propertyType === "bed" && (
      <input
        className="form-control form-control-sm"
        placeholder="Bed No (e.g., B1)"
        value={roomForm.bedNo}
        onChange={(e) =>
          setRoomForm((prev) => ({
            ...prev,
            bedNo: e.target.value,
          }))
        }
      />)}

      {roomForm.propertyType === "bed" && (
      <input
        className="form-control form-control-sm"
        placeholder="Bed Category (e.g., Upper, Lower)"
        value={roomForm.bedCategory}
        onChange={(e) =>
          setRoomForm((prev) => ({
            ...prev,
            bedCategory: e.target.value,
          }))
        }
      />)}

      {/* ✅ NEW FIELD: BED PRICE */}
      <input
        type="number"
        className="form-control form-control-sm"
        placeholder={
          roomForm.propertyType === "bed"
            ? "Bed Price (₹)"
            : roomForm.propertyType === "shop"
            ? "Shop Price (₹)"
            : "Flat Price (₹)"
        }
        value={roomForm.bedPrice}
        onChange={(e) =>
          setRoomForm((prev) => ({
            ...prev,
            bedPrice: e.target.value,
          }))
        }
      />

<button
  className="btn btn-sm px-3 text-white"
  style={{ backgroundColor: "#5f7dfc" }}
  onClick={addRoom}
>
  Add {getUnitLabel(roomForm.propertyType)}
</button>

    </div>
    ) : null}
 </div>


        {/* KPI – Primary Total */}
        <div className="col-12 col-md-6 col-lg-4 room-manager-stat-col ms-lg-auto">
          <div className="bg-white border rounded-3 shadow-sm p-3 h-100 d-flex align-items-center room-manager-top-card room-manager-top-card--rooms room-manager-top-card-inner">
            <div
              className="rounded-circle d-inline-flex justify-content-center align-items-center me-3 room-manager-top-card-icon"
            >
              <FaBuilding />
            </div>
            <div>
              <div className="small room-manager-top-card-label">{statsMeta.primaryLabel}</div>
              <div className="fw-bold fs-4 room-manager-top-card-value">{statsMeta.primaryValue}</div>
            </div>
          </div>
        </div>

        {/* KPI – Secondary Total */}
        <div className="col-12 col-md-6 col-lg-4 room-manager-stat-col">
          <div className="bg-white border rounded-3 shadow-sm p-3 h-100 d-flex align-items-center room-manager-top-card room-manager-top-card--beds room-manager-top-card-inner">
            <div
              className="rounded-circle d-inline-flex justify-content-center align-items-center me-3 room-manager-top-card-icon"
            >
              <FaBed />
            </div>
            <div>
              <div className="small room-manager-top-card-label">{statsMeta.secondaryLabel}</div>
              <div className="fw-bold fs-4 room-manager-top-card-value">{statsMeta.secondaryValue}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Rooms & Beds Table */}
      <div className="card shadow-sm room-manager-table-card">
        <div className="card-body">
          <div className="room-manager-filterbar mb-4">
            <div
              className="room-manager-filterbar-controls"
            >
              <div className="room-manager-filter-field">
                <label className="form-label mb-1">Property Type</label>
                <select
                  className="form-select form-select-sm"
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                >
                  {PROPERTY_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="room-manager-filter-field">
                <label className="form-label mb-1">Category</label>
                <select
                  className="form-select form-select-sm"
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {filterCategoryOptions.map((c, idx) => (
                    <option key={idx} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="room-manager-filter-field">
                <label className="form-label mb-1">Wing</label>
                <select
                  className="form-select form-select-sm"
                  value={wingFilter}
                  onChange={(e) => setWingFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {filterWingOptions.map((wing, idx) => (
                    <option key={idx} value={wing}>
                      {wing}
                    </option>
                  ))}
                </select>
              </div>

              <div className="room-manager-filter-field">
                <label className="form-label mb-1">Floor</label>
                <select
                  className="form-select form-select-sm"
                  value={floorFilter}
                  onChange={(e) => setFloorFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {filterFloorOptions.map((floor, idx) => (
                    <option key={idx} value={floor}>
                      {floor}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            <div className="room-manager-filterbar-side">
              <button
                type="button"
                className="btn btn-outline-secondary room-manager-reset-btn"
                onClick={clearFilters}
                disabled={!search && !catFilter && !wingFilter && !floorFilter}
              >
                <FaRedoAlt className="me-2" /> Reset Filters
              </button>
            </div>
          </div>

          {propertyFilter !== "bed" ? renderGroupedUnitsDesktop() : renderBedRoomsDesktop()}

          {renderSetupUnits()}

          {false && (propertyFilter !== "bed" ? (
            renderGroupedUnitsDesktop()
          ) : (
          <div className="table-responsive">
            <table className="table table-bordered table-sm align-middle">
              <thead>
                <tr className="fw-semibold text-secondary">
                  <th style={{ whiteSpace: "nowrap" }}>Unit No</th>
                  <th style={{ whiteSpace: "nowrap" }}>Floor</th>
                  <th style={{ whiteSpace: "nowrap" }}>Type</th>
                  <th style={{ whiteSpace: "nowrap" }}>Category</th>
                  <th style={{ minWidth: 320 }}>Beds</th>
                  <th style={{ whiteSpace: "nowrap" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedRooms.map((room) => {
                  const norm = normalizeFloorKey(room.floorNo);
                  const displayFloor = norm
                    ? floorLabelFromKey(norm)
                    : room.floorNo || "-";

                  return (
                 <tr
  key={`${room.category}-${room.floorNo}-${room.roomNo}`}
  style={{ backgroundColor: getRoomColor(room) }}
>
<td className="fw-semibold">
  {(() => {
    const { bg, fg } = roomColors(room); // ✅ PASS room here
    return (
      <span className="roomNoPill" style={{ "--bg": bg, "--fg": fg }}>
        {room.roomNo}
      </span>
    );
  })()}
</td>

                      <td>{displayFloor}</td>
                     <td>{getPropertyTypeLabel(room.propertyType)}</td>
                     <td>
  <span
    className="badge bg-light text-dark border"
    role="button"
    title="Click to edit category"
    style={{ cursor: "pointer" }}
    onClick={() => editRoomCategoryQuick(room)}
  >
    <div>{room.category || "-"}</div>
    {(room.wingName || room.flatType) && (
      <small className="d-block text-muted">
        {[room.wingName ? `Wing ${room.wingName}` : "", room.flatType || ""].filter(Boolean).join(" • ")}
      </small>
    )}
  </span>
</td>

                      <td>
                        {(room.beds?.length ? room.beds : []).map(
                          (bed, idx, arr) => {
                            const isLast = idx === arr.length - 1;
                            return (
                              <div
                                key={`${room.roomNo}-${bed.bedNo}-${idx}`}
                                className="d-flex justify-content-between align-items-center py-1 flex-wrap"
                                style={
                                  !isLast
                                    ? { borderBottom: "1px solid #9aa0a6" }
                                    : {}
                                }
                              >
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                  <span className="badge rounded-pill bg-secondary">
                                    {(room.propertyType || "bed") === "bed" ? `Bed ${bed.bedNo}` : `Unit ${bed.bedNo}`}
                                  </span>
                                  {bed.bedCategory && (
                                    <span className="badge rounded-pill bg-light text-dark border">
                                      {bed.bedCategory}
                                    </span>
                                  )}
                                  <small className="text-muted">
                                    Price:{" "}
                                    {bed.price != null
                                      ? `₹${Number(bed.price).toLocaleString(
                                          "en-IN"
                                        )}`
                                      : "—"}
                                  </small>
                                </div>
                                <button
                                  className="btn btn-sm btn-outline-primary ms-2"
                                 onClick={() =>
  openEditModal(
    room._id,
    room.roomNo,
    bed.bedNo,
     bed.bedCategory ?? "",
    bed.price ?? ""
  )
}

                                >
                                  Edit Price
                                </button>
                              </div>
                            );
                          }
                        )}
                        {!room.beds?.length && (
                          <span className="text-muted">No beds yet</span>
                        )}
                      </td>
                      <td>
                        {(room.propertyType || "bed") === "bed" && <button
                          className="btn btn-sm"
                          style={{ backgroundColor: "#5f7dfc", color: "white" }}
                          onClick={() => openAddBedModal(room)}
                          disabled={hasReachedHostelBedLimit}
                          title={
                            hasReachedHostelBedLimit
                              ? `Maximum ${MAX_HOSTEL_BEDS} hostel beds reached`
                              : "Add a new bed"
                          }
                        >
                          + Add Bed
                        </button>}

                        {/* 🔴 NEW: one Delete Bed button per room */}
                        {(room.propertyType || "bed") === "bed" && room.beds?.length > 0 && (
 <button
  className="btn btn-sm btn-outline-primary ms-2"
  style={{ color: "#2ea3f2", borderColor: "#2ea3f2" }}
  onClick={() => openDeleteBedModal(room)}
>
  Delete Bed
</button>


                        )}

                        {(room.propertyType || "bed") !== "bed" && (
                          <button
                            className="btn btn-sm btn-outline-danger ms-2 px-2 py-1"
                            style={{ fontSize: "0.8rem", lineHeight: 1.2 }}
                            onClick={() => openDeleteRoomModal(room)}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!displayedRooms.length && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      No rooms match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          ))}
        </div>
      </div>

      <div className="room-manager-footer-bar d-none d-md-flex">
        <span>
          Showing 1 to {propertyFilter === "bed" ? displayedRooms.length : groupedDisplayedRooms.length} of{" "}
          {propertyFilter === "bed" ? displayedRooms.length : groupedDisplayedRooms.length}{" "}
          {propertyFilter === "bed" ? "rooms" : "properties"}
        </span>
        <div className="room-manager-footer-pager">
          <button type="button" className="room-manager-footer-pagebtn" disabled>
            ‹
          </button>
          <button type="button" className="room-manager-footer-pagebtn is-active">
            1
          </button>
          <button type="button" className="room-manager-footer-pagebtn" disabled>
            ›
          </button>
        </div>
      </div>

      {showQuickAddForm && renderDesktopQuickAddModal()}

      {/* Add Bed Modal */}
      {showAddBedModal && selectedRoom && renderModal(
        <div
          style={modalBackdropStyle}
          onClick={() => setShowAddBedModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered room-manager-bed-dialog"
            style={{
              width: "100%",
              maxWidth: "560px",
              margin: "0 12px",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
              <div
                className="modal-content room-manager-bed-modal"
                style={{
                  maxHeight: "calc(100vh - 24px)",
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  maxWidth: "520px",
                }}
              >
              <div
                className="modal-header bg-white sticky-top py-2 room-manager-bed-header"
                style={{ zIndex: 1 }}
              >
                <h6 className="modal-title mb-0">
                  Add Bed — Room {selectedRoom.roomNo}
                </h6>
               <button
  type="button"
  className="btn-close p-0"
  onClick={() => setShowAddBedModal(false)}
>
  x
</button>

              </div>

              <div className="modal-body py-2 room-manager-bed-body" style={{ overflowY: "auto" }}>
                <div className="alert alert-info small mb-2">
                  Total hostel beds: {totalHostelBeds} / {MAX_HOSTEL_BEDS}
                  {reusableHostelBedSlots.length > 0 ? (
                    <div className="mt-1">
                      {reusableHostelBedSlots.length} pending unit
                      {reusableHostelBedSlots.length === 1 ? "" : "s"} can be used if the plan limit is already full.
                    </div>
                  ) : null}
                </div>
                <div className="mb-2">
                  <label className="form-label mb-1">Bed No</label>
                  <input
                    className="form-control form-control-sm"
                    value={bedForm.bedNo}
                    disabled={!canAddHostelBed}
                    onChange={(e) =>
                      setBedForm((prev) => ({
                        ...prev,
                        bedNo: e.target.value,
                      }))
                    }
                    placeholder="e.g., B3"
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label mb-1">Bed Category</label>
                  <input
                    className="form-control form-control-sm"
                    value={bedForm.bedCategory}
                    disabled={!canAddHostelBed}
                    onChange={(e) =>
                      setBedForm((prev) => ({
                        ...prev,
                        bedCategory: e.target.value,
                      }))
                    }
                    placeholder="e.g., Upper, Lower"
                  />
                </div>

                <div className="mb-1">
                  <label className="form-label mb-1">
                    Price <span className="text-muted">(optional)</span>
                  </label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">₹</span>
                    <input
                      type="number"
                      className="form-control"
                      value={bedForm.price}
                      disabled={!canAddHostelBed}
                      onChange={(e) =>
                        setBedForm((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      placeholder="e.g., 3500"
                      min="0"
                      inputMode="decimal"
                    />
                  </div>
                  <small className="text-muted d-block mt-1">
                    Enter amount in INR
                  </small>
                </div>
              </div>

              <div className="modal-footer py-2 flex-wrap gap-2 room-manager-bed-footer">
                <button
                  className="btn btn-secondary w-100 w-sm-auto"
                  onClick={() => setShowAddBedModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-success w-100 w-sm-auto"
                  onClick={addBedToRoom}
                  disabled={!canAddHostelBed}
                >
                  Save Bed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Placeholder Unit Details Modal - aligned with mobile Units flow */}
      {setupTarget &&
        renderModal(
          <div style={modalBackdropStyle} onClick={closeSetupUnitModal}>
            <div
              className="modal-dialog modal-dialog-centered room-manager-edit-dialog"
              style={{ width: "100%", maxWidth: "600px", margin: "0 12px" }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div
                className="modal-content roommodal room-manager-edit-modal"
                style={{ maxHeight: "calc(100vh - 24px)", display: "flex", flexDirection: "column" }}
              >
                <div className="modal-header bg-white sticky-top py-2 room-manager-edit-header" style={{ zIndex: 1 }}>
                  <div>
                    <h6 className="modal-title mb-0">
                      {isPlaceholderUnit(setupTarget) ? "Set unit details" : "Edit unit details"}
                    </h6>
                    <small className="text-muted">
                      {isPlaceholderUnit(setupTarget)
                        ? "Add the property, floor and unit number before assigning tenants."
                        : "Update the property, room/unit, meter and location details."}
                    </small>
                    <div>
                      <span className="badge bg-light text-dark border mt-1">
                        {getPropertyTypeLabel(setupTarget.propertyType)}
                      </span>
                    </div>
                  </div>
                  <button type="button" className="btn-close btn-close1 p-1" onClick={closeSetupUnitModal}>x</button>
                </div>

                <div className="modal-body py-2 room-manager-edit-body" style={{ overflowY: "auto" }}>
                  {(() => {
                    const targetType = normalizePropertyType(setupTarget.propertyType);
                    const pendingSetup = isPlaceholderUnit(setupTarget);
                    const labels = getSetupDetailLabels(targetType);
                    return (
                      <>
                        <div className="mb-2">
                          <label className="form-label mb-1">{labels.category}</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            list="setup-property-options"
                            value={setupForm.category}
                            onChange={(e) => setSetupForm((prev) => ({ ...prev, category: e.target.value, floorNo: "", wingName: "", flatType: "" }))}
                            placeholder={`Enter ${labels.category.toLowerCase()}`}
                          />
                          <datalist id="setup-property-options">
                            {setupPropertyOptions.map((option) => <option key={option} value={option} />)}
                          </datalist>
                        </div>

                        <div className="mb-2">
                          <label className="form-label mb-1">Floor</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            list="setup-floor-options"
                            value={setupForm.floorNo}
                            onChange={(e) => setSetupForm((prev) => ({ ...prev, floorNo: e.target.value, wingName: "", flatType: "" }))}
                            placeholder="Example: Ground or 1"
                          />
                          <datalist id="setup-floor-options">
                            {setupFloorOptions.map((option) => <option key={option} value={option} />)}
                          </datalist>
                        </div>

                        <div className="mb-2">
                          <label className="form-label mb-1">Wing or block <span className="text-muted">(optional)</span></label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            list="setup-wing-options"
                            value={setupForm.wingName}
                            onChange={(e) => setSetupForm((prev) => ({ ...prev, wingName: e.target.value }))}
                            placeholder="Example: A"
                          />
                          <datalist id="setup-wing-options">
                            {setupWingOptions.map((option) => <option key={option} value={option} />)}
                          </datalist>
                        </div>

                        {targetType === "room" && (
                          <div className="mb-2">
                            <label className="form-label mb-1">Flat type</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              list="setup-flat-type-options"
                              value={setupForm.flatType}
                              onChange={(e) => setSetupForm((prev) => ({ ...prev, flatType: e.target.value }))}
                              placeholder="Example: 1 RK or 1 BHK"
                            />
                            <datalist id="setup-flat-type-options">
                              {setupFlatTypeOptions.map((option) => <option key={option} value={option} />)}
                            </datalist>
                          </div>
                        )}

                        <div className="mb-2">
                          <label className="form-label mb-1">{labels.number}</label>
                          <input type="text" className="form-control form-control-sm" value={setupForm.roomNo} onChange={(e) => setSetupForm((prev) => ({ ...prev, roomNo: e.target.value }))} placeholder={labels.numberPlaceholder} />
                        </div>

                        <div className="mb-2">
                          <label className="form-label mb-1">Meter number <span className="text-muted">(optional)</span></label>
                          <input type="text" className="form-control form-control-sm" value={setupForm.meterNo} onChange={(e) => setSetupForm((prev) => ({ ...prev, meterNo: e.target.value }))} placeholder="Example: MTR-101" />
                        </div>

                        <div className="mb-2">
                          <label className="form-label mb-1">Last meter reading <span className="text-muted">(optional)</span></label>
                          <input type="number" className="form-control form-control-sm" min="0" inputMode="decimal" value={setupForm.lastMeterReading} onChange={(e) => setSetupForm((prev) => ({ ...prev, lastMeterReading: e.target.value }))} placeholder="Example: 250" />
                        </div>

                        {targetType === "bed" && pendingSetup && (
                          <div className="mb-2">
                            <label className="form-label mb-1">Bed category</label>
                            <input type="text" className="form-control form-control-sm" value={setupForm.bedCategory} onChange={(e) => setSetupForm((prev) => ({ ...prev, bedCategory: e.target.value }))} placeholder="Example: Standard" />
                          </div>
                        )}

                        {(pendingSetup || targetType !== "bed") && (
                          <div className="mb-2">
                            <label className="form-label mb-1">{labels.price}</label>
                            <div className="input-group input-group-sm">
                              <span className="input-group-text">Rs.</span>
                              <input type="number" className="form-control" value={setupForm.price} onChange={(e) => setSetupForm((prev) => ({ ...prev, price: e.target.value }))} min="0" inputMode="decimal" placeholder="Example: 5000" />
                            </div>
                            <small className="text-muted">
                              {pendingSetup
                                ? "Monthly rent is required before this unit can be assigned."
                                : "Update the monthly rent for this unit."}
                            </small>
                          </div>
                        )}

                        {targetType === "bed" && !pendingSetup && (
                          <div className="alert alert-light border small mb-2">
                            Bed category and bed rent are edited separately from each bed row, matching the mobile app.
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div className="modal-footer py-2 flex-wrap gap-2 room-manager-edit-footer">
                  <button className="btn btn-secondary w-100 w-sm-auto" onClick={closeSetupUnitModal} disabled={setupSaving}>Cancel</button>
                  <button className="btn btn-primary w-100 w-sm-auto" onClick={saveSetupUnit} disabled={setupSaving}>
                    {setupSaving ? "Saving..." : isPlaceholderUnit(setupTarget) ? "Save details" : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Edit Price Modal */}
      {showEditModal &&
        renderModal(
        <div
          style={modalBackdropStyle}
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered room-manager-edit-dialog"
            style={{
              width: "100%",
              maxWidth: "520px",
              margin: "0 12px",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="modal-content roommodal room-manager-edit-modal"
              style={{
                maxHeight: "calc(100vh - 24px)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                className="modal-header bg-white sticky-top py-2 room-manager-edit-header"
                style={{ zIndex: 1 }}
              >
                <h6 className="modal-title mb-0">
                  {propertyFilter === "room"
                    ? `Edit Room - Room ${editTarget.roomNo}`
                    : `Edit Bed - Room ${editTarget.roomNo} - Category ${editTarget.bedCategory || "-"}`}
                </h6>
                <button
                  type="button"
                  className="btn-close btn-close1 p-1"
                  onClick={() => setShowEditModal(false)}
                >
                  x
                </button>
              </div>

              <div className="modal-body py-2 room-manager-edit-body" style={{ overflowY: "auto" }}>
                {propertyFilter !== "room" && (
                  <div className="mb-2">
                    <label className="form-label mb-1">Bed Category</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editTarget.bedCategory}
                      onChange={(e) =>
                        setEditTarget((t) => ({ ...t, bedCategory: e.target.value }))
                      }
                      placeholder="Upper / Lower"
                    />
                  </div>
                )}



  {/* ✅ Price */}
  <label className="form-label mb-1">Price</label>
  <div className="input-group input-group-sm">
    <span className="input-group-text">₹</span>
    <input
      type="number"
      className="form-control"
      value={editTarget.price}
      onChange={(e) =>
        setEditTarget((t) => ({ ...t, price: e.target.value }))
      }
      min="0"
      inputMode="decimal"
      placeholder="e.g., 3500"
    />
  </div>
</div>


              <div className="modal-footer py-2 flex-wrap gap-2 room-manager-edit-footer">
                <button
                  className="btn btn-secondary w-100 w-sm-auto"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary w-100 w-sm-auto"
                  onClick={updateBedPrice}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 NEW: Delete Bed Modal */}
      {showDeleteBedModal && renderModal(
        <div
          style={modalBackdropStyle}
          onClick={() => setShowDeleteBedModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered room-manager-delete-bed-dialog"
            style={{
              width: "100%",
              maxWidth: "520px",
              margin: "0 12px",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="modal-content room-manager-delete-bed-modal"
              style={{
                maxHeight: "calc(100vh - 24px)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                className="modal-header bg-white sticky-top py-2 room-manager-delete-bed-header"
                style={{ zIndex: 1 }}
              >
                <h6 className="modal-title mb-0">
                  Delete Bed — Room {deleteBedState.roomNo}
                </h6>
               <button
  type="button"
  className="btn-close p-0"
  onClick={() => setShowDeleteBedModal(false)}
>
  x
</button>

              </div>

              <div className="modal-body py-2 room-manager-delete-bed-body" style={{ overflowY: "auto" }}>
                <div className="mb-2">
                  <label className="form-label mb-1">Select Bed</label>
                  <select
                    className="form-select form-select-sm"
                    value={deleteBedState.selectedBedNo}
                    onChange={(e) =>
                      setDeleteBedState((prev) => ({
                        ...prev,
                        selectedBedNo: e.target.value,
                      }))
                    }
                  >
                    <option value="">-- Select Bed --</option>
                    {deleteBedState.beds.map((b) => (
                      <option key={b.bedNo} value={b.bedNo}>
                        Bed {b.bedNo}
                        {b.bedCategory ? ` (${b.bedCategory})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-2">
                  <label className="form-label mb-1">
                    Password (required to delete)
                  </label>
                  <input
                    type="password"
                    name="delete-bed-password"
                    autoComplete="new-password"
                    className="form-control form-control-sm"
                    value={deleteBedState.password}
                    onChange={(e) =>
                      setDeleteBedState((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    placeholder="Enter password"
                  />
               
                </div>

                <div className="alert alert-warning small mt-2">
                  This will permanently remove the selected bed from this room.
                </div>
              </div>

              <div className="modal-footer py-2 flex-wrap gap-2 room-manager-delete-bed-footer">
                <button
                  className="btn btn-secondary w-100 w-sm-auto"
                  onClick={() => setShowDeleteBedModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger w-100 w-sm-auto"
                  onClick={handleDeleteBed}
                >
                  Delete Bed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteRoomModal && renderModal(
        <div
          style={modalBackdropStyle}
          onClick={() => setShowDeleteRoomModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered room-manager-delete-dialog"
            style={{
              width: "100%",
              maxWidth: "520px",
              margin: "0 12px",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="modal-content room-manager-delete-modal"
              style={{
                maxHeight: "calc(100vh - 24px)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                className="modal-header bg-white sticky-top py-2 room-manager-delete-header"
                style={{ zIndex: 1 }}
              >
                <h6 className="modal-title mb-0">
                  Delete {deleteRoomState.propertyType === "shop"
                    ? "Shop"
                    : deleteRoomState.propertyType === "room"
                      ? "Residential Room"
                      : "Hostel Room"} — {deleteRoomState.roomNo}
                </h6>
                <button
                  type="button"
                  className="btn-close p-0"
                  onClick={() => setShowDeleteRoomModal(false)}
                >
                  x
                </button>
              </div>

              <div className="modal-body py-2 room-manager-delete-body" style={{ overflowY: "auto" }}>
                <div className="alert alert-warning small mb-0">
                  This will permanently remove the selected{" "}
                  {deleteRoomState.propertyType === "shop"
                    ? "shop"
                    : deleteRoomState.propertyType === "room"
                      ? "residential room"
                      : "hostel room"}.
                  <br />
                  <strong>
                    Deletion is allowed only when no active tenant is assigned to this unit.
                  </strong>
                </div>
              </div>

              <div className="modal-footer py-2 flex-wrap gap-2 room-manager-delete-footer">
                <button
                  className="btn btn-secondary w-100 w-sm-auto"
                  onClick={() => setShowDeleteRoomModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger w-100 w-sm-auto"
                  onClick={deleteRoomOrShop}
                >
                  Delete {deleteRoomState.propertyType === "shop"
                    ? "Shop"
                    : deleteRoomState.propertyType === "room"
                      ? "Room"
                      : "Hostel Room"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Editor Modal */}
      {showCatEditor &&
        renderModal(
        <div style={modalBackdropStyle} onClick={() => setShowCatEditor(false)}>
          <div
            className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down"
            style={{ maxWidth: "720px", margin: "1rem" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-content" style={{ width: "100%", maxWidth: "720px" }}>
              <div
                className="modal-header sticky-top bg-white"
                style={{ zIndex: 1 }}
              >
                <h5 className="modal-title">Edit Category Names</h5>
                <button
  type="button"
  className="btn-close p-0"
  onClick={() => setShowCatEditor(false)}
>
  x
</button>

              </div>

              <div
                className="modal-body p-3"
                style={{ maxHeight: "70vh", overflow: "auto" }}
              >
                <div className="alert alert-info small">
                  Order matters: limits are tied to index (0–
                  {DEFAULT_CATEGORIES.length - 1}).
                </div>

                <div className="row g-2">
                  {catDrafts.map((val, idx) => (
                    <div className="col-12 col-md-6" key={idx}>
                      <label className="form-label small">
                        Category {idx + 1}
                      </label>
                      <input
                        className="form-control form-control-sm"
                        value={val}
                        onChange={(e) =>
                          setCatDrafts((prev) => {
                            const copy = [...prev];
                            copy[idx] = e.target.value;
                            return copy;
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer flex-wrap gap-2">
                <button
                  className="btn btn-outline-secondary"
                  onClick={resetDefaultCategories}
                >
                  Reset Defaults
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCatEditor(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-success"
                  onClick={saveCategoryNames}
                >
                  Save Categories
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
    </div>
  );
}
