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

const Sidebar = () => {
  const [userName, setUserName] = useState("");

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
        <div className="sidebar-item" onClick={() => handleNavigation("/tracker/bed", { tab: "rent", trackerType: "bed" })}>
          <MdOutlineBedroomParent className="icon" /> Hostel
        </div>
        <div className="sidebar-item" onClick={() => handleNavigation("/tracker/room", { tab: "rent", trackerType: "room" })}>
          <MdOutlineBedroomParent className="icon" /> Residential Rooms
        </div>
        <div className="sidebar-item" onClick={() => handleNavigation("/tracker/shop", { tab: "rent", trackerType: "shop" })}>
          <MdOutlineBedroomParent className="icon" /> Commercial Shop
        </div>
        <div className="sidebar-item" onClick={() => handleNavigation("/tracker/bed", { tab: "light-hostel", trackerType: "bed" })}>
          <MdLightbulbOutline className="icon" /> Light Bill Hostel
        </div>
        <div className="sidebar-item" onClick={() => handleNavigation("/tracker/room", { tab: "light-room-shop", trackerType: "room" })}>
          <MdLightbulbOutline className="icon" /> Light Bill Room + Shop
        </div>
        <div className="sidebar-item" onClick={() => handleNavigation("/tracker/bed", { tab: "expenses-hostel", trackerType: "bed" })}>
          <MdOutlineReceiptLong className="icon" /> Expenses Hostel
        </div>
        <div className="sidebar-item" onClick={() => handleNavigation("/tracker/room", { tab: "expenses-room-shop", trackerType: "room" })}>
          <MdOutlineReceiptLong className="icon" /> Expenses Room + Shop
        </div>
        <div className="sidebar-item" onClick={() => handleNavigation("/tracker/bed", { tab: "staff", trackerType: "bed" })}>
          <MdOutlineReceiptLong className="icon" /> Staff
        </div>
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
