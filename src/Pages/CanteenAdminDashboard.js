import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaClipboardList,
  FaSignOutAlt,
  FaUtensils,
  FaArrowLeft,
  FaTimes,
} from "react-icons/fa";
import { MdDashboard, MdLightbulbOutline, MdBuild } from "react-icons/md";
import { BsCurrencyRupee, BsBoxArrowRight } from "react-icons/bs";
import CanteenExpense from "./CanteenExpense";
import MealAttendancePage from "./MealAttendancePage";
import { clearAdminToken, getAdminSession } from "../utils/adminAuth";

function CanteenAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useMemo(() => getAdminSession(), []);
  const isSuperAdmin = session?.role === "super_admin";

  const [activeTab, setActiveTab] = useState(location.state?.tab || "expenses");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 992 : false
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);

      if (!mobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state?.tab]);

  const handleLogout = () => {
    setSidebarOpen(false);
    clearAdminToken();
    navigate("/", { replace: true });
  };

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleBackToDashboard = () => {
    setSidebarOpen(false);
    navigate("/maindashboard");
  };

  const sidebarBg = "#6281e0";
  const sidebarText = "#ffffff";
  const sidebarMuted = "rgba(255,255,255,0.68)";
  const sidebarHover = "rgba(255,255,255,0.10)";
  const sidebarActive = "rgba(255,255,255,0.14)";

  const menuItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <MdDashboard size={20} />,
      onClick: handleBackToDashboard,
      show: isSuperAdmin,
      exact: false,
    },
    {
      key: "expenses",
      label: "Canteen Portal",
      icon: <FaUtensils size={18} />,
      onClick: () => handleSelectTab("expenses"),
      show: true,
      exact: activeTab === "expenses",
    },
    {
      key: "attendance",
      label: "Meal Attendance",
      icon: <FaClipboardList size={18} />,
      onClick: () => handleSelectTab("attendance"),
      show: true,
      exact: activeTab === "attendance",
    },
  ];

  const extraItems = [
   
  ];

  const renderSidebar = (mobile = false) => (
    <div
      style={{
        background: sidebarBg,
        color: sidebarText,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: mobile ? "18px 18px 22px" : "18px 18px 22px",
      }}
    >
      <div
        className="d-flex align-items-center"
        style={{
          minHeight: 42,
          marginBottom: 18,
        }}
      >
        <button
          type="button"
          onClick={() => (mobile ? setSidebarOpen(false) : null)}
          style={{
            width: 36,
            height: 36,
            border: "none",
            background: "transparent",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            padding: 0,
            marginRight: 10,
            cursor: mobile ? "pointer" : "default",
            opacity: 0.95,
          }}
        >
          {mobile ? <FaBars /> : <FaBars />}
        </button>

        <div
          style={{
            fontSize: mobile ? 16 : 22,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "0.2px",
          }}
        >
          Hostel Manager
        </div>
      </div>

      <div className="d-flex flex-column" style={{ gap: 8, marginTop: 8 }}>
        {isSuperAdmin &&
          menuItems
            .filter((item) => item.key === "dashboard" && item.show)
            .map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                style={{
                  border: "none",
                  background: item.exact ? sidebarActive : "transparent",
                  color: "#ffffff",
                  borderRadius: 12,
                  padding: "11px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  fontSize: 15,
                  fontWeight: 500,
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    width: 18,
                    minWidth: 18,
                    display: "inline-flex",
                    justifyContent: "center",
                    alignItems: "center",
                    opacity: 0.95,
                  }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            ))}

        {extraItems.map((item) => (
          <button
            key={item.key}
            type="button"
            style={{
              border: "none",
              background: "transparent",
              color: "#ffffff",
              borderRadius: 12,
              padding: "11px 10px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 15,
              fontWeight: 500,
              textAlign: "left",
              cursor: "default",
            }}
          >
            <span
              style={{
                width: 18,
                minWidth: 18,
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                opacity: 0.95,
              }}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}

        {menuItems
          .filter((item) => item.key !== "dashboard" && item.show)
          .map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              style={{
                border: "none",
                background: item.exact ? sidebarActive : "transparent",
                color: "#ffffff",
                borderRadius: 12,
                padding: "11px 10px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 15,
                fontWeight: 500,
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 18,
                  minWidth: 18,
                  display: "inline-flex",
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: 0.95,
                }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}

        <button
          type="button"
          onClick={handleLogout}
          style={{
            border: "none",
            background: "transparent",
            color: "#ffffff",
            borderRadius: 12,
            padding: "11px 10px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 15,
            fontWeight: 500,
            textAlign: "left",
            marginTop: 2,
          }}
        >
          <span
            style={{
              width: 18,
              minWidth: 18,
              display: "inline-flex",
              justifyContent: "center",
              alignItems: "center",
              opacity: 0.95,
            }}
          >
            <BsBoxArrowRight size={18} />
          </span>
          <span>Logout</span>
        </button>
      </div>

      <div className="mt-auto text-center" style={{ paddingTop: 26 }}>
        <div
          style={{
            color: sidebarMuted,
            fontSize: 12,
            fontWeight: 500,
            marginBottom: 10,
          }}
        >
          v1.0.0
        </div>
        <div
          style={{
            color: sidebarMuted,
            fontSize: 12,
            fontWeight: 400,
          }}
        >
          © Hostel Manager
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="min-vh-100"
      style={{
        background: "linear-gradient(180deg, #f4f7fb 0%, #eef2f8 100%)",
      }}
    >
      <div className="container-fluid py-3 py-lg-4">
        <div className="d-lg-none mb-3">
          <div
            className="d-flex align-items-center justify-content-between"
            style={{
              background: "#ffffff",
              borderRadius: 18,
              padding: "12px 14px",
              boxShadow: "0 6px 20px rgba(15, 23, 42, 0.06)",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                }}
              >
                Dedicated Portal
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#102a5c",
                }}
              >
                Canteen Management
              </div>
            </div>

            <button
              type="button"
              className="btn"
              onClick={() => setSidebarOpen(true)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: "1px solid #dbe3ef",
                background: "#ffffff",
                color: "#102a5c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              <FaBars />
            </button>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-3 col-xl-2 d-none d-lg-block">
            <div
              style={{
                position: "sticky",
                top: 16,
                height: "calc(100vh - 32px)",
              }}
            >
              <div
                style={{
                  borderRadius: 0,
                  overflow: "hidden",
                  height: "100%",
                  background: sidebarBg,
                  boxShadow: "0 14px 32px rgba(15, 23, 42, 0.10)",
                }}
              >
                {renderSidebar(false)}
              </div>
            </div>
          </div>

          {isMobile && sidebarOpen && (
            <>
              <div
                onClick={() => setSidebarOpen(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15, 23, 42, 0.28)",
                  zIndex: 1040,
                }}
              />

              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "78%",
                  maxWidth: 320,
                  height: "100vh",
                  background: sidebarBg,
                  zIndex: 1050,
                  boxShadow: "10px 0 28px rgba(15, 23, 42, 0.25)",
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  marginTop: 0,
                }}
              >
                {renderSidebar(true)}
              </div>
            </>
          )}

          <div className="col-12 col-lg-9 col-xl-10">
            <div style={{ minHeight: "500px" }}>
              {activeTab === "expenses" ? (
                <CanteenExpense embedded={true} />
              ) : (
                <MealAttendancePage embedded={true} user={session} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CanteenAdminDashboard;
