import { useState, useEffect } from "react";
import axios from "axios";
import { User } from "lucide-react";
import { FaDatabase, FaWarehouse, FaClipboard, FaTachometerAlt, FaTools} from "react-icons/fa";
import {
  MdOutlineBedroomParent,
  MdLightbulbOutline,
  MdOutlineReceiptLong,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import "../Pages/khata.css";
import { getAppBootstrap } from "../saasApi";
import { allowedUnitTypes } from "../utils/subscriptionAccess";

const Sidebar = () => {
  const [userName, setUserName] = useState("");
  const [enabledUnitTypes, setEnabledUnitTypes] = useState(null);

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

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const response = await axios.get("    http://localhost:8000/api/user", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUserName(response.data.username);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserName();
  }, []);

  const navigate = useNavigate();
  const handleNavigation = (path, state) => {
    navigate(path, state ? { state } : undefined);
  };

  return (
    <div className="sidebar bg-gray-800 text-white fixed left-0 top-0 bottom-0 w-64 p-4">
      {/* Header */}
      <div className="mb-6 text-center">
        <h6 className="text-gray-400 text-sm">Welcome,</h6>
        <h4 className="font-bold text-yellow-500 text-lg flex items-center justify-center gap-2">
          <User color="white" size={18} /> {userName?.toUpperCase() || "GUEST"}!
        </h4>
        <h6 className="text-gray-300 text-sm mt-1">Management Book</h6>
      </div>

      <hr className="border-gray-600 mb-4" />

      {/* Navigation Links */}
      <div className="flex flex-col gap-3">
        <div className="sidebar-item" onClick={() => handleNavigation("/dashboard")}>
          <FaTachometerAlt className="icon" /> Dashboard
        </div>
        {hasUnitType("bed") ? <div className="sidebar-item" onClick={() => handleNavigation("/tracker/bed", { tab: "rent", trackerType: "bed" })}>
          <MdOutlineBedroomParent className="icon" /> Hostel
        </div> : null}
        {hasUnitType("room") ? <div className="sidebar-item" onClick={() => handleNavigation("/tracker/room", { tab: "rent", trackerType: "room" })}>
          <MdOutlineBedroomParent className="icon" /> Residential Rooms
        </div> : null}
        {hasUnitType("shop") ? <div className="sidebar-item" onClick={() => handleNavigation("/tracker/shop", { tab: "rent", trackerType: "shop" })}>
          <MdOutlineBedroomParent className="icon" /> Commercial Shop
        </div> : null}
        {hasUnitType("bed") ? <div className="sidebar-item" onClick={() => handleNavigation("/tracker/bed", { tab: "light-hostel", trackerType: "bed" })}>
          <MdLightbulbOutline className="icon" /> Light Bill Hostel
        </div> : null}
        {hasUnitType("room") || hasUnitType("shop") ? <div className="sidebar-item" onClick={() => {
          const type = hasUnitType("room") ? "room" : "shop";
          handleNavigation(`/tracker/${type}`, { tab: type === "room" ? "light-room" : "light-shop", trackerType: type });
        }}>
          <MdLightbulbOutline className="icon" /> Light Bill {hasUnitType("room") && hasUnitType("shop") ? "Room + Shop" : hasUnitType("room") ? "Room" : "Shop"}
        </div> : null}
        {hasUnitType("bed") ? <div className="sidebar-item" onClick={() => handleNavigation("/tracker/bed", { tab: "expenses-hostel", trackerType: "bed" })}>
          <MdOutlineReceiptLong className="icon" /> Expenses Hostel
        </div> : null}
        {hasUnitType("room") || hasUnitType("shop") ? <div className="sidebar-item" onClick={() => {
          const type = hasUnitType("room") ? "room" : "shop";
          handleNavigation(`/tracker/${type}`, { tab: type === "room" ? "expenses-room" : "expenses-shop", trackerType: type });
        }}>
          <MdOutlineReceiptLong className="icon" /> Expenses {hasUnitType("room") && hasUnitType("shop") ? "Room + Shop" : hasUnitType("room") ? "Room" : "Shop"}
        </div> : null}
        {(hasUnitType("bed") || hasUnitType("room") || hasUnitType("shop")) ? <div className="sidebar-item" onClick={() => handleNavigation(`/tracker/${hasUnitType("bed") ? "bed" : hasUnitType("room") ? "room" : "shop"}`, { tab: "staff", trackerType: hasUnitType("bed") ? "bed" : hasUnitType("room") ? "room" : "shop" })}>
          <MdOutlineReceiptLong className="icon" /> Staff
        </div> : null}
        <div className="sidebar-item" onClick={() => handleNavigation("/suppliers")}>
          <FaWarehouse className="icon" /> Suppliers
        </div>
        <div className="sidebar-item" onClick={() => handleNavigation("/maintenance")}>
          <FaClipboard className="icon" /> All Projects
        </div>
        <div className="sidebar-item" onClick={() => handleNavigation("/record")}>
          <FaDatabase className="icon" /> Expenses
        </div>
        <div className="sidebar-item" onClick={() => handleNavigation("/setting")}>
       <FaTools className="icon" />  Settings
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
